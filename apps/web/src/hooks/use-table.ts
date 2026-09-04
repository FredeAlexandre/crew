import { env } from "@crew/env/web";
import {
	type CardId,
	type DistressDirection,
	type Intent,
	intentSchema,
	type SonarPosition,
	type TaskInstanceId,
} from "@crew/protocol";
import type { TableView } from "@crew/view-model/fixtures";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TableError } from "../lib/rooms.ts";
import { parseServerFrame } from "./parse-server-frame.ts";

const RECONNECT_MS = 400;

export type ClientIntent =
	| { type: "player.ready"; ready: boolean }
	| { type: "player.leave" }
	| { type: "player.rename"; displayName: string }
	| { type: "host.start" }
	| {
			type: "host.configure";
			difficulty: number;
			captainSeat: number | null;
			distressDisabled?: boolean;
			completedTricksVisible?: boolean;
			playerCount?: number;
	  }
	| { type: "host.retry"; keepTasks?: boolean }
	| { type: "host.fillBots"; seatId?: number }
	| { type: "host.kick"; seatId: number }
	| { type: "task.take"; taskInstanceId: TaskInstanceId }
	| { type: "task.pass" }
	| { type: "task.predict"; count: number }
	| { type: "distress.skip" }
	| { type: "distress.activate"; direction: DistressDirection }
	| { type: "distress.passCard"; cardId: CardId }
	| { type: "card.play"; cardId: CardId }
	| { type: "sonar.use"; cardId: CardId; position: SonarPosition }
	| Intent;

export function useTable(code: string | null): {
	view: TableView | null;
	error: TableError | null;
	sendIntent: (intent: ClientIntent) => void;
} {
	const [view, setView] = useState<TableView | null>(null);
	const [error, setError] = useState<TableError | null>(null);
	const viewRef = useRef<TableView | null>(null);
	const socketRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		viewRef.current = null;
		setView(null);
		if (code === null) {
			setError(null);
			return;
		}

		const roomCode = code;
		let cancelled = false;
		let retry: ReturnType<typeof setTimeout> | undefined;
		let socket: WebSocket | null = null;

		function connect() {
			if (cancelled) {
				return;
			}
			const next = new WebSocket(roomSocketUrl(roomCode));
			socket = next;
			socketRef.current = next;
			next.addEventListener("message", (event: MessageEvent) => {
				if (cancelled || typeof event.data !== "string") {
					return;
				}
				const parsed = parseServerFrame(event.data);
				if (parsed === null || parsed.kind === "fact") {
					return;
				}
				if (parsed.kind === "error") {
					const seconds = Number(parsed.message.match(/\d+/)?.[0]);
					setError({
						code: parsed.code,
						seconds:
							parsed.code === "reconnectBlocked" && Number.isFinite(seconds) ? seconds : undefined,
					});
					return;
				}
				viewRef.current = parsed.view;
				setView(parsed.view);
				setError(null);
			});
			next.addEventListener("close", () => {
				if (socketRef.current === next) {
					socketRef.current = null;
				}
				if (cancelled) {
					return;
				}
				retry = setTimeout(connect, RECONNECT_MS);
			});
		}

		function leaveTable() {
			if (socket?.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ type: "player.leave" }));
			}
		}
		window.addEventListener("crew:leave-table", leaveTable);

		connect();
		return () => {
			cancelled = true;
			if (retry !== undefined) {
				clearTimeout(retry);
			}
			socketRef.current = null;
			socket?.close();
			window.removeEventListener("crew:leave-table", leaveTable);
		};
	}, [code]);

	const sendIntent = useCallback((intent: ClientIntent) => {
		const socket = socketRef.current;
		if (socket === null || socket.readyState !== WebSocket.OPEN) {
			return;
		}
		const stamped = stampIntent(intent, viewRef.current);
		if (stamped === null) {
			return;
		}
		setError(null);
		socket.send(JSON.stringify(stamped));
	}, []);

	return { view, error, sendIntent };
}

function roomSocketUrl(code: string): string {
	const http = env.VITE_SERVER_URL.replace(/\/$/, "");
	const ws = http.replace(/^http/i, "ws");
	return `${ws}/room/${code}`;
}

function stampIntent(intent: ClientIntent, view: TableView | null): Intent | null {
	if (
		intent.type === "player.ready" ||
		intent.type === "player.leave" ||
		intent.type === "player.rename" ||
		intent.type === "host.start" ||
		intent.type === "host.configure" ||
		intent.type === "host.retry" ||
		intent.type === "host.fillBots" ||
		intent.type === "host.kick" ||
		intent.type === "echo"
	) {
		const parsed = intentSchema.safeParse(intent);
		return parsed.success ? parsed.data : null;
	}
	const attemptId =
		"attemptId" in intent && typeof intent.attemptId === "string" && intent.attemptId.length > 0
			? intent.attemptId
			: view?.attemptId;
	const seatId =
		"seatId" in intent && typeof intent.seatId === "number" ? intent.seatId : view?.viewerSeat;
	const parsed = intentSchema.safeParse({ ...intent, attemptId, seatId });
	return parsed.success ? parsed.data : null;
}

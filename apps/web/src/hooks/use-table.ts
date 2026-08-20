import { env } from "@crew/env/web";
import { type EchoFact, echoIntentSchema, type SnapshotEnvelope } from "@crew/protocol";
import { useCallback, useRef, useState } from "react";

function wsUrl(roomName: string) {
	const http = env.VITE_SERVER_URL.replace(/\/$/, "");
	const ws = http.replace(/^http/, "ws");
	return `${ws}/room/${roomName}`;
}

export function useTable(roomName = "playground") {
	const socketRef = useRef<WebSocket | null>(null);
	const [snapshot, setSnapshot] = useState<SnapshotEnvelope | null>(null);
	const [facts, setFacts] = useState<EchoFact[]>([]);
	const [status, setStatus] = useState<"idle" | "open" | "closed">("idle");

	const connect = useCallback(() => {
		const socket = new WebSocket(wsUrl(roomName));
		socketRef.current = socket;
		socket.addEventListener("open", () => setStatus("open"));
		socket.addEventListener("close", () => setStatus("closed"));
		socket.addEventListener("message", (event) => {
			const data = JSON.parse(String(event.data)) as EchoFact;
			if (data.type === "echo") {
				setFacts((current) => [...current, data]);
			}
		});
	}, [roomName]);

	const sendIntent = useCallback((payload: unknown) => {
		const intent = echoIntentSchema.parse({
			type: "echo",
			attemptId: "playground",
			seq: 0,
			payload,
		});
		socketRef.current?.send(JSON.stringify(intent));
	}, []);

	return { snapshot, setSnapshot, facts, status, connect, sendIntent };
}

import { isRoomCode, normalizeRoomCode, type PlayerCount, type RoomTicket } from "@crew/protocol";
import { fixtures, type TableView } from "@crew/view-model/fixtures";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTable } from "../hooks/use-table.ts";
import { joinRoom, roomErrorCopy } from "../lib/rooms.ts";
import { GeometryTable } from "../skins/geometry/Table.tsx";
import styles from "../styles/lobby.module.css";

export const Route = createFileRoute("/lobby/$code")({
	component: LobbyRoute,
});

const SEAT_REGIONS = ["seat.self", "seat.1", "seat.2", "seat.3", "seat.4"] as const;

function placeholderLobby(playerCount: PlayerCount): TableView {
	const template = fixtures["lobby.threeEmpty"];
	const blank = template.seats[0];
	if (blank === undefined) {
		return template;
	}
	return {
		...template,
		playerCount,
		seats: Array.from({ length: playerCount }, (_, index) => ({
			...blank,
			region: SEAT_REGIONS[index] ?? "seat.4",
			seatId: index as 0 | 1 | 2 | 3 | 4,
			displayName: index === 0 ? "You" : null,
			connected: index === 0,
			ready: false,
		})),
		undealt: { present: playerCount === 3 },
	};
}

function LobbyRoute() {
	const { code: rawCode } = Route.useParams();
	const code = normalizeRoomCode(rawCode);
	const [status, setStatus] = useState<"joining" | "ready" | "error">(
		isRoomCode(code) ? "joining" : "error",
	);
	const [error, setError] = useState(isRoomCode(code) ? null : "That code is not a lobby.");
	const [copied, setCopied] = useState(false);
	const [ticket, setTicket] = useState<RoomTicket | null>(null);
	const table = useTable(ticket !== null ? ticket.code : null);
	const view = table.view ?? placeholderLobby(ticket?.playerCount ?? 3);

	useEffect(() => {
		if (!isRoomCode(code)) {
			return;
		}
		let cancelled = false;
		void joinRoom(code)
			.then((next) => {
				if (!cancelled) {
					setTicket(next);
					setStatus("ready");
				}
			})
			.catch((caught) => {
				if (!cancelled) {
					setError(roomErrorCopy(caught));
					setStatus("error");
				}
			});
		return () => {
			cancelled = true;
		};
	}, [code]);

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	}

	const waitingToSit = status !== "error" && table.view === null;
	const statusNote = waitingToSit
		? "Sitting down…"
		: view.scene === "lobby"
			? "Waiting for the rest of the crew."
			: null;

	return (
		<section className={styles.page}>
			<nav className={styles.bar}>
				<Link className={styles.home} to="/">
					Table
				</Link>
			</nav>
			<div className={waitingToSit ? `${styles.stage} ${styles.pending}` : styles.stage}>
				<GeometryTable
					view={view}
					sendIntent={table.sendIntent}
					lobby={{
						roomCode: code,
						copied,
						statusNote,
						alert: error ?? table.error,
						onCopyCode: isRoomCode(code) ? () => void copyCode() : undefined,
						onReady: (ready) => table.sendIntent({ type: "player.ready", ready }),
						onStart: view.affordances.canStart
							? () => table.sendIntent({ type: "host.start" })
							: undefined,
					}}
				/>
			</div>
		</section>
	);
}

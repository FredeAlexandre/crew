import { isRoomCode, normalizeRoomCode, type PlayerCount, type RoomTicket } from "@crew/protocol";
import { fixtures, type TableView } from "@crew/view-model/fixtures";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDisplayName } from "../hooks/use-display-name.ts";
import { useTable } from "../hooks/use-table.ts";
import { normalizeDisplayName } from "../lib/display-name.ts";
import { useI18n } from "../lib/i18n.tsx";
import { lobbyShareUrl } from "../lib/lobby-code.ts";
import { joinRoom, roomErrorCopy, tableErrorCopy } from "../lib/rooms.ts";
import { GeometryTable } from "../skins/geometry/Table.tsx";

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
			displayName: null,
			connected: index === 0,
			ready: false,
		})),
		undealt: { present: playerCount === 3 },
	};
}

function LobbyRoute() {
	const { t } = useI18n();
	const { code: rawCode } = Route.useParams();
	const code = normalizeRoomCode(rawCode);
	const [status, setStatus] = useState<"joining" | "ready" | "error">(
		isRoomCode(code) ? "joining" : "error",
	);
	const [error, setError] = useState(isRoomCode(code) ? null : t("invalidLobby"));
	const [copied, setCopied] = useState(false);
	const [ticket, setTicket] = useState<RoomTicket | null>(null);
	const displayName = useDisplayName();
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
					setError(roomErrorCopy(caught, t));
					setStatus("error");
				}
			});
		return () => {
			cancelled = true;
		};
	}, [code, t]);

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(lobbyShareUrl(code, window.location.origin));
			setCopied(true);
		} catch {
			setCopied(false);
		}
	}

	const waitingToSit = status !== "error" && table.view === null;
	const statusNote = waitingToSit
		? t("sittingDown")
		: view.scene === "lobby"
			? t("waitingCrew")
			: null;

	return (
		<section className="grid h-full min-h-0 min-w-0 max-w-full">
			<div
				className={
					waitingToSit
						? "grid h-full min-h-0 min-w-0 max-w-full opacity-55"
						: "grid h-full min-h-0 min-w-0 max-w-full"
				}
			>
				<GeometryTable
					view={view}
					sendIntent={table.sendIntent}
					lobby={{
						roomCode: code,
						copied,
						statusNote,
						alert: error ?? (table.error ? tableErrorCopy(table.error, t) : null),
						name: displayName.name,
						onNameChange:
							table.view === null
								? undefined
								: (value) => {
										displayName.onChange(value);
										const normalized = normalizeDisplayName(value);
										if (normalized.length > 0) {
											table.sendIntent({
												type: "player.rename",
												displayName: normalized,
											});
										}
									},
						onCopyCode: isRoomCode(code) ? () => void copyCode() : undefined,
						onReady: (ready) => table.sendIntent({ type: "player.ready", ready }),
						onFillBots: view.affordances.canFillBots
							? () => table.sendIntent({ type: "host.fillBots" })
							: undefined,
						onKick: view.affordances.canConfigure
							? (seatId) => table.sendIntent({ type: "host.kick", seatId })
							: undefined,
						onConfigure: view.affordances.canConfigure
							? (setup) => table.sendIntent({ type: "host.configure", ...setup })
							: undefined,
						onStart: view.affordances.canStart
							? () => table.sendIntent({ type: "host.start" })
							: undefined,
					}}
				/>
			</div>
		</section>
	);
}

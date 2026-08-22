import { isRoomCode, normalizeRoomCode, type PlayerCount, type RoomTicket } from "@crew/protocol";
import {
	type FixtureName,
	fixtures,
	isFixtureName,
	nextFixture,
	previousFixture,
	type TableView,
} from "@crew/view-model/fixtures";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "react-aria-components";
import { useTable } from "../hooks/use-table.ts";
import { joinRoom, roomErrorCopy } from "../lib/rooms.ts";
import { GeometryTable } from "../skins/geometry/Table.tsx";
import styles from "../styles/lobby.module.css";

export const Route = createFileRoute("/lobby/$code")({
	validateSearch: (search: Record<string, unknown>): { preview?: FixtureName } =>
		typeof search.preview === "string" && isFixtureName(search.preview)
			? { preview: search.preview }
			: {},
	component: LobbyRoute,
});

const FIXTURE_SITUATION: Record<FixtureName, string> = {
	"lobby.threeEmpty": "Three empty chairs. Nobody has sat down yet.",
	"briefing.mission1": "Mission 1. The crew is seated. Confirm to deal.",
	"deal.mid": "Cards are still landing. Four in your hand; the rest of the table is filling.",
	"taskDraft.captainChoosing":
		"You are the captain. Take or pass the open task: win one blue card.",
	"distress.offer": "Tasks are assigned. Activate the distress signal or skip it.",
	"play.midTrick.fourPlayers":
		"First trick: the captain led submarine 3. Play a card from your hand.",
	"play.sonarAvailable": "You are captain and on lead. Sonar is available before the first card.",
	"play.twoTasksLeft":
		"You are captain on lead. Two tasks remain: win two consecutive tricks, and win a 1.",
	"result.fail.taskImpossible": "The mission failed: a task became impossible.",
};

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
	const { preview } = Route.useSearch();
	const navigate = Route.useNavigate();
	const code = normalizeRoomCode(rawCode);
	const live = preview === undefined;
	const [status, setStatus] = useState<"joining" | "ready" | "error">(
		live && isRoomCode(code) ? "joining" : live ? "error" : "ready",
	);
	const [error, setError] = useState(
		live && !isRoomCode(code) ? "That code is not a lobby." : null,
	);
	const [copied, setCopied] = useState(false);
	const [ticket, setTicket] = useState<RoomTicket | null>(null);
	const table = useTable(live && ticket !== null ? ticket.code : null);
	const view =
		preview !== undefined
			? fixtures[preview]
			: (table.view ?? placeholderLobby(ticket?.playerCount ?? 3));

	useEffect(() => {
		if (!live || !isRoomCode(code)) {
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
	}, [code, live]);

	function show(name: FixtureName) {
		void navigate({ search: { preview: name } });
	}

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	}

	const waitingToSit = live && status !== "error" && table.view === null;
	const statusNote = !live
		? null
		: waitingToSit
			? "Sitting down…"
			: view.scene === "lobby"
				? "Waiting for the rest of the crew."
				: null;
	const alert = live ? (error ?? table.error) : null;

	return (
		<section className={styles.page}>
			<nav className={styles.bar}>
				<Link className={styles.home} to="/">
					Table
				</Link>
				{preview === undefined ? null : (
					<>
						<Button
							className={styles.step}
							type="button"
							onPress={() => show(previousFixture(preview))}
						>
							Previous
						</Button>
						<p className={styles.situation}>{FIXTURE_SITUATION[preview]}</p>
						<Button
							className={styles.step}
							type="button"
							onPress={() => show(nextFixture(preview))}
						>
							Next
						</Button>
					</>
				)}
			</nav>
			<div className={waitingToSit ? `${styles.stage} ${styles.pending}` : styles.stage}>
				<GeometryTable
					view={view}
					sendIntent={live ? table.sendIntent : undefined}
					lobby={{
						roomCode: code,
						copied,
						statusNote,
						alert,
						onCopyCode: isRoomCode(code) ? () => void copyCode() : undefined,
						onReady: live
							? (ready) => table.sendIntent({ type: "player.ready", ready })
							: undefined,
						onStart:
							preview !== undefined
								? () => show("briefing.mission1")
								: view.affordances.canStart
									? () => table.sendIntent({ type: "host.start" })
									: undefined,
					}}
					onConfirmBriefing={preview !== undefined ? () => show("deal.mid") : undefined}
					onTakeTask={preview !== undefined ? () => show("distress.offer") : undefined}
					onSkipDistress={
						preview !== undefined ? () => show("play.midTrick.fourPlayers") : undefined
					}
					onActivateDistress={
						preview !== undefined ? () => show("play.midTrick.fourPlayers") : undefined
					}
					onRetry={preview !== undefined ? () => show("briefing.mission1") : undefined}
				/>
			</div>
		</section>
	);
}

import { isRoomCode, normalizeRoomCode } from "@crew/protocol";
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

function previewLobby(): TableView {
	const base = fixtures["lobby.threeEmpty"];
	return {
		...base,
		seats: base.seats.map((seat) =>
			seat.region === "seat.self" ? { ...seat, displayName: "You", connected: true } : seat,
		),
	};
}

function LobbyRoute() {
	const { code: rawCode } = Route.useParams();
	const { preview } = Route.useSearch();
	const navigate = Route.useNavigate();
	const code = normalizeRoomCode(rawCode);
	const [status, setStatus] = useState<"joining" | "ready" | "error">(
		isRoomCode(code) ? "joining" : "error",
	);
	const [error, setError] = useState(isRoomCode(code) ? null : "That code is not a lobby.");
	const [copied, setCopied] = useState(false);
	const view = preview === undefined ? previewLobby() : fixtures[preview];

	useEffect(() => {
		if (!isRoomCode(code)) {
			return;
		}
		let cancelled = false;
		void joinRoom(code)
			.then(() => {
				if (!cancelled) {
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
			<div className={styles.stage}>
				<GeometryTable
					view={view}
					lobby={{
						roomCode: code,
						copied,
						statusNote:
							preview === undefined && status === "joining"
								? "Sitting down…"
								: preview === undefined && status === "ready"
									? "Waiting for the rest of the crew."
									: null,
						alert: preview === undefined ? error : null,
						onCopyCode: isRoomCode(code) ? () => void copyCode() : undefined,
						onStart: () => show("briefing.mission1"),
					}}
					onConfirmBriefing={() => show("deal.mid")}
					onTakeTask={() => show("distress.offer")}
					onSkipDistress={() => show("play.midTrick.fourPlayers")}
					onActivateDistress={() => show("play.midTrick.fourPlayers")}
					onRetry={() => show("briefing.mission1")}
				/>
			</div>
		</section>
	);
}

import { type EngineState, legalIntents } from "@crew/engine";
import type {
	CardId,
	Fact,
	IllegalReason,
	SeatId,
	SonarPosition,
	Suit,
	TaskInstanceId,
} from "@crew/protocol";
import {
	regionForSeat,
	relativeSeat,
	type SeatRegion,
	type TableView,
	type TaskView,
	type TrickCard,
	taskRegionAt,
} from "./table.ts";

/**
 * Per-seat projection. Server-only — `apps/web` must not import this file.
 */
export function project(state: EngineState, viewerSeat: SeatId): TableView {
	const playerCount = state.playerCount;
	const intents = legalIntents(state, viewerSeat);
	const { scene, overlay } = sceneAndOverlay(state);

	const takeable = new Set<TaskInstanceId>();
	const legalPlay = new Set<CardId>();
	const legalPass = new Set<CardId>();
	const sonarCandidates: { cardId: CardId; position: SonarPosition }[] = [];
	let canPlay = false;
	let canSonar = false;
	let canTakeTask = false;
	let canPassTask = false;
	let canSkipDistress = false;
	let canActivateDistress = false;
	let canPassDistressCard = false;

	for (const intent of intents) {
		switch (intent.type) {
			case "card.play":
				canPlay = true;
				legalPlay.add(intent.cardId);
				break;
			case "sonar.use":
				canSonar = true;
				sonarCandidates.push({ cardId: intent.cardId, position: intent.position });
				break;
			case "task.take":
				canTakeTask = true;
				takeable.add(intent.taskInstanceId);
				break;
			case "task.pass":
				canPassTask = true;
				break;
			case "distress.skip":
				canSkipDistress = true;
				break;
			case "distress.activate":
				canActivateDistress = true;
				break;
			case "distress.passCard":
				canPassDistressCard = true;
				legalPass.add(intent.cardId);
				break;
			default:
				break;
		}
	}

	const lastTrickWinner = state.lastTrick?.winnerSeat ?? null;
	const seats: TableView["seats"] = [];
	for (let relative = 0; relative < playerCount; relative += 1) {
		const seatId = ((viewerSeat + relative) % playerCount) as SeatId;
		const slot = state.sonar[seatId];
		const communication = slot?.communication ?? null;
		seats.push({
			region: regionForSeat(seatId, viewerSeat, playerCount),
			seatId,
			displayName: null,
			connected: true,
			ready: true,
			isCaptain: state.captainSeat === seatId,
			sonar: {
				state:
					communication !== null
						? "communicating"
						: slot?.available === true
							? "available"
							: "used",
				communication,
			},
			handCount: state.hands[seatId]?.length ?? 0,
			wonTrickCount: state.tricksWon[seatId]?.length ?? 0,
			isTurn: state.currentSeat === seatId,
			isLastTrickWinner: lastTrickWinner === seatId,
			tasks: state.tasks
				.filter((task) => task.ownerSeat === seatId)
				.map((task) => toTaskView(task, viewerSeat, playerCount, takeable)),
		});
	}

	const communicatedId = state.sonar[viewerSeat]?.communication?.cardId ?? null;
	const viewerHand = state.hands[viewerSeat] ?? [];
	const hand = viewerHand.map((cardId) => {
		const legal = legalPlay.has(cardId) || legalPass.has(cardId);
		return {
			cardId,
			legal,
			illegalReason: legal ? null : illegalReasonFor(state, viewerSeat, cardId),
			communicated: communicatedId === cardId,
		};
	});

	const trickCards: TrickCard[] = state.currentTrick.map((play, index) => ({
		region: regionForSeat(play.seatId, viewerSeat, playerCount),
		seatId: play.seatId,
		cardId: play.cardId,
		order: index + 1,
	}));
	const lead = trickCards[0];
	const trickId = state.trickId >= 1 ? state.trickId : null;

	const lastTrick =
		state.lastTrick === null
			? null
			: {
					trickId: state.lastTrick.trickId,
					winnerRegion: regionForSeat(state.lastTrick.winnerSeat, viewerSeat, playerCount),
					winnerSeatId: state.lastTrick.winnerSeat,
					ledSuit: state.lastTrick.ledSuit,
					cards: state.lastTrick.cards.map((play, index) => ({
						region: regionForSeat(play.seatId, viewerSeat, playerCount),
						seatId: play.seatId,
						cardId: play.cardId,
						order: index + 1,
					})),
				};

	const turnRegion: SeatRegion | null =
		state.currentSeat === null ? null : regionForSeat(state.currentSeat, viewerSeat, playerCount);

	return {
		attemptId: state.attemptId,
		seq: state.seq,
		viewerSeat,
		playerCount,
		scene,
		overlay,
		chrome: {
			missionId: state.mission?.id ?? null,
			difficulty: state.mission?.difficulty ?? null,
			trickId,
			turnRegion,
			distress: {
				active: state.distressActive,
				direction: state.distressDirection,
			},
			sonarAvailable: state.sonar[viewerSeat]?.available === true,
			flags: {
				sonarDisabled: state.mission?.flags?.sonarDisabled === true,
				discussionAllowed: state.mission?.flags?.discussionAllowed === true,
			},
		},
		seats,
		hand,
		trick: {
			trickId,
			ledSuit: state.ledSuit,
			leadRegion: lead?.region ?? null,
			cards: trickCards,
		},
		centerTasks: state.tasks
			.filter((task) => task.ownerSeat === null)
			.map((task) => toTaskView(task, viewerSeat, playerCount, takeable)),
		lastTrick,
		undealt: { present: playerCount === 3 },
		sonarCandidates,
		affordances: {
			canPlay,
			canSonar,
			canTakeTask,
			canPassTask,
			canSkipDistress,
			canActivateDistress,
			canPassDistressCard,
			canPeekLastTrick: lastTrick !== null,
		},
		result: state.result === null ? null : { outcome: state.result, reason: state.failReason },
	};
}

export function projectFacts(facts: readonly Fact[], viewerSeat: SeatId): Fact[] {
	return facts.map((fact) => redactFact(fact, viewerSeat));
}

function redactFact(fact: Fact, viewerSeat: SeatId): Fact {
	if (fact.type === "card.dealt" && fact.seatId !== viewerSeat) {
		return omitCardId(fact);
	}
	if (fact.type === "card.passed" && fact.fromSeat !== viewerSeat && fact.toSeat !== viewerSeat) {
		return omitCardId(fact);
	}
	return fact;
}

function omitCardId(fact: Fact & { cardId?: CardId }): Fact {
	const next = { ...fact };
	delete next.cardId;
	return next;
}

function sceneAndOverlay(state: EngineState): Pick<TableView, "scene" | "overlay"> {
	switch (state.phase) {
		case "taskDraft":
			return { scene: "taskDraft", overlay: "none" };
		case "distressOffer":
		case "distressPass":
			return { scene: "play", overlay: "distress" };
		case "play":
		case "trick":
			return { scene: "play", overlay: "none" };
		case "result":
			return { scene: "result", overlay: "none" };
	}
}

function toTaskView(
	task: EngineState["tasks"][number],
	viewerSeat: SeatId,
	playerCount: number,
	takeable: ReadonlySet<TaskInstanceId>,
): TaskView {
	const region =
		task.ownerSeat === null
			? "tasks.center"
			: taskRegionAt(relativeSeat(task.ownerSeat, viewerSeat, playerCount));
	return {
		instanceId: task.instanceId,
		spec: task.spec,
		status: task.status,
		progress: task.progress,
		region,
		ownerSeatId: task.ownerSeat,
		takeable: takeable.has(task.instanceId),
	};
}

function illegalReasonFor(
	state: EngineState,
	viewerSeat: SeatId,
	cardId: CardId,
): IllegalReason | null {
	if (state.phase === "distressPass") {
		if (state.currentSeat === viewerSeat && suitOf(cardId) === "submarine") {
			return "cannotPassSubmarine";
		}
		return null;
	}
	if (state.phase !== "play" && state.phase !== "trick") {
		return null;
	}
	if (state.currentSeat !== viewerSeat) {
		return "notYourTurn";
	}
	if (state.phase === "trick" && state.ledSuit !== null) {
		const ledSuit = state.ledSuit;
		if (suitOf(cardId) !== ledSuit) {
			const hand = state.hands[viewerSeat] ?? [];
			if (hand.some((id) => suitOf(id) === ledSuit)) {
				return "mustFollowSuit";
			}
		}
	}
	return null;
}

function suitOf(cardId: CardId): Suit {
	const dash = cardId.lastIndexOf("-");
	return cardId.slice(0, dash) as Suit;
}

import {
	type EngineState,
	legalIntents,
	sonarCandidates as listSonarCandidates,
} from "@crew/engine";
import {
	type CardId,
	DEFAULT_MISSION_DIFFICULTY,
	type Fact,
	type IllegalReason,
	type SeatId,
	type Suit,
	type TaskInstanceId,
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

type OccupancySeat = {
	playerId: string;
	displayName: string | null;
	image?: string | null;
	connected: boolean;
	ready: boolean;
} | null;

export type Occupancy = readonly OccupancySeat[];

export type LobbySetup = {
	difficulty: number;
	captainSeat: SeatId | null;
	distressDisabled: boolean;
	completedTricksVisible: boolean;
};

const DEFAULT_LOBBY_SETUP: LobbySetup = {
	difficulty: DEFAULT_MISSION_DIFFICULTY,
	captainSeat: null,
	distressDisabled: false,
	completedTricksVisible: false,
};

/**
 * Per-seat projection. Server-only — `apps/web` must not import this file.
 */
export function project(
	state: EngineState,
	viewerSeat: SeatId,
	occupancy?: Occupancy,
	hostSeatId?: SeatId | null,
	completedTricksVisible = false,
): TableView {
	const playerCount = state.playerCount;
	const intents = legalIntents(state, viewerSeat);
	const { scene, overlay } = sceneAndOverlay(state);

	const takeable = new Set<TaskInstanceId>();
	const legalPlay = new Set<CardId>();
	const legalPass = new Set<CardId>();
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

	const sonarCandidates = listSonarCandidates(state, viewerSeat);
	const lastTrickWinner = state.lastTrick?.winnerSeat ?? null;
	const seats: TableView["seats"] = [];
	for (let relative = 0; relative < playerCount; relative += 1) {
		const seatId = ((viewerSeat + relative) % playerCount) as SeatId;
		const slot = state.sonar[seatId];
		const communication = slot?.communication ?? null;
		seats.push({
			region: regionForSeat(seatId, viewerSeat, playerCount),
			seatId,
			...occupancyFields(occupancy, seatId),
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
			completedTricks: completedTricksVisible
				? (state.completedTricks[seatId] ?? []).map((trick) => ({
						trickId: trick.trickId,
						ledSuit: trick.ledSuit,
						cards: trick.cards.map((play, index) => ({
							region: regionForSeat(play.seatId, viewerSeat, playerCount),
							seatId: play.seatId,
							cardId: play.cardId,
							order: index + 1,
						})),
					}))
				: [],
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
		state.lastTrick === null || !completedTricksVisible
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
	const history =
		state.phase === "result"
			? state.trickHistory.map((trick) => ({
					trickId: trick.trickId,
					winnerRegion: regionForSeat(trick.winnerSeat, viewerSeat, playerCount),
					winnerSeatId: trick.winnerSeat,
					ledSuit: trick.ledSuit,
					cards: trick.cards.map((play, index) => ({
						region: regionForSeat(play.seatId, viewerSeat, playerCount),
						seatId: play.seatId,
						cardId: play.cardId,
						order: index + 1,
					})),
				}))
			: [];

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
				distressDisabled: state.mission?.flags?.distressDisabled === true,
				completedTricksVisible,
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
		history,
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
			canPeekLastTrick: completedTricksVisible && lastTrick !== null,
			canStart: false,
			canFillBots: false,
			canConfigure: false,
			canRetry: state.phase === "result" && hostSeatId === viewerSeat,
		},
		result: state.result === null ? null : { outcome: state.result, reason: state.failReason },
	};
}

export function projectFacts(facts: readonly Fact[], viewerSeat: SeatId): Fact[] {
	return facts.map((fact) => redactFact(fact, viewerSeat));
}

export function projectLobby(
	occupancy: Occupancy,
	viewerSeat: SeatId,
	seq: number,
	hostSeatId: SeatId | null,
	setup: LobbySetup = DEFAULT_LOBBY_SETUP,
): TableView {
	const playerCount = occupancy.length;
	const seats: TableView["seats"] = [];
	for (let relative = 0; relative < playerCount; relative += 1) {
		const seatId = ((viewerSeat + relative) % playerCount) as SeatId;
		seats.push({
			region: regionForSeat(seatId, viewerSeat, playerCount),
			seatId,
			...occupancyFields(occupancy, seatId),
			isCaptain: setup.captainSeat === seatId,
			sonar: { state: "available", communication: null },
			handCount: 0,
			wonTrickCount: 0,
			completedTricks: [],
			isTurn: false,
			isLastTrickWinner: false,
			tasks: [],
		});
	}
	return {
		attemptId: null,
		seq,
		viewerSeat,
		playerCount,
		scene: "lobby",
		overlay: "none",
		chrome: {
			missionId: null,
			difficulty: setup.difficulty,
			trickId: null,
			turnRegion: null,
			distress: { active: false, direction: null },
			sonarAvailable: false,
			flags: {
				sonarDisabled: false,
				discussionAllowed: false,
				distressDisabled: setup.distressDisabled,
				completedTricksVisible: setup.completedTricksVisible,
			},
		},
		seats,
		hand: [],
		trick: { trickId: null, ledSuit: null, leadRegion: null, cards: [] },
		centerTasks: [],
		lastTrick: null,
		history: [],
		undealt: { present: playerCount === 3 },
		sonarCandidates: [],
		affordances: {
			canPlay: false,
			canSonar: false,
			canTakeTask: false,
			canPassTask: false,
			canSkipDistress: false,
			canActivateDistress: false,
			canPassDistressCard: false,
			canPeekLastTrick: false,
			canStart: lobbyCanStart(occupancy, viewerSeat, hostSeatId),
			canFillBots: lobbyCanFillBots(occupancy, viewerSeat, hostSeatId),
			canConfigure: lobbyCanConfigure(occupancy, viewerSeat, hostSeatId),
			canRetry: false,
		},
		result: null,
	};
}

function lobbyCanStart(
	occupancy: Occupancy,
	viewerSeat: SeatId,
	hostSeatId: SeatId | null,
): boolean {
	if (hostSeatId === null || viewerSeat !== hostSeatId || occupancy.length === 0) {
		return false;
	}
	return occupancy.every((seat) => seat?.ready);
}

function lobbyCanFillBots(
	occupancy: Occupancy,
	viewerSeat: SeatId,
	hostSeatId: SeatId | null,
): boolean {
	if (hostSeatId === null || viewerSeat !== hostSeatId) {
		return false;
	}
	const host = occupancy[hostSeatId];
	if (host === null || host === undefined) {
		return false;
	}
	return occupancy.some((seat) => seat === null);
}

function lobbyCanConfigure(
	occupancy: Occupancy,
	viewerSeat: SeatId,
	hostSeatId: SeatId | null,
): boolean {
	if (hostSeatId === null || viewerSeat !== hostSeatId) {
		return false;
	}
	const host = occupancy[hostSeatId];
	return host !== null && host !== undefined;
}

function occupancyFields(
	occupancy: Occupancy | undefined,
	seatId: SeatId,
): Pick<
	TableView["seats"][number],
	"displayName" | "image" | "avatarSeed" | "connected" | "ready"
> {
	if (occupancy === undefined) {
		return { displayName: null, connected: true, ready: true };
	}
	const slot = occupancy[seatId];
	if (slot === undefined || slot === null) {
		return { displayName: null, connected: false, ready: false };
	}
	return {
		displayName: slot.displayName,
		...(slot.image ? { image: slot.image } : {}),
		avatarSeed: slot.playerId,
		connected: slot.connected,
		ready: slot.ready,
	};
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

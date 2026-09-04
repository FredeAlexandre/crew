import {
	type CardId,
	type DistressDirection,
	type Fact,
	type SeatId,
	type Suit,
	splitCardId,
	type TaskInstanceId,
	type TaskPublic,
} from "@crew/protocol";
import {
	regionForSeat,
	relativeSeat,
	type TableView,
	type TaskView,
	type TrickCard,
	taskRegionAt,
} from "./table.ts";

export type ReplayParticipant = {
	seatId: number;
	playerId: string;
	displayName: string;
	isBot: boolean;
};

export type ReplaySetup = {
	difficulty: number;
	captainSeat: SeatId | null;
	distressDisabled: boolean;
	completedTricksVisible: boolean;
	missionId?: string;
	sonarDisabled?: boolean;
};

export type ReplayCheckpoint = {
	kind: "round" | "task";
	atMs: number;
	trickId?: number;
	taskInstanceId?: string;
	colorIndex?: number;
};

export type ReplayFrame = {
	view: TableView;
	durationMs: number;
	startMs: number;
	factType: Fact["type"];
};

export type ReplayTimeline = {
	frames: ReplayFrame[];
	checkpoints: ReplayCheckpoint[];
	totalMs: number;
};

export const REPLAY_SPEEDS = [1, 1.5, 2] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

const DEAD_AFFORDANCES: TableView["affordances"] = {
	canPlay: false,
	canSonar: false,
	canTakeTask: false,
	canPassTask: false,
	canSkipDistress: false,
	canActivateDistress: false,
	canPassDistressCard: false,
	canPredict: false,
	canPeekLastTrick: false,
	canStart: false,
	canFillBots: false,
	canConfigure: false,
	canRetry: false,
};

const DURATION_MS: Partial<Record<Fact["type"], number>> = {
	"card.dealt": 0,
	"captain.revealed": 400,
	"tasks.drawn": 700,
	"task.offeredTurn": 280,
	"task.taken": 650,
	"task.passed": 400,
	"task.predicted": 500,
	"task.replaced": 400,
	"draft.completed": 300,
	"distress.offered": 700,
	"distress.skipped": 400,
	"distress.activated": 500,
	"card.passed": 600,
	"turn.started": 350,
	"card.played": 750,
	"trick.resolved": 1400,
	"task.progressed": 0,
	"task.completed": 500,
	"task.failed": 500,
	"sonar.used": 600,
	"sonar.cleared": 200,
	"mission.won": 800,
	"mission.failed": 800,
};

const DEAL_BURST_MS = 600;

type ReplayTask = {
	instanceId: TaskInstanceId;
	spec: TaskPublic;
	ownerSeat: SeatId | null;
	status: "open" | "completed" | "failed";
	progress: number;
	prediction: number | null;
};

type LastTrick = {
	trickId: number;
	winnerSeat: SeatId;
	ledSuit: Suit;
	cards: TrickPlay[];
};

type TrickPlay = { seatId: SeatId; cardId: CardId };

type SonarSlot = {
	available: boolean;
	communication: { cardId: CardId; position: "highest" | "only" | "lowest" } | null;
};

type ReplayState = {
	attemptId: string | null;
	seq: number;
	playerCount: number;
	viewerSeat: SeatId;
	missionId: string | null;
	difficulty: number;
	scene: TableView["scene"];
	overlay: TableView["overlay"];
	currentSeat: SeatId | null;
	trickId: number | null;
	ledSuit: Suit | null;
	currentTrick: TrickPlay[];
	resolvedVisible: boolean;
	lastTrick: LastTrick | null;
	trickHistory: LastTrick[];
	completedTricks: LastTrick[][];
	wonTrickCount: number[];
	hands: CardId[][];
	unknownCounts: number[];
	captainSeat: SeatId | null;
	sonar: SonarSlot[];
	tasks: ReplayTask[];
	distressActive: boolean;
	distressDirection: DistressDirection | null;
	result: "won" | "failed" | null;
	failReason: string | null;
	completedTricksVisible: boolean;
	sonarDisabled: boolean;
	distressDisabled: boolean;
	participants: ReplayParticipant[];
};

export function buildReplay(input: {
	facts: readonly Fact[];
	participants: readonly ReplayParticipant[];
	setup: ReplaySetup;
	viewerSeat: SeatId;
	attemptId?: string | null;
	playerCount: number;
}): ReplayTimeline {
	const playerCount = clampPlayerCount(input.playerCount);
	const viewerSeat = clampSeat(input.viewerSeat, playerCount);
	const state = emptyState({
		playerCount,
		viewerSeat,
		participants: input.participants,
		setup: input.setup,
		attemptId: input.attemptId ?? null,
	});
	const frames: ReplayFrame[] = [];
	const checkpoints: ReplayCheckpoint[] = [];
	let taskColor = 0;
	const facts = [...input.facts].sort((left, right) => left.seq - right.seq);

	for (let index = 0; index < facts.length; index += 1) {
		const fact = facts[index];
		if (fact === undefined) {
			continue;
		}
		applyFact(state, fact);
		const next = facts[index + 1];
		if (fact.type === "card.dealt" && next?.type === "card.dealt") {
			continue;
		}
		const durationMs = fact.type === "card.dealt" ? DEAL_BURST_MS : (DURATION_MS[fact.type] ?? 0);
		if (durationMs <= 0) {
			continue;
		}
		const previous = frames.at(-1);
		const startMs = previous === undefined ? 0 : previous.startMs + previous.durationMs;
		frames.push({ view: toView(state), durationMs, startMs, factType: fact.type });
		if (fact.type === "trick.resolved") {
			checkpoints.push({ kind: "round", atMs: startMs, trickId: fact.trickId });
		}
		if (fact.type === "task.completed") {
			checkpoints.push({
				kind: "task",
				atMs: startMs,
				taskInstanceId: fact.taskInstanceId,
				colorIndex: taskColor,
			});
			taskColor += 1;
		}
	}

	if (frames.length === 0) {
		frames.push({
			view: toView(state),
			durationMs: 1,
			startMs: 0,
			factType: "host.started",
		});
	}

	const last = frames.at(-1);
	const totalMs = last === undefined ? 0 : last.startMs + last.durationMs;
	return { frames, checkpoints, totalMs };
}

export function frameIndexAt(
	frames: readonly Pick<ReplayFrame, "startMs">[],
	timeMs: number,
): number {
	if (frames.length === 0) {
		return 0;
	}
	let index = 0;
	for (let i = 0; i < frames.length; i += 1) {
		const frame = frames[i];
		if (frame !== undefined && frame.startMs <= timeMs) {
			index = i;
		} else {
			break;
		}
	}
	return index;
}

function emptyState(input: {
	playerCount: number;
	viewerSeat: SeatId;
	participants: readonly ReplayParticipant[];
	setup: ReplaySetup;
	attemptId: string | null;
}): ReplayState {
	const seats = Array.from({ length: input.playerCount }, (_, seatId) => seatId);
	return {
		attemptId: input.attemptId,
		seq: 0,
		playerCount: input.playerCount,
		viewerSeat: input.viewerSeat,
		missionId: input.setup.missionId ?? null,
		difficulty: input.setup.difficulty,
		scene: "deal",
		overlay: "none",
		currentSeat: null,
		trickId: null,
		ledSuit: null,
		currentTrick: [],
		resolvedVisible: false,
		lastTrick: null,
		trickHistory: [],
		completedTricks: seats.map(() => []),
		wonTrickCount: seats.map(() => 0),
		hands: seats.map(() => []),
		unknownCounts: seats.map(() => 0),
		captainSeat: input.setup.captainSeat,
		sonar: seats.map(() => ({
			available: input.setup.sonarDisabled !== true,
			communication: null,
		})),
		tasks: [],
		distressActive: false,
		distressDirection: null,
		result: null,
		failReason: null,
		completedTricksVisible: input.setup.completedTricksVisible,
		sonarDisabled: input.setup.sonarDisabled === true,
		distressDisabled: input.setup.distressDisabled,
		participants: [...input.participants],
	};
}

function applyFact(state: ReplayState, fact: Fact): void {
	state.seq = fact.seq;
	if (fact.attemptId !== null && fact.attemptId !== undefined) {
		state.attemptId = fact.attemptId;
	}
	switch (fact.type) {
		case "host.started":
			state.missionId = fact.missionId;
			state.scene = "deal";
			return;
		case "card.dealt": {
			state.scene = "deal";
			ensureSeat(state, fact.seatId);
			if (fact.cardId !== undefined) {
				state.hands[fact.seatId]?.push(fact.cardId);
			} else {
				state.unknownCounts[fact.seatId] = (state.unknownCounts[fact.seatId] ?? 0) + 1;
			}
			return;
		}
		case "captain.revealed":
			state.captainSeat = fact.seatId;
			return;
		case "tasks.drawn":
			state.scene = "taskDraft";
			state.tasks = fact.tasks.map((entry) => ({
				instanceId: entry.taskInstanceId,
				spec: entry.task,
				ownerSeat: null,
				status: "open",
				progress: 0,
				prediction: null,
			}));
			return;
		case "task.offeredTurn":
			state.scene = "taskDraft";
			state.currentSeat = fact.seatId;
			state.overlay = predictingOverlay(state);
			return;
		case "task.taken": {
			const task = taskById(state, fact.taskInstanceId);
			if (task !== undefined) {
				task.ownerSeat = fact.seatId;
			}
			state.currentSeat = fact.seatId;
			state.overlay = predictingOverlay(state);
			return;
		}
		case "task.passed":
			state.currentSeat = fact.seatId;
			return;
		case "task.predicted": {
			const task = taskById(state, fact.taskInstanceId);
			if (task !== undefined) {
				task.prediction = fact.count;
			}
			state.overlay = "none";
			return;
		}
		case "task.replaced": {
			const index = state.tasks.findIndex((task) => task.instanceId === fact.oldTaskInstanceId);
			if (index >= 0) {
				state.tasks[index] = {
					instanceId: fact.newTaskInstanceId,
					spec: fact.task,
					ownerSeat: null,
					status: "open",
					progress: 0,
					prediction: null,
				};
			}
			return;
		}
		case "draft.completed":
			state.currentSeat = null;
			state.overlay = "none";
			return;
		case "distress.offered":
			state.scene = "play";
			state.overlay = "distress";
			return;
		case "distress.skipped":
			state.overlay = "none";
			state.distressActive = false;
			return;
		case "distress.activated":
			state.scene = "play";
			state.overlay = "distress";
			state.distressActive = true;
			state.distressDirection = fact.direction;
			return;
		case "card.passed": {
			moveCard(state, fact.fromSeat, fact.toSeat, fact.cardId);
			return;
		}
		case "turn.started":
			if (state.resolvedVisible) {
				state.currentTrick = [];
				state.resolvedVisible = false;
			}
			state.scene = "play";
			state.overlay = "none";
			state.currentSeat = fact.seatId;
			state.trickId = fact.trickId;
			state.ledSuit = fact.ledSuit ?? null;
			return;
		case "card.played": {
			if (state.resolvedVisible) {
				state.currentTrick = [];
				state.resolvedVisible = false;
			}
			state.scene = "play";
			state.overlay = "none";
			removeCard(state, fact.seatId, fact.cardId);
			if (state.currentTrick.length === 0) {
				state.ledSuit = splitCardId(fact.cardId).suit;
			}
			state.currentTrick.push({ seatId: fact.seatId, cardId: fact.cardId });
			state.currentSeat = fact.seatId;
			return;
		}
		case "trick.resolved": {
			const cards =
				state.currentTrick.length > 0
					? state.currentTrick
					: fact.cardIds.map((cardId) => ({ seatId: 0 as SeatId, cardId }));
			const resolved: LastTrick = {
				trickId: fact.trickId,
				winnerSeat: fact.winnerSeat,
				ledSuit: fact.ledSuit,
				cards,
			};
			state.lastTrick = resolved;
			state.trickHistory.push(resolved);
			state.completedTricks[fact.winnerSeat]?.push(resolved);
			state.wonTrickCount[fact.winnerSeat] = (state.wonTrickCount[fact.winnerSeat] ?? 0) + 1;
			state.trickId = fact.trickId;
			state.ledSuit = fact.ledSuit;
			state.currentSeat = fact.winnerSeat;
			state.resolvedVisible = true;
			if (state.currentTrick.length === 0) {
				state.currentTrick = cards;
			}
			return;
		}
		case "task.progressed": {
			const task = taskById(state, fact.taskInstanceId);
			if (task !== undefined) {
				task.progress = fact.progress;
			}
			return;
		}
		case "task.completed": {
			const task = taskById(state, fact.taskInstanceId);
			if (task !== undefined) {
				task.status = "completed";
			}
			return;
		}
		case "task.failed": {
			const task = taskById(state, fact.taskInstanceId);
			if (task !== undefined) {
				task.status = "failed";
			}
			return;
		}
		case "sonar.used": {
			const slot = state.sonar[fact.seatId];
			if (slot !== undefined) {
				slot.available = false;
				slot.communication = { cardId: fact.cardId, position: fact.position };
			}
			return;
		}
		case "sonar.cleared": {
			const slot = state.sonar[fact.seatId];
			if (slot !== undefined) {
				slot.communication = null;
			}
			return;
		}
		case "mission.won":
			state.scene = "result";
			state.overlay = "none";
			state.result = "won";
			state.failReason = null;
			state.currentSeat = null;
			state.missionId = fact.missionId;
			return;
		case "mission.failed":
			state.scene = "result";
			state.overlay = "none";
			state.result = "failed";
			state.failReason = fact.reason;
			state.currentSeat = null;
			state.missionId = fact.missionId;
			return;
		default:
			return;
	}
}

function toView(state: ReplayState): TableView {
	const viewerSeat = state.viewerSeat;
	const playerCount = state.playerCount;
	const seats: TableView["seats"] = [];
	for (let relative = 0; relative < playerCount; relative += 1) {
		const seatId = ((viewerSeat + relative) % playerCount) as SeatId;
		const slot = state.sonar[seatId];
		const communication = slot?.communication ?? null;
		const occupant = state.participants.find((participant) => participant.seatId === seatId);
		seats.push({
			region: regionForSeat(seatId, viewerSeat, playerCount),
			seatId,
			displayName: occupant?.displayName ?? null,
			avatarSeed: occupant?.playerId,
			connected: true,
			leaving: false,
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
			handCount: handCount(state, seatId),
			wonTrickCount: state.wonTrickCount[seatId] ?? 0,
			completedTricks: state.completedTricksVisible
				? (state.completedTricks[seatId] ?? []).map((trick) => ({
						trickId: trick.trickId,
						ledSuit: trick.ledSuit,
						cards: toTrickCards(trick.cards, viewerSeat, playerCount),
					}))
				: [],
			isTurn: state.currentSeat === seatId,
			isLastTrickWinner: state.lastTrick?.winnerSeat === seatId,
			tasks: state.tasks
				.filter((task) => task.ownerSeat === seatId)
				.map((task) => toTaskView(task, viewerSeat, playerCount)),
		});
	}
	const viewerHand = state.hands[viewerSeat] ?? [];
	const communicatedId = state.sonar[viewerSeat]?.communication?.cardId ?? null;
	const trickCards = toTrickCards(state.currentTrick, viewerSeat, playerCount);
	const lead = trickCards[0];
	const lastTrick =
		state.lastTrick === null
			? null
			: {
					trickId: state.lastTrick.trickId,
					winnerRegion: regionForSeat(state.lastTrick.winnerSeat, viewerSeat, playerCount),
					winnerSeatId: state.lastTrick.winnerSeat,
					ledSuit: state.lastTrick.ledSuit,
					cards: toTrickCards(state.lastTrick.cards, viewerSeat, playerCount),
				};
	const history =
		state.scene === "result"
			? state.trickHistory.map((trick) => ({
					trickId: trick.trickId,
					winnerRegion: regionForSeat(trick.winnerSeat, viewerSeat, playerCount),
					winnerSeatId: trick.winnerSeat,
					ledSuit: trick.ledSuit,
					cards: toTrickCards(trick.cards, viewerSeat, playerCount),
				}))
			: [];
	const turnRegion =
		state.currentSeat === null ? null : regionForSeat(state.currentSeat, viewerSeat, playerCount);
	const handLengths = Array.from({ length: playerCount }, (_, seat) =>
		handCount(state, seat as SeatId),
	);
	return {
		attemptId: state.attemptId,
		seq: state.seq,
		viewerSeat,
		playerCount,
		scene: state.scene,
		overlay: state.overlay,
		chrome: {
			missionId: state.missionId,
			difficulty: state.difficulty,
			trickId: state.trickId,
			turnRegion,
			distress: {
				active: state.distressActive,
				direction: state.distressDirection,
			},
			sonarAvailable: state.sonar[viewerSeat]?.available === true,
			maxTricks: handLengths.length === 0 ? 0 : Math.min(...handLengths),
			flags: {
				sonarDisabled: state.sonarDisabled,
				discussionAllowed: false,
				distressDisabled: state.distressDisabled,
				completedTricksVisible: state.completedTricksVisible,
			},
		},
		seats,
		hand: viewerHand.map((cardId) => ({
			cardId,
			legal: false,
			illegalReason: null,
			communicated: communicatedId === cardId,
		})),
		trick: {
			trickId: state.trickId,
			ledSuit: state.ledSuit,
			leadRegion: lead?.region ?? null,
			cards: trickCards,
		},
		centerTasks: state.tasks
			.filter((task) => task.ownerSeat === null)
			.map((task) => toTaskView(task, viewerSeat, playerCount)),
		lastTrick,
		history,
		undealt: { present: playerCount === 3 && state.scene !== "result" },
		sonarCandidates: [],
		affordances: {
			...DEAD_AFFORDANCES,
			canPeekLastTrick: state.completedTricksVisible && lastTrick !== null,
		},
		result: state.result === null ? null : { outcome: state.result, reason: state.failReason },
	};
}

function toTaskView(task: ReplayTask, viewerSeat: SeatId, playerCount: number): TaskView {
	const region =
		task.ownerSeat === null
			? "tasks.center"
			: taskRegionAt(relativeSeat(task.ownerSeat, viewerSeat, playerCount));
	const hidePrediction =
		task.spec.kind === "predictTricks" &&
		task.spec.reveal === "hidden" &&
		task.ownerSeat !== viewerSeat;
	return {
		instanceId: task.instanceId,
		spec: task.spec,
		status: task.status,
		progress: task.progress,
		region,
		ownerSeatId: task.ownerSeat,
		takeable: false,
		prediction: hidePrediction ? null : task.prediction,
		needsPrediction:
			task.spec.kind === "predictTricks" &&
			task.prediction === null &&
			task.ownerSeat === viewerSeat,
	};
}

function toTrickCards(
	plays: readonly TrickPlay[],
	viewerSeat: SeatId,
	playerCount: number,
): TrickCard[] {
	return plays.map((play, index) => ({
		region: regionForSeat(play.seatId, viewerSeat, playerCount),
		seatId: play.seatId,
		cardId: play.cardId,
		order: index + 1,
	}));
}

function predictingOverlay(state: ReplayState): TableView["overlay"] {
	const pending = state.tasks.some(
		(task) =>
			task.ownerSeat === state.viewerSeat &&
			task.spec.kind === "predictTricks" &&
			task.prediction === null,
	);
	return pending ? "predict" : "none";
}

function taskById(state: ReplayState, instanceId: string): ReplayTask | undefined {
	return state.tasks.find((task) => task.instanceId === instanceId);
}

function ensureSeat(state: ReplayState, seatId: number): void {
	if (state.hands[seatId] === undefined) {
		state.hands[seatId] = [];
	}
	if (state.unknownCounts[seatId] === undefined) {
		state.unknownCounts[seatId] = 0;
	}
}

function handCount(state: ReplayState, seatId: SeatId): number {
	return (state.hands[seatId]?.length ?? 0) + (state.unknownCounts[seatId] ?? 0);
}

function removeCard(state: ReplayState, seatId: SeatId, cardId: CardId | undefined): void {
	ensureSeat(state, seatId);
	if (cardId !== undefined) {
		const hand = state.hands[seatId];
		if (hand !== undefined) {
			const index = hand.indexOf(cardId);
			if (index >= 0) {
				hand.splice(index, 1);
				return;
			}
		}
	}
	const unknown = state.unknownCounts[seatId] ?? 0;
	if (unknown > 0) {
		state.unknownCounts[seatId] = unknown - 1;
	}
}

function moveCard(
	state: ReplayState,
	fromSeat: SeatId,
	toSeat: SeatId,
	cardId: CardId | undefined,
): void {
	removeCard(state, fromSeat, cardId);
	ensureSeat(state, toSeat);
	if (cardId !== undefined) {
		state.hands[toSeat]?.push(cardId);
	} else {
		state.unknownCounts[toSeat] = (state.unknownCounts[toSeat] ?? 0) + 1;
	}
}

function clampPlayerCount(value: number): number {
	if (value < 3) {
		return 3;
	}
	if (value > 5) {
		return 5;
	}
	return value;
}

function clampSeat(seat: number, playerCount: number): SeatId {
	if (seat < 0 || seat >= playerCount) {
		return 0;
	}
	return seat as SeatId;
}

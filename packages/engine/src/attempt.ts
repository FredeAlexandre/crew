import type { AttemptId, Fact, SeatId } from "@crew/protocol";
import { dealHands, giveCardToSeat, seatWithCard } from "./deal.ts";
import { DECK, seats } from "./deck.ts";
import { replaceImpossibleTasks } from "./draft.ts";
import { emit } from "./emit.ts";
import { createRng, shuffle } from "./rng.ts";
import type { ApplyOk, EngineState, MissionDef, PlayerCount } from "./state.ts";
import { TASK_BY_ID } from "./tasks/catalog.ts";
import { drawTasks } from "./tasks/draw.ts";

export type CreateAttemptConfig = {
	attemptId: AttemptId;
	mission: MissionDef;
	playerCount: PlayerCount;
	seed: number;
	captainSeat?: SeatId | null;
};

export function createAttempt(config: CreateAttemptConfig): ApplyOk {
	const facts: Fact[] = [];
	const rng = createRng(config.seed);
	const state: EngineState = {
		version: 1,
		phase: "taskDraft",
		attemptId: config.attemptId,
		seq: 0,
		rng: rng.state,
		playerCount: config.playerCount,
		mission: config.mission,
		hands: [],
		captainSeat: null,
		trickId: 0,
		currentSeat: null,
		ledSuit: null,
		currentTrick: [],
		lastTrick: null,
		trickHistory: [],
		completedTricks: [],
		tricksWon: [],
		captured: [],
		consecutiveWins: [],
		sonar: [],
		distressActive: false,
		distressDirection: null,
		distressPassed: [],
		tasks: [],
		centerTaskIds: [],
		passAllowed: false,
		draftActs: 0,
		nextInstance: 0,
		taskDrawPile: [],
		result: null,
		failReason: null,
	};

	const shuffled = shuffle(DECK, rng);
	state.hands = dealHands(shuffled, config.playerCount);
	if (config.captainSeat !== undefined && config.captainSeat !== null) {
		giveCardToSeat(state.hands, "submarine-4", config.captainSeat);
	}
	state.captainSeat = seatWithCard(state.hands, "submarine-4");
	state.tricksWon = seats(config.playerCount).map(() => []);
	state.completedTricks = seats(config.playerCount).map(() => []);
	state.captured = seats(config.playerCount).map(() => []);
	state.consecutiveWins = seats(config.playerCount).map(() => 0);
	state.sonar = seats(config.playerCount).map(() => ({
		available: config.mission.flags?.sonarDisabled !== true,
		communication: null,
	}));
	state.distressPassed = seats(config.playerCount).map(() => null);

	for (const seat of seats(config.playerCount)) {
		const hand = state.hands[seat] ?? [];
		for (let index = 0; index < hand.length; index += 1) {
			const cardId = hand[index];
			if (cardId === undefined) {
				continue;
			}
			emit(state, facts, {
				type: "card.dealt",
				seatId: seat,
				cardId,
				index,
				handCount: index + 1,
			});
		}
	}

	if (state.captainSeat !== null) {
		emit(state, facts, { type: "captain.revealed", seatId: state.captainSeat });
	}

	const drawn = drawTasks(rng, config.playerCount, config.mission.difficulty);
	state.taskDrawPile = drawn.remaining;
	state.nextInstance = 0;
	for (const spec of drawn.drawn) {
		const instanceId = `${config.attemptId}:${state.nextInstance}`;
		state.nextInstance += 1;
		state.tasks.push({
			instanceId,
			ownerSeat: null,
			status: "open",
			progress: 0,
			spec: TASK_BY_ID[spec.id] ?? spec,
		});
		state.centerTaskIds.push(instanceId);
	}

	replaceImpossibleTasks(state, facts);
	emit(state, facts, {
		type: "tasks.drawn",
		tasks: state.tasks.map((task) => ({
			taskInstanceId: task.instanceId,
			task: task.spec,
		})),
	});

	state.passAllowed = state.centerTaskIds.length < config.playerCount;
	state.draftActs = 0;
	state.currentSeat = state.captainSeat;
	if (state.currentSeat !== null) {
		emit(state, facts, { type: "task.offeredTurn", seatId: state.currentSeat });
	}

	state.rng = rng.state;
	return { ok: true, state, facts };
}

import { apply, createAttempt, type EngineState, legalIntents, type MissionDef } from "./index.ts";
import type { ApplyResult } from "./state.ts";

const mission = (difficulty = 1): MissionDef => ({
	id: "m1",
	difficulty,
});

export function must(result: ApplyResult): EngineState {
	if (!result.ok) {
		throw new Error(result.error);
	}
	return result.state;
}

export function startAttempt(playerCount: 3 | 4 | 5 = 4, seed = 1, difficulty = 1): EngineState {
	return createAttempt({
		attemptId: "a1",
		mission: mission(difficulty),
		playerCount,
		seed,
	}).state;
}

export function takeAllTasks(state: EngineState): EngineState {
	let current = state;
	while (current.phase === "taskDraft") {
		const seat = current.currentSeat;
		if (seat === null) {
			throw new Error("draft with no current seat");
		}
		const intents = legalIntents(current, seat);
		const take = intents.find((intent) => intent.type === "task.take") ?? intents[0];
		if (take === undefined) {
			throw new Error("no draft intent");
		}
		current = must(apply(current, take));
	}
	return current;
}

export function skipDistressToPlay(state: EngineState): EngineState {
	const afterDraft = takeAllTasks(state);
	return must(
		apply(afterDraft, {
			type: "distress.skip",
			attemptId: afterDraft.attemptId,
			seatId: 0,
		}),
	);
}

function playFirstLegal(state: EngineState): EngineState {
	const seat = state.currentSeat;
	if (seat === null) {
		throw new Error("no current seat");
	}
	const play = legalIntents(state, seat).find((intent) => intent.type === "card.play");
	if (play === undefined) {
		throw new Error("no legal play");
	}
	return must(apply(state, play));
}

export function playOut(state: EngineState, maxSteps = 400): EngineState {
	let current = state;
	for (let step = 0; step < maxSteps && current.phase !== "result"; step += 1) {
		current = playFirstLegal(current);
	}
	return current;
}

export function autoplay(state: EngineState, maxSteps = 400): EngineState {
	let current = takeAllTasks(state);
	if (current.phase === "distressOffer") {
		current = must(
			apply(current, { type: "distress.skip", attemptId: current.attemptId, seatId: 0 }),
		);
	}
	return playOut(current, maxSteps);
}

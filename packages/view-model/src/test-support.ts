import {
	type ApplyResult,
	apply,
	createAttempt,
	type EngineState,
	legalIntents,
} from "@crew/engine";
import type { SeatId } from "@crew/protocol";

export function must(result: ApplyResult): EngineState {
	if (!result.ok) {
		throw new Error(result.error);
	}
	return result.state;
}

export function startAttempt(playerCount: 3 | 4 | 5 = 4, seed = 1, difficulty = 1): EngineState {
	return createAttempt({
		attemptId: "a1",
		mission: { id: "m1", difficulty },
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

export function playFirstLegal(state: EngineState): EngineState {
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

export function playCards(state: EngineState, count: number): EngineState {
	let current = state;
	for (let i = 0; i < count; i += 1) {
		current = playFirstLegal(current);
	}
	return current;
}

export function failWithImpossibleTask(state: EngineState): EngineState {
	const playing = skipDistressToPlay(state);
	const doomed: EngineState = {
		...playing,
		tasks: [
			{
				instanceId: "fail",
				ownerSeat: 0,
				status: "open",
				progress: 0,
				spec: {
					id: "x",
					kind: "consecutiveTricks",
					count: 20,
					difficulty: { 3: 1, 4: 1, 5: 1 },
					captainMaySelect: true,
				},
			},
		],
	};
	return playCards(doomed, doomed.playerCount);
}

export function viewerCaptain(state: EngineState): SeatId {
	if (state.captainSeat === null) {
		throw new Error("no captain");
	}
	return state.captainSeat;
}

import {
	type ApplyResult,
	apply,
	createAttempt,
	type EngineState,
	type Intent,
	legalIntents,
	type PlayerCount,
} from "../src/index.ts";

export function seedFromArgv(fallback = 1): number {
	const raw = process.argv[2];
	if (raw === undefined) {
		return fallback;
	}
	const value = Number(raw);
	if (!Number.isInteger(value)) {
		throw new Error(`seed must be an integer, got ${JSON.stringify(raw)}`);
	}
	return value;
}

export function must(result: ApplyResult): EngineState {
	if (!result.ok) {
		throw new Error(result.error);
	}
	return result.state;
}

export function applyOk(state: EngineState, intent: Intent): Extract<ApplyResult, { ok: true }> {
	const result = apply(state, intent);
	if (!result.ok) {
		throw new Error(result.error);
	}
	return result;
}

export function startAttempt(seed: number, playerCount: PlayerCount = 4, difficulty = 1) {
	return createAttempt({
		attemptId: "a1",
		mission: { id: "m1", difficulty },
		playerCount,
		seed,
	});
}

/** Captain, then clockwise, takes the first legal task until the center is empty. */
export function completeDraft(state: EngineState): EngineState {
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

function skipDistress(state: EngineState): EngineState {
	return must(
		apply(state, {
			type: "distress.skip",
			attemptId: state.attemptId,
			seatId: 0,
		}),
	);
}

/** Draft every task, skip distress, reach the first lead. */
export function toPlay(state: EngineState): EngineState {
	return skipDistress(completeDraft(state));
}

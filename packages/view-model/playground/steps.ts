import {
	type ApplyResult,
	apply,
	createAttempt,
	type EngineState,
	type Intent,
	legalIntents,
	type PlayerCount,
} from "@crew/engine";

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

function must(result: ApplyResult): EngineState {
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

export function toPlay(state: EngineState): EngineState {
	return must(
		apply(completeDraft(state), {
			type: "distress.skip",
			attemptId: state.attemptId,
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

export function playCards(state: EngineState, count: number): EngineState {
	let current = state;
	for (let step = 0; step < count; step += 1) {
		current = playFirstLegal(current);
	}
	return current;
}

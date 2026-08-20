import { apply, type EngineState, legalIntents } from "../../src/index.ts";
import { must } from "../steps.ts";

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

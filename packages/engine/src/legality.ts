import type { Intent, SeatId } from "@crew/protocol";
import { legalDistressPassCards } from "./distress.ts";
import { canPass, legalDraftInstanceIds, maxPredictCount, pendingPredictionTask } from "./draft.ts";
import { legalSonarUses } from "./sonar.ts";
import type { EngineState } from "./state.ts";
import { legalCards } from "./trick.ts";

function meta(state: EngineState, seat: SeatId) {
	return { attemptId: state.attemptId, seatId: seat };
}

export function legalIntents(state: EngineState, seat: SeatId): Intent[] {
	if (seat < 0 || seat >= state.playerCount) {
		return [];
	}
	if (state.phase === "result") {
		return [];
	}
	const base = meta(state, seat);
	const intents: Intent[] = [];

	if (state.phase === "taskDraft" && state.currentSeat === seat) {
		const pending = pendingPredictionTask(state, seat);
		if (pending !== undefined) {
			const max = maxPredictCount(state);
			for (let count = 0; count <= max; count += 1) {
				intents.push({ type: "task.predict", ...base, count });
			}
			return intents;
		}
		for (const taskInstanceId of legalDraftInstanceIds(state, seat)) {
			intents.push({ type: "task.take", ...base, taskInstanceId });
		}
		if (canPass(state, seat)) {
			intents.push({ type: "task.pass", ...base });
		}
		return intents;
	}

	if (state.phase === "distressOffer") {
		intents.push({ type: "distress.skip", ...base });
		intents.push({ type: "distress.activate", ...base, direction: "left" });
		intents.push({ type: "distress.activate", ...base, direction: "right" });
		return intents;
	}

	if (state.phase === "distressPass" && state.currentSeat === seat) {
		for (const cardId of legalDistressPassCards(state, seat)) {
			intents.push({ type: "distress.passCard", ...base, cardId });
		}
		return intents;
	}

	if (state.phase === "play" && state.currentSeat === seat) {
		for (const cardId of legalCards(state.hands[seat] ?? [], null)) {
			intents.push({ type: "card.play", ...base, cardId });
		}
	}
	if (state.phase === "play") {
		for (const use of legalSonarUses(state, seat)) {
			intents.push({ type: "sonar.use", ...base, cardId: use.cardId, position: use.position });
		}
		return intents;
	}

	if (state.phase === "trick" && state.currentSeat === seat) {
		for (const cardId of legalCards(state.hands[seat] ?? [], state.ledSuit)) {
			intents.push({ type: "card.play", ...base, cardId });
		}
	}

	return intents;
}

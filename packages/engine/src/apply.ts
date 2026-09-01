import type { Fact, Intent } from "@crew/protocol";
import { activateDistress, passDistressCard, skipDistress } from "./distress.ts";
import { passTask, predictTask, takeTask } from "./draft.ts";
import { playCard } from "./play.ts";
import { useSonar } from "./sonar.ts";
import { type ApplyResult, cloneState, type EngineState, isPlayIntent } from "./state.ts";

export function apply(state: EngineState, intent: Intent): ApplyResult {
	if (!isPlayIntent(intent)) {
		return { ok: false, error: "unknownIntent" };
	}
	if (state.phase === "result") {
		return { ok: false, error: "missionOver" };
	}
	if (intent.attemptId !== state.attemptId) {
		return { ok: false, error: "wrongAttempt" };
	}
	if (intent.seatId < 0 || intent.seatId >= state.playerCount) {
		return { ok: false, error: "illegalSeat" };
	}

	const next = cloneState(state);
	const facts: Fact[] = [];
	let error = null;

	switch (intent.type) {
		case "task.take":
			error = takeTask(next, intent.seatId, intent.taskInstanceId, facts);
			break;
		case "task.pass":
			error = passTask(next, intent.seatId, facts);
			break;
		case "task.predict":
			error = predictTask(next, intent.seatId, intent.count, facts);
			break;
		case "distress.skip":
			error = skipDistress(next, facts);
			break;
		case "distress.activate":
			error = activateDistress(next, intent.direction, facts);
			break;
		case "distress.passCard":
			error = passDistressCard(next, intent.seatId, intent.cardId, facts);
			break;
		case "card.play":
			error = playCard(next, intent.seatId, intent.cardId, facts);
			break;
		case "sonar.use":
			error = useSonar(next, intent.seatId, intent.cardId, intent.position, facts);
			break;
	}

	if (error !== null) {
		return { ok: false, error };
	}
	next.rng = state.rng;
	return { ok: true, state: next, facts };
}

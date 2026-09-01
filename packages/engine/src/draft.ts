import type { Fact, IllegalReason, SeatId, TaskInstanceId } from "@crew/protocol";
import { remainingTricks } from "./deal.ts";
import { nextSeat } from "./deck.ts";
import { emit } from "./emit.ts";
import { startPlay } from "./play.ts";
import type { EngineState } from "./state.ts";
import { taskCost } from "./tasks/catalog.ts";
import { pickReplacement, structurallyImpossible } from "./tasks/draw.ts";

function taskByInstance(state: EngineState, instanceId: TaskInstanceId) {
	return state.tasks.find((task) => task.instanceId === instanceId);
}

export function replaceImpossibleTasks(state: EngineState, facts: Fact[]): void {
	if (state.playerCount !== 3 && state.playerCount !== 4 && state.playerCount !== 5) {
		return;
	}
	const playerCount = state.playerCount;
	let guard = 0;
	while (structurallyImpossible(state.tasks.map((task) => task.spec)) && guard < 32) {
		guard += 1;
		const conflict = state.tasks.find((_task, index) =>
			structurallyImpossible(state.tasks.filter((_, i) => i <= index).map((entry) => entry.spec)),
		);
		if (conflict === undefined) {
			return;
		}
		const replacement = pickReplacement(
			state.taskDrawPile,
			playerCount,
			taskCost(conflict.spec, playerCount),
			state.tasks
				.filter((task) => task.instanceId !== conflict.instanceId)
				.map((task) => task.spec),
		);
		if (replacement === null) {
			return;
		}
		const newId = `${state.attemptId}:${state.nextInstance}`;
		state.nextInstance += 1;
		const oldId = conflict.instanceId;
		conflict.instanceId = newId;
		conflict.spec = replacement;
		conflict.prediction = null;
		const centerIndex = state.centerTaskIds.indexOf(oldId);
		if (centerIndex >= 0) {
			state.centerTaskIds[centerIndex] = newId;
		}
		emit(state, facts, {
			type: "task.replaced",
			oldTaskInstanceId: oldId,
			newTaskInstanceId: newId,
			task: replacement,
		});
	}
}

function beginDistress(state: EngineState, facts: Fact[]): void {
	state.currentSeat = null;
	emit(state, facts, { type: "draft.completed" });
	if (state.mission?.flags?.distressDisabled === true) {
		startPlay(state, facts);
		return;
	}
	state.phase = "distressOffer";
	emit(state, facts, { type: "distress.offered" });
}

export function takeTask(
	state: EngineState,
	seat: SeatId,
	instanceId: TaskInstanceId,
	facts: Fact[],
): IllegalReason | null {
	if (state.phase !== "taskDraft") {
		return "wrongPhase";
	}
	if (state.currentSeat !== seat) {
		return "notYourTurn";
	}
	if (!state.centerTaskIds.includes(instanceId)) {
		return "taskNotAvailable";
	}
	const task = taskByInstance(state, instanceId);
	if (task === undefined) {
		return "taskNotAvailable";
	}
	if (task.spec.captainMaySelect === false && seat === state.captainSeat) {
		return "captainMayNotSelect";
	}
	task.ownerSeat = seat;
	state.centerTaskIds = state.centerTaskIds.filter((id) => id !== instanceId);
	state.draftActs += 1;
	emit(state, facts, { type: "task.taken", taskInstanceId: instanceId, seatId: seat });
	if (task.spec.kind === "predictTricks" && task.prediction === null) {
		return null;
	}
	return afterDraftAction(state, facts);
}

export function passTask(state: EngineState, seat: SeatId, facts: Fact[]): IllegalReason | null {
	if (state.phase !== "taskDraft") {
		return "wrongPhase";
	}
	if (state.currentSeat !== seat) {
		return "notYourTurn";
	}
	if (!canPass(state, seat)) {
		return "cannotPassTask";
	}
	state.draftActs += 1;
	emit(state, facts, { type: "task.passed", seatId: seat });
	return afterDraftAction(state, facts);
}

export function canPass(state: EngineState, _seat: SeatId): boolean {
	if (!state.passAllowed) {
		return false;
	}
	if (pendingPredictionTask(state, _seat) !== undefined) {
		return false;
	}
	if (state.draftActs >= state.playerCount) {
		return false;
	}
	return state.centerTaskIds.length > 0;
}

function afterDraftAction(state: EngineState, facts: Fact[]): IllegalReason | null {
	if (state.centerTaskIds.length === 0) {
		beginDistress(state, facts);
		return null;
	}
	if (state.playerCount === 0 || state.currentSeat === null) {
		return null;
	}
	state.currentSeat = nextSeat(state.currentSeat, state.playerCount);
	emit(state, facts, { type: "task.offeredTurn", seatId: state.currentSeat });
	return null;
}

export function pendingPredictionTask(state: EngineState, seat: SeatId) {
	return state.tasks.find(
		(task) =>
			task.ownerSeat === seat && task.spec.kind === "predictTricks" && task.prediction === null,
	);
}

export function maxPredictCount(state: EngineState): number {
	return remainingTricks(state.hands);
}

export function predictTask(
	state: EngineState,
	seat: SeatId,
	count: number,
	facts: Fact[],
): IllegalReason | null {
	if (state.phase !== "taskDraft") {
		return "wrongPhase";
	}
	if (state.currentSeat !== seat) {
		return "notYourTurn";
	}
	const task = pendingPredictionTask(state, seat);
	if (task === undefined) {
		return "predictionRequired";
	}
	if (count < 0 || count > maxPredictCount(state)) {
		return "invalidPrediction";
	}
	task.prediction = count;
	emit(state, facts, {
		type: "task.predicted",
		taskInstanceId: task.instanceId,
		seatId: seat,
		count,
		hidden: task.spec.kind === "predictTricks" && task.spec.reveal === "hidden",
	});
	return afterDraftAction(state, facts);
}

export function legalDraftInstanceIds(state: EngineState, seat: SeatId): TaskInstanceId[] {
	if (state.phase !== "taskDraft" || state.currentSeat !== seat) {
		return [];
	}
	if (pendingPredictionTask(state, seat) !== undefined) {
		return [];
	}
	return state.centerTaskIds.filter((id) => {
		const task = taskByInstance(state, id);
		if (task === undefined) {
			return false;
		}
		if (task.spec.captainMaySelect === false && seat === state.captainSeat) {
			return false;
		}
		return true;
	});
}

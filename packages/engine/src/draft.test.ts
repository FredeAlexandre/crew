import { describe, expect, it } from "vitest";
import { must, startAttempt, takeAllTasks } from "./harness.ts";
import { apply, createAttempt, type EngineState, legalIntents, TASK_CATALOG } from "./index.ts";

function draftWithTasks(playerCount: 3 | 4 | 5, taskCount: number): EngineState {
	const spec = TASK_CATALOG.find((task) => task.captainMaySelect);
	if (spec === undefined) {
		throw new Error("expected a captain-ok task");
	}
	const state = structuredClone(startAttempt(playerCount, 1, 1));
	state.tasks = [];
	state.centerTaskIds = [];
	for (let i = 0; i < taskCount; i += 1) {
		const instanceId = `a1:${i}`;
		state.tasks.push({
			instanceId,
			ownerSeat: null,
			status: "open",
			progress: 0,
			spec,
			prediction: null,
		});
		state.centerTaskIds.push(instanceId);
	}
	state.passAllowed = taskCount <= playerCount;
	state.draftActs = 0;
	state.currentSeat = state.captainSeat;
	state.nextInstance = taskCount;
	return state;
}

function canPassNow(state: EngineState): boolean {
	const seat = state.currentSeat;
	if (seat === null) {
		return false;
	}
	return legalIntents(state, seat).some((intent) => intent.type === "task.pass");
}

function takeCurrent(state: EngineState): EngineState {
	const seat = state.currentSeat;
	if (seat === null) {
		throw new Error("no seat");
	}
	const take = legalIntents(state, seat).find((intent) => intent.type === "task.take");
	if (take === undefined) {
		throw new Error("no take");
	}
	let next = must(apply(state, take));
	const predict = legalIntents(next, seat).find((intent) => intent.type === "task.predict");
	if (predict !== undefined) {
		next = must(apply(next, predict));
	}
	return next;
}

function passCurrent(state: EngineState): EngineState {
	const seat = state.currentSeat;
	if (seat === null) {
		throw new Error("no seat");
	}
	return must(apply(state, { type: "task.pass", attemptId: "a1", seatId: seat }));
}

describe("task draft", () => {
	it("allows passing only when leftover tasks would not wrap to the captain", () => {
		const two = draftWithTasks(4, 2);
		expect(two.passAllowed).toBe(true);
		expect(canPassNow(two)).toBe(true);

		const afterCaptainPass = passCurrent(two);
		expect(canPassNow(afterCaptainPass)).toBe(false);

		const many = startAttempt(3, 4, 12);
		if (many.centerTaskIds.length > many.playerCount) {
			expect(many.passAllowed).toBe(false);
			const seat = many.captainSeat ?? 0;
			expect(legalIntents(many, seat).some((intent) => intent.type === "task.pass")).toBe(false);
		}
	});

	it("lets the captain pass a single leftover task but forces a later seat to take it", () => {
		let state = draftWithTasks(4, 1);
		expect(canPassNow(state)).toBe(true);
		state = passCurrent(state);
		expect(canPassNow(state)).toBe(true);
		state = passCurrent(state);
		expect(canPassNow(state)).toBe(false);
		const taker = state.currentSeat;
		state = takeCurrent(state);
		expect(state.centerTaskIds).toHaveLength(0);
		expect(state.tasks[0]?.ownerSeat).toBe(taker);
		expect(state.tasks[0]?.ownerSeat).not.toBe(draftWithTasks(4, 1).captainSeat);
	});

	it("stops others from passing a leftover task back to the captain", () => {
		const captain = draftWithTasks(4, 2).captainSeat;
		let state = takeCurrent(draftWithTasks(4, 2));
		expect(state.tasks.filter((task) => task.ownerSeat === captain)).toHaveLength(1);
		expect(canPassNow(state)).toBe(true);
		state = passCurrent(state);
		expect(canPassNow(state)).toBe(false);
		state = takeCurrent(state);
		expect(state.centerTaskIds).toHaveLength(0);
		expect(state.tasks.filter((task) => task.ownerSeat === captain)).toHaveLength(1);
	});

	it("forbids the captain from passing when leftover tasks equal the seats behind", () => {
		const equal = draftWithTasks(4, 4);
		expect(equal.passAllowed).toBe(true);
		expect(canPassNow(equal)).toBe(false);
		expect(
			apply(equal, {
				type: "task.pass",
				attemptId: "a1",
				seatId: equal.captainSeat ?? 0,
			}).ok,
		).toBe(false);
	});

	it("assigns every task and then offers distress", () => {
		const state = takeAllTasks(startAttempt(4, 5, 3));
		expect(state.centerTaskIds).toHaveLength(0);
		expect(state.tasks.every((task) => task.ownerSeat !== null)).toBe(true);
		expect(state.phase).toBe("distressOffer");
	});

	it("skips the distress offer when the mission disables it", () => {
		const { state: started } = createAttempt({
			attemptId: "a1",
			mission: { id: "m1", difficulty: 3, flags: { distressDisabled: true } },
			playerCount: 4,
			seed: 5,
		});
		const state = takeAllTasks(started);
		expect(state.phase).toBe("play");
		expect(state.distressActive).toBe(false);
		expect(state.currentSeat).toBe(state.captainSeat);
	});

	it("forbids the captain from taking a captain-restricted task", () => {
		const state = startAttempt(4, 1, 1);
		const captain = state.captainSeat;
		if (captain === null) {
			throw new Error("captain");
		}
		const restricted = state.tasks.find((task) => task.spec.captainMaySelect === false);
		if (restricted === undefined) {
			return;
		}
		expect(
			apply(state, {
				type: "task.take",
				attemptId: "a1",
				seatId: captain,
				taskInstanceId: restricted.instanceId,
			}).ok,
		).toBe(false);
	});
});

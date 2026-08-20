import { describe, expect, it } from "vitest";
import { must, startAttempt, takeAllTasks } from "./harness.ts";
import { apply, legalIntents } from "./index.ts";

describe("task draft", () => {
	it("allows passing only when there are fewer tasks than players", () => {
		const few = startAttempt(4, 1, 1);
		expect(few.centerTaskIds.length).toBeLessThan(4);
		expect(few.passAllowed).toBe(true);
		const captain = few.captainSeat;
		if (captain === null) {
			throw new Error("captain");
		}
		expect(legalIntents(few, captain).some((intent) => intent.type === "task.pass")).toBe(true);

		const many = startAttempt(3, 4, 12);
		if (many.centerTaskIds.length >= many.playerCount) {
			expect(many.passAllowed).toBe(false);
			const seat = many.captainSeat ?? 0;
			expect(legalIntents(many, seat).some((intent) => intent.type === "task.pass")).toBe(false);
		}
	});

	it("assigns every task and then offers distress", () => {
		const state = takeAllTasks(startAttempt(4, 5, 3));
		expect(state.centerTaskIds).toHaveLength(0);
		expect(state.tasks.every((task) => task.ownerSeat !== null)).toBe(true);
		expect(state.phase).toBe("distressOffer");
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

	it("stops allowing passes after everyone has had one chance", () => {
		const state = startAttempt(4, 3, 1);
		const captain = state.captainSeat;
		if (captain === null || !state.passAllowed) {
			return;
		}
		let current = state;
		for (let i = 0; i < 4; i += 1) {
			const seat = current.currentSeat;
			if (seat === null) {
				break;
			}
			current = must(apply(current, { type: "task.pass", attemptId: "a1", seatId: seat }));
		}
		if (current.phase === "taskDraft") {
			const seat = current.currentSeat;
			if (seat !== null) {
				expect(legalIntents(current, seat).some((intent) => intent.type === "task.pass")).toBe(
					false,
				);
			}
		}
	});
});

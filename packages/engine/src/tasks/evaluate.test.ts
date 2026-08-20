import type { TaskPublic } from "@crew/protocol";
import { describe, expect, it } from "vitest";
import { remainingTricks } from "../deal.ts";
import type { TaskInstance } from "../state.ts";
import { type EvalContext, evaluateTask } from "./evaluate.ts";

const difficulty = { 3: 1, 4: 1, 5: 1 } as const;

function spec(kind: TaskPublic): TaskPublic {
	return kind;
}

function task(kind: TaskPublic): TaskInstance {
	return {
		instanceId: "i1",
		ownerSeat: 0,
		status: "open",
		progress: 0,
		spec: kind,
	};
}

function ctx(partial: Partial<EvalContext> = {}): EvalContext {
	const merged: EvalContext = {
		owner: 0,
		trickId: 1,
		winnerSeat: 0,
		ledSuit: "pink",
		trick: [
			{ seatId: 0, cardId: "pink-9" },
			{ seatId: 1, cardId: "pink-2" },
			{ seatId: 2, cardId: "yellow-9" },
			{ seatId: 3, cardId: "pink-3" },
		],
		winningCardId: "pink-9",
		captured: [["pink-9", "pink-2", "yellow-9", "pink-3"], [], [], []],
		tricksWon: [[1], [], [], []],
		consecutiveWins: [1, 0, 0, 0],
		hands: [["pink-1", "blue-4"], ["green-5"], ["yellow-1"], ["submarine-2"]],
		captainSeat: 1,
		remainingTricks: 0,
		noMoreTricks: false,
		playerCount: 4,
		...partial,
	};
	const remain = remainingTricks(merged.hands);
	return {
		...merged,
		remainingTricks: partial.remainingTricks ?? remain,
		noMoreTricks: partial.noMoreTricks ?? remain === 0,
	};
}

describe("task families", () => {
	it("winCards completes, stays open, or fails", () => {
		const win = spec({
			id: "x",
			kind: "winCards",
			cards: ["pink-9"],
			difficulty,
			captainMaySelect: true,
		});
		expect(evaluateTask(task(win), ctx()).verdict).toBe("completed");
		expect(
			evaluateTask(
				task(win),
				ctx({
					captured: [[], ["pink-9"], [], []],
					hands: [["pink-1"], ["green-2"], ["blue-3"], ["yellow-4"]],
				}),
			).verdict,
		).toBe("failed");
		expect(
			evaluateTask(
				task(win),
				ctx({
					captured: [[], [], [], []],
					hands: [["pink-9"], ["green-2"], ["blue-3"], ["yellow-4"]],
				}),
			).verdict,
		).toBe("open");
	});

	it("winColor / winValue / winSubmarines", () => {
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "winColor",
					suit: "pink",
					count: 1,
					difficulty,
					captainMaySelect: true,
				}),
				ctx(),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "winValue",
					value: 9,
					count: 1,
					difficulty,
					captainMaySelect: true,
				}),
				ctx(),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "winSubmarines",
					count: 1,
					difficulty,
					captainMaySelect: true,
				}),
				ctx({
					captured: [[], [], [], []],
					hands: [["pink-1"], ["pink-2"], ["pink-3"], ["pink-4"]],
				}),
			).verdict,
		).toBe("failed");
	});

	it("winWith completes when the owner wins with the matching card", () => {
		const winWith = task({
			id: "x",
			kind: "winWith",
			value: 9,
			difficulty,
			captainMaySelect: true,
		});
		expect(evaluateTask(winWith, ctx()).verdict).toBe("completed");
		expect(
			evaluateTask(
				winWith,
				ctx({
					winnerSeat: 1,
					winningCardId: "pink-2",
					hands: [[], ["pink-1"], ["pink-3"], ["pink-4"]],
				}),
			).verdict,
		).toBe("failed");
	});

	it("avoid fails when the forbidden card is captured and completes when none remain", () => {
		const avoidPink = task({
			id: "x",
			kind: "avoid",
			suit: "pink",
			difficulty,
			captainMaySelect: true,
		});
		expect(evaluateTask(avoidPink, ctx()).verdict).toBe("failed");
		expect(
			evaluateTask(
				avoidPink,
				ctx({
					captured: [[], ["pink-9"], [], []],
					hands: [["yellow-1"], ["yellow-2"], ["yellow-3"], ["yellow-4"]],
				}),
			).verdict,
		).toBe("completed");
	});

	it("trickCount exact / atLeast / atMost", () => {
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "trickCount",
					op: "atLeast",
					count: 1,
					difficulty,
					captainMaySelect: true,
				}),
				ctx(),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "trickCount",
					op: "exact",
					count: 1,
					difficulty,
					captainMaySelect: true,
				}),
				ctx({ hands: [["pink-1"], ["pink-2"], ["pink-3"], ["pink-4"]] }),
			).verdict,
		).toBe("open");
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "trickCount",
					op: "atMost",
					count: 0,
					difficulty,
					captainMaySelect: true,
				}),
				ctx(),
			).verdict,
		).toBe("failed");
	});

	it("consecutiveTricks", () => {
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "consecutiveTricks",
					count: 2,
					difficulty,
					captainMaySelect: true,
				}),
				ctx({ consecutiveWins: [2, 0, 0, 0] }),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "consecutiveTricks",
					count: 3,
					difficulty,
					captainMaySelect: true,
				}),
				ctx({ consecutiveWins: [1, 0, 0, 0], hands: [[], [], [], []] }),
			).verdict,
		).toBe("failed");
	});

	it("nthTrick first and last", () => {
		expect(
			evaluateTask(
				task({ id: "x", kind: "nthTrick", n: 1, difficulty, captainMaySelect: true }),
				ctx({ trickId: 1, winnerSeat: 0 }),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({ id: "x", kind: "nthTrick", n: 1, difficulty, captainMaySelect: true }),
				ctx({ trickId: 1, winnerSeat: 2 }),
			).verdict,
		).toBe("failed");
		expect(
			evaluateTask(
				task({ id: "x", kind: "nthTrick", n: 0, difficulty, captainMaySelect: true }),
				ctx({ hands: [["pink-1"], ["pink-2"], ["pink-3"], ["pink-4"]], winnerSeat: 0 }),
			).verdict,
		).toBe("open");
		expect(
			evaluateTask(
				task({ id: "x", kind: "nthTrick", n: 0, difficulty, captainMaySelect: true }),
				ctx({ hands: [[], [], [], []], winnerSeat: 0, noMoreTricks: true, remainingTricks: 0 }),
			).verdict,
		).toBe("completed");
	});

	it("compareTricks", () => {
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "compareTricks",
					op: "moreThan",
					vs: "captain",
					difficulty,
					captainMaySelect: false,
				}),
				ctx({
					tricksWon: [[1, 2, 3], [], [], []],
					captainSeat: 1,
					hands: [[], [], [], []],
				}),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "compareTricks",
					op: "fewerThan",
					vs: "captain",
					difficulty,
					captainMaySelect: false,
				}),
				ctx({ tricksWon: [[1, 2, 3], [], [], []], captainSeat: 1, hands: [[], [], [], []] }),
			).verdict,
		).toBe("failed");
	});

	it("trickSum and trickFilter", () => {
		const sum = 9 + 2 + 9 + 3;
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "trickSum",
					op: "eq",
					target: sum,
					noSubmarines: true,
					difficulty,
					captainMaySelect: true,
				}),
				ctx(),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "trickFilter",
					filter: "allOdd",
					noSubmarines: true,
					difficulty,
					captainMaySelect: true,
				}),
				ctx({
					trick: [
						{ seatId: 0, cardId: "pink-9" },
						{ seatId: 1, cardId: "green-1" },
						{ seatId: 2, cardId: "yellow-5" },
						{ seatId: 3, cardId: "blue-3" },
					],
				}),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "trickFilter",
					filter: "allEven",
					noSubmarines: true,
					difficulty,
					captainMaySelect: true,
				}),
				ctx(),
			).verdict,
		).toBe("open");
	});

	it("collection families", () => {
		expect(
			evaluateTask(
				task({ id: "x", kind: "collectAllColors", difficulty, captainMaySelect: true }),
				ctx({
					captured: [["pink-1", "yellow-1", "green-1", "blue-1"], [], [], []],
				}),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({ id: "x", kind: "collectAllOfOneColor", difficulty, captainMaySelect: true }),
				ctx({
					captured: [
						[
							"pink-1",
							"pink-2",
							"pink-3",
							"pink-4",
							"pink-5",
							"pink-6",
							"pink-7",
							"pink-8",
							"pink-9",
						],
						[],
						[],
						[],
					],
				}),
			).verdict,
		).toBe("completed");
		expect(
			evaluateTask(
				task({
					id: "x",
					kind: "collectMoreColor",
					more: "pink",
					less: "yellow",
					difficulty,
					captainMaySelect: true,
				}),
				ctx({
					captured: [["pink-1", "pink-2"], [], [], []],
					hands: [[], [], [], []],
				}),
			).verdict,
		).toBe("completed");
	});
});

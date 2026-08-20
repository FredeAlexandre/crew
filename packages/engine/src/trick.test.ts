import { describe, expect, it } from "vitest";
import { trickWinner } from "./trick.ts";

describe("trickWinner", () => {
	it("awards the highest card of the led suit", () => {
		expect(
			trickWinner(
				[
					{ seatId: 0, cardId: "green-3" },
					{ seatId: 1, cardId: "green-5" },
					{ seatId: 2, cardId: "yellow-9" },
					{ seatId: 3, cardId: "green-2" },
				],
				"green",
			),
		).toBe(1);
	});

	it("lets the highest submarine beat color cards", () => {
		expect(
			trickWinner(
				[
					{ seatId: 0, cardId: "green-3" },
					{ seatId: 1, cardId: "green-5" },
					{ seatId: 2, cardId: "submarine-1" },
					{ seatId: 3, cardId: "green-2" },
				],
				"green",
			),
		).toBe(2);
	});

	it("compares submarines when several are played", () => {
		expect(
			trickWinner(
				[
					{ seatId: 0, cardId: "pink-9" },
					{ seatId: 1, cardId: "submarine-1" },
					{ seatId: 2, cardId: "submarine-4" },
					{ seatId: 3, cardId: "yellow-1" },
				],
				"pink",
			),
		).toBe(2);
	});
});

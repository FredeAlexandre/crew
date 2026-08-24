import { expect, it } from "vitest";
import { sortHand } from "./hand-sort.ts";

it("sorts a hand by number, then suit color", () => {
	const cards = ["submarine-1", "blue-2", "pink-1", "yellow-1", "green-1"] as const;
	const sorted = sortHand(
		cards.map((cardId) => ({ cardId, legal: true, illegalReason: null, communicated: false })),
	);
	expect(sorted.map((card) => card.cardId)).toEqual([
		"pink-1",
		"yellow-1",
		"green-1",
		"submarine-1",
		"blue-2",
	]);
});

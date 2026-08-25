import { expect, it } from "vitest";
import { sortHand } from "./hand-sort.ts";

it("sorts a hand by suit color, then number", () => {
	const cards = ["submarine-1", "blue-2", "pink-3", "pink-1", "yellow-1", "green-1"] as const;
	const sorted = sortHand(
		cards.map((cardId) => ({ cardId, legal: true, illegalReason: null, communicated: false })),
	);
	expect(sorted.map((card) => card.cardId)).toEqual([
		"pink-1",
		"pink-3",
		"yellow-1",
		"green-1",
		"blue-2",
		"submarine-1",
	]);
});

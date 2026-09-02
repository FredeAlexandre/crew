import { expect, it } from "vitest";
import { sortHand } from "./hand-sort.ts";

it("sorts a hand by color, then number, with submarines last", () => {
	const cards = [
		"submarine-4",
		"blue-2",
		"pink-9",
		"yellow-1",
		"green-1",
		"submarine-1",
		"pink-1",
		"blue-8",
	] as const;
	const sorted = sortHand(
		cards.map((cardId) => ({ cardId, legal: true, illegalReason: null, communicated: false })),
	);
	expect(sorted.map((card) => card.cardId)).toEqual([
		"pink-1",
		"pink-9",
		"yellow-1",
		"green-1",
		"blue-2",
		"blue-8",
		"submarine-1",
		"submarine-4",
	]);
});

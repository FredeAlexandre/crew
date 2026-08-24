import { describe, expect, it } from "vitest";
import { cardIndexFromRects } from "./hand-layout.ts";

const row = [
	{ left: 0, right: 40, top: 20, bottom: 80 },
	{ left: 20, right: 60, top: 20, bottom: 80 },
	{ left: 40, right: 80, top: 20, bottom: 80 },
];

describe("cardIndexFromRects", () => {
	it("hits the exposed left strip of an overlapped card", () => {
		expect(cardIndexFromRects(10, 50, row, null)).toBe(0);
	});

	it("gives the overlap to the later card on top", () => {
		expect(cardIndexFromRects(30, 50, row, null)).toBe(1);
		expect(cardIndexFromRects(50, 50, row, null)).toBe(2);
	});

	it("misses empty space beside and above the row", () => {
		expect(cardIndexFromRects(-1, 50, row, null)).toBeNull();
		expect(cardIndexFromRects(81, 50, row, null)).toBeNull();
		expect(cardIndexFromRects(10, 10, row, null)).toBeNull();
	});

	it("keeps the raised card when the point is on its lifted body", () => {
		const raised = [row[0], { left: 20, right: 60, top: 0, bottom: 60 }, row[2]];
		expect(cardIndexFromRects(30, 10, raised, 1)).toBe(1);
		expect(cardIndexFromRects(10, 50, raised, 1)).toBe(0);
	});
});

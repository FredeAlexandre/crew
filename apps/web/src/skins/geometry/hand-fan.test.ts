import { describe, expect, it } from "vitest";
import { fanAngle, fanRise, fanShift, fanSpread, nearestFanIndex } from "./hand-fan.ts";

describe("fanSpread", () => {
	it("is flat for a single card", () => {
		expect(fanSpread(1)).toBe(0);
		expect(fanSpread(0)).toBe(0);
	});

	it("opens with the hand and then caps", () => {
		expect(fanSpread(2)).toBe(18);
		expect(fanSpread(5)).toBeCloseTo(20.8);
		expect(fanSpread(13)).toBe(56);
	});
});

describe("fanAngle", () => {
	it("centers a single card", () => {
		expect(fanAngle(0, 1, 40)).toBe(0);
	});

	it("mirrors left and right around the middle", () => {
		expect(fanAngle(0, 5, 40)).toBe(-20);
		expect(fanAngle(2, 5, 40)).toBe(0);
		expect(fanAngle(4, 5, 40)).toBe(20);
	});
});

describe("fanShift", () => {
	it("keeps a single card centered", () => {
		expect(fanShift(0, 1, 300, 40)).toBe(0);
	});

	it("spreads the first and last cards toward the edges", () => {
		expect(fanShift(0, 5, 300, 40)).toBeLessThan(0);
		expect(fanShift(2, 5, 300, 40)).toBe(0);
		expect(fanShift(4, 5, 300, 40)).toBeGreaterThan(0);
		expect(fanShift(4, 5, 300, 40)).toBeCloseTo(-fanShift(0, 5, 300, 40));
	});
});

describe("fanRise", () => {
	it("leaves a single card unshifted", () => {
		expect(fanRise(0, 1)).toBe(0);
	});

	it("lifts the middle and keeps the edges on the baseline", () => {
		expect(fanRise(0, 5, 16)).toBeCloseTo(0);
		expect(fanRise(2, 5, 16)).toBe(-16);
		expect(fanRise(4, 5, 16)).toBeCloseTo(0);
	});
});

describe("nearestFanIndex", () => {
	it("picks the only card", () => {
		expect(nearestFanIndex(12, 100, 1)).toBe(0);
	});

	it("maps the left and right edges", () => {
		expect(nearestFanIndex(0, 100, 5)).toBe(0);
		expect(nearestFanIndex(100, 100, 5)).toBe(4);
	});

	it("stays on the current card until the pointer crosses the next slot", () => {
		expect(nearestFanIndex(30, 100, 5, 1)).toBe(1);
		expect(nearestFanIndex(5, 100, 5, 1)).toBe(0);
	});
});

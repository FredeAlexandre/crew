import { describe, expect, it } from "vitest";
import { botPlayDelayMs } from "./bot-delay.ts";

describe("botPlayDelayMs", () => {
	it("chooses a delay from 0.5 through 2.5 seconds", () => {
		expect(botPlayDelayMs(() => 0)).toBe(500);
		expect(botPlayDelayMs(() => 0.5)).toBe(1_500);
		expect(botPlayDelayMs(() => 0.999_999)).toBe(2_500);
	});
});

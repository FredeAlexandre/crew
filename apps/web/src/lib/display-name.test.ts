import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createDebouncedAction,
	isGeneratedGuestName,
	normalizeDisplayName,
	visibleDisplayName,
} from "./display-name.ts";

describe("normalizeDisplayName", () => {
	it("trims, collapses space, and caps length", () => {
		expect(normalizeDisplayName("  Ann   Marie  ")).toBe("Ann Marie");
		expect(normalizeDisplayName("abcdefghijklmnopqrstuvwxyz")).toBe("abcdefghijklmnopqrstuvwx");
	});

	it("treats blank input as empty", () => {
		expect(normalizeDisplayName("   ")).toBe("");
	});
});

describe("guest names", () => {
	it("hides generated guest names in the field", () => {
		expect(isGeneratedGuestName("Guest a1b2c3d4")).toBe(true);
		expect(visibleDisplayName("Guest a1b2c3d4")).toBe("");
		expect(visibleDisplayName("Alex")).toBe("Alex");
		expect(isGeneratedGuestName("Guest")).toBe(false);
	});
});

describe("createDebouncedAction", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("saves after the delay and coalesces keystrokes", async () => {
		vi.useFakeTimers();
		const calls: string[] = [];
		const saver = createDebouncedAction(async (value) => {
			calls.push(value);
		}, 500);
		saver.schedule("Al");
		saver.schedule("Alex");
		await vi.advanceTimersByTimeAsync(499);
		expect(calls).toEqual([]);
		await vi.advanceTimersByTimeAsync(1);
		expect(calls).toEqual(["Alex"]);
	});

	it("flush cancels a pending debounce and saves the latest value", async () => {
		vi.useFakeTimers();
		const calls: string[] = [];
		const saver = createDebouncedAction(async (value) => {
			calls.push(value);
		}, 500);
		saver.schedule("Al");
		const flushed = saver.flush("Alex");
		await vi.advanceTimersByTimeAsync(500);
		await flushed;
		expect(calls).toEqual(["Alex"]);
	});

	it("swallows save errors so create and join are not blocked", async () => {
		const saver = createDebouncedAction(async () => {
			throw new Error("offline");
		}, 500);
		await expect(saver.flush("Alex")).resolves.toBeUndefined();
	});
});

import { describe, expect, it } from "vitest";
import { createRng } from "../rng.ts";
import { TASK_CATALOG, taskCost } from "./catalog.ts";
import { drawTasks, structurallyImpossible } from "./draw.ts";

describe("task draw", () => {
	it("sums to the mission difficulty and skips overshooting cards", () => {
		for (const seed of [1, 2, 3, 9, 42, 99, 12345]) {
			for (const difficulty of [1, 2, 5, 8]) {
				const { drawn } = drawTasks(createRng(seed), 4, difficulty);
				const sum = drawn.reduce((total, spec) => total + taskCost(spec, 4), 0);
				expect(sum).toBe(difficulty);
			}
		}
	});

	it("detects structurally impossible unique-card overlap", () => {
		const a = TASK_CATALOG.find((spec) => spec.kind === "winCards" && spec.cards.length === 1);
		if (a === undefined || a.kind !== "winCards") {
			throw new Error("need winCards");
		}
		const duplicate = { ...a, id: "dup" };
		expect(structurallyImpossible([a, duplicate])).toBe(true);
		expect(structurallyImpossible([a])).toBe(false);
	});
});

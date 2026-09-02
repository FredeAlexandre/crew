import { describe, expect, it } from "vitest";
import { translate } from "../../lib/i18n.tsx";
import { taskCatalogLabel, trickSumBound } from "./task-label.ts";

const difficulty = { 3: 3, 4: 3, 5: 4 } as const;

describe("taskCatalogLabel", () => {
	it("names a card-win task in each language", () => {
		const spec = {
			id: "t01",
			kind: "winCards" as const,
			cards: ["pink-9" as const],
			difficulty: { 3: 1, 4: 1, 5: 1 },
			captainMaySelect: true,
		};
		expect(taskCatalogLabel(spec, (key, values) => translate("en", key, values))).toBe(
			"Win Pink 9",
		);
		expect(taskCatalogLabel(spec, (key, values) => translate("fr", key, values))).toBe(
			"Gagner Rose 9",
		);
		expect(taskCatalogLabel(spec, (key, values) => translate("es", key, values))).toBe(
			"Ganar Rosa 9",
		);
	});

	it("names a trick-sum task for the table's crew size", () => {
		const spec = {
			id: "t80",
			kind: "trickSum" as const,
			op: "gt" as const,
			target: { 3: 23, 4: 28, 5: 31 },
			noSubmarines: true,
			difficulty,
			captainMaySelect: true,
		};
		const en = (key: string, values?: Record<string, string | number>) =>
			translate("en", key, values);
		expect(taskCatalogLabel(spec, en)).toBe("Win a trick summing over 23/28/31, no submarines");
		expect(taskCatalogLabel(spec, en, { playerCount: 3 })).toBe(
			"Win a trick summing over 23, no submarines",
		);
		expect(taskCatalogLabel(spec, en, { playerCount: 4 })).toBe(
			"Win a trick summing over 28, no submarines",
		);
		expect(taskCatalogLabel(spec, en, { playerCount: 5 })).toBe(
			"Win a trick summing over 31, no submarines",
		);
	});
});

describe("trickSumBound", () => {
	it("picks the crew-size target when params say how many are playing", () => {
		const spec = {
			id: "t80",
			kind: "trickSum" as const,
			op: "gt" as const,
			target: { 3: 23, 4: 28, 5: 31 },
			noSubmarines: true,
			difficulty,
			captainMaySelect: true,
		};
		expect(trickSumBound(spec)).toBe("23/28/31");
		expect(trickSumBound(spec, { playerCount: 4 })).toBe("28");
	});

	it("keeps alternate exact sums together", () => {
		const spec = {
			id: "t82",
			kind: "trickSum" as const,
			op: "eq" as const,
			targets: [22, 23],
			noSubmarines: false,
			difficulty,
			captainMaySelect: true,
		};
		expect(trickSumBound(spec, { playerCount: 4 })).toBe("22/23");
	});
});

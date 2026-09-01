import { describe, expect, it } from "vitest";
import { translate } from "../../lib/i18n.tsx";
import { taskCatalogLabel } from "./task-label.ts";

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
});

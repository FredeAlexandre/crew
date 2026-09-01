import { describe, expect, it } from "vitest";
import { catalogKeys, translate } from "./i18n.tsx";

describe("i18n catalogs", () => {
	it("keeps the same keys in English, French, and Spanish", () => {
		const keys = catalogKeys().sort();
		expect(keys.length).toBeGreaterThan(100);
		for (const locale of ["fr", "es"] as const) {
			for (const key of keys) {
				const value = translate(locale, key);
				expect(value, `${locale} missing ${key}`).not.toBe(key);
			}
		}
	});
});

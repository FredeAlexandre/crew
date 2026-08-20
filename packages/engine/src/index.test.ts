import { describe, expect, it } from "vitest";
import { emptyState } from "./index.ts";

describe("emptyState", () => {
	it("is a versioned placeholder until the engine lands", () => {
		expect(emptyState()).toEqual({ version: 0 });
	});
});

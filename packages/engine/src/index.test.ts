import { describe, expect, it } from "vitest";
import { emptyState } from "./index.ts";

describe("emptyState", () => {
	it("is a versioned placeholder until engine-model lands", () => {
		expect(emptyState()).toEqual({ version: 0 });
	});
});

import { describe, expect, it } from "vitest";
import { identiconUrl } from "./avatar.ts";

describe("identiconUrl", () => {
	it("uses DiceBear's seeded Bottts API", () => {
		const first = identiconUrl("player-123");
		expect(first).toBe(identiconUrl("player-123"));
		expect(first).toBe("https://api.dicebear.com/10.x/bottts/svg?seed=player-123");
		expect(identiconUrl("player-456")).not.toBe(first);
	});
});

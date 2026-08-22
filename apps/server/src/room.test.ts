import { describe, expect, it } from "vitest";
import { playerHeaders, readPlayerHeaders } from "./player-headers.ts";

describe("room player headers", () => {
	it("round-trips playerId and displayName for the DO", () => {
		const headers = new Headers(playerHeaders("p1", "Guest ä"));
		expect(readPlayerHeaders(headers)).toEqual({
			playerId: "p1",
			displayName: "Guest ä",
		});
		expect(readPlayerHeaders(new Headers())).toBeNull();
	});
});

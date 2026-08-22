import { describe, expect, it } from "vitest";
import { extractLobbyCode, lobbyShareUrl } from "./lobby-code.ts";

describe("extractLobbyCode", () => {
	it("keeps a typed room code", () => {
		expect(extractLobbyCode(" ab-12 ")).toBe("AB12");
	});

	it("pulls the code out of a full lobby link", () => {
		expect(extractLobbyCode("https://crew.aleno.casa/lobby/AB12")).toBe("AB12");
		expect(extractLobbyCode("https://crew.aleno.casa/lobby/ab12?ref=sms")).toBe("AB12");
		expect(extractLobbyCode("http://localhost:3001/lobby/K7PQ")).toBe("K7PQ");
		expect(extractLobbyCode("crew.aleno.casa/lobby/ZY9M/")).toBe("ZY9M");
	});

	it("strips hyphens inside a pasted path segment", () => {
		expect(extractLobbyCode("https://crew.aleno.casa/lobby/AB-12")).toBe("AB12");
	});
});

describe("lobbyShareUrl", () => {
	it("builds an absolute lobby link from the current origin", () => {
		expect(lobbyShareUrl("ab12", "https://crew.aleno.casa")).toBe(
			"https://crew.aleno.casa/lobby/AB12",
		);
	});
});

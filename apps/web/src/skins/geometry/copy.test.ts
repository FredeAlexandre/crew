import { describe, expect, it } from "vitest";
import { lobbySlot } from "./copy.ts";

describe("lobbySlot", () => {
	it("keeps self at the bottom for every crew size", () => {
		expect(lobbySlot("seat.self", 3)).toBe("self");
		expect(lobbySlot("seat.self", 4)).toBe("self");
		expect(lobbySlot("seat.self", 5)).toBe("self");
	});

	it("sits three players as a triangle", () => {
		expect(lobbySlot("seat.1", 3)).toBe("west");
		expect(lobbySlot("seat.2", 3)).toBe("east");
	});

	it("puts the fourth player in front", () => {
		expect(lobbySlot("seat.1", 4)).toBe("west");
		expect(lobbySlot("seat.2", 4)).toBe("north");
		expect(lobbySlot("seat.3", 4)).toBe("east");
	});

	it("fans five players as a reversed star with self as the head", () => {
		expect(lobbySlot("seat.1", 5)).toBe("west");
		expect(lobbySlot("seat.2", 5)).toBe("northwest");
		expect(lobbySlot("seat.3", 5)).toBe("northeast");
		expect(lobbySlot("seat.4", 5)).toBe("east");
	});
});

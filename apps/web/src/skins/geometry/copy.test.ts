import { describe, expect, it } from "vitest";
import { translate } from "../../lib/i18n.tsx";
import { illegalCopy, lobbySlot, missionHeading, sonarPositionCopy } from "./copy.ts";

const tEn = (key: string, values?: Record<string, string | number>) => translate("en", key, values);
const tFr = (key: string, values?: Record<string, string | number>) => translate("fr", key, values);

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

describe("translated table copy", () => {
	it("renders mission headings and illegal reasons in the active language", () => {
		expect(missionHeading("m4", tEn)).toBe("Mission 4");
		expect(missionHeading("m4", tFr)).toBe("Mission 4");
		expect(illegalCopy("mustFollowSuit", tEn)).toBe("Must follow suit");
		expect(illegalCopy("mustFollowSuit", tFr)).toBe("Vous devez suivre");
		expect(sonarPositionCopy("highest", tFr)).toBe("La plus haute de cette couleur");
	});
});

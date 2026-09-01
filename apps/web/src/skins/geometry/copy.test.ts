import { describe, expect, it } from "vitest";
import { translate } from "../../lib/i18n.tsx";
import {
	illegalCopy,
	lobbySlot,
	missionHeading,
	playLeadRegion,
	seatsInPlayOrder,
	sonarPositionCopy,
} from "./copy.ts";

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

describe("seatsInPlayOrder", () => {
	const seats = [
		{ region: "seat.self" as const },
		{ region: "seat.1" as const },
		{ region: "seat.2" as const },
		{ region: "seat.3" as const },
	];

	it("puts the leader first and keeps clockwise order", () => {
		expect(seatsInPlayOrder(seats, "seat.3").map((seat) => seat.region)).toEqual([
			"seat.3",
			"seat.self",
			"seat.1",
			"seat.2",
		]);
	});

	it("leaves order unchanged when the leader is already first", () => {
		expect(seatsInPlayOrder(seats, "seat.self").map((seat) => seat.region)).toEqual([
			"seat.self",
			"seat.1",
			"seat.2",
			"seat.3",
		]);
	});

	it("falls back to the given order when there is no leader", () => {
		expect(seatsInPlayOrder(seats, null).map((seat) => seat.region)).toEqual([
			"seat.self",
			"seat.1",
			"seat.2",
			"seat.3",
		]);
	});
});

describe("playLeadRegion", () => {
	const seats = [
		{ region: "seat.self" as const, isCaptain: false },
		{ region: "seat.1" as const, isCaptain: true },
	];

	it("prefers the shown lead, then the trick lead, then whose turn it is", () => {
		expect(
			playLeadRegion(
				{
					trick: { leadRegion: "seat.1" },
					chrome: { turnRegion: "seat.self" },
					seats,
				},
				"seat.self",
			),
		).toBe("seat.self");
		expect(
			playLeadRegion({
				trick: { leadRegion: "seat.1" },
				chrome: { turnRegion: "seat.self" },
				seats,
			}),
		).toBe("seat.1");
		expect(
			playLeadRegion({
				trick: { leadRegion: null },
				chrome: { turnRegion: "seat.self" },
				seats,
			}),
		).toBe("seat.self");
	});

	it("falls back to the captain when nobody has led yet", () => {
		expect(
			playLeadRegion({
				trick: { leadRegion: null },
				chrome: { turnRegion: null },
				seats,
			}),
		).toBe("seat.1");
	});

	it("keeps the captain first during the task draft", () => {
		expect(
			playLeadRegion({
				scene: "taskDraft",
				trick: { leadRegion: null },
				chrome: { turnRegion: "seat.self" },
				seats,
			}),
		).toBe("seat.1");
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

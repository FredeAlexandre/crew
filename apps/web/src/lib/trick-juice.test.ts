import { playMidTrickFourPlayers } from "@crew/view-model/fixtures";
import { describe, expect, it } from "vitest";
import { trickCardKey, trickJuice } from "./trick-juice.ts";

describe("trickJuice", () => {
	it("does not juice the first snapshot", () => {
		expect(trickJuice(null, playMidTrickFourPlayers)).toEqual({
			landKeys: [],
			holdCards: null,
			winnerRegion: null,
			playWin: false,
		});
	});

	it("lands only newly arrived trick cards", () => {
		const extra = playMidTrickFourPlayers.trick.cards[0];
		if (extra === undefined) {
			throw new Error("fixture missing trick card");
		}
		const next = {
			...playMidTrickFourPlayers,
			trick: {
				...playMidTrickFourPlayers.trick,
				cards: [
					...playMidTrickFourPlayers.trick.cards,
					{ ...extra, seatId: extra.seatId === 0 ? 1 : 0, order: extra.order + 1 },
				],
			},
		};
		const added = next.trick.cards[next.trick.cards.length - 1];
		if (added === undefined) {
			throw new Error("expected added card");
		}
		const juice = trickJuice(playMidTrickFourPlayers, next);
		expect(juice.landKeys).toEqual([trickCardKey(added)]);
		expect(juice.playWin).toBe(false);
	});

	it("holds the last trick and marks the winner when the well clears", () => {
		const last = {
			trickId: 4,
			winnerRegion: "seat.self" as const,
			winnerSeatId: 3,
			ledSuit: "green" as const,
			cards: playMidTrickFourPlayers.trick.cards,
		};
		const resolved = {
			...playMidTrickFourPlayers,
			trick: { ...playMidTrickFourPlayers.trick, cards: [] },
			lastTrick: last,
		};
		const juice = trickJuice(playMidTrickFourPlayers, resolved);
		expect(juice.playWin).toBe(true);
		expect(juice.holdCards).toEqual(last.cards);
		expect(juice.winnerRegion).toBe("seat.self");
		expect(juice.landKeys).toEqual([]);
	});
});

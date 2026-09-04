import { describe, expect, it } from "vitest";
import { parseHistoryGame } from "./history-game.ts";
import {
	groupHistoryByDay,
	type HistoryEntry,
	localDayKey,
	missionNumber,
} from "./history-group.ts";

function entry(
	overrides: Partial<HistoryEntry> & Pick<HistoryEntry, "attemptId" | "completedAt">,
): HistoryEntry {
	return {
		missionId: "m1",
		result: "won",
		roomCode: "ABCD",
		playerCount: 4,
		...overrides,
	};
}

describe("groupHistoryByDay", () => {
	it("groups completed attempts by local calendar day, newest day first", () => {
		const groups = groupHistoryByDay([
			entry({ attemptId: "later", completedAt: new Date(2026, 8, 4, 18, 0).toISOString() }),
			entry({ attemptId: "earlier", completedAt: new Date(2026, 8, 4, 9, 0).toISOString() }),
			entry({ attemptId: "yesterday", completedAt: new Date(2026, 8, 3, 22, 0).toISOString() }),
		]);
		expect(groups.map((group) => group.day)).toEqual([
			localDayKey(new Date(2026, 8, 4)),
			localDayKey(new Date(2026, 8, 3)),
		]);
		expect(groups[0]?.entries.map((item) => item.attemptId)).toEqual(["later", "earlier"]);
		expect(groups[1]?.entries.map((item) => item.attemptId)).toEqual(["yesterday"]);
	});

	it("skips entries with an unreadable date", () => {
		const groups = groupHistoryByDay([
			entry({ attemptId: "bad", completedAt: "nope" }),
			entry({ attemptId: "ok", completedAt: new Date(2026, 8, 4, 12, 0).toISOString() }),
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0]?.entries[0]?.attemptId).toBe("ok");
	});
});

describe("missionNumber", () => {
	it("strips a leading m from catalog ids", () => {
		expect(missionNumber("m12")).toBe("12");
		expect(missionNumber("12")).toBe("12");
	});
});

describe("parseHistoryGame", () => {
	it("reads facts from stored event payloads", () => {
		const game = parseHistoryGame({
			attemptId: "a1",
			missionId: "m1",
			result: "won",
			playerCount: 4,
			participants: [{ seatId: 0, playerId: "u1", displayName: "Alex", isBot: false }],
			setup: {
				difficulty: 4,
				captainSeat: null,
				distressDisabled: true,
				completedTricksVisible: true,
			},
			events: [
				{
					seq: 1,
					type: "host.started",
					payload: { type: "host.started", attemptId: "a1", seq: 1, missionId: "m1" },
				},
			],
		});
		expect(game?.facts).toEqual([
			{ type: "host.started", attemptId: "a1", seq: 1, missionId: "m1" },
		]);
		expect(game?.participants[0]?.displayName).toBe("Alex");
	});

	it("rejects a payload that is not a recorded game", () => {
		expect(parseHistoryGame({ attemptId: "a1" })).toBeNull();
	});
});

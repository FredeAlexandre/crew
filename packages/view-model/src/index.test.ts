import { describe, expect, it } from "vitest";
import { regionForSeat, relativeSeat, tableViewSchema, taskRegionAt } from "./table.ts";

describe("seat rotation helpers", () => {
	it("maps engine seats onto self-relative regions", () => {
		expect(relativeSeat(2, 2, 4)).toBe(0);
		expect(relativeSeat(3, 2, 4)).toBe(1);
		expect(relativeSeat(0, 2, 4)).toBe(2);
		expect(relativeSeat(1, 2, 4)).toBe(3);
		expect(regionForSeat(2, 2, 4)).toBe("seat.self");
		expect(regionForSeat(3, 2, 4)).toBe("seat.1");
		expect(taskRegionAt(0)).toBe("tasks.self");
		expect(taskRegionAt(2)).toBe("tasks.2");
	});
});

describe("tableViewSchema", () => {
	it("parses a lobby with three empty seats", () => {
		const emptySeat = (region: "seat.self" | "seat.1" | "seat.2", seatId: 0 | 1 | 2) => ({
			region,
			seatId,
			displayName: null,
			connected: false,
			ready: false,
			isCaptain: false,
			sonar: { state: "available" as const, communication: null },
			handCount: 0,
			wonTrickCount: 0,
			isTurn: false,
			isLastTrickWinner: false,
			tasks: [],
		});
		const parsed = tableViewSchema.parse({
			attemptId: null,
			seq: 0,
			viewerSeat: 0,
			playerCount: 3,
			scene: "lobby",
			overlay: "none",
			chrome: {
				missionId: null,
				difficulty: null,
				trickId: null,
				turnRegion: null,
				distress: { active: false, direction: null },
				sonarAvailable: false,
				flags: { sonarDisabled: false, discussionAllowed: false },
			},
			seats: [emptySeat("seat.self", 0), emptySeat("seat.1", 1), emptySeat("seat.2", 2)],
			hand: [],
			trick: { trickId: null, ledSuit: null, leadRegion: null, cards: [] },
			centerTasks: [],
			lastTrick: null,
			undealt: { present: true },
			sonarCandidates: [],
			affordances: {
				canPlay: false,
				canSonar: false,
				canTakeTask: false,
				canPassTask: false,
				canSkipDistress: false,
				canActivateDistress: false,
				canPassDistressCard: false,
				canPeekLastTrick: false,
				canStart: false,
				canFillBots: false,
				canConfigure: false,
				canRetry: false,
			},
			result: null,
		});
		expect(parsed.scene).toBe("lobby");
		expect(parsed.seats).toHaveLength(3);
	});
});

import type { createDb } from "@crew/db";
import type { Fact } from "@crew/protocol";
import { describe, expect, it } from "vitest";
import { recordPlayerHistory } from "./history.ts";
import type { TableState } from "./table.ts";

function resultState(): TableState {
	return {
		code: "ABCD",
		hostPlayerId: "account-1",
		playerCount: 3,
		status: "playing",
		seq: 4,
		seats: [
			{ playerId: "account-1", displayName: "Alex", connected: true, ready: true },
			{ playerId: "guest-1", displayName: "Guest", connected: true, ready: true },
			{ playerId: "bot:2", displayName: "Bot", connected: true, ready: true },
		],
		setup: {
			difficulty: 1,
			captainSeat: null,
			distressDisabled: false,
			completedTricksVisible: false,
		},
		engine: {
			phase: "result",
			result: "won",
			failReason: null,
			attemptId: "attempt-1",
			mission: { id: "m1", difficulty: 1 },
		} as TableState["engine"],
		historyFacts: [
			{
				type: "host.started",
				attemptId: "attempt-1",
				seq: 1,
				missionId: "m1",
			} as Fact,
		],
		kicks: {},
	};
}

describe("recordPlayerHistory", () => {
	it("stores a completed attempt for signed-in players, not guests or bots", async () => {
		let inserted: Array<{ userId: string; attemptId: string }> = [];
		const db = {
			select: () => ({
				from: () => ({
					where: async () => [{ id: "account-1" }],
				}),
			}),
			insert: () => ({
				values: (values: unknown) => {
					if (
						Array.isArray(values) &&
						values.every((value) => {
							return typeof value === "object" && value !== null && "userId" in value;
						})
					) {
						inserted = values.map((value) => {
							const row = value as { userId: string; attemptId: string };
							return { userId: row.userId, attemptId: row.attemptId };
						});
					}
					return { onConflictDoNothing: async () => undefined };
				},
			}),
		} as unknown as ReturnType<typeof createDb>;

		await recordPlayerHistory(db, resultState());

		expect(inserted).toEqual([{ userId: "account-1", attemptId: "attempt-1" }]);
	});

	it("does not write while an attempt is still in progress", async () => {
		let selected = false;
		const db = {
			select: () => {
				selected = true;
				return {};
			},
		} as unknown as ReturnType<typeof createDb>;
		const state = resultState();
		state.engine = { ...state.engine, phase: "play", result: null } as TableState["engine"];

		await recordPlayerHistory(db, state);

		expect(selected).toBe(false);
	});
});

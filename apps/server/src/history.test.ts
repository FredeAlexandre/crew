import type { createDb } from "@crew/db";
import type { Fact } from "@crew/protocol";
import { describe, expect, it } from "vitest";
import { insertCampaign, recordPlayerHistory } from "./history.ts";
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
		mode: "freePlay",
		campaign: null,
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

	it("attaches campaignId to game_history and updates campaign step on result", async () => {
		let insertedGame: unknown = null;
		const updates: Record<string, unknown> = {};
		const db = {
			select: () => ({
				from: () => ({
					where: async () => [{ id: "account-1" }],
				}),
			}),
			insert: () => ({
				values: (values: unknown) => {
					if (typeof values === "object" && values !== null && "campaignId" in values) {
						insertedGame = values;
					}
					return { onConflictDoNothing: async () => undefined };
				},
			}),
			update: (table: unknown) => ({
				set: (values: unknown) => {
					const name = String(
						(table as { [key: symbol]: unknown })[Symbol.for("drizzle:Name")] ?? "table",
					);
					updates[name] = values;
					return {
						where: async () => undefined,
					};
				},
			}),
		} as unknown as ReturnType<typeof createDb>;

		const state = resultState();
		state.mode = "campaign";
		state.campaign = {
			logbookId: "deep-sea",
			campaignId: "camp-123",
			stepIndex: 0,
			phase: "briefing",
			paragraphIndex: 0,
			paragraphEndsAt: 0,
			stepAttempts: [0, 0, 0, 0, 0],
		};

		await recordPlayerHistory(db, state);

		expect(insertedGame).not.toBeNull();
		const game = insertedGame as Record<string, unknown>;
		expect(game.campaignId).toBe("camp-123");
		const stepUpdate = updates.campaign_steps as Record<string, unknown>;
		expect(stepUpdate).toBeDefined();
		expect(stepUpdate.status).toBe("won");
		expect(stepUpdate.attempts).toBe(1);
	});

	it("persists campaign row, human members, and steps on insertCampaign", async () => {
		const inserts: Record<string, unknown[]> = {};
		const db = {
			insert: (table: unknown) => ({
				values: (values: unknown) => {
					const name = String(
						(table as { [key: symbol]: unknown })[Symbol.for("drizzle:Name")] ?? "table",
					);
					inserts[name] = Array.isArray(values) ? values : [values];
					return { onConflictDoNothing: async () => undefined };
				},
			}),
		} as unknown as ReturnType<typeof createDb>;

		const state = resultState();
		state.mode = "campaign";
		state.campaign = {
			logbookId: "deep-sea",
			campaignId: "camp-456",
			stepIndex: 0,
			phase: "story",
			paragraphIndex: 0,
			paragraphEndsAt: 0,
			stepAttempts: [0, 0, 0, 0, 0],
		};

		await insertCampaign(db, state);

		// Members skip bot:2
		const members = inserts.campaign_members as Array<{ userId: string }>;
		expect(members).toBeDefined();
		expect(members.map((m) => m.userId)).toEqual(["account-1", "guest-1"]);

		// Steps create 5 steps
		const steps = inserts.campaign_steps as Array<{ stepIndex: number }>;
		expect(steps).toHaveLength(5);
	});
});

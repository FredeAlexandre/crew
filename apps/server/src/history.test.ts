import type { createDb } from "@crew/db";
import type { Fact } from "@crew/protocol";
import { describe, expect, it } from "vitest";
import { GAME_HISTORY_EVENT_CHUNK, recordPlayerHistory } from "./history.ts";
import type { TableState } from "./table.ts";

function resultState(facts?: Fact[]): TableState {
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
		historyFacts: facts ?? [
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

type EventRow = { seq: number; payload: string };
type PlayerRow = { userId: string; attemptId: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function fakeHistoryDb() {
	const eventBatches: EventRow[][] = [];
	let insertedPlayers: PlayerRow[] = [];
	const db = {
		select: () => ({
			from: () => ({
				where: async () => [{ id: "account-1" }],
			}),
		}),
		insert: () => ({
			values: (values: unknown) => {
				if (Array.isArray(values) && values.every(isEventRow)) {
					eventBatches.push(values);
				}
				if (Array.isArray(values) && values.every(isPlayerRow)) {
					insertedPlayers = values.map((value) => ({
						userId: value.userId,
						attemptId: value.attemptId,
					}));
				}
				return { onConflictDoNothing: async () => undefined };
			},
		}),
	} as unknown as ReturnType<typeof createDb>;
	return { db, eventBatches, players: () => insertedPlayers };
}

function isEventRow(value: unknown): value is EventRow {
	return isRecord(value) && typeof value.seq === "number" && typeof value.payload === "string";
}

function isPlayerRow(value: unknown): value is PlayerRow {
	return isRecord(value) && typeof value.userId === "string" && typeof value.attemptId === "string";
}

function startedFacts(count: number): Fact[] {
	return Array.from({ length: count }, (_, index) => ({
		type: "host.started",
		attemptId: "attempt-1",
		seq: index + 1,
		missionId: "m1",
	})) as Fact[];
}

describe("recordPlayerHistory", () => {
	it("stores a completed attempt for signed-in players, not guests or bots", async () => {
		const { db, players } = fakeHistoryDb();

		await recordPlayerHistory(db, resultState());

		expect(players()).toEqual([{ userId: "account-1", attemptId: "attempt-1" }]);
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

	it("chunks event inserts under D1's 100 bound-parameter limit", async () => {
		const { db, eventBatches } = fakeHistoryDb();
		const count = GAME_HISTORY_EVENT_CHUNK * 2 + 5;

		await recordPlayerHistory(db, resultState(startedFacts(count)));

		expect(eventBatches.every((batch) => batch.length <= GAME_HISTORY_EVENT_CHUNK)).toBe(true);
		expect(eventBatches).toHaveLength(3);
		expect(eventBatches.flat()).toHaveLength(count);
	});
});

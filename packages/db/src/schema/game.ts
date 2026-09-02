import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth.ts";

export const players = sqliteTable(
	"players",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),
		displayName: text("display_name").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("players_userId_idx").on(table.userId)],
);

export const rooms = sqliteTable(
	"rooms",
	{
		id: text("id").primaryKey(),
		code: text("code").notNull().unique(),
		hostPlayerId: text("host_player_id")
			.notNull()
			.references(() => players.id, { onDelete: "cascade" }),
		status: text("status", { enum: ["lobby", "playing", "done"] })
			.notNull()
			.default("lobby"),
		occupancy: integer("occupancy").notNull().default(0),
		playerCount: integer("player_count").notNull().default(4),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("rooms_code_idx").on(table.code)],
);

export const playerHistory = sqliteTable(
	"player_history",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		missionId: text("mission_id").notNull(),
		attemptId: text("attempt_id").notNull(),
		result: text("result", { enum: ["won", "failed"] }).notNull(),
		roomCode: text("room_code").notNull(),
		playerCount: integer("player_count").notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("player_history_userId_idx").on(table.userId),
		uniqueIndex("player_history_user_attempt_unique").on(table.userId, table.attemptId),
	],
);

export const gameHistory = sqliteTable(
	"game_history",
	{
		attemptId: text("attempt_id").primaryKey(),
		roomCode: text("room_code").notNull(),
		campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
		missionId: text("mission_id").notNull(),
		result: text("result", { enum: ["won", "failed"] }).notNull(),
		failReason: text("fail_reason"),
		difficulty: integer("difficulty").notNull(),
		playerCount: integer("player_count").notNull(),
		participants: text("participants").notNull(),
		setup: text("setup").notNull(),
		finalState: text("final_state").notNull(),
		startedAt: integer("started_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("game_history_roomCode_idx").on(table.roomCode),
		index("game_history_campaignId_idx").on(table.campaignId),
	],
);

export const campaigns = sqliteTable(
	"campaigns",
	{
		id: text("id").primaryKey(),
		logbookId: text("logbook_id").notNull(),
		hostPlayerId: text("host_player_id")
			.notNull()
			.references(() => players.id, { onDelete: "cascade" }),
		roomCode: text("room_code").notNull(),
		status: text("status", { enum: ["active", "completed"] })
			.notNull()
			.default("active"),
		stepIndex: integer("step_index").notNull().default(0),
		playerCount: integer("player_count").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("campaigns_roomCode_idx").on(table.roomCode)],
);

export const campaignMembers = sqliteTable(
	"campaign_members",
	{
		id: text("id").primaryKey(),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		displayName: text("display_name").notNull(),
		seatId: integer("seat_id").notNull(),
	},
	(table) => [
		index("campaign_members_campaignId_idx").on(table.campaignId),
		index("campaign_members_userId_idx").on(table.userId),
	],
);

export const campaignSteps = sqliteTable(
	"campaign_steps",
	{
		id: text("id").primaryKey(),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		stepIndex: integer("step_index").notNull(),
		attempts: integer("attempts").notNull().default(0),
		status: text("status", { enum: ["current", "won"] }).notNull(),
		lastAttemptId: text("last_attempt_id"),
	},
	(table) => [index("campaign_steps_campaignId_idx").on(table.campaignId)],
);

export const gameHistoryEvents = sqliteTable(
	"game_history_events",
	{
		id: text("id").primaryKey(),
		attemptId: text("attempt_id")
			.notNull()
			.references(() => gameHistory.attemptId, { onDelete: "cascade" }),
		seq: integer("seq").notNull(),
		type: text("type").notNull(),
		payload: text("payload").notNull(),
	},
	(table) => [
		index("game_history_events_attempt_idx").on(table.attemptId),
		uniqueIndex("game_history_events_attempt_seq_unique").on(table.attemptId, table.seq),
	],
);

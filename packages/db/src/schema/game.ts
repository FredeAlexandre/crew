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

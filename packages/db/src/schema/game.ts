import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("rooms_code_idx").on(table.code)],
);

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	CAMPAIGNS_SQL,
	GAME_HISTORY_SQL,
	INIT_SQL,
	PLAYER_COUNT_SQL,
	PLAYER_HISTORY_SQL,
	toExecSql,
} from "./migrate.ts";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

describe("schema bootstrap SQL", () => {
	it("stays aligned with the drizzle migration files", () => {
		expect(INIT_SQL).toBe(readFileSync(join(migrationsDir, "0000_init.sql"), "utf8"));
		expect(PLAYER_COUNT_SQL).toBe(
			readFileSync(join(migrationsDir, "0001_player_count.sql"), "utf8"),
		);
		expect(PLAYER_HISTORY_SQL).toBe(
			readFileSync(join(migrationsDir, "0002_player_history.sql"), "utf8"),
		);
		expect(GAME_HISTORY_SQL).toBe(
			readFileSync(join(migrationsDir, "0003_game_history.sql"), "utf8"),
		);
		expect(CAMPAIGNS_SQL).toBe(readFileSync(join(migrationsDir, "0004_campaigns.sql"), "utf8"));
	});

	it("turns drizzle breakpoints into statement separators", () => {
		expect(toExecSql("A;\n--> statement-breakpoint\nB;")).toBe("A;\nB;");
	});
});

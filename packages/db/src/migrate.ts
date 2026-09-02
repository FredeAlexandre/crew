/**
 * Apply committed Drizzle SQL when Alchemy's local D1 reconcile did not.
 * Keep the strings identical to `src/migrations/*.sql` (enforced by test).
 */
export const INIT_SQL = `CREATE TABLE \`user\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`email\` text NOT NULL,
	\`email_verified\` integer DEFAULT false NOT NULL,
	\`image\` text,
	\`is_anonymous\` integer DEFAULT false NOT NULL,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`user_email_unique\` ON \`user\` (\`email\`);
--> statement-breakpoint
CREATE TABLE \`session\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`expires_at\` integer NOT NULL,
	\`token\` text NOT NULL,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	\`updated_at\` integer,
	\`ip_address\` text,
	\`user_agent\` text,
	\`user_id\` text NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`session_token_unique\` ON \`session\` (\`token\`);
--> statement-breakpoint
CREATE INDEX \`session_userId_idx\` ON \`session\` (\`user_id\`);
--> statement-breakpoint
CREATE TABLE \`account\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`account_id\` text NOT NULL,
	\`provider_id\` text NOT NULL,
	\`user_id\` text NOT NULL,
	\`access_token\` text,
	\`refresh_token\` text,
	\`id_token\` text,
	\`access_token_expires_at\` integer,
	\`refresh_token_expires_at\` integer,
	\`scope\` text,
	\`password\` text,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	\`updated_at\` integer,
	FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`account_userId_idx\` ON \`account\` (\`user_id\`);
--> statement-breakpoint
CREATE TABLE \`verification\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`identifier\` text NOT NULL,
	\`value\` text NOT NULL,
	\`expires_at\` integer NOT NULL,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX \`verification_identifier_idx\` ON \`verification\` (\`identifier\`);
--> statement-breakpoint
CREATE TABLE \`players\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`display_name\` text NOT NULL,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`players_user_id_unique\` ON \`players\` (\`user_id\`);
--> statement-breakpoint
CREATE INDEX \`players_userId_idx\` ON \`players\` (\`user_id\`);
--> statement-breakpoint
CREATE TABLE \`rooms\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`code\` text NOT NULL,
	\`host_player_id\` text NOT NULL,
	\`status\` text DEFAULT 'lobby' NOT NULL,
	\`occupancy\` integer DEFAULT 0 NOT NULL,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (\`host_player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`rooms_code_unique\` ON \`rooms\` (\`code\`);
--> statement-breakpoint
CREATE INDEX \`rooms_code_idx\` ON \`rooms\` (\`code\`);
`;

export const PLAYER_COUNT_SQL = `ALTER TABLE \`rooms\` ADD \`player_count\` integer DEFAULT 4 NOT NULL;
`;

export const PLAYER_HISTORY_SQL = `CREATE TABLE \`player_history\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`mission_id\` text NOT NULL,
	\`attempt_id\` text NOT NULL,
	\`result\` text NOT NULL,
	\`room_code\` text NOT NULL,
	\`player_count\` integer NOT NULL,
	\`completed_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`player_history_userId_idx\` ON \`player_history\` (\`user_id\`);
--> statement-breakpoint
CREATE UNIQUE INDEX \`player_history_user_attempt_unique\` ON \`player_history\` (\`user_id\`, \`attempt_id\`);
`;

export const GAME_HISTORY_SQL = `CREATE TABLE \`game_history\` (
	\`attempt_id\` text PRIMARY KEY NOT NULL,
	\`room_code\` text NOT NULL,
	\`mission_id\` text NOT NULL,
	\`result\` text NOT NULL,
	\`fail_reason\` text,
	\`difficulty\` integer NOT NULL,
	\`player_count\` integer NOT NULL,
	\`participants\` text NOT NULL,
	\`setup\` text NOT NULL,
	\`final_state\` text NOT NULL,
	\`started_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	\`completed_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX \`game_history_roomCode_idx\` ON \`game_history\` (\`room_code\`);
--> statement-breakpoint
CREATE TABLE \`game_history_events\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`attempt_id\` text NOT NULL,
	\`seq\` integer NOT NULL,
	\`type\` text NOT NULL,
	\`payload\` text NOT NULL,
	FOREIGN KEY (\`attempt_id\`) REFERENCES \`game_history\`(\`attempt_id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`game_history_events_attempt_idx\` ON \`game_history_events\` (\`attempt_id\`);
--> statement-breakpoint
CREATE UNIQUE INDEX \`game_history_events_attempt_seq_unique\` ON \`game_history_events\` (\`attempt_id\`, \`seq\`);
`;

export const CAMPAIGNS_SQL = `CREATE TABLE \`campaigns\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`logbook_id\` text NOT NULL,
	\`host_player_id\` text NOT NULL,
	\`room_code\` text NOT NULL,
	\`status\` text DEFAULT 'active' NOT NULL,
	\`step_index\` integer DEFAULT 0 NOT NULL,
	\`player_count\` integer NOT NULL,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (\`host_player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`campaigns_roomCode_idx\` ON \`campaigns\` (\`room_code\`);
--> statement-breakpoint
CREATE TABLE \`campaign_members\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`campaign_id\` text NOT NULL,
	\`user_id\` text NOT NULL,
	\`display_name\` text NOT NULL,
	\`seat_id\` integer NOT NULL,
	FOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`campaign_members_campaignId_idx\` ON \`campaign_members\` (\`campaign_id\`);
--> statement-breakpoint
CREATE INDEX \`campaign_members_userId_idx\` ON \`campaign_members\` (\`user_id\`);
--> statement-breakpoint
CREATE TABLE \`campaign_steps\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`campaign_id\` text NOT NULL,
	\`step_index\` integer NOT NULL,
	\`attempts\` integer DEFAULT 0 NOT NULL,
	\`status\` text NOT NULL,
	\`last_attempt_id\` text,
	FOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`campaign_steps_campaignId_idx\` ON \`campaign_steps\` (\`campaign_id\`);
--> statement-breakpoint
ALTER TABLE \`game_history\` ADD \`campaign_id\` text REFERENCES \`campaigns\`(\`id\`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
CREATE INDEX \`game_history_campaignId_idx\` ON \`game_history\` (\`campaign_id\`);
`;

export function toExecSql(sql: string): string {
	return sql.replace(/\s*-->\s*statement-breakpoint\s*/g, "\n");
}

let applied = false;

export async function ensureMigrated(d1: D1Database): Promise<void> {
	if (applied) {
		return;
	}
	const user = await d1
		.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'user' LIMIT 1")
		.first();
	if (user === null) {
		await d1.exec(toExecSql(INIT_SQL));
	}
	const rooms = await d1
		.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'rooms' LIMIT 1")
		.first();
	if (rooms !== null) {
		const columns = await d1.prepare("PRAGMA table_info(rooms)").all<{ name: string }>();
		if (!columns.results.some((column) => column.name === "player_count")) {
			await d1.exec(PLAYER_COUNT_SQL);
		}
	}
	const history = await d1
		.prepare(
			"SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'player_history' LIMIT 1",
		)
		.first();
	if (history === null) {
		await d1.exec(toExecSql(PLAYER_HISTORY_SQL));
	}
	const games = await d1
		.prepare(
			"SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'game_history' LIMIT 1",
		)
		.first();
	if (games === null) {
		await d1.exec(toExecSql(GAME_HISTORY_SQL));
	}
	const campaignTable = await d1
		.prepare(
			"SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'campaigns' LIMIT 1",
		)
		.first();
	if (campaignTable === null) {
		await d1.exec(toExecSql(CAMPAIGNS_SQL));
	}
	applied = true;
}

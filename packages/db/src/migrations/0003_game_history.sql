CREATE TABLE `game_history` (
	`attempt_id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`mission_id` text NOT NULL,
	`result` text NOT NULL,
	`fail_reason` text,
	`difficulty` integer NOT NULL,
	`player_count` integer NOT NULL,
	`participants` text NOT NULL,
	`setup` text NOT NULL,
	`final_state` text NOT NULL,
	`started_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`completed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `game_history_roomCode_idx` ON `game_history` (`room_code`);
--> statement-breakpoint
CREATE TABLE `game_history_events` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`seq` integer NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `game_history`(`attempt_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_history_events_attempt_idx` ON `game_history_events` (`attempt_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_history_events_attempt_seq_unique` ON `game_history_events` (`attempt_id`, `seq`);

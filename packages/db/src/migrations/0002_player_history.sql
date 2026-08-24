CREATE TABLE `player_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mission_id` text NOT NULL,
	`attempt_id` text NOT NULL,
	`result` text NOT NULL,
	`room_code` text NOT NULL,
	`player_count` integer NOT NULL,
	`completed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `player_history_userId_idx` ON `player_history` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_history_user_attempt_unique` ON `player_history` (`user_id`, `attempt_id`);

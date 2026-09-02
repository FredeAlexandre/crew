CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`logbook_id` text NOT NULL,
	`host_player_id` text NOT NULL,
	`room_code` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`step_index` integer DEFAULT 0 NOT NULL,
	`player_count` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`host_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `campaigns_roomCode_idx` ON `campaigns` (`room_code`);
--> statement-breakpoint
CREATE TABLE `campaign_members` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`seat_id` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `campaign_members_campaignId_idx` ON `campaign_members` (`campaign_id`);
--> statement-breakpoint
CREATE INDEX `campaign_members_userId_idx` ON `campaign_members` (`user_id`);
--> statement-breakpoint
CREATE TABLE `campaign_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`last_attempt_id` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `campaign_steps_campaignId_idx` ON `campaign_steps` (`campaign_id`);
--> statement-breakpoint
ALTER TABLE `game_history` ADD `campaign_id` text REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
CREATE INDEX `game_history_campaignId_idx` ON `game_history` (`campaign_id`);

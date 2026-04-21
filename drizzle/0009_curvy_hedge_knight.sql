CREATE TABLE `agent_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text,
	`revoked_at` text,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `agent_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`question` text NOT NULL,
	`answer_preview` text,
	`source_count` integer DEFAULT 0 NOT NULL,
	`latency_ms` integer,
	`rating` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_api_keys_key_hash_unique` ON `agent_api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `aak_agent_idx` ON `agent_api_keys` (`agent_id`);--> statement-breakpoint
CREATE INDEX `aak_hash_idx` ON `agent_api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `aq_agent_idx` ON `agent_queries` (`agent_id`);--> statement-breakpoint
CREATE INDEX `aq_agent_day_idx` ON `agent_queries` (`agent_id`,`created_at`);
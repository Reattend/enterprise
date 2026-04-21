CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`tier` text DEFAULT 'org' NOT NULL,
	`department_id` text,
	`owner_user_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`icon_name` text,
	`color` text,
	`system_prompt` text NOT NULL,
	`scope_config` text,
	`deployment_targets` text DEFAULT '[]' NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ag_org_idx` ON `agents` (`organization_id`);--> statement-breakpoint
CREATE INDEX `ag_org_slug_idx` ON `agents` (`organization_id`,`slug`);--> statement-breakpoint
CREATE INDEX `ag_tier_idx` ON `agents` (`tier`);
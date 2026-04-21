CREATE TABLE `policies` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`category` text,
	`icon_name` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`current_version_id` text,
	`effective_date` text,
	`applicability` text DEFAULT '{"allOrg":true,"departments":[],"roles":[],"users":[]}' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `policy_acknowledgments` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`policy_version_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`acknowledged_at` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`policy_version_id`) REFERENCES `policy_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `policy_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`body` text NOT NULL,
	`requires_re_ack` integer DEFAULT true NOT NULL,
	`change_note` text,
	`supersedes_version_id` text,
	`published_at` text,
	`published_by_user_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`published_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pol_org_idx` ON `policies` (`organization_id`);--> statement-breakpoint
CREATE INDEX `pol_org_slug_idx` ON `policies` (`organization_id`,`slug`);--> statement-breakpoint
CREATE INDEX `pol_status_idx` ON `policies` (`status`);--> statement-breakpoint
CREATE INDEX `pa_policy_user_idx` ON `policy_acknowledgments` (`policy_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `pa_version_user_idx` ON `policy_acknowledgments` (`policy_version_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `pa_org_user_idx` ON `policy_acknowledgments` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `pv_policy_idx` ON `policy_versions` (`policy_id`);--> statement-breakpoint
CREATE INDEX `pv_policy_version_idx` ON `policy_versions` (`policy_id`,`version_number`);
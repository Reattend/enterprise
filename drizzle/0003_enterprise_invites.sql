CREATE TABLE `enterprise_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`title` text,
	`department_id` text,
	`dept_role` text,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`accepted_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_invites_token_unique` ON `enterprise_invites` (`token`);--> statement-breakpoint
CREATE INDEX `ei_org_idx` ON `enterprise_invites` (`organization_id`);--> statement-breakpoint
CREATE INDEX `ei_email_idx` ON `enterprise_invites` (`email`);--> statement-breakpoint
CREATE INDEX `ei_token_idx` ON `enterprise_invites` (`token`);--> statement-breakpoint
CREATE INDEX `ei_status_idx` ON `enterprise_invites` (`status`);
CREATE TABLE `transfer_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text,
	`role_id` text,
	`reason` text NOT NULL,
	`records_transferred` integer DEFAULT 0 NOT NULL,
	`decisions_transferred` integer DEFAULT 0 NOT NULL,
	`transfer_notes` text,
	`initiated_by_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `employee_roles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`initiated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `te_org_idx` ON `transfer_events` (`organization_id`);--> statement-breakpoint
CREATE INDEX `te_from_user_idx` ON `transfer_events` (`from_user_id`);--> statement-breakpoint
CREATE INDEX `te_to_user_idx` ON `transfer_events` (`to_user_id`);
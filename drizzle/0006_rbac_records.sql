CREATE TABLE `record_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`organization_id` text,
	`user_id` text,
	`department_id` text,
	`role_id` text,
	`shared_by` text NOT NULL,
	`shared_at` text NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `employee_roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shared_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `records` ADD `visibility` text DEFAULT 'team' NOT NULL;--> statement-breakpoint
CREATE INDEX `rs_record_idx` ON `record_shares` (`record_id`);--> statement-breakpoint
CREATE INDEX `rs_user_idx` ON `record_shares` (`user_id`);--> statement-breakpoint
CREATE INDEX `rs_dept_idx` ON `record_shares` (`department_id`);--> statement-breakpoint
CREATE INDEX `rs_role_idx` ON `record_shares` (`role_id`);--> statement-breakpoint
CREATE INDEX `rec_visibility_idx` ON `records` (`visibility`);
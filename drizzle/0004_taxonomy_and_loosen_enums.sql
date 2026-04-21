CREATE TABLE `organization_taxonomy` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`rank_order` integer DEFAULT 0 NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `employee_roles` ADD `seniority_rank` integer;--> statement-breakpoint
CREATE INDEX `ot_org_kind_idx` ON `organization_taxonomy` (`organization_id`,`kind`);--> statement-breakpoint
CREATE INDEX `ot_org_kind_rank_idx` ON `organization_taxonomy` (`organization_id`,`kind`,`rank_order`);
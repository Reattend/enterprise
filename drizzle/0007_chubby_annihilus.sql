CREATE TABLE `wiki_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`page_type` text NOT NULL,
	`page_key` text NOT NULL,
	`summary` text NOT NULL,
	`record_count` integer DEFAULT 0 NOT NULL,
	`last_record_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`generated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ws_org_page_idx` ON `wiki_summaries` (`organization_id`,`page_type`,`page_key`);--> statement-breakpoint
CREATE INDEX `ws_dirty_idx` ON `wiki_summaries` (`dirty`);
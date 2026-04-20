CREATE TABLE `ask_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`question` text NOT NULL,
	`answer_text` text NOT NULL,
	`sources` text,
	`rating` text NOT NULL,
	`created_at` text NOT NULL
);

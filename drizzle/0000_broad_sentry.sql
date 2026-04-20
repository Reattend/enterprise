CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`object_type` text NOT NULL,
	`object_id` text NOT NULL,
	`meta` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text DEFAULT 'Desktop App' NOT NULL,
	`token_hash` text NOT NULL,
	`token_prefix` text NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`record_id` text,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`file_path` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `board_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`from_node_id` text NOT NULL,
	`to_node_id` text NOT NULL,
	`kind` text DEFAULT 'arrow' NOT NULL,
	`label` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_node_id`) REFERENCES `board_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_node_id`) REFERENCES `board_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `board_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`node_type` text NOT NULL,
	`record_id` text,
	`content` text,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`width` real DEFAULT 200,
	`height` real DEFAULT 100,
	`color` text DEFAULT '#fef08a',
	`locked` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`state` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`title` text NOT NULL,
	`messages` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`record_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `embeddings` (
	`record_id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`vector` text NOT NULL,
	`model` text DEFAULT 'mock' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`normalized` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entity_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`entity_name` text NOT NULL,
	`entity_type` text DEFAULT 'person' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`raw_facts` text DEFAULT '[]' NOT NULL,
	`record_ids` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feedback_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`name` text,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`admin_notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `game_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`player_id` text NOT NULL,
	`action_type` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `game_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_players` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`player_id` text NOT NULL,
	`name` text NOT NULL,
	`is_host` integer DEFAULT false,
	`last_seen_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `game_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`game_type` text NOT NULL,
	`host_id` text NOT NULL,
	`host_name` text NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`phase` text DEFAULT 'lobby' NOT NULL,
	`state` text DEFAULT '{}' NOT NULL,
	`config` text,
	`max_players` integer DEFAULT 50,
	`version` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inbox_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`object_type` text,
	`object_id` text,
	`status` text DEFAULT 'unread' NOT NULL,
	`snoozed_until` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `integration_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`app_name` text NOT NULL,
	`email` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `integrations_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`logo_url` text,
	`status` text DEFAULT 'coming_soon' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `integrations_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`integration_key` text NOT NULL,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` text,
	`settings` text,
	`last_synced_at` text,
	`sync_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `job_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`result` text,
	`error` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` text NOT NULL,
	`used` integer DEFAULT false,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`price_monthly` real NOT NULL,
	`features` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_records` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`record_id` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`record_id` text NOT NULL,
	`proposed_project_name` text NOT NULL,
	`confidence` real DEFAULT 0.5,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text DEFAULT '#6366f1',
	`is_default` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `raw_items` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`source_id` text,
	`external_id` text,
	`author` text,
	`occurred_at` text,
	`text` text NOT NULL,
	`metadata` text,
	`status` text DEFAULT 'new' NOT NULL,
	`triage_result` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `record_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`record_id` text NOT NULL,
	`date` text NOT NULL,
	`label` text NOT NULL,
	`type` text DEFAULT 'reminder' NOT NULL,
	`done` integer DEFAULT false,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `record_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`entity_id` text NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `record_links` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`from_record_id` text NOT NULL,
	`to_record_id` text NOT NULL,
	`kind` text NOT NULL,
	`weight` real DEFAULT 0.5,
	`explanation` text,
	`locked` integer DEFAULT false,
	`created_by` text DEFAULT 'agent' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`raw_item_id` text,
	`type` text DEFAULT 'note' NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content` text,
	`confidence` real DEFAULT 0.5,
	`tags` text,
	`locked` integer DEFAULT false,
	`source` text,
	`source_id` text,
	`occurred_at` text,
	`meta` text,
	`triage_status` text DEFAULT 'needs_review' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`raw_item_id`) REFERENCES `raw_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shared_links` (
	`id` text PRIMARY KEY NOT NULL,
	`share_token` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content` text,
	`record_type` text DEFAULT 'note' NOT NULL,
	`tags` text,
	`meta` text,
	`entities` text,
	`device_id` text,
	`user_id` text,
	`expires_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `slack_game_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`user_id` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `slack_game_prompts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `slack_game_prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`question` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`message_ts` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `slack_game_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`team_name` text,
	`bot_token` text NOT NULL,
	`installed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`kind` text DEFAULT 'manual' NOT NULL,
	`label` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `standup_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`channel_name` text,
	`questions` text NOT NULL,
	`schedule_days` text NOT NULL,
	`schedule_time` text NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`participants` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `standup_teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `standup_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`answers` text NOT NULL,
	`submitted_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `standup_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `standup_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`config_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'collecting' NOT NULL,
	`summary_ts` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`config_id`) REFERENCES `standup_configs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `standup_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`slack_team_id` text NOT NULL,
	`slack_team_name` text,
	`bot_token` text NOT NULL,
	`installed_by` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_key` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`trial_ends_at` text,
	`renews_at` text,
	`paddle_subscription_id` text,
	`paddle_customer_id` text,
	`meta` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams_recap_installs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`team_id` text,
	`channel_id` text,
	`conversation_id` text,
	`service_url` text NOT NULL,
	`installed_by` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teams_recap_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text,
	`decisions` text,
	`action_items` text,
	`notes` text,
	`submitted_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `teams_recap_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams_recap_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`install_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`triggered_by` text NOT NULL,
	`triggered_by_name` text,
	`status` text DEFAULT 'collecting' NOT NULL,
	`card_activity_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`install_id`) REFERENCES `teams_recap_installs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usage_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text,
	`user_id` text,
	`date` text NOT NULL,
	`ops_count` integer DEFAULT 0 NOT NULL,
	`tier` text DEFAULT 'anonymous' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text,
	`avatar_url` text,
	`onboarding_completed` integer DEFAULT false,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'personal' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `al_workspace_idx` ON `activity_log` (`workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE INDEX `api_token_user_idx` ON `api_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_token_hash_idx` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `att_record_idx` ON `attachments` (`record_id`);--> statement-breakpoint
CREATE INDEX `att_workspace_idx` ON `attachments` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `bn_board_idx` ON `board_nodes` (`board_id`);--> statement-breakpoint
CREATE INDEX `board_workspace_idx` ON `boards` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `cs_user_idx` ON `chat_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `cs_updated_idx` ON `chat_sessions` (`updated_at`);--> statement-breakpoint
CREATE INDEX `ent_workspace_idx` ON `entities` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `ent_normalized_idx` ON `entities` (`normalized`);--> statement-breakpoint
CREATE INDEX `ep_workspace_idx` ON `entity_profiles` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `ep_entity_name_idx` ON `entity_profiles` (`workspace_id`,`entity_name`);--> statement-breakpoint
CREATE INDEX `ga_room_idx` ON `game_actions` (`room_id`);--> statement-breakpoint
CREATE INDEX `ga_room_action_idx` ON `game_actions` (`room_id`,`action_type`);--> statement-breakpoint
CREATE INDEX `gp_room_idx` ON `game_players` (`room_id`);--> statement-breakpoint
CREATE INDEX `gp_player_idx` ON `game_players` (`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_rooms_code_unique` ON `game_rooms` (`code`);--> statement-breakpoint
CREATE INDEX `gr_code_idx` ON `game_rooms` (`code`);--> statement-breakpoint
CREATE INDEX `gr_status_idx` ON `game_rooms` (`status`);--> statement-breakpoint
CREATE INDEX `gr_expires_idx` ON `game_rooms` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_catalog_key_unique` ON `integrations_catalog` (`key`);--> statement-breakpoint
CREATE INDEX `ic_user_integration_idx` ON `integrations_connections` (`user_id`,`integration_key`);--> statement-breakpoint
CREATE INDEX `jq_status_idx` ON `job_queue` (`status`);--> statement-breakpoint
CREATE INDEX `jq_type_idx` ON `job_queue` (`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `plans_key_unique` ON `plans` (`key`);--> statement-breakpoint
CREATE INDEX `pr_project_idx` ON `project_records` (`project_id`);--> statement-breakpoint
CREATE INDEX `pr_record_idx` ON `project_records` (`record_id`);--> statement-breakpoint
CREATE INDEX `proj_workspace_idx` ON `projects` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `ri_workspace_idx` ON `raw_items` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `ri_status_idx` ON `raw_items` (`status`);--> statement-breakpoint
CREATE INDEX `ri_external_id_idx` ON `raw_items` (`external_id`);--> statement-breakpoint
CREATE INDEX `ri_source_idx` ON `raw_items` (`source_id`);--> statement-breakpoint
CREATE INDEX `rd_workspace_idx` ON `record_dates` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `rd_record_idx` ON `record_dates` (`record_id`);--> statement-breakpoint
CREATE INDEX `rd_date_idx` ON `record_dates` (`date`);--> statement-breakpoint
CREATE INDEX `re_record_idx` ON `record_entities` (`record_id`);--> statement-breakpoint
CREATE INDEX `re_entity_idx` ON `record_entities` (`entity_id`);--> statement-breakpoint
CREATE INDEX `rl_from_idx` ON `record_links` (`from_record_id`);--> statement-breakpoint
CREATE INDEX `rl_to_idx` ON `record_links` (`to_record_id`);--> statement-breakpoint
CREATE INDEX `rec_workspace_idx` ON `records` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `rec_type_idx` ON `records` (`type`);--> statement-breakpoint
CREATE INDEX `rec_triage_status_idx` ON `records` (`triage_status`);--> statement-breakpoint
CREATE UNIQUE INDEX `shared_links_share_token_unique` ON `shared_links` (`share_token`);--> statement-breakpoint
CREATE INDEX `sl_token_idx` ON `shared_links` (`share_token`);--> statement-breakpoint
CREATE INDEX `slack_answer_prompt_idx` ON `slack_game_answers` (`prompt_id`);--> statement-breakpoint
CREATE INDEX `slack_prompt_team_idx` ON `slack_game_prompts` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `slack_game_teams_team_id_unique` ON `slack_game_teams` (`team_id`);--> statement-breakpoint
CREATE INDEX `standup_config_team_idx` ON `standup_configs` (`team_id`);--> statement-breakpoint
CREATE INDEX `standup_config_channel_idx` ON `standup_configs` (`channel_id`);--> statement-breakpoint
CREATE INDEX `standup_response_session_idx` ON `standup_responses` (`session_id`);--> statement-breakpoint
CREATE INDEX `standup_response_user_idx` ON `standup_responses` (`user_id`);--> statement-breakpoint
CREATE INDEX `standup_session_config_idx` ON `standup_sessions` (`config_id`);--> statement-breakpoint
CREATE INDEX `standup_session_date_idx` ON `standup_sessions` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `standup_teams_slack_team_id_unique` ON `standup_teams` (`slack_team_id`);--> statement-breakpoint
CREATE INDEX `sub_user_idx` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `teams_recap_tenant_channel_idx` ON `teams_recap_installs` (`tenant_id`,`channel_id`);--> statement-breakpoint
CREATE INDEX `teams_recap_conversation_idx` ON `teams_recap_installs` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `teams_recap_response_session_idx` ON `teams_recap_responses` (`session_id`);--> statement-breakpoint
CREATE INDEX `teams_recap_response_user_idx` ON `teams_recap_responses` (`user_id`);--> statement-breakpoint
CREATE INDEX `teams_recap_session_install_idx` ON `teams_recap_sessions` (`install_id`);--> statement-breakpoint
CREATE INDEX `teams_recap_session_status_idx` ON `teams_recap_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `ud_device_date_idx` ON `usage_daily` (`device_id`,`date`);--> statement-breakpoint
CREATE INDEX `ud_user_date_idx` ON `usage_daily` (`user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `wm_workspace_idx` ON `workspace_members` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `wm_user_idx` ON `workspace_members` (`user_id`);
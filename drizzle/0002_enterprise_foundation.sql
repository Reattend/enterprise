CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`department_id` text,
	`user_id` text,
	`user_email` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`ip_address` text,
	`user_agent` text,
	`metadata` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`department_id` text,
	`workspace_id` text NOT NULL,
	`record_id` text,
	`title` text NOT NULL,
	`context` text,
	`rationale` text,
	`outcome` text,
	`decided_by_user_id` text,
	`decided_by_role_id` text,
	`decided_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`superseded_by_id` text,
	`reversed_at` text,
	`reversed_by_user_id` text,
	`reversed_reason` text,
	`tags` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`decided_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`decided_by_role_id`) REFERENCES `employee_roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reversed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `department_members` (
	`id` text PRIMARY KEY NOT NULL,
	`department_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`parent_id` text,
	`kind` text DEFAULT 'department' NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`head_user_id` text,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`head_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employee_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`department_id` text,
	`title` text NOT NULL,
	`description` text,
	`seniority` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `knowledge_health` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`department_id` text,
	`total_records` integer DEFAULT 0 NOT NULL,
	`stale_count` integer DEFAULT 0 NOT NULL,
	`contradictions_count` integer DEFAULT 0 NOT NULL,
	`gaps_count` integer DEFAULT 0 NOT NULL,
	`orphaned_count` integer DEFAULT 0 NOT NULL,
	`health_score` real DEFAULT 100 NOT NULL,
	`findings` text,
	`computed_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`title` text,
	`offboarded_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`primary_domain` text,
	`plan` text DEFAULT 'starter' NOT NULL,
	`deployment` text DEFAULT 'saas' NOT NULL,
	`on_prem_rabbit_url` text,
	`seat_limit` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`settings` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `record_role_ownership` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`role_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`assigned_by_user_id` text,
	`assigned_at` text NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `employee_roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `role_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`transfer_notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `employee_roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sso_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`provider` text NOT NULL,
	`client_id` text,
	`client_secret_encrypted` text,
	`tenant_id` text,
	`metadata_url` text,
	`acs_url` text,
	`entity_id` text,
	`domain` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`jit_provisioning` integer DEFAULT true NOT NULL,
	`default_role` text DEFAULT 'member' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workspace_org_links` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`department_id` text,
	`visibility` text DEFAULT 'department_only' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_org_idx` ON `audit_log` (`organization_id`);--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `audit_created_at_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_org_created_idx` ON `audit_log` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `dec_org_idx` ON `decisions` (`organization_id`);--> statement-breakpoint
CREATE INDEX `dec_dept_idx` ON `decisions` (`department_id`);--> statement-breakpoint
CREATE INDEX `dec_workspace_idx` ON `decisions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `dec_status_idx` ON `decisions` (`status`);--> statement-breakpoint
CREATE INDEX `dec_decided_at_idx` ON `decisions` (`decided_at`);--> statement-breakpoint
CREATE INDEX `dm_dept_user_idx` ON `department_members` (`department_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `dm_user_idx` ON `department_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `dm_org_idx` ON `department_members` (`organization_id`);--> statement-breakpoint
CREATE INDEX `dept_org_idx` ON `departments` (`organization_id`);--> statement-breakpoint
CREATE INDEX `dept_parent_idx` ON `departments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `dept_org_slug_idx` ON `departments` (`organization_id`,`slug`);--> statement-breakpoint
CREATE INDEX `er_org_idx` ON `employee_roles` (`organization_id`);--> statement-breakpoint
CREATE INDEX `er_dept_idx` ON `employee_roles` (`department_id`);--> statement-breakpoint
CREATE INDEX `kh_org_idx` ON `knowledge_health` (`organization_id`);--> statement-breakpoint
CREATE INDEX `kh_dept_idx` ON `knowledge_health` (`department_id`);--> statement-breakpoint
CREATE INDEX `kh_computed_at_idx` ON `knowledge_health` (`computed_at`);--> statement-breakpoint
CREATE INDEX `om_org_user_idx` ON `organization_members` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `om_user_idx` ON `organization_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `om_status_idx` ON `organization_members` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `org_slug_idx` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `org_domain_idx` ON `organizations` (`primary_domain`);--> statement-breakpoint
CREATE INDEX `rro_record_idx` ON `record_role_ownership` (`record_id`);--> statement-breakpoint
CREATE INDEX `rro_role_idx` ON `record_role_ownership` (`role_id`);--> statement-breakpoint
CREATE INDEX `rro_org_idx` ON `record_role_ownership` (`organization_id`);--> statement-breakpoint
CREATE INDEX `ra_role_idx` ON `role_assignments` (`role_id`);--> statement-breakpoint
CREATE INDEX `ra_user_idx` ON `role_assignments` (`user_id`);--> statement-breakpoint
CREATE INDEX `ra_current_idx` ON `role_assignments` (`role_id`,`ended_at`);--> statement-breakpoint
CREATE INDEX `sso_org_idx` ON `sso_configs` (`organization_id`);--> statement-breakpoint
CREATE INDEX `sso_domain_idx` ON `sso_configs` (`domain`);--> statement-breakpoint
CREATE INDEX `wol_org_idx` ON `workspace_org_links` (`organization_id`);--> statement-breakpoint
CREATE INDEX `wol_dept_idx` ON `workspace_org_links` (`department_id`);
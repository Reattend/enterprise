import { sqliteTable, text, integer, real, blob, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Users ──────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Workspaces ─────────────────────────────────────────
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  type: text('type', { enum: ['personal', 'team'] }).notNull().default('personal'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const workspaceMembers = sqliteTable('workspace_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull().default('member'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('wm_workspace_idx').on(table.workspaceId),
  userIdx: index('wm_user_idx').on(table.userId),
}))

export const workspaceInvites = sqliteTable('workspace_invites', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
  status: text('status', { enum: ['pending', 'accepted', 'expired'] }).notNull().default('pending'),
  invitedBy: text('invited_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text('expires_at'),
})

// ─── Sources ────────────────────────────────────────────
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['manual', 'email', 'calendar', 'chat', 'document', 'web', 'api', 'integration'] }).notNull().default('manual'),
  label: text('label').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Raw Inbox Items ────────────────────────────────────
export const rawItems = sqliteTable('raw_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').references(() => sources.id),
  externalId: text('external_id'),
  author: text('author'), // JSON string
  occurredAt: text('occurred_at'),
  text: text('text').notNull(),
  metadata: text('metadata'), // JSON string
  status: text('status', { enum: ['new', 'triaged', 'ignored'] }).notNull().default('new'),
  triageResult: text('triage_result'), // JSON - full agent output
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('ri_workspace_idx').on(table.workspaceId),
  statusIdx: index('ri_status_idx').on(table.status),
  externalIdIdx: index('ri_external_id_idx').on(table.externalId),
  sourceIdx: index('ri_source_idx').on(table.sourceId),
}))

// ─── Records (Curated Memories) ─────────────────────────
export const records = sqliteTable('records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  rawItemId: text('raw_item_id').references(() => rawItems.id),
  type: text('type', { enum: ['decision', 'insight', 'meeting', 'idea', 'context', 'tasklike', 'note', 'transcript'] }).notNull().default('note'),
  title: text('title').notNull(),
  summary: text('summary'),
  content: text('content'),
  confidence: real('confidence').default(0.5),
  tags: text('tags'), // JSON array
  locked: integer('locked', { mode: 'boolean' }).default(false),
  source: text('source'), // e.g. 'manual', 'gmail', 'slack'
  sourceId: text('source_id'), // external ID from source system
  occurredAt: text('occurred_at'), // when the event originally happened
  meta: text('meta'), // JSON string for extra metadata
  triageStatus: text('triage_status', { enum: ['auto_accepted', 'needs_review'] }).notNull().default('needs_review'),
  // RBAC visibility level. Enterprise-only; Personal Reattend still works
  // with the default 'team' value because workspace_members governs access
  // there. For Enterprise:
  //   - private    → only createdBy sees it
  //   - team       → members of the backing workspace (default)
  //   - department → any user in the dept the workspace is linked to, via
  //                  workspace_org_links + role cascade
  //   - org        → everyone in the org
  // Explicit cross-dept/user sharing lives in record_shares.
  visibility: text('visibility', { enum: ['private', 'team', 'department', 'org'] }).notNull().default('team'),
  createdBy: text('created_by').notNull(), // user id or 'agent'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('rec_workspace_idx').on(table.workspaceId),
  typeIdx: index('rec_type_idx').on(table.type),
  triageStatusIdx: index('rec_triage_status_idx').on(table.triageStatus),
  visibilityIdx: index('rec_visibility_idx').on(table.visibility),
}))

// ─── Attachments ────────────────────────────────────────
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  recordId: text('record_id').references(() => records.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(), // mime type
  fileSize: integer('file_size').notNull(),
  filePath: text('file_path').notNull(), // relative path under data/uploads/
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  recordIdx: index('att_record_idx').on(table.recordId),
  workspaceIdx: index('att_workspace_idx').on(table.workspaceId),
}))

// ─── Entities ───────────────────────────────────────────
export const entities = sqliteTable('entities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['person', 'org', 'topic', 'product', 'project', 'custom'] }).notNull(),
  name: text('name').notNull(),
  normalized: text('normalized').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('ent_workspace_idx').on(table.workspaceId),
  normalizedIdx: index('ent_normalized_idx').on(table.normalized),
}))

export const recordEntities = sqliteTable('record_entities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recordId: text('record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
}, (table) => ({
  recordIdx: index('re_record_idx').on(table.recordId),
  entityIdx: index('re_entity_idx').on(table.entityId),
}))

// ─── Record Links (Graph Edges) ─────────────────────────
export const recordLinks = sqliteTable('record_links', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  fromRecordId: text('from_record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
  toRecordId: text('to_record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['same_topic', 'depends_on', 'contradicts', 'continuation_of', 'same_people', 'causes', 'temporal', 'related_to', 'leads_to', 'supports', 'part_of', 'blocks'] }).notNull(),
  weight: real('weight').default(0.5),
  explanation: text('explanation'),
  locked: integer('locked', { mode: 'boolean' }).default(false),
  createdBy: text('created_by').notNull().default('agent'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  fromIdx: index('rl_from_idx').on(table.fromRecordId),
  toIdx: index('rl_to_idx').on(table.toRecordId),
}))

// ─── Embeddings ─────────────────────────────────────────
export const embeddings = sqliteTable('embeddings', {
  recordId: text('record_id').primaryKey().references(() => records.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  vector: text('vector').notNull(), // JSON array of floats
  model: text('model').notNull().default('mock'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Projects ───────────────────────────────────────────
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#6366f1'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('proj_workspace_idx').on(table.workspaceId),
}))

export const projectRecords = sqliteTable('project_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  recordId: text('record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
}, (table) => ({
  projectIdx: index('pr_project_idx').on(table.projectId),
  recordIdx: index('pr_record_idx').on(table.recordId),
}))

export const projectSuggestions = sqliteTable('project_suggestions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  recordId: text('record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
  proposedProjectName: text('proposed_project_name').notNull(),
  confidence: real('confidence').default(0.5),
  reason: text('reason'),
  status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Boards (Whiteboard) ────────────────────────────────
export const boards = sqliteTable('boards', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  state: text('state'), // JSON blob: { customNodes, customEdges, comments, memoryPositions }
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('board_workspace_idx').on(table.workspaceId),
}))

export const boardNodes = sqliteTable('board_nodes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  nodeType: text('node_type', { enum: ['record', 'sticky', 'group', 'text'] }).notNull(),
  recordId: text('record_id').references(() => records.id),
  content: text('content'),
  x: real('x').notNull().default(0),
  y: real('y').notNull().default(0),
  width: real('width').default(200),
  height: real('height').default(100),
  color: text('color').default('#fef08a'),
  locked: integer('locked', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  boardIdx: index('bn_board_idx').on(table.boardId),
}))

export const boardEdges = sqliteTable('board_edges', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  fromNodeId: text('from_node_id').notNull().references(() => boardNodes.id, { onDelete: 'cascade' }),
  toNodeId: text('to_node_id').notNull().references(() => boardNodes.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['arrow', 'link'] }).notNull().default('arrow'),
  label: text('label'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Comments & Activity ────────────────────────────────
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  recordId: text('record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  actor: text('actor').notNull(), // user id or 'agent'
  action: text('action').notNull(),
  objectType: text('object_type').notNull(),
  objectId: text('object_id').notNull(),
  meta: text('meta'), // JSON
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('al_workspace_idx').on(table.workspaceId),
}))

// ─── Billing ────────────────────────────────────────────
export const plans = sqliteTable('plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key', { enum: ['normal', 'smart'] }).notNull().unique(),
  name: text('name').notNull(),
  priceMonthly: real('price_monthly').notNull(),
  features: text('features').notNull(), // JSON array
})

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planKey: text('plan_key').notNull(), // 'normal' | 'smart'
  status: text('status', { enum: ['active', 'trialing', 'canceled', 'past_due', 'expired'] }).notNull().default('active'),
  trialEndsAt: text('trial_ends_at'),
  renewsAt: text('renews_at'),
  paddleSubscriptionId: text('paddle_subscription_id'),
  paddleCustomerId: text('paddle_customer_id'),
  meta: text('meta'), // JSON
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdx: index('sub_user_idx').on(table.userId),
}))

// ─── Integrations ───────────────────────────────────────
export const integrationsCatalog = sqliteTable('integrations_catalog', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  logoUrl: text('logo_url'),
  status: text('status', { enum: ['coming_soon', 'beta', 'active'] }).notNull().default('coming_soon'),
})

export const integrationsConnections = sqliteTable('integrations_connections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  integrationKey: text('integration_key').notNull(),
  status: text('status', { enum: ['disconnected', 'connected', 'error'] }).notNull().default('disconnected'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: text('token_expires_at'),
  settings: text('settings'), // JSON — domain whitelist, sync prefs
  lastSyncedAt: text('last_synced_at'),
  syncError: text('sync_error'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIntegrationIdx: index('ic_user_integration_idx').on(table.userId, table.integrationKey),
}))

// ─── Job Queue ──────────────────────────────────────────
export const jobQueue = sqliteTable('job_queue', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull(),
  type: text('type', { enum: ['triage', 'ingest', 'embed', 'link', 'project_suggest'] }).notNull(),
  payload: text('payload').notNull(), // JSON
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).notNull().default('pending'),
  result: text('result'), // JSON
  error: text('error'),
  attempts: integer('attempts').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
}, (table) => ({
  statusIdx: index('jq_status_idx').on(table.status),
  typeIdx: index('jq_type_idx').on(table.type),
}))

// ─── Inbox Notifications ────────────────────────────────
export const inboxNotifications = sqliteTable('inbox_notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['todo', 'decision_pending', 'suggestion', 'mention', 'system', 'reminder', 'needs_review', 'rejected'] }).notNull(),
  title: text('title').notNull(),
  body: text('body'),
  objectType: text('object_type'),
  objectId: text('object_id'),
  status: text('status', { enum: ['unread', 'read', 'done'] }).notNull().default('unread'),
  snoozedUntil: text('snoozed_until'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── API Tokens (for desktop app / tray) ─────────────────
export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Desktop App'),
  tokenHash: text('token_hash').notNull(), // SHA-256 hash of the token
  tokenPrefix: text('token_prefix').notNull(), // first 8 chars for identification
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'), // null = never expires
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdx: index('api_token_user_idx').on(table.userId),
  hashIdx: index('api_token_hash_idx').on(table.tokenHash),
}))

// ─── Admin Users ─────────────────────────────────────────
export const adminUsers = sqliteTable('admin_users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['super_admin', 'viewer'] }).notNull().default('viewer'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Feedback & Inquiries ────────────────────────────────
export const feedbackRequests = sqliteTable('feedback_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  name: text('name'),
  type: text('type', { enum: ['feedback', 'feature_request', 'enterprise_inquiry', 'bug_report'] }).notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['new', 'reviewed', 'resolved'] }).notNull().default('new'),
  adminNotes: text('admin_notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── OTP Codes ──────────────────────────────────────────
export const otpCodes = sqliteTable('otp_codes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: text('expires_at').notNull(),
  used: integer('used', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Slack Memory Match Game ────────────────────────────
export const slackGameTeams = sqliteTable('slack_game_teams', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text('team_id').notNull().unique(),
  teamName: text('team_name'),
  botToken: text('bot_token').notNull(),
  installedAt: text('installed_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const slackGamePrompts = sqliteTable('slack_game_prompts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text('team_id').notNull(),
  channelId: text('channel_id').notNull(),
  question: text('question').notNull(),
  status: text('status', { enum: ['active', 'closed'] }).notNull().default('active'),
  messageTs: text('message_ts'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  teamIdx: index('slack_prompt_team_idx').on(table.teamId),
}))

export const slackGameAnswers = sqliteTable('slack_game_answers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  promptId: text('prompt_id').notNull().references(() => slackGamePrompts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  answer: text('answer').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  promptIdx: index('slack_answer_prompt_idx').on(table.promptId),
}))

// ─── Slack Async Standup Bot ─────────────────────────────
export const standupTeams = sqliteTable('standup_teams', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slackTeamId: text('slack_team_id').notNull().unique(),
  slackTeamName: text('slack_team_name'),
  botToken: text('bot_token').notNull(),
  installedBy: text('installed_by'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const standupConfigs = sqliteTable('standup_configs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text('team_id').notNull().references(() => standupTeams.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull(),
  channelName: text('channel_name'),
  questions: text('questions').notNull(), // JSON array of strings
  scheduleDays: text('schedule_days').notNull(), // JSON array e.g. [1,2,3,4,5]
  scheduleTime: text('schedule_time').notNull(), // "09:00" (24h)
  timezone: text('timezone').notNull().default('America/New_York'),
  participants: text('participants'), // JSON array of Slack user IDs (null = all channel members)
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  teamIdx: index('standup_config_team_idx').on(table.teamId),
  channelIdx: index('standup_config_channel_idx').on(table.channelId),
}))

export const standupSessions = sqliteTable('standup_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  configId: text('config_id').notNull().references(() => standupConfigs.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // "2026-02-20"
  status: text('status', { enum: ['collecting', 'posted'] }).notNull().default('collecting'),
  summaryTs: text('summary_ts'), // Slack message ts for summary post
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  configIdx: index('standup_session_config_idx').on(table.configId),
  dateIdx: index('standup_session_date_idx').on(table.date),
}))

export const standupResponses = sqliteTable('standup_responses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => standupSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  answers: text('answers').notNull(), // JSON array of strings (parallel to questions)
  submittedAt: text('submitted_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sessionIdx: index('standup_response_session_idx').on(table.sessionId),
  userIdx: index('standup_response_user_idx').on(table.userId),
}))

// ─── MS Teams Meeting Recap Bot ─────────────────────────────
export const teamsRecapInstalls = sqliteTable('teams_recap_installs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  teamId: text('team_id'),
  channelId: text('channel_id'),
  conversationId: text('conversation_id'),
  serviceUrl: text('service_url').notNull(),
  installedBy: text('installed_by'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  tenantChannelIdx: index('teams_recap_tenant_channel_idx').on(table.tenantId, table.channelId),
  conversationIdx: index('teams_recap_conversation_idx').on(table.conversationId),
}))

export const teamsRecapSessions = sqliteTable('teams_recap_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  installId: text('install_id').notNull().references(() => teamsRecapInstalls.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id').notNull(),
  triggeredBy: text('triggered_by').notNull(),
  triggeredByName: text('triggered_by_name'),
  status: text('status', { enum: ['collecting', 'posted'] }).notNull().default('collecting'),
  cardActivityId: text('card_activity_id'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  installIdx: index('teams_recap_session_install_idx').on(table.installId),
  statusIdx: index('teams_recap_session_status_idx').on(table.status),
}))

export const teamsRecapResponses = sqliteTable('teams_recap_responses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => teamsRecapSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  userName: text('user_name'),
  decisions: text('decisions'),
  actionItems: text('action_items'),
  notes: text('notes'),
  submittedAt: text('submitted_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sessionIdx: index('teams_recap_response_session_idx').on(table.sessionId),
  userIdx: index('teams_recap_response_user_idx').on(table.userId),
}))

// ─── Integration Requests ─────────────────────────────────
export const integrationRequests = sqliteTable('integration_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  appName: text('app_name').notNull(),
  email: text('email'),
  status: text('status', { enum: ['new', 'reviewed'] }).notNull().default('new'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Game Rooms (Multiplayer) ─────────────────────────────
export const gameRooms = sqliteTable('game_rooms', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  gameType: text('game_type').notNull(),
  hostId: text('host_id').notNull(),
  hostName: text('host_name').notNull(),
  status: text('status', { enum: ['lobby', 'playing', 'finished'] }).notNull().default('lobby'),
  phase: text('phase').notNull().default('lobby'),
  state: text('state').notNull().default('{}'),
  config: text('config'),
  maxPlayers: integer('max_players').default(50),
  version: integer('version').notNull().default(0),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  codeIdx: index('gr_code_idx').on(table.code),
  statusIdx: index('gr_status_idx').on(table.status),
  expiresIdx: index('gr_expires_idx').on(table.expiresAt),
}))

export const gamePlayers = sqliteTable('game_players', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => gameRooms.id, { onDelete: 'cascade' }),
  playerId: text('player_id').notNull(),
  name: text('name').notNull(),
  isHost: integer('is_host', { mode: 'boolean' }).default(false),
  lastSeenAt: text('last_seen_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  roomIdx: index('gp_room_idx').on(table.roomId),
  playerIdx: index('gp_player_idx').on(table.playerId),
}))

export const gameActions = sqliteTable('game_actions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => gameRooms.id, { onDelete: 'cascade' }),
  playerId: text('player_id').notNull(),
  actionType: text('action_type').notNull(),
  payload: text('payload').notNull().default('{}'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  roomIdx: index('ga_room_idx').on(table.roomId),
  roomActionIdx: index('ga_room_action_idx').on(table.roomId, table.actionType),
}))

// ─── Usage Daily (metering for anonymous + registered users) ──
export const usageDaily = sqliteTable('usage_daily', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text('device_id'), // anonymous users identified by device UUID
  userId: text('user_id'), // registered users (nullable for anonymous)
  date: text('date').notNull(), // YYYY-MM-DD
  opsCount: integer('ops_count').notNull().default(0),
  tier: text('tier', { enum: ['anonymous', 'registered', 'smart'] }).notNull().default('anonymous'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  deviceDateIdx: index('ud_device_date_idx').on(table.deviceId, table.date),
  userDateIdx: index('ud_user_date_idx').on(table.userId, table.date),
}))

// ─── Record Dates (extracted deadlines, follow-ups, events) ─
export const recordDates = sqliteTable('record_dates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  recordId: text('record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  label: text('label').notNull(), // e.g. "Proposal deadline", "Follow up with John"
  type: text('type', { enum: ['deadline', 'follow_up', 'event', 'due_date', 'launch', 'reminder'] }).notNull().default('reminder'),
  done: integer('done', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('rd_workspace_idx').on(table.workspaceId),
  recordIdx: index('rd_record_idx').on(table.recordId),
  dateIdx: index('rd_date_idx').on(table.date),
}))

// ─── Chat Sessions ────────────────────────────────────────
export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  messages: text('messages').notNull().default('[]'), // JSON array
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdx: index('cs_user_idx').on(table.userId),
  updatedIdx: index('cs_updated_idx').on(table.updatedAt),
}))

// ─── Entity Profiles (LLM-maintained running summaries per entity) ──────────
// Built incrementally as records are created — used to answer "what has X done"
// queries without scanning every individual record at query time.
export const entityProfiles = sqliteTable('entity_profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  entityName: text('entity_name').notNull(),
  entityType: text('entity_type', { enum: ['person', 'client', 'project', 'topic'] }).notNull().default('person'),
  summary: text('summary').notNull().default(''),        // LLM-generated prose, regenerated periodically
  rawFacts: text('raw_facts').notNull().default('[]'),   // JSON string[], capped at 60 entries
  recordIds: text('record_ids').notNull().default('[]'), // JSON string[] of contributing record IDs
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('ep_workspace_idx').on(table.workspaceId),
  entityNameIdx: index('ep_entity_name_idx').on(table.workspaceId, table.entityName),
}))

// ─── Shared Links (public sharing for meetings/memories) ──
export const sharedLinks = sqliteTable('shared_links', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  shareToken: text('share_token').notNull().unique().$defaultFn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 12; i++) token += chars[Math.floor(Math.random() * chars.length)]
    return token
  }),
  title: text('title').notNull(),
  summary: text('summary'),
  content: text('content'),
  recordType: text('record_type').notNull().default('note'),
  tags: text('tags'), // JSON array
  meta: text('meta'), // JSON with action_items, decisions, key_points
  entities: text('entities'), // JSON array of { kind, name }
  deviceId: text('device_id'),
  userId: text('user_id'),
  expiresAt: text('expires_at'), // optional expiry
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  tokenIdx: index('sl_token_idx').on(table.shareToken),
}))

// ─── Ask Feedback ──────────────────────────────────────────
export const askFeedback = sqliteTable('ask_feedback', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  question: text('question').notNull(),
  answerText: text('answer_text').notNull(),
  sources: text('sources'),
  rating: text('rating', { enum: ['up', 'down'] }).notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ═══════════════════════════════════════════════════════════════════════════
// ENTERPRISE LAYER
// Organization → Department → (Division) → Team(workspace) → Members
// Plus: decisions, audit, SSO, employee roles, knowledge health.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Organizations ────────────────────────────────────────
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  primaryDomain: text('primary_domain'), // e.g. "acme.com" — used for SSO domain-match
  plan: text('plan', { enum: ['starter', 'business', 'enterprise', 'government'] }).notNull().default('starter'),
  deployment: text('deployment', { enum: ['saas', 'on_prem', 'air_gapped'] }).notNull().default('saas'),
  onPremRabbitUrl: text('on_prem_rabbit_url'),
  seatLimit: integer('seat_limit'),
  status: text('status', { enum: ['active', 'suspended', 'canceled'] }).notNull().default('active'),
  settings: text('settings'), // JSON — retention days, default role, etc.
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  slugIdx: index('org_slug_idx').on(table.slug),
  domainIdx: index('org_domain_idx').on(table.primaryDomain),
}))

// ─── Departments (self-referential: supports Department → Division → Team) ─
export const departments = sqliteTable('departments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'), // self-ref: null for root; set for nested units
  // Free-text kind label (customizable per-org via organization_taxonomy).
  // Default values: 'department' | 'division' | 'team'. Government orgs override
  // with values like 'Ministry', 'Directorate', 'Wing', 'Section', etc.
  // The special string 'team' triggers workspace auto-provisioning.
  kind: text('kind').notNull().default('department'),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  headUserId: text('head_user_id').references(() => users.id), // current head
  description: text('description'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('dept_org_idx').on(table.organizationId),
  parentIdx: index('dept_parent_idx').on(table.parentId),
  orgSlugIdx: index('dept_org_slug_idx').on(table.organizationId, table.slug),
}))

// ─── Organization Members ─────────────────────────────────
// Org-level membership. A user can belong to multiple orgs (consultants, contractors).
export const organizationMembers = sqliteTable('organization_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['super_admin', 'admin', 'member', 'guest'] }).notNull().default('member'),
  status: text('status', { enum: ['active', 'suspended', 'offboarded'] }).notNull().default('active'),
  title: text('title'), // free-text job title, e.g. "VP Engineering"
  offboardedAt: text('offboarded_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgUserIdx: index('om_org_user_idx').on(table.organizationId, table.userId),
  userIdx: index('om_user_idx').on(table.userId),
  statusIdx: index('om_status_idx').on(table.status),
}))

// ─── Department Members ───────────────────────────────────
// Department-level membership drives RBAC (HR sees HR, Eng sees Eng).
export const departmentMembers = sqliteTable('department_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  departmentId: text('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['dept_head', 'manager', 'member', 'viewer'] }).notNull().default('member'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  deptUserIdx: index('dm_dept_user_idx').on(table.departmentId, table.userId),
  userIdx: index('dm_user_idx').on(table.userId),
  orgIdx: index('dm_org_idx').on(table.organizationId),
}))

// ─── Employee Roles ───────────────────────────────────────
// Knowledge stays with the ROLE, not the person. When a person leaves,
// their successor inherits the role's records automatically.
export const employeeRoles = sqliteTable('employee_roles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
  title: text('title').notNull(), // e.g. "VP Engineering", "Finance Controller"
  description: text('description'),
  // Free-text seniority label — any value per-org taxonomy. Historic defaults:
  // ic/lead/manager/director/vp/c_level. Government values: Secretary/JS/DS/...
  seniority: text('seniority'),
  // Integer rank for sorting. Lower = more senior. Populated from
  // organization_taxonomy.rankOrder when a labeled entry is chosen.
  seniorityRank: integer('seniority_rank'),
  status: text('status', { enum: ['active', 'vacant', 'archived'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('er_org_idx').on(table.organizationId),
  deptIdx: index('er_dept_idx').on(table.departmentId),
}))

// ─── Role Assignments ─────────────────────────────────────
// Who held which role, when. endedAt = null means currently held.
// This enables "when Partha left, what knowledge did VP Eng lose" queries.
export const roleAssignments = sqliteTable('role_assignments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roleId: text('role_id').notNull().references(() => employeeRoles.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  startedAt: text('started_at').notNull().$defaultFn(() => new Date().toISOString()),
  endedAt: text('ended_at'), // null = current holder
  transferNotes: text('transfer_notes'), // handover context
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  roleIdx: index('ra_role_idx').on(table.roleId),
  userIdx: index('ra_user_idx').on(table.userId),
  currentIdx: index('ra_current_idx').on(table.roleId, table.endedAt),
}))

// ─── Decisions ────────────────────────────────────────────
// First-class decision tracking. Not every record is a decision, but every
// decision gets a record + a decisions row linking context, rationale, outcome.
export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  recordId: text('record_id').references(() => records.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  context: text('context'), // why this decision was needed
  rationale: text('rationale'), // why this option was chosen
  outcome: text('outcome'), // what actually happened — filled in later
  decidedByUserId: text('decided_by_user_id').references(() => users.id),
  decidedByRoleId: text('decided_by_role_id').references(() => employeeRoles.id), // survives user departures
  decidedAt: text('decided_at').notNull(),
  status: text('status', { enum: ['active', 'superseded', 'reversed', 'archived'] }).notNull().default('active'),
  supersededById: text('superseded_by_id'), // self-ref: points to newer decision
  reversedAt: text('reversed_at'),
  reversedByUserId: text('reversed_by_user_id').references(() => users.id),
  reversedReason: text('reversed_reason'),
  tags: text('tags'), // JSON array
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('dec_org_idx').on(table.organizationId),
  deptIdx: index('dec_dept_idx').on(table.departmentId),
  workspaceIdx: index('dec_workspace_idx').on(table.workspaceId),
  statusIdx: index('dec_status_idx').on(table.status),
  decidedAtIdx: index('dec_decided_at_idx').on(table.decidedAt),
}))

// ─── Audit Log ────────────────────────────────────────────
// Immutable. Separate from activity_log (which is per-workspace product events).
// Audit log captures every query, every read, every admin action — with IP, UA,
// and denormalized user email so records survive user deletion for retention.
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull(),
  departmentId: text('department_id'),
  userId: text('user_id'),
  userEmail: text('user_email').notNull(), // denormalized — survives user deletion
  action: text('action', { enum: [
    'query', 'read', 'create', 'update', 'delete', 'export',
    'login', 'logout', 'sso_login', 'role_change',
    'member_invite', 'member_remove', 'permission_change',
    'decision_create', 'decision_reverse',
    'admin_action', 'integration_connect', 'integration_disconnect',
  ] }).notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'), // JSON — query text, old/new values, etc.
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('audit_org_idx').on(table.organizationId),
  userIdx: index('audit_user_idx').on(table.userId),
  actionIdx: index('audit_action_idx').on(table.action),
  createdAtIdx: index('audit_created_at_idx').on(table.createdAt),
  orgCreatedIdx: index('audit_org_created_idx').on(table.organizationId, table.createdAt),
}))

// ─── SSO Configurations ───────────────────────────────────
export const ssoConfigs = sqliteTable('sso_configs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: ['azure_ad', 'okta', 'google_workspace', 'saml_generic', 'oidc_generic'] }).notNull(),
  clientId: text('client_id'),
  clientSecretEncrypted: text('client_secret_encrypted'), // encrypted at rest
  tenantId: text('tenant_id'), // Azure AD tenant / SAML idp id
  metadataUrl: text('metadata_url'),
  acsUrl: text('acs_url'), // SAML assertion consumer URL
  entityId: text('entity_id'),
  domain: text('domain').notNull(), // which email domain this applies to
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  justInTimeProvisioning: integer('jit_provisioning', { mode: 'boolean' }).notNull().default(true),
  defaultRole: text('default_role', { enum: ['member', 'guest'] }).notNull().default('member'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('sso_org_idx').on(table.organizationId),
  domainIdx: index('sso_domain_idx').on(table.domain),
}))

// ─── Knowledge Health ─────────────────────────────────────
// Computed per department by self-healing agents. Drives the admin dashboard.
export const knowledgeHealth = sqliteTable('knowledge_health', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'cascade' }),
  totalRecords: integer('total_records').notNull().default(0),
  staleCount: integer('stale_count').notNull().default(0),
  contradictionsCount: integer('contradictions_count').notNull().default(0),
  gapsCount: integer('gaps_count').notNull().default(0),
  orphanedCount: integer('orphaned_count').notNull().default(0), // records with no owner role
  healthScore: real('health_score').notNull().default(100), // 0-100
  findings: text('findings'), // JSON array of specific issues
  computedAt: text('computed_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('kh_org_idx').on(table.organizationId),
  deptIdx: index('kh_dept_idx').on(table.departmentId),
  computedAtIdx: index('kh_computed_at_idx').on(table.computedAt),
}))

// ─── Enterprise Workspace Links ───────────────────────────
// Workspaces remain the unit where records/memories live. In enterprise mode,
// a workspace belongs to exactly one department (and by transitivity, one org).
// Personal / team workspaces (inherited from Personal Reattend) leave these null.
export const workspaceOrgLinks = sqliteTable('workspace_org_links', {
  workspaceId: text('workspace_id').primaryKey().references(() => workspaces.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
  visibility: text('visibility', { enum: ['department_only', 'org_wide', 'cross_dept'] }).notNull().default('department_only'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('wol_org_idx').on(table.organizationId),
  deptIdx: index('wol_dept_idx').on(table.departmentId),
}))

// ─── AI Agents ────────────────────────────────────────────
// Purpose-built AI helpers — each one is Chat with a specific system prompt,
// scoped to specific knowledge sources. Org-level (available to everyone),
// departmental (scoped to dept members), or personal (one user only).
// Deployment targets: web (default), slack, teams, email, api.
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  tier: text('tier', { enum: ['org', 'departmental', 'personal', 'third_party'] }).notNull().default('org'),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
  ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'set null' }), // for personal agents
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  iconName: text('icon_name'), // lucide icon name, e.g. "FileText"
  color: text('color'), // e.g. "text-blue-500"
  systemPrompt: text('system_prompt').notNull(), // persona + rules
  // Scope JSON: { types: ['policy']? , departmentIds: []?, recordIds: []?, tags: []? }
  // Empty scope = all accessible records.
  scopeConfig: text('scope_config'),
  deploymentTargets: text('deployment_targets').notNull().default('[]'), // JSON array: ['web', 'slack', ...]
  usageCount: integer('usage_count').notNull().default(0),
  status: text('status', { enum: ['active', 'archived', 'draft'] }).notNull().default('active'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('ag_org_idx').on(table.organizationId),
  orgSlugIdx: index('ag_org_slug_idx').on(table.organizationId, table.slug),
  tierIdx: index('ag_tier_idx').on(table.tier),
}))

// ─── Organization Taxonomy ────────────────────────────────
// Per-org customization of department kinds and seniority ladders.
// Default orgs get standard values (department/division/team, ic/lead/...).
// Government orgs override with their own: Ministry/Department/Wing/Section,
// Secretary/Joint Secretary/Deputy Secretary/Director, etc.
// `kind='department_kind'` drives the dept tree's "kind" field.
// `kind='seniority_rank'` drives the employee_roles "seniority" field.
export const organizationTaxonomy = sqliteTable('organization_taxonomy', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['department_kind', 'seniority_rank'] }).notNull(),
  label: text('label').notNull(),
  rankOrder: integer('rank_order').notNull().default(0), // lower = more senior / higher in tree
  description: text('description'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgKindIdx: index('ot_org_kind_idx').on(table.organizationId, table.kind),
  orgKindRankIdx: index('ot_org_kind_rank_idx').on(table.organizationId, table.kind, table.rankOrder),
}))

// ─── Record shares (explicit cross-dept / user / role grants) ─────────────
// Lets a team-scoped record be shared out to another department, a specific
// role, or a named user. Exactly one of (userId, departmentId, roleId) must
// be set per row. The read-path RBAC filter OR-joins these with the record's
// own visibility level.
export const recordShares = sqliteTable('record_shares', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recordId: text('record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull(), // for fast workspace-scoped reads
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'cascade' }),
  roleId: text('role_id').references(() => employeeRoles.id, { onDelete: 'cascade' }),
  sharedBy: text('shared_by').notNull().references(() => users.id),
  sharedAt: text('shared_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  recordIdx: index('rs_record_idx').on(table.recordId),
  userIdx: index('rs_user_idx').on(table.userId),
  deptIdx: index('rs_dept_idx').on(table.departmentId),
  roleIdx: index('rs_role_idx').on(table.roleId),
}))

// ─── Enterprise Invites (pending, pre-signup) ─────────────
// Outstanding invitations sent to people who don't have a Reattend Enterprise
// account yet. Once the recipient visits the token URL and accepts, we create
// their user + add them to the org + optionally a department in one txn.
// Workflow:
//   invited -> (email sent) -> user clicks link
//   -> /enterprise-invite/[token] -> sign in OR create account
//   -> POST /accept -> status='accepted', org membership created
// Tokens are opaque random strings (32 hex). Expiry default: 14 days.
export const enterpriseInvites = sqliteTable('enterprise_invites', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['super_admin', 'admin', 'member', 'guest'] }).notNull().default('member'),
  title: text('title'),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
  deptRole: text('dept_role', { enum: ['dept_head', 'manager', 'member', 'viewer'] }),
  token: text('token').notNull().unique(),
  status: text('status', { enum: ['pending', 'accepted', 'expired', 'canceled'] }).notNull().default('pending'),
  invitedByUserId: text('invited_by_user_id').notNull().references(() => users.id),
  expiresAt: text('expires_at').notNull(),
  acceptedAt: text('accepted_at'),
  acceptedByUserId: text('accepted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('ei_org_idx').on(table.organizationId),
  emailIdx: index('ei_email_idx').on(table.email),
  tokenIdx: index('ei_token_idx').on(table.token),
  statusIdx: index('ei_status_idx').on(table.status),
}))

// ─── Record Role Ownership ────────────────────────────────
// Links a record to the employee role that owns it. Survives user departure —
// when the next person takes the role, they inherit access automatically.
export const recordRoleOwnership = sqliteTable('record_role_ownership', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recordId: text('record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => employeeRoles.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  assignedByUserId: text('assigned_by_user_id').references(() => users.id),
  assignedAt: text('assigned_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  recordIdx: index('rro_record_idx').on(table.recordId),
  roleIdx: index('rro_role_idx').on(table.roleId),
  orgIdx: index('rro_org_idx').on(table.organizationId),
}))

// ─── Wiki Summaries (Claude-generated, cached) ────────────
// A wiki page is a cached Claude summary for one of three targets:
//   dept   → organizational unit (dept, division, team, ministry, section, …)
//   topic  → a tag or entity name that crosses multiple records
//   person → a user whose contributions we're summarizing
//
// We cache the summary here so we don't re-call the LLM on every page load.
// The cache is invalidated when any linked record is updated (see staleAfter).
// Each row covers exactly one (org, pageType, pageKey) — pageKey is a deptId,
// a normalized topic slug, or a userId depending on pageType.
export const wikiSummaries = sqliteTable('wiki_summaries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  pageType: text('page_type', { enum: ['dept', 'topic', 'person'] }).notNull(),
  pageKey: text('page_key').notNull(),
  summary: text('summary').notNull(), // Claude's 100-word summary
  recordCount: integer('record_count').notNull().default(0),
  lastRecordAt: text('last_record_at'), // most-recent underlying record timestamp
  // True when the cache is known to be behind reality (new record landed
  // since we generated). Next page load regenerates.
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false),
  generatedAt: text('generated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgPageIdx: index('ws_org_page_idx').on(table.organizationId, table.pageType, table.pageKey),
  dirtyIdx: index('ws_dirty_idx').on(table.dirty),
}))

// ─── Policies (enterprise, versioned, ack-tracked) ────────
// The authoritative store of "how we do things here" — travel, security, HR,
// IT, finance, compliance. Every edit creates a new row in policy_versions;
// policies.currentVersionId points at the live one. Acks are per (user,
// policyVersionId) so changing a policy requires re-acknowledgment by default
// (admin can opt out on trivial edits via version.requiresReAck=false).
//
// Applicability JSON:
//   { allOrg: boolean, departments: string[], roles: string[], users: string[] }
// At least one scope applies; union semantics (any match = applies).
export const policies = sqliteTable('policies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  category: text('category'), // "security" | "hr" | "finance" | "it" | "travel" | "compliance" | "other"
  iconName: text('icon_name'), // lucide icon name
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  // Pointer to live version. Nullable for drafts that haven't been saved yet.
  currentVersionId: text('current_version_id'),
  effectiveDate: text('effective_date'), // ISO date; when the live version takes effect
  // JSON: { allOrg, departments, roles, users }. See module-level comment.
  applicability: text('applicability').notNull().default('{"allOrg":true,"departments":[],"roles":[],"users":[]}'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('pol_org_idx').on(table.organizationId),
  orgSlugIdx: index('pol_org_slug_idx').on(table.organizationId, table.slug),
  statusIdx: index('pol_status_idx').on(table.status),
}))

export const policyVersions = sqliteTable('policy_versions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  policyId: text('policy_id').notNull().references(() => policies.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(), // 1, 2, 3…
  title: text('title').notNull(), // snapshot of title at this version
  summary: text('summary'), // short human-readable summary
  body: text('body').notNull(), // full policy text (markdown)
  // When true, publishing this version wipes old acks and forces re-ack.
  // Admin sets false for minor typo fixes.
  requiresReAck: integer('requires_re_ack', { mode: 'boolean' }).notNull().default(true),
  changeNote: text('change_note'), // what changed vs previous version
  supersedesVersionId: text('supersedes_version_id'),
  publishedAt: text('published_at'), // null if draft
  publishedByUserId: text('published_by_user_id').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  policyIdx: index('pv_policy_idx').on(table.policyId),
  policyVersionIdx: index('pv_policy_version_idx').on(table.policyId, table.versionNumber),
}))

export const policyAcknowledgments = sqliteTable('policy_acknowledgments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  policyId: text('policy_id').notNull().references(() => policies.id, { onDelete: 'cascade' }),
  policyVersionId: text('policy_version_id').notNull().references(() => policyVersions.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  acknowledgedAt: text('acknowledged_at').notNull().$defaultFn(() => new Date().toISOString()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
}, (table) => ({
  policyUserIdx: index('pa_policy_user_idx').on(table.policyId, table.userId),
  versionUserIdx: index('pa_version_user_idx').on(table.policyVersionId, table.userId),
  orgUserIdx: index('pa_org_user_idx').on(table.organizationId, table.userId),
}))

// ─── Agent Queries (analytics / per-agent logging) ────────
// Every query handled by a named agent gets a row here. The chat API writes
// these inline so the analytics tab doesn't need to scan chat_sessions JSON.
// Ratings come from the existing ask_feedback flow — we denormalize a copy
// so per-agent "avg rating" queries stay fast.
export const agentQueries = sqliteTable('agent_queries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answerPreview: text('answer_preview'), // first 500 chars of the answer
  sourceCount: integer('source_count').notNull().default(0),
  latencyMs: integer('latency_ms'),
  rating: text('rating', { enum: ['up', 'down'] }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  agentIdx: index('aq_agent_idx').on(table.agentId),
  agentDayIdx: index('aq_agent_day_idx').on(table.agentId, table.createdAt),
}))

// ─── Agent API Keys (external deployment: Slack bot / API / Email) ────────
// Hashed at rest (sha256). The first 8 chars of the plaintext are stored in
// keyPrefix for UI display ("ak_live_abcdef12…"); the full key is shown
// exactly once at create time. Revocation is non-destructive so audit trail
// survives.
export const agentApiKeys = sqliteTable('agent_api_keys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // "Slack bot" | "Teams bot" | "CLI" | ...
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(), // first 8 chars for UI display
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  lastUsedAt: text('last_used_at'),
  revokedAt: text('revoked_at'),
}, (table) => ({
  agentIdx: index('aak_agent_idx').on(table.agentId),
  hashIdx: index('aak_hash_idx').on(table.keyHash),
}))

// ─── Knowledge Transfer Events ────────────────────────────
// One row per transfer operation. The actual record ownership moves live in
// record_role_ownership + role_assignments; this table is the audit + UX
// trail so we can render "On Mar 12, 47 records transferred from Partha
// (VP Eng) to Aditi (VP Eng)" without scanning those base tables.
export const transferEvents = sqliteTable('transfer_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  fromUserId: text('from_user_id').notNull().references(() => users.id),
  toUserId: text('to_user_id').references(() => users.id), // null = "park at role, no named successor yet"
  roleId: text('role_id').references(() => employeeRoles.id, { onDelete: 'set null' }),
  reason: text('reason', { enum: ['offboard', 'role_change', 'temporary', 'correction'] }).notNull(),
  recordsTransferred: integer('records_transferred').notNull().default(0),
  decisionsTransferred: integer('decisions_transferred').notNull().default(0),
  transferNotes: text('transfer_notes'), // handover summary authored by outgoing person / admin
  initiatedByUserId: text('initiated_by_user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orgIdx: index('te_org_idx').on(table.organizationId),
  fromUserIdx: index('te_from_user_idx').on(table.fromUserId),
  toUserIdx: index('te_to_user_idx').on(table.toUserId),
}))

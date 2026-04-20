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
  createdBy: text('created_by').notNull(), // user id or 'agent'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workspaceIdx: index('rec_workspace_idx').on(table.workspaceId),
  typeIdx: index('rec_type_idx').on(table.type),
  triageStatusIdx: index('rec_triage_status_idx').on(table.triageStatus),
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

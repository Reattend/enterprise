import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import * as schema from './schema'

const dbPath = path.resolve(process.cwd(), 'data', 'reattend.db')
const dataDir = path.dirname(dbPath)

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Create all tables from schema using raw SQL
const createTableSQL = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'personal' CHECK(type IN ('personal', 'team')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS wm_workspace_idx ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS wm_user_idx ON workspace_members(user_id);

-- Workspace Invites
CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'expired')),
  invited_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

-- Sources
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'manual' CHECK(kind IN ('manual', 'email', 'calendar', 'chat', 'document', 'web', 'api', 'integration')),
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Raw Items (Inbox)
CREATE TABLE IF NOT EXISTS raw_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES sources(id),
  external_id TEXT,
  author TEXT,
  occurred_at TEXT,
  text TEXT NOT NULL,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'triaged', 'ignored')),
  triage_result TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ri_workspace_idx ON raw_items(workspace_id);
CREATE INDEX IF NOT EXISTS ri_status_idx ON raw_items(status);

-- Records (Curated Memories)
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  raw_item_id TEXT REFERENCES raw_items(id),
  type TEXT NOT NULL DEFAULT 'note' CHECK(type IN ('decision', 'insight', 'meeting', 'idea', 'context', 'tasklike', 'note')),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  confidence REAL DEFAULT 0.5,
  tags TEXT,
  locked INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS rec_workspace_idx ON records(workspace_id);
CREATE INDEX IF NOT EXISTS rec_type_idx ON records(type);

-- Entities
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('person', 'org', 'topic', 'product', 'project', 'custom')),
  name TEXT NOT NULL,
  normalized TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ent_workspace_idx ON entities(workspace_id);
CREATE INDEX IF NOT EXISTS ent_normalized_idx ON entities(normalized);

-- Record Entities
CREATE TABLE IF NOT EXISTS record_entities (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS re_record_idx ON record_entities(record_id);
CREATE INDEX IF NOT EXISTS re_entity_idx ON record_entities(entity_id);

-- Record Links (Graph Edges)
CREATE TABLE IF NOT EXISTS record_links (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  from_record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  to_record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('same_topic', 'depends_on', 'contradicts', 'continuation_of', 'same_people', 'causes', 'temporal')),
  weight REAL DEFAULT 0.5,
  explanation TEXT,
  locked INTEGER DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT 'agent',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS rl_from_idx ON record_links(from_record_id);
CREATE INDEX IF NOT EXISTS rl_to_idx ON record_links(to_record_id);

-- Embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  record_id TEXT PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  vector TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'mock',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS proj_workspace_idx ON projects(workspace_id);

-- Project Records
CREATE TABLE IF NOT EXISTS project_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS pr_project_idx ON project_records(project_id);
CREATE INDEX IF NOT EXISTS pr_record_idx ON project_records(record_id);

-- Project Suggestions
CREATE TABLE IF NOT EXISTS project_suggestions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  proposed_project_name TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Boards
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Board Nodes
CREATE TABLE IF NOT EXISTS board_nodes (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK(node_type IN ('record', 'sticky', 'group', 'text')),
  record_id TEXT REFERENCES records(id),
  content TEXT,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  width REAL DEFAULT 200,
  height REAL DEFAULT 100,
  color TEXT DEFAULT '#fef08a',
  locked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS bn_board_idx ON board_nodes(board_id);

-- Board Edges
CREATE TABLE IF NOT EXISTS board_edges (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  from_node_id TEXT NOT NULL REFERENCES board_nodes(id) ON DELETE CASCADE,
  to_node_id TEXT NOT NULL REFERENCES board_nodes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'arrow' CHECK(kind IN ('arrow', 'link')),
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS al_workspace_idx ON activity_log(workspace_id);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE CHECK(key IN ('normal', 'smart')),
  name TEXT NOT NULL,
  price_monthly REAL NOT NULL,
  features TEXT NOT NULL
);

-- Subscriptions (user-level, not workspace-level)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'trialing', 'canceled', 'past_due', 'expired')),
  trial_ends_at TEXT,
  renews_at TEXT,
  paddle_subscription_id TEXT,
  paddle_customer_id TEXT,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sub_user_idx ON subscriptions(user_id);

-- Integrations Catalog
CREATE TABLE IF NOT EXISTS integrations_catalog (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'coming_soon' CHECK(status IN ('coming_soon', 'beta', 'active'))
);

-- Integrations Connections
CREATE TABLE IF NOT EXISTS integrations_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK(status IN ('disconnected', 'connected', 'error')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  settings TEXT,
  last_synced_at TEXT,
  sync_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ic_user_integration_idx ON integrations_connections(user_id, integration_key);

-- Job Queue
CREATE TABLE IF NOT EXISTS job_queue (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('triage', 'ingest', 'embed', 'link', 'project_suggest')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  result TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS jq_status_idx ON job_queue(status);
CREATE INDEX IF NOT EXISTS jq_type_idx ON job_queue(type);

-- OTP Codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS otp_email_idx ON otp_codes(email);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  record_id TEXT REFERENCES records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS att_record_idx ON attachments(record_id);
CREATE INDEX IF NOT EXISTS att_workspace_idx ON attachments(workspace_id);

-- Inbox Notifications
CREATE TABLE IF NOT EXISTS inbox_notifications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('todo', 'decision_pending', 'suggestion', 'mention', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  object_type TEXT,
  object_id TEXT,
  status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread', 'read', 'done')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Execute each statement
const statements = createTableSQL.split(';').filter(s => s.trim().length > 0)
for (const stmt of statements) {
  try {
    sqlite.exec(stmt + ';')
  } catch (e: any) {
    // Ignore "already exists" errors
    if (!e.message?.includes('already exists')) {
      console.error('Error executing:', stmt.trim().substring(0, 80))
      console.error(e.message)
    }
  }
}

// ─── Migrate subscriptions from workspace-level to user-level ───
try {
  // Check if old workspace_id column exists
  const cols = sqlite.prepare("PRAGMA table_info(subscriptions)").all() as any[]
  const hasWorkspaceId = cols.some((c: any) => c.name === 'workspace_id')
  const hasUserId = cols.some((c: any) => c.name === 'user_id')

  if (hasWorkspaceId && !hasUserId) {
    console.log('Migrating subscriptions from workspace-level to user-level...')

    // Create new table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions_v2 (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'trialing', 'canceled', 'past_due', 'expired')),
        trial_ends_at TEXT,
        renews_at TEXT,
        paddle_subscription_id TEXT,
        paddle_customer_id TEXT,
        meta TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    // Migrate existing data
    const existingSubs = sqlite.prepare('SELECT s.*, w.created_by FROM subscriptions s JOIN workspaces w ON s.workspace_id = w.id').all() as any[]
    const insertStmt = sqlite.prepare('INSERT OR IGNORE INTO subscriptions_v2 (id, user_id, plan_key, status, trial_ends_at, renews_at, meta, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const sub of existingSubs) {
      const newPlanKey = sub.plan_key === 'free' ? 'normal' : 'smart'
      insertStmt.run(sub.id, sub.created_by, newPlanKey, sub.status, sub.trial_ends_at, sub.renews_at, sub.meta, sub.created_at, sub.created_at)
    }

    // Swap tables
    sqlite.exec('DROP TABLE subscriptions;')
    sqlite.exec('ALTER TABLE subscriptions_v2 RENAME TO subscriptions;')
    sqlite.exec('CREATE INDEX IF NOT EXISTS sub_user_idx ON subscriptions(user_id);')
    console.log(`Migrated ${existingSubs.length} subscriptions to user-level.`)
  }
} catch (e: any) {
  console.error('Subscription migration note:', e.message)
}

// ─── Migrate plans table to new keys ───
try {
  const existingPlans = sqlite.prepare("SELECT key FROM plans").all() as any[]
  if (existingPlans.some((p: any) => p.key === 'free' || p.key === 'pro' || p.key === 'team')) {
    sqlite.exec('DELETE FROM plans;')
    console.log('Cleared old plan keys (free/pro/team).')
  }
} catch { /* plans table might not exist yet */ }

// ─── Migrate integrations_connections to add new columns ───
try {
  const icCols = sqlite.prepare("PRAGMA table_info(integrations_connections)").all() as any[]
  const hasUserId = icCols.some((c: any) => c.name === 'user_id')
  if (!hasUserId && icCols.length > 0) {
    console.log('Migrating integrations_connections to add OAuth columns...')
    sqlite.exec('DROP TABLE integrations_connections;')
    sqlite.exec(`
      CREATE TABLE integrations_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        integration_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'disconnected' CHECK(status IN ('disconnected', 'connected', 'error')),
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TEXT,
        settings TEXT,
        last_synced_at TEXT,
        sync_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    sqlite.exec('CREATE INDEX IF NOT EXISTS ic_user_integration_idx ON integrations_connections(user_id, integration_key);')
    console.log('Migrated integrations_connections.')
  }
} catch (e: any) {
  console.error('integrations_connections migration note:', e.message)
}

// ─── Add source/sourceId/occurredAt/meta columns to records ───
try {
  const recCols = sqlite.prepare("PRAGMA table_info(records)").all() as any[]
  const hasSource = recCols.some((c: any) => c.name === 'source')
  if (!hasSource) {
    console.log('Adding source, source_id, occurred_at, meta columns to records...')
    sqlite.exec('ALTER TABLE records ADD COLUMN source TEXT;')
    sqlite.exec('ALTER TABLE records ADD COLUMN source_id TEXT;')
    sqlite.exec('ALTER TABLE records ADD COLUMN occurred_at TEXT;')
    sqlite.exec('ALTER TABLE records ADD COLUMN meta TEXT;')
    console.log('Added new columns to records.')
  }
} catch (e: any) {
  console.error('Records migration note:', e.message)
}

// ─── Add state column to boards table ───
try {
  const boardCols = sqlite.prepare("PRAGMA table_info(boards)").all() as any[]
  const hasState = boardCols.some((c: any) => c.name === 'state')
  if (!hasState && boardCols.length > 0) {
    console.log('Adding state column to boards...')
    sqlite.exec('ALTER TABLE boards ADD COLUMN state TEXT;')
    console.log('Added state column to boards.')
  }
} catch (e: any) {
  console.error('Boards migration note:', e.message)
}

// ─── Recreate record_links to support expanded link kinds ───
try {
  const rlCols = sqlite.prepare("PRAGMA table_info(record_links)").all() as any[]
  if (rlCols.length > 0) {
    // Check if the CHECK constraint is outdated by trying to get the table SQL
    const tableInfo = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='record_links'").get() as any
    if (tableInfo?.sql && !tableInfo.sql.includes('related_to')) {
      console.log('Migrating record_links to support expanded link kinds...')
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS record_links_v2 (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          from_record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
          to_record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
          kind TEXT NOT NULL CHECK(kind IN ('same_topic', 'depends_on', 'contradicts', 'continuation_of', 'same_people', 'causes', 'temporal', 'related_to', 'leads_to', 'supports', 'part_of', 'blocks')),
          weight REAL DEFAULT 0.5,
          explanation TEXT,
          locked INTEGER DEFAULT 0,
          created_by TEXT NOT NULL DEFAULT 'agent',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)
      sqlite.exec('INSERT OR IGNORE INTO record_links_v2 SELECT * FROM record_links;')
      sqlite.exec('DROP TABLE record_links;')
      sqlite.exec('ALTER TABLE record_links_v2 RENAME TO record_links;')
      sqlite.exec('CREATE INDEX IF NOT EXISTS rl_from_idx ON record_links(from_record_id);')
      sqlite.exec('CREATE INDEX IF NOT EXISTS rl_to_idx ON record_links(to_record_id);')
      console.log('Migrated record_links to expanded kinds.')
    }
  }
} catch (e: any) {
  console.error('record_links migration note:', e.message)
}

// ─── Add indexes on raw_items for integration feed ───
try {
  sqlite.exec('CREATE INDEX IF NOT EXISTS ri_external_id_idx ON raw_items(external_id);')
  sqlite.exec('CREATE INDEX IF NOT EXISTS ri_source_idx ON raw_items(source_id);')
} catch (e: any) {
  console.error('raw_items index migration note:', e.message)
}

// ─── Slack Async Standup Bot tables ───
const standupSQL = `
CREATE TABLE IF NOT EXISTS standup_teams (
  id TEXT PRIMARY KEY,
  slack_team_id TEXT NOT NULL UNIQUE,
  slack_team_name TEXT,
  bot_token TEXT NOT NULL,
  installed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS standup_configs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES standup_teams(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  questions TEXT NOT NULL,
  schedule_days TEXT NOT NULL,
  schedule_time TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  participants TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS standup_config_team_idx ON standup_configs(team_id);
CREATE INDEX IF NOT EXISTS standup_config_channel_idx ON standup_configs(channel_id);

CREATE TABLE IF NOT EXISTS standup_sessions (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES standup_configs(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'collecting' CHECK(status IN ('collecting', 'posted')),
  summary_ts TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS standup_session_config_idx ON standup_sessions(config_id);
CREATE INDEX IF NOT EXISTS standup_session_date_idx ON standup_sessions(date);

CREATE TABLE IF NOT EXISTS standup_responses (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES standup_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  answers TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS standup_response_session_idx ON standup_responses(session_id);
CREATE INDEX IF NOT EXISTS standup_response_user_idx ON standup_responses(user_id);
`
for (const stmt of standupSQL.split(';').map(s => s.trim()).filter(Boolean)) {
  sqlite.exec(stmt)
}

// ─── MS Teams Meeting Recap Bot tables ───
const teamsRecapSQL = `
CREATE TABLE IF NOT EXISTS teams_recap_installs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  team_id TEXT,
  channel_id TEXT,
  conversation_id TEXT,
  service_url TEXT NOT NULL,
  installed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS teams_recap_tenant_channel_idx ON teams_recap_installs(tenant_id, channel_id);
CREATE INDEX IF NOT EXISTS teams_recap_conversation_idx ON teams_recap_installs(conversation_id);

CREATE TABLE IF NOT EXISTS teams_recap_sessions (
  id TEXT PRIMARY KEY,
  install_id TEXT NOT NULL REFERENCES teams_recap_installs(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  triggered_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'collecting' CHECK(status IN ('collecting', 'posted')),
  card_activity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS teams_recap_session_install_idx ON teams_recap_sessions(install_id);
CREATE INDEX IF NOT EXISTS teams_recap_session_status_idx ON teams_recap_sessions(status);

CREATE TABLE IF NOT EXISTS teams_recap_responses (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES teams_recap_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  decisions TEXT,
  action_items TEXT,
  notes TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS teams_recap_response_session_idx ON teams_recap_responses(session_id);
CREATE INDEX IF NOT EXISTS teams_recap_response_user_idx ON teams_recap_responses(user_id);
`
for (const stmt of teamsRecapSQL.split(';').map(s => s.trim()).filter(Boolean)) {
  sqlite.exec(stmt)
}

// ─── Integration Requests table ───
sqlite.exec(`
CREATE TABLE IF NOT EXISTS integration_requests (
  id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

// ─── Add onboarding_completed to users ───
try {
  const userCols = sqlite.prepare("PRAGMA table_info(users)").all() as any[]
  const hasOnboarding = userCols.some((c: any) => c.name === 'onboarding_completed')
  if (!hasOnboarding && userCols.length > 0) {
    console.log('Adding onboarding_completed column to users...')
    sqlite.exec('ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0;')
    console.log('Added onboarding_completed column to users.')
  }
} catch (e: any) {
  console.error('Users onboarding migration note:', e.message)
}

// ─── Usage Daily table (metering) ───
sqlite.exec(`
CREATE TABLE IF NOT EXISTS usage_daily (
  id TEXT PRIMARY KEY,
  device_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  ops_count INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'anonymous' CHECK(tier IN ('anonymous', 'registered', 'smart')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ud_device_date_idx ON usage_daily(device_id, date);
CREATE INDEX IF NOT EXISTS ud_user_date_idx ON usage_daily(user_id, date);
`)

// ─── API Tokens table (for desktop tray app) ───
sqlite.exec(`
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Desktop App',
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS api_token_user_idx ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS api_token_hash_idx ON api_tokens(token_hash);
`)

// ─── Game Rooms (Multiplayer) ───
const gameRoomsSQL = `
CREATE TABLE IF NOT EXISTS game_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  game_type TEXT NOT NULL,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK(status IN ('lobby', 'playing', 'finished')),
  phase TEXT NOT NULL DEFAULT 'lobby',
  state TEXT NOT NULL DEFAULT '{}',
  config TEXT,
  max_players INTEGER DEFAULT 50,
  version INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS gr_code_idx ON game_rooms(code);
CREATE INDEX IF NOT EXISTS gr_status_idx ON game_rooms(status);
CREATE INDEX IF NOT EXISTS gr_expires_idx ON game_rooms(expires_at);

CREATE TABLE IF NOT EXISTS game_players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_host INTEGER DEFAULT 0,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS gp_room_idx ON game_players(room_id);
CREATE INDEX IF NOT EXISTS gp_player_idx ON game_players(player_id);

CREATE TABLE IF NOT EXISTS game_actions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ga_room_idx ON game_actions(room_id);
CREATE INDEX IF NOT EXISTS ga_room_action_idx ON game_actions(room_id, action_type);
`
for (const stmt of gameRoomsSQL.split(';').map(s => s.trim()).filter(Boolean)) {
  sqlite.exec(stmt)
}

// ─── Chat Sessions table ───
sqlite.exec(`
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS cs_user_idx ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS cs_updated_idx ON chat_sessions(updated_at);
`)

// ─── Record Dates table ───
try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS record_dates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'reminder' CHECK(type IN ('deadline', 'follow_up', 'event', 'due_date', 'launch', 'reminder')),
      done INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS rd_workspace_idx ON record_dates(workspace_id);
    CREATE INDEX IF NOT EXISTS rd_record_idx ON record_dates(record_id);
    CREATE INDEX IF NOT EXISTS rd_date_idx ON record_dates(date);
  `)
  console.log('✓ record_dates table')
} catch (e: any) {
  if (!e.message?.includes('already exists')) console.error('record_dates migration:', e.message)
  else console.log('— record_dates (already exists)')
}

// ─── Add snoozed_until to inbox_notifications ───
try {
  const inboxCols = sqlite.prepare("PRAGMA table_info(inbox_notifications)").all() as any[]
  const hasSnoozed = inboxCols.some((c: any) => c.name === 'snoozed_until')
  if (!hasSnoozed && inboxCols.length > 0) {
    sqlite.exec('ALTER TABLE inbox_notifications ADD COLUMN snoozed_until TEXT;')
    console.log('✓ inbox_notifications.snoozed_until')
  } else {
    console.log('— inbox_notifications.snoozed_until (already exists)')
  }
} catch (e: any) {
  console.error('snoozed_until migration:', e.message)
}

// ─── Migrate inbox_notifications to support reminder type ───
try {
  const tableInfo = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='inbox_notifications'").get() as any
  if (tableInfo?.sql && !tableInfo.sql.includes('reminder')) {
    console.log('Migrating inbox_notifications to support reminder type...')
    const snoozedExists = sqlite.prepare("PRAGMA table_info(inbox_notifications)").all().some((c: any) => c.name === 'snoozed_until')
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS inbox_notifications_v2 (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id),
        type TEXT NOT NULL CHECK(type IN ('todo', 'decision_pending', 'suggestion', 'mention', 'system', 'reminder')),
        title TEXT NOT NULL,
        body TEXT,
        object_type TEXT,
        object_id TEXT,
        status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread', 'read', 'done')),
        snoozed_until TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    sqlite.exec(`INSERT OR IGNORE INTO inbox_notifications_v2 SELECT id, workspace_id, user_id, type, title, body, object_type, object_id, status, ${snoozedExists ? 'snoozed_until' : 'NULL'}, created_at FROM inbox_notifications;`)
    sqlite.exec('DROP TABLE inbox_notifications;')
    sqlite.exec('ALTER TABLE inbox_notifications_v2 RENAME TO inbox_notifications;')
    console.log('✓ inbox_notifications migrated with reminder type')
  }
} catch (e: any) {
  console.error('inbox_notifications reminder migration:', e.message)
}

// ─── Add triage_status to records ───────────────────────
try {
  const recCols = sqlite.prepare("PRAGMA table_info(records)").all() as any[]
  const hasTriageStatus = recCols.some((c: any) => c.name === 'triage_status')
  if (!hasTriageStatus) {
    sqlite.exec("ALTER TABLE records ADD COLUMN triage_status TEXT NOT NULL DEFAULT 'needs_review';")
    sqlite.exec("CREATE INDEX IF NOT EXISTS rec_triage_status_idx ON records(triage_status);")
    console.log('✓ records.triage_status')
  } else {
    console.log('— records.triage_status (already exists)')
  }
} catch (e: any) {
  console.error('triage_status migration:', e.message)
}

// ─── Migrate inbox_notifications to support needs_review + rejected types ───
try {
  const tableInfo2 = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='inbox_notifications'").get() as any
  if (tableInfo2?.sql && !tableInfo2.sql.includes('needs_review')) {
    console.log('Migrating inbox_notifications to support needs_review/rejected types...')
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS inbox_notifications_v3 (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('todo', 'decision_pending', 'suggestion', 'mention', 'system', 'reminder', 'needs_review', 'rejected')),
        title TEXT NOT NULL,
        body TEXT,
        object_type TEXT,
        object_id TEXT,
        status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread', 'read', 'done')),
        snoozed_until TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    sqlite.exec(`INSERT OR IGNORE INTO inbox_notifications_v3 SELECT id, workspace_id, user_id, type, title, body, object_type, object_id, status, snoozed_until, created_at FROM inbox_notifications;`)
    sqlite.exec('DROP TABLE inbox_notifications;')
    sqlite.exec('ALTER TABLE inbox_notifications_v3 RENAME TO inbox_notifications;')
    console.log('✓ inbox_notifications migrated with needs_review/rejected types')
  } else {
    console.log('— inbox_notifications needs_review/rejected (already exists)')
  }
} catch (e: any) {
  console.error('inbox_notifications needs_review/rejected migration:', e.message)
}

// ─── Exit Interview Agent ───
try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS exit_interviews (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      departing_user_id TEXT NOT NULL REFERENCES users(id),
      initiated_by_user_id TEXT NOT NULL REFERENCES users(id),
      role_title TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'completed', 'archived')),
      questions TEXT NOT NULL DEFAULT '[]',
      handoff_doc TEXT,
      handoff_record_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS ei_org_idx ON exit_interviews(organization_id);
    CREATE INDEX IF NOT EXISTS ei_departing_idx ON exit_interviews(departing_user_id);
    CREATE INDEX IF NOT EXISTS ei_status_idx ON exit_interviews(status);
  `)
  console.log('✓ exit_interviews')
} catch (e: any) {
  console.error('exit_interviews migration:', e.message)
}

console.log('Database migration complete!')
sqlite.close()

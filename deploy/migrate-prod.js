#!/usr/bin/env node
/**
 * Production DB migration runner.
 * Run via: node deploy/migrate-prod.js
 * Safe to re-run — all statements are idempotent.
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.resolve(process.cwd(), 'data', 'reattend.db'))
db.pragma('foreign_keys = ON')

function run(sql, label) {
  try {
    db.exec(sql)
    console.log(`  ✓ ${label}`)
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('duplicate')) {
      console.log(`  — ${label} (already exists)`)
    } else {
      console.error(`  ✗ ${label}: ${e.message}`)
    }
  }
}

function addColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.find(c => c.name === column)) {
    run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, `${table}.${column}`)
  } else {
    console.log(`  — ${table}.${column} (already exists)`)
  }
}

console.log('Running production migrations...')

// ─── chat_sessions ───────────────────────────────────────
run(`
  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    messages TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`, 'chat_sessions table')
run(`CREATE INDEX IF NOT EXISTS cs_user_idx ON chat_sessions(user_id)`, 'cs_user_idx')
run(`CREATE INDEX IF NOT EXISTS cs_updated_idx ON chat_sessions(updated_at)`, 'cs_updated_idx')

// ─── records: source / source_id / occurred_at / meta ────
addColumn('records', 'source', 'TEXT')
addColumn('records', 'source_id', 'TEXT')
addColumn('records', 'occurred_at', 'TEXT')
addColumn('records', 'meta', 'TEXT')

// ─── users: onboarding_completed ─────────────────────────
addColumn('users', 'onboarding_completed', 'INTEGER DEFAULT 0')

// ─── inbox_notifications: snoozed_until ──────────────────
addColumn('inbox_notifications', 'snoozed_until', 'TEXT')

// ─── Indexes ──────────────────────────────────────────────
run(`CREATE INDEX IF NOT EXISTS ri_external_id_idx ON raw_items(external_id)`, 'ri_external_id_idx')
run(`CREATE INDEX IF NOT EXISTS ri_source_idx ON raw_items(source_id)`, 'ri_source_idx')

// ─── record_dates table ───────────────────────────────────
run(`
  CREATE TABLE IF NOT EXISTS record_dates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    label TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'reminder' CHECK(type IN ('deadline', 'follow_up', 'event', 'due_date', 'launch', 'reminder')),
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`, 'record_dates table')
run(`CREATE INDEX IF NOT EXISTS rd_workspace_idx ON record_dates(workspace_id)`, 'rd_workspace_idx')
run(`CREATE INDEX IF NOT EXISTS rd_record_idx ON record_dates(record_id)`, 'rd_record_idx')
run(`CREATE INDEX IF NOT EXISTS rd_date_idx ON record_dates(date)`, 'rd_date_idx')

// ─── inbox_notifications: add reminder + needs_review + rejected types ───
;(function () {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='inbox_notifications'").get()
  if (tableInfo?.sql && !tableInfo.sql.includes('needs_review')) {
    console.log('  Migrating inbox_notifications to support needs_review/rejected types...')
    try {
      const hasSnoozed = db.prepare("PRAGMA table_info(inbox_notifications)").all().some(c => c.name === 'snoozed_until')
      db.exec(`
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
      db.exec(`INSERT OR IGNORE INTO inbox_notifications_v3 SELECT id, workspace_id, user_id, type, title, body, object_type, object_id, status, ${hasSnoozed ? 'snoozed_until' : 'NULL'}, created_at FROM inbox_notifications;`)
      db.exec('DROP TABLE inbox_notifications;')
      db.exec('ALTER TABLE inbox_notifications_v3 RENAME TO inbox_notifications;')
      console.log('  ✓ inbox_notifications migrated with needs_review/rejected types')
    } catch (e) {
      console.error('  ✗ inbox_notifications migration:', e.message)
    }
  } else {
    console.log('  — inbox_notifications needs_review/rejected (already exists)')
  }
})()

// ─── records: triage_status ───────────────────────────────
addColumn('records', 'triage_status', "TEXT NOT NULL DEFAULT 'needs_review'")
run(`CREATE INDEX IF NOT EXISTS rec_triage_status_idx ON records(triage_status)`, 'rec_triage_status_idx')

console.log('Migrations complete.')
db.close()

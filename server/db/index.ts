import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { DB_PATH } from '../config.js';
import { ConfigService } from '../services/configService.js';

// Ensure database directory exists dynamically
const dbDir = path.dirname(DB_PATH);
if (dbDir && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const sqlite = sqlite3.verbose();
export const db = new sqlite.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log('✅ SQLite production database active at:', DB_PATH);
  }
});

// Promisified DB helpers
export const query = {
  get: <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  },
  all: <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []) as T[]);
      });
    });
  },
  run: (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  exec: (sql: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Production Database Schema Initialization
export async function initDb() {
  await query.exec(`
    PRAGMA journal_mode = WAL;

    -- Platform Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    -- Admin-Managed Product Configurations
    CREATE TABLE IF NOT EXISTS product_configs (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT NOT NULL, -- 'number', 'boolean', 'string', 'json'
      category TEXT NOT NULL, -- 'storage', 'archiver', 'access', 'system'
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    -- Connected Instagram Accounts
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      encrypted_password TEXT,
      session_cookie TEXT,
      is_active INTEGER DEFAULT 1,
      two_factor_required INTEGER DEFAULT 0,
      is_sandbox INTEGER DEFAULT 1,
      checkpoint_url TEXT,
      follower_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      story_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_synced_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);

    -- Saved Stories with Dynamic Admin-Managed TTL
    CREATE TABLE IF NOT EXISTS saved_stories (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      user_id TEXT,
      target_username TEXT NOT NULL,
      user_full_name TEXT,
      user_avatar TEXT,
      media_type TEXT NOT NULL, -- 'image' or 'video'
      media_url TEXT NOT NULL,
      local_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      duration REAL DEFAULT 0,
      caption TEXT,
      posted_at TEXT NOT NULL,
      downloaded_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_viewed INTEGER DEFAULT 0,
      is_favorited INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', -- 'active', 'expired', 'purged'
      purged_at TEXT,
      media_data BLOB,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_stories_status_expires ON saved_stories(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_stories_target ON saved_stories(target_username);

    -- VIP Watchlist Targets
    CREATE TABLE IF NOT EXISTS watchlist_targets (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      user_id TEXT,
      target_username TEXT NOT NULL,
      target_full_name TEXT,
      target_avatar TEXT,
      is_active INTEGER DEFAULT 1,
      check_frequency_minutes INTEGER DEFAULT 60,
      auto_download INTEGER DEFAULT 1,
      retention_days INTEGER DEFAULT 30,
      last_checked_at TEXT,
      stories_saved_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Follower Snapshots
    CREATE TABLE IF NOT EXISTS followers (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      user_id TEXT,
      username TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      is_follower INTEGER DEFAULT 0,
      is_following INTEGER DEFAULT 0,
      is_mutual INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      is_whitelisted INTEGER DEFAULT 0,
      status TEXT DEFAULT 'current',
      unfollowed_detected_at TEXT,
      first_detected_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_followers_acc_user ON followers(account_id, username);

    -- Storage Metrics
    CREATE TABLE IF NOT EXISTS storage_stats (
      key TEXT PRIMARY KEY,
      numeric_value REAL DEFAULT 0,
      text_value TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // Ensure legacy audit logs table is dropped if it exists
  try {
    await query.exec(`DROP TABLE IF EXISTS system_audit_logs;`);
  } catch {}

  // Ensure media_data BLOB column exists if migrating existing database
  try {
    await query.exec(`ALTER TABLE saved_stories ADD COLUMN media_data BLOB;`);
  } catch {
    // Column already exists or table was just created
  }

  try {
    await query.exec(`ALTER TABLE accounts ADD COLUMN is_sandbox INTEGER DEFAULT 1;`);
  } catch {
    // Column already exists
  }

  // Columns supporting the official Instagram OAuth (Instagram Login) connect flow.
  // Each ALTER is isolated so a missing/existing column never blocks the others.
  const accountColumnMigrations = [
    `ALTER TABLE accounts ADD COLUMN auth_method TEXT;`,            // 'oauth' | 'session' | 'credentials' | 'sandbox'
    `ALTER TABLE accounts ADD COLUMN oauth_access_token TEXT;`,     // AES-256-GCM encrypted long-lived token
    `ALTER TABLE accounts ADD COLUMN oauth_token_expires_at TEXT;`, // ISO expiry for the long-lived token
    `ALTER TABLE accounts ADD COLUMN instagram_user_id TEXT;`       // Instagram-scoped user id from Graph API
  ];
  for (const migration of accountColumnMigrations) {
    try {
      await query.exec(migration);
    } catch {
      // Column already exists
    }
  }

  // Initialize product configurations managed by Admin
  await ConfigService.initConfigs();

  console.log('✅ SQLite production tables & configuration initialized.');
}

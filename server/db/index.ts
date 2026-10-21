import pg from 'pg';
import { DATABASE_URL } from '../config.js';
import { ConfigService } from '../services/configService.js';

const { Pool } = pg;

// Parse int8 (bigint) as standard JS number for COUNT(*) and aggregation queries
pg.types.setTypeParser(20, (val: string) => parseInt(val, 10));

// Initialize PostgreSQL Cloud Connection Pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const db = pool;

pool.on('error', (err) => {
  console.error('❌ Unexpected Cloud PostgreSQL client error:', err);
});

// Converts SQLite-style unquoted ? parameter placeholders to PostgreSQL $1, $2, ...
export function convertSql(sql: string): string {
  let paramIndex = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      result += char;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      result += char;
    } else if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      result += `$${paramIndex++}`;
    } else {
      result += char;
    }
  }

  return result;
}

// PostgreSQL Query Helpers
export const query = {
  get: async <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
    const converted = convertSql(sql);
    const res = await pool.query(converted, params);
    return (res.rows[0] as T) || undefined;
  },
  all: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    const trimmed = sql.trim();
    // Compatibility adapter for SQLite PRAGMA table_info queries
    const pragmaMatch = trimmed.match(/^PRAGMA\s+table_info\(['"]?([a-zA-Z0-9_]+)['"]?\)/i);
    if (pragmaMatch) {
      const tableName = pragmaMatch[1];
      const res = await pool.query(
        `SELECT column_name as name, data_type as type FROM information_schema.columns WHERE table_name = $1`,
        [tableName]
      );
      return res.rows as T[];
    }
    const converted = convertSql(sql);
    const res = await pool.query(converted, params);
    return (res.rows || []) as T[];
  },
  run: async (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
    const converted = convertSql(sql);
    const res = await pool.query(converted, params);
    return { lastID: 0, changes: res.rowCount ?? 0 };
  },
  exec: async (sql: string): Promise<void> => {
    await pool.query(sql);
  }
};

// Cloud PostgreSQL Database Schema Initialization
export async function initDb() {
  await query.exec(`
    -- Platform Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
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
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    -- Connected Instagram Accounts
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
      auth_method TEXT,
      oauth_access_token TEXT,
      oauth_token_expires_at TEXT,
      instagram_user_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);

    -- Saved Stories with Dynamic Admin-Managed TTL
    CREATE TABLE IF NOT EXISTS saved_stories (
      id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      target_username TEXT NOT NULL,
      user_full_name TEXT,
      user_avatar TEXT,
      media_type TEXT NOT NULL,
      media_url TEXT NOT NULL,
      local_filename TEXT NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      duration REAL DEFAULT 0,
      caption TEXT,
      posted_at TEXT NOT NULL,
      downloaded_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_viewed INTEGER DEFAULT 0,
      is_favorited INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      purged_at TEXT,
      media_data BYTEA
    );

    CREATE INDEX IF NOT EXISTS idx_stories_status_expires ON saved_stories(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_stories_target ON saved_stories(target_username);

    -- VIP Watchlist Targets
    CREATE TABLE IF NOT EXISTS watchlist_targets (
      id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      target_username TEXT NOT NULL,
      target_full_name TEXT,
      target_avatar TEXT,
      is_active INTEGER DEFAULT 1,
      check_frequency_minutes INTEGER DEFAULT 60,
      auto_download INTEGER DEFAULT 1,
      retention_days INTEGER DEFAULT 30,
      last_checked_at TEXT,
      stories_saved_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Follower Snapshots
    CREATE TABLE IF NOT EXISTS followers (
      id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
      last_seen_at TEXT NOT NULL
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

  // Ensure any schema migrations are applied idempotently
  const migrations = [
    `ALTER TABLE saved_stories ADD COLUMN IF NOT EXISTS media_data BYTEA;`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_sandbox INTEGER DEFAULT 1;`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS auth_method TEXT;`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS oauth_access_token TEXT;`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS oauth_token_expires_at TEXT;`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS instagram_user_id TEXT;`
  ];

  for (const migration of migrations) {
    try {
      await query.exec(migration);
    } catch {
      // Column already exists
    }
  }

  // Initialize product configurations managed by Admin
  await ConfigService.initConfigs();

  console.log('✅ Cloud PostgreSQL production tables & configuration initialized.');
}

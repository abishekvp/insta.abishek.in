import { query } from '../db/index.js';

export interface ProductConfig {
  key: string;
  value: string;
  type: 'number' | 'boolean' | 'string' | 'json';
  category: 'storage' | 'archiver' | 'access' | 'system' | 'oauth';
  label: string;
  description: string;
  updated_at: string;
  updated_by?: string;
}

export class ConfigService {
  private static cache: Map<string, string> = new Map();
  private static cacheExpiry = 0;

  /**
   * Default initial product configurations (seeded into DB if table is empty)
   */
  static readonly INITIAL_CONFIGS: Array<Omit<ProductConfig, 'updated_at'>> = [
    {
      key: 'story_ttl_days',
      value: '30',
      type: 'number',
      category: 'storage',
      label: 'Story Retention TTL (Days)',
      description: 'The number of days saved stories are kept in storage before the automated TTL engine unlinks and purges media files.'
    },
    {
      key: 'auto_purge_interval_minutes',
      value: '30',
      type: 'number',
      category: 'storage',
      label: 'Auto-Purge Cron Interval (Minutes)',
      description: 'Frequency at which the background storage cleaner executes to delete expired story files.'
    },
    {
      key: 'max_stories_per_user',
      value: '500',
      type: 'number',
      category: 'storage',
      label: 'Maximum Stories Limit Per User',
      description: 'Maximum active story archives an individual user account is permitted to hold concurrently.'
    },
    {
      key: 'max_watchlist_targets',
      value: '25',
      type: 'number',
      category: 'archiver',
      label: 'Max VIP Watchlist Targets Per User',
      description: 'Maximum number of target friend accounts allowed on an individual VIP Auto-Archiver list.'
    },
    {
      key: 'auto_archiver_enabled',
      value: 'true',
      type: 'boolean',
      category: 'archiver',
      label: 'Global Story Auto-Archiver Engine',
      description: 'Master switch to enable or pause background Instagram story crawlers system-wide.'
    },
    {
      key: 'allow_user_registrations',
      value: 'true',
      type: 'boolean',
      category: 'access',
      label: 'Open User Self-Registration',
      description: 'Allow new users to register for the platform. When disabled, only Administrators can create accounts.'
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      type: 'boolean',
      category: 'system',
      label: 'System Maintenance Mode',
      description: 'When enabled, only Administrators can access dashboard features; standard users see a maintenance screen.'
    },
    {
      key: 'announcement_banner',
      value: '',
      type: 'string',
      category: 'system',
      label: 'System Announcement Banner',
      description: 'Global notification message displayed to all users at the top of the interface (leave blank to hide).'
    },
    {
      key: 'app_base_url',
      value: process.env.APP_BASE_URL || 'http://localhost:5500',
      type: 'string',
      category: 'oauth',
      label: 'Application Base URL (APP_BASE_URL)',
      description: 'Canonical public base URL of this application, used to construct Instagram OAuth callbacks and post-login redirects.'
    },
    {
      key: 'ig_oauth_client_id',
      value: process.env.IG_OAUTH_CLIENT_ID || '',
      type: 'string',
      category: 'oauth',
      label: 'Instagram OAuth Client ID (IG_OAUTH_CLIENT_ID)',
      description: 'Your Meta / Instagram App ID obtained from https://developers.facebook.com.'
    },
    {
      key: 'ig_oauth_client_secret',
      value: process.env.IG_OAUTH_CLIENT_SECRET || '',
      type: 'string',
      category: 'oauth',
      label: 'Instagram OAuth Client Secret (IG_OAUTH_CLIENT_SECRET)',
      description: 'Your Meta / Instagram App Secret. Stored securely and used during authorization code exchanges.'
    },
    {
      key: 'ig_oauth_redirect_uri',
      value: process.env.IG_OAUTH_REDIRECT_URI || '',
      type: 'string',
      category: 'oauth',
      label: 'Instagram OAuth Redirect URI (IG_OAUTH_REDIRECT_URI)',
      description: 'Whitelisted OAuth callback URL in Meta App settings. If left blank, automatically computes: <APP_BASE_URL>/api/auth/instagram/oauth/callback.'
    },
    {
      key: 'ig_oauth_scopes',
      value: process.env.IG_OAUTH_SCOPES || 'instagram_business_basic',
      type: 'string',
      category: 'oauth',
      label: 'Instagram OAuth Scopes / Permissions (IG_OAUTH_SCOPES)',
      description: 'Comma-separated list of OAuth scopes requested from Instagram (e.g. instagram_business_basic, instagram_business_content_publish, instagram_business_manage_messages).'
    }
  ];

  /**
   * Initializes product configurations in database if missing.
   */
  static async initConfigs() {
    const now = new Date().toISOString();
    for (const cfg of this.INITIAL_CONFIGS) {
      const existing = await query.get('SELECT key FROM product_configs WHERE key = ?', [cfg.key]);
      if (!existing) {
        await query.run(`
          INSERT INTO product_configs (key, value, type, category, label, description, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'system')
        `, [cfg.key, cfg.value, cfg.type, cfg.category, cfg.label, cfg.description, now]);
      }
    }
    await this.refreshCache();
  }

  static async refreshCache() {
    const rows = await query.all<ProductConfig>('SELECT * FROM product_configs');
    this.cache.clear();
    for (const r of rows) {
      this.cache.set(r.key, r.value);
    }
    this.cacheExpiry = Date.now() + 60000; // Cache for 60s
  }

  static async getAllConfigs(): Promise<ProductConfig[]> {
    return query.all<ProductConfig>('SELECT * FROM product_configs ORDER BY category ASC, key ASC');
  }

  static async getValue<T = string>(key: string, fallback: T): Promise<T> {
    if (Date.now() > this.cacheExpiry || (!this.cache.has(key) && !this.cache.has(key.toLowerCase()))) {
      await this.refreshCache();
    }
    const val = this.cache.get(key) ?? this.cache.get(key.toLowerCase()) ?? this.cache.get(key.toUpperCase());
    if (val === undefined) return fallback;

    if (typeof fallback === 'number') {
      const num = parseFloat(val);
      return (isNaN(num) ? fallback : num) as unknown as T;
    }
    if (typeof fallback === 'boolean') {
      return (val === 'true' || val === '1') as unknown as T;
    }
    return val as unknown as T;
  }

  static async updateConfig(key: string, value: string, updatedBy = 'admin'): Promise<void> {
    const now = new Date().toISOString();
    await query.run(`
      UPDATE product_configs
      SET value = ?, updated_at = ?, updated_by = ?
      WHERE key = ?
    `, [value, now, updatedBy, key]);

    this.cache.set(key, value);
  }

  static async updateMultipleConfigs(configs: Record<string, string>, updatedBy = 'admin'): Promise<void> {
    for (const [key, value] of Object.entries(configs)) {
      await this.updateConfig(key, String(value), updatedBy);
    }
  }
}

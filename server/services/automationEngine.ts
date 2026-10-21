import cron from 'node-cron';
import { query } from '../db/index.js';
import { StorySaverService } from './storySaverService.js';
import { ConfigService } from './configService.js';

export interface WatchlistTarget {
  id: string;
  account_id?: string;
  user_id?: string;
  target_username: string;
  target_full_name: string;
  target_avatar: string;
  is_active: number;
  check_frequency_minutes: number;
  auto_download: number;
  retention_days: number;
  last_checked_at: string;
  stories_saved_count: number;
  created_at: string;
}

export class AutomationEngine {
  private static isInitialized = false;

  /**
   * Start production background cron workers
   */
  static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[Automation Engine] Background workers initialized in production mode.');

    // 1. Storage TTL Expiration Engine: runs periodically
    cron.schedule('*/30 * * * *', async () => {
      try {
        await StorySaverService.purgeExpiredStories();
      } catch (err: any) {
        console.error('[Automation Engine] Error in scheduled TTL purge:', err.message);
      }
    });

    // 2. VIP Story Watchlist Auto-Archiver: runs periodically
    cron.schedule('*/15 * * * *', async () => {
      try {
        const isEnabled = await ConfigService.getValue<boolean>('auto_archiver_enabled', true);
        if (isEnabled) {
          await this.runAutoArchiverJob();
        }
      } catch (err: any) {
        console.error('[Automation Engine] Error in Watchlist Auto-Archiver:', err.message);
      }
    });

    // Initial check on boot
    StorySaverService.purgeExpiredStories().catch(() => {});
  }

  static async runAutoArchiverJob() {
    const activeTargets = await query.all<WatchlistTarget>(`
      SELECT * FROM watchlist_targets WHERE is_active = 1 AND auto_download = 1
    `);

    if (activeTargets.length === 0) return { checked: 0, newStoriesSaved: 0 };

    const now = new Date().toISOString();
    for (const target of activeTargets) {
      await query.run(`
        UPDATE watchlist_targets SET last_checked_at = ? WHERE id = ?
      `, [now, target.id]);
    }

    return {
      checked: activeTargets.length,
      newStoriesSaved: 0,
      timestamp: now
    };
  }

  static async getWatchlist(userId?: string) {
    let sql = `SELECT * FROM watchlist_targets`;
    const bindings: any[] = [];
    if (userId) {
      sql += ` WHERE user_id = ? OR user_id IS NULL`;
      bindings.push(userId);
    }
    sql += ` ORDER BY created_at DESC`;
    return query.all<WatchlistTarget>(sql, bindings);
  }

  static async addWatchlistTarget(params: {
    userId?: string;
    accountId?: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
    frequencyMinutes?: number;
    autoDownload?: boolean;
    retentionDays?: number;
  }) {
    const cleanUser = params.username.toLowerCase().replace('@', '').trim();
    const existing = await query.get<WatchlistTarget>(`
      SELECT * FROM watchlist_targets WHERE target_username = ? AND (user_id = ? OR user_id IS NULL)
    `, [cleanUser, params.userId || null]);

    if (existing) {
      await query.run(`
        UPDATE watchlist_targets
        SET is_active = 1,
            check_frequency_minutes = ?,
            auto_download = ?,
            retention_days = ?
        WHERE id = ?
      `, [
        params.frequencyMinutes || existing.check_frequency_minutes,
        params.autoDownload !== undefined ? (params.autoDownload ? 1 : 0) : existing.auto_download,
        params.retentionDays || existing.retention_days,
        existing.id
      ]);
      return query.get<WatchlistTarget>('SELECT * FROM watchlist_targets WHERE id = ?', [existing.id]);
    }

    const id = `target_${cleanUser}_${Date.now()}`;
    const now = new Date().toISOString();
    const avatar = params.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    await query.run(`
      INSERT INTO watchlist_targets (
        id, user_id, account_id, target_username, target_full_name, target_avatar, is_active,
        check_frequency_minutes, auto_download, retention_days, last_checked_at,
        stories_saved_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 0, ?)
    `, [
      id,
      params.userId || null,
      params.accountId || null,
      cleanUser,
      params.fullName || cleanUser,
      avatar,
      params.frequencyMinutes || 60,
      params.autoDownload !== undefined ? (params.autoDownload ? 1 : 0) : 1,
      params.retentionDays || 30,
      now,
      now
    ]);

    return query.get<WatchlistTarget>('SELECT * FROM watchlist_targets WHERE id = ?', [id]);
  }

  static async removeWatchlistTarget(targetId: string) {
    return query.run('DELETE FROM watchlist_targets WHERE id = ?', [targetId]);
  }

  static async toggleWatchlistTarget(targetId: string) {
    const target = await query.get<WatchlistTarget>('SELECT is_active FROM watchlist_targets WHERE id = ?', [targetId]);
    if (!target) return null;
    const newVal = target.is_active ? 0 : 1;
    await query.run('UPDATE watchlist_targets SET is_active = ? WHERE id = ?', [newVal, targetId]);
    return { id: targetId, is_active: newVal };
  }
}

import axios from 'axios';
import { query } from '../db/index.js';
import { ConfigService } from './configService.js';

export interface StoryRecord {
  id: string;
  account_id?: string;
  user_id?: string;
  target_username: string;
  user_full_name: string;
  user_avatar: string;
  media_type: 'image' | 'video';
  media_url: string;
  local_filename: string;
  file_size: number;
  duration: number;
  caption: string;
  posted_at: string;
  downloaded_at: string;
  expires_at: string;
  is_viewed: number;
  is_favorited: number;
  status: 'active' | 'expired' | 'purged';
  purged_at?: string;
  media_data?: Buffer;
}

export const STORY_META_FIELDS = `
  id, account_id, user_id, target_username, user_full_name, user_avatar,
  media_type, media_url, local_filename, file_size, duration, caption,
  posted_at, downloaded_at, expires_at, is_viewed, is_favorited, status, purged_at
`;

export class StorySaverService {
  /**
   * Save a story to disk and database with the Admin-configured TTL retention period.
   */
  static async saveStory(params: {
    accountId?: string;
    userId?: string;
    targetUsername: string;
    userFullName: string;
    userAvatar: string;
    mediaType: 'image' | 'video';
    mediaUrl: string;
    caption?: string;
    postedAt?: string;
    duration?: number;
    customTtlDays?: number;
  }): Promise<StoryRecord> {
    // Dynamic TTL configured by Admin in Product Configs (defaults to 30)
    const configuredTtlDays = await ConfigService.getValue<number>('story_ttl_days', 30);
    const ttlDays = params.customTtlDays || configuredTtlDays;

    const now = new Date();
    const downloadedAt = now.toISOString();
    // Expiration date calculated strictly from retention policy
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
    const postedAt = params.postedAt || now.toISOString();

    const storyId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ext = params.mediaType === 'video' ? 'mp4' : 'jpg';
    const localFilename = `${params.targetUsername.replace(/[^a-zA-Z0-9_]/g, '')}_${storyId}.${ext}`;

    let mediaBuffer: Buffer | null = null;
    let fileSize = 0;

    // Stream & buffer media directly in memory for DB persistence (zero local disk processing)
    try {
      if (params.mediaUrl.startsWith('http')) {
        const response = await axios({
          url: params.mediaUrl,
          method: 'GET',
          responseType: 'arraybuffer',
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        mediaBuffer = Buffer.from(response.data);
        fileSize = mediaBuffer.length;
      }
    } catch (err: any) {
      console.warn(`Could not download remote media directly: ${err.message}`);
    }

    await query.run(`
      INSERT INTO saved_stories (
        id, account_id, user_id, target_username, user_full_name, user_avatar, media_type,
        media_url, local_filename, file_size, duration, caption, posted_at,
        downloaded_at, expires_at, is_viewed, is_favorited, status, media_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      storyId,
      params.accountId || null,
      params.userId || null,
      params.targetUsername,
      params.userFullName,
      params.userAvatar,
      params.mediaType,
      params.mediaUrl,
      localFilename,
      fileSize,
      params.duration || (params.mediaType === 'video' ? 10 : 5),
      params.caption || '',
      postedAt,
      downloadedAt,
      expiresAt,
      0,
      0,
      'active',
      mediaBuffer
    ]);

    return (await query.get<StoryRecord>(`SELECT ${STORY_META_FIELDS} FROM saved_stories WHERE id = ?`, [storyId]))!;
  }

  /**
   * Get active stories (optionally filtered by user/account)
   */
  static async getActiveStories(params?: {
    userId?: string;
    accountId?: string;
    targetUsername?: string;
    mediaType?: string;
    onlyFavorites?: boolean;
    search?: string;
  }): Promise<StoryRecord[]> {
    let sql = `SELECT ${STORY_META_FIELDS} FROM saved_stories WHERE status = 'active'`;
    const bindings: any[] = [];

    if (params?.userId) {
      sql += ` AND (user_id = ? OR user_id IS NULL)`;
      bindings.push(params.userId);
    }
    if (params?.accountId) {
      sql += ` AND account_id = ?`;
      bindings.push(params.accountId);
    }
    if (params?.targetUsername) {
      sql += ` AND target_username = ?`;
      bindings.push(params.targetUsername);
    }
    if (params?.mediaType && params.mediaType !== 'all') {
      sql += ` AND media_type = ?`;
      bindings.push(params.mediaType);
    }
    if (params?.onlyFavorites) {
      sql += ` AND is_favorited = 1`;
    }
    if (params?.search) {
      sql += ` AND (target_username LIKE ? OR user_full_name LIKE ? OR caption LIKE ?)`;
      const term = `%${params.search}%`;
      bindings.push(term, term, term);
    }

    sql += ` ORDER BY posted_at DESC`;
    return query.all<StoryRecord>(sql, bindings);
  }

  /**
   * Groups stories by creator
   */
  static async getStoryGroups(userId?: string) {
    const stories = await this.getActiveStories({ userId });
    const groupsMap = new Map<string, {
      username: string;
      fullName: string;
      avatar: string;
      stories: StoryRecord[];
      hasUnviewed: boolean;
      latestPostedAt: string;
    }>();

    for (const story of stories) {
      if (!groupsMap.has(story.target_username)) {
        groupsMap.set(story.target_username, {
          username: story.target_username,
          fullName: story.user_full_name,
          avatar: story.user_avatar,
          stories: [],
          hasUnviewed: false,
          latestPostedAt: story.posted_at
        });
      }
      const group = groupsMap.get(story.target_username)!;
      group.stories.push(story);
      if (!story.is_viewed) {
        group.hasUnviewed = true;
      }
    }

    return Array.from(groupsMap.values());
  }

  static async markViewed(storyId: string) {
    return query.run(`UPDATE saved_stories SET is_viewed = 1 WHERE id = ?`, [storyId]);
  }

  static async toggleFavorite(storyId: string) {
    const story = await query.get<StoryRecord>('SELECT is_favorited FROM saved_stories WHERE id = ?', [storyId]);
    if (!story) return null;
    const newVal = story.is_favorited ? 0 : 1;
    await query.run('UPDATE saved_stories SET is_favorited = ? WHERE id = ?', [newVal, storyId]);
    return { id: storyId, is_favorited: newVal };
  }

  /**
   * Retrieve binary media directly from the database row (zero local filesystem access)
   */
  static async getMedia(filenameOrId: string): Promise<{
    buffer: Buffer;
    mediaType: string;
    fileSize: number;
    filename: string;
  } | null> {
    const row = await query.get<{
      media_data: any;
      media_type: string;
      file_size: number;
      local_filename: string;
    }>(
      `SELECT media_data, media_type, file_size, local_filename
       FROM saved_stories
       WHERE local_filename = ? OR id = ?`,
      [filenameOrId, filenameOrId]
    );

    if (!row || !row.media_data) return null;

    const buffer = Buffer.isBuffer(row.media_data) ? row.media_data : Buffer.from(row.media_data);
    return {
      buffer,
      mediaType: row.media_type,
      fileSize: buffer.length || row.file_size,
      filename: row.local_filename
    };
  }

  /**
   * Automated TTL Expiration Cleaner:
   * Finds all active stories past their expiration timestamp,
   * purges media binary blob from the database, and marks record purged.
   */
  static async purgeExpiredStories(): Promise<{
    purgedCount: number;
    reclaimedBytes: number;
    reclaimedFormatted: string;
  }> {
    const now = new Date().toISOString();
    const expiredStories = await query.all<StoryRecord>(`
      SELECT id, file_size FROM saved_stories
      WHERE status = 'active' AND expires_at <= ?
    `, [now]);

    let reclaimedBytes = 0;
    let purgedCount = 0;

    for (const story of expiredStories) {
      reclaimedBytes += story.file_size || 0;

      // Purge binary BLOB directly in database with zero local disk operations
      await query.run(`
        UPDATE saved_stories
        SET status = 'purged', purged_at = ?, media_data = NULL
        WHERE id = ?
      `, [now, story.id]);

      purgedCount++;
    }

    if (reclaimedBytes > 0) {
      const existing = await query.get<{ numeric_value: number }>(`
        SELECT numeric_value FROM storage_stats WHERE key = 'purged_bytes_saved'
      `);
      const totalReclaimed = (existing?.numeric_value || 0) + reclaimedBytes;
      const formatted = this.formatBytes(totalReclaimed);

      await query.run(`
        INSERT INTO storage_stats (key, numeric_value, text_value, updated_at)
        VALUES ('purged_bytes_saved', ?, ?, ?)
        ON CONFLICT (key) DO UPDATE SET
          numeric_value = EXCLUDED.numeric_value,
          text_value = EXCLUDED.text_value,
          updated_at = EXCLUDED.updated_at
      `, [totalReclaimed, formatted, now]);
    }

    console.log(`[TTL Engine] Purged ${purgedCount} expired stories. Reclaimed: ${this.formatBytes(reclaimedBytes)}.`);

    return {
      purgedCount,
      reclaimedBytes,
      reclaimedFormatted: this.formatBytes(reclaimedBytes)
    };
  }

  static async getStorageMetrics() {
    const activeStats = await query.get<{ count: number; total_bytes: number }>(`
      SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_bytes
      FROM saved_stories
      WHERE status = 'active'
    `);

    const purgedStats = await query.get<{ count: number; total_bytes: number }>(`
      SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_bytes
      FROM saved_stories
      WHERE status = 'purged'
    `);

    const cumulativeReclaimed = await query.get<{ numeric_value: number; text_value: string }>(`
      SELECT numeric_value, text_value FROM storage_stats WHERE key = 'purged_bytes_saved'
    `);

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const expiringSoon = await query.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM saved_stories
      WHERE status = 'active' AND expires_at <= ?
    `, [tomorrow]);

    const ttlPolicyDays = await ConfigService.getValue<number>('story_ttl_days', 30);
    const activeBytes = activeStats?.total_bytes || 0;
    const purgedBytes = cumulativeReclaimed?.numeric_value || (purgedStats?.total_bytes || 0);

    return {
      activeStoriesCount: activeStats?.count || 0,
      activeStorageBytes: activeBytes,
      activeStorageFormatted: this.formatBytes(activeBytes),
      purgedStoriesCount: purgedStats?.count || 0,
      purgedStorageBytes: purgedBytes,
      purgedStorageFormatted: this.formatBytes(purgedBytes),
      expiringWithin24h: expiringSoon?.count || 0,
      ttlDaysPolicy: ttlPolicyDays,
      storageOptimizationPercentage: (purgedBytes + activeBytes) > 0 
        ? Math.round((purgedBytes / (purgedBytes + activeBytes)) * 100) 
        : 0
    };
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

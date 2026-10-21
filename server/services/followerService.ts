import { query } from '../db/index.js';

export interface FollowerRecord {
  id: string;
  account_id?: string;
  user_id?: string;
  username: string;
  full_name: string;
  avatar_url: string;
  is_follower: number;
  is_following: number;
  is_mutual: number;
  is_verified: number;
  is_whitelisted: number;
  status: 'current' | 'unfollowed' | 'new_follower';
  unfollowed_detected_at?: string;
  first_detected_at: string;
  last_seen_at: string;
}

export class FollowerService {
  /**
   * Get all followers categorized by filter:
   * 'all' | 'unfollowers' | 'not_following_back' | 'fans' | 'mutual' | 'whitelisted'
   */
  static async getFollowers(params: {
    accountId?: string;
    userId?: string;
    filter?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM followers WHERE 1=1`;
    const bindings: any[] = [];

    if (params.userId) {
      sql += ` AND (user_id = ? OR user_id IS NULL)`;
      bindings.push(params.userId);
    } else if (params.accountId) {
      sql += ` AND account_id = ?`;
      bindings.push(params.accountId);
    }

    switch (params.filter) {
      case 'unfollowers':
        sql += ` AND status = 'unfollowed'`;
        break;
      case 'not_following_back':
        sql += ` AND is_following = 1 AND is_follower = 0 AND status != 'unfollowed'`;
        break;
      case 'fans':
        sql += ` AND is_follower = 1 AND is_following = 0`;
        break;
      case 'mutual':
        sql += ` AND is_mutual = 1`;
        break;
      case 'whitelisted':
        sql += ` AND is_whitelisted = 1`;
        break;
      default:
        break;
    }

    if (params.search) {
      sql += ` AND (username LIKE ? OR full_name LIKE ?)`;
      const term = `%${params.search}%`;
      bindings.push(term, term);
    }

    if (params.filter === 'unfollowers') {
      sql += ` ORDER BY unfollowed_detected_at DESC`;
    } else {
      sql += ` ORDER BY is_whitelisted DESC, last_seen_at DESC`;
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = await query.get<{ total: number }>(countSql, bindings);

    sql += ` LIMIT ? OFFSET ?`;
    bindings.push(limit, offset);

    const rows = await query.all<FollowerRecord>(sql, bindings);

    return {
      data: rows,
      total: totalRow?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((totalRow?.total || 0) / limit)
    };
  }

  /**
   * Get intelligence overview stats (counts for all categories)
   */
  static async getOverviewCounts(userId?: string, accountId?: string) {
    let whereClause = `WHERE 1=1`;
    const bindings: any[] = [];

    if (userId) {
      whereClause += ` AND (user_id = ? OR user_id IS NULL)`;
      bindings.push(userId);
    } else if (accountId) {
      whereClause += ` AND account_id = ?`;
      bindings.push(accountId);
    }

    const totalFollowers = await query.get<{ c: number }>(`
      SELECT COUNT(*) as c FROM followers ${whereClause} AND is_follower = 1
    `, bindings);

    const totalFollowing = await query.get<{ c: number }>(`
      SELECT COUNT(*) as c FROM followers ${whereClause} AND is_following = 1
    `, bindings);

    const unfollowersCount = await query.get<{ c: number }>(`
      SELECT COUNT(*) as c FROM followers ${whereClause} AND status = 'unfollowed'
    `, bindings);

    const notFollowingBackCount = await query.get<{ c: number }>(`
      SELECT COUNT(*) as c FROM followers ${whereClause} AND is_following = 1 AND is_follower = 0 AND status != 'unfollowed'
    `, bindings);

    const fansCount = await query.get<{ c: number }>(`
      SELECT COUNT(*) as c FROM followers ${whereClause} AND is_follower = 1 AND is_following = 0
    `, bindings);

    const mutualCount = await query.get<{ c: number }>(`
      SELECT COUNT(*) as c FROM followers ${whereClause} AND is_mutual = 1
    `, bindings);

    const whitelistedCount = await query.get<{ c: number }>(`
      SELECT COUNT(*) as c FROM followers ${whereClause} AND is_whitelisted = 1
    `, bindings);

    return {
      followersCount: totalFollowers?.c || 0,
      followingCount: totalFollowing?.c || 0,
      unfollowersCount: unfollowersCount?.c || 0,
      notFollowingBackCount: notFollowingBackCount?.c || 0,
      fansCount: fansCount?.c || 0,
      mutualCount: mutualCount?.c || 0,
      whitelistedCount: whitelistedCount?.c || 0
    };
  }

  /**
   * Toggle Whitelist protection for a target user
   */
  static async toggleWhitelist(userId: string | undefined, username: string) {
    let sql = `SELECT * FROM followers WHERE username = ?`;
    const bindings: any[] = [username];

    if (userId) {
      sql += ` AND (user_id = ? OR user_id IS NULL)`;
      bindings.push(userId);
    }

    const row = await query.get<FollowerRecord>(sql, bindings);

    if (!row) {
      const now = new Date().toISOString();
      await query.run(`
        INSERT INTO followers (
          id, user_id, username, full_name, avatar_url, is_whitelisted,
          first_detected_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `, [`fol_${username}`, userId || null, username, username, '', now, now]);
      return { username, is_whitelisted: 1 };
    }

    const newVal = row.is_whitelisted ? 0 : 1;
    await query.run(`
      UPDATE followers SET is_whitelisted = ? WHERE id = ?
    `, [newVal, row.id]);

    return { username, is_whitelisted: newVal };
  }

  /**
   * Perform an automated snapshot scan
   */
  static async syncFollowersSnapshot(userId: string | undefined, currentLiveFollowers: Array<{
    username: string;
    fullName?: string;
    avatarUrl?: string;
    isFollower: boolean;
    isFollowing: boolean;
    isVerified?: boolean;
  }>) {
    const now = new Date().toISOString();
    const liveMap = new Map(currentLiveFollowers.map(f => [f.username.toLowerCase(), f]));

    let sql = `SELECT * FROM followers`;
    const bindings: any[] = [];
    if (userId) {
      sql += ` WHERE user_id = ? OR user_id IS NULL`;
      bindings.push(userId);
    }

    const existing = await query.all<FollowerRecord>(sql, bindings);

    let detectedUnfollowers = 0;
    let newFollowersCount = 0;

    for (const record of existing) {
      const lower = record.username.toLowerCase();
      const current = liveMap.get(lower);

      if (record.is_follower === 1 && (!current || !current.isFollower)) {
        await query.run(`
          UPDATE followers
          SET is_follower = 0, is_mutual = 0, status = 'unfollowed', unfollowed_detected_at = ?
          WHERE id = ?
        `, [now, record.id]);
        detectedUnfollowers++;
      } else if (current) {
        await query.run(`
          UPDATE followers
          SET full_name = ?, avatar_url = ?, is_follower = ?, is_following = ?,
              is_mutual = ?, is_verified = ?, last_seen_at = ?
          WHERE id = ?
        `, [
          current.fullName || record.full_name,
          current.avatarUrl || record.avatar_url,
          current.isFollower ? 1 : 0,
          current.isFollowing ? 1 : 0,
          (current.isFollower && current.isFollowing) ? 1 : 0,
          current.isVerified ? 1 : 0,
          now,
          record.id
        ]);
        liveMap.delete(lower);
      }
    }

    for (const [_, item] of liveMap) {
      const id = `fol_${item.username}_${Date.now()}`;
      await query.run(`
        INSERT INTO followers (
          id, user_id, username, full_name, avatar_url, is_follower, is_following,
          is_mutual, is_verified, is_whitelisted, status, first_detected_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'current', ?, ?)
      `, [
        id,
        userId || null,
        item.username,
        item.fullName || item.username,
        item.avatarUrl || '',
        item.isFollower ? 1 : 0,
        item.isFollowing ? 1 : 0,
        (item.isFollower && item.isFollowing) ? 1 : 0,
        item.isVerified ? 1 : 0,
        now,
        now
      ]);
      newFollowersCount++;
    }

    return {
      syncedAt: now,
      detectedUnfollowers,
      newFollowersCount,
      totalFollowers: currentLiveFollowers.filter(f => f.isFollower).length,
      totalFollowing: currentLiveFollowers.filter(f => f.isFollowing).length
    };
  }

  /**
   * Export follower dataset to CSV format
   */
  static async exportToCsv(userId: string | undefined, filter?: string): Promise<string> {
    const result = await this.getFollowers({ userId, filter, limit: 5000 });
    const headers = ['Username', 'Full Name', 'Follows You', 'You Follow', 'Mutual', 'Whitelisted', 'Status', 'Unfollowed At', 'First Detected'];

    const rows = result.data.map(r => [
      `"${r.username}"`,
      `"${(r.full_name || '').replace(/"/g, '""')}"`,
      r.is_follower ? 'YES' : 'NO',
      r.is_following ? 'YES' : 'NO',
      r.is_mutual ? 'YES' : 'NO',
      r.is_whitelisted ? 'YES' : 'NO',
      r.status,
      r.unfollowed_detected_at || '',
      r.first_detected_at
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

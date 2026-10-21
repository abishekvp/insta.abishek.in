import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { ConfigService } from '../services/configService.js';
import { StorySaverService } from '../services/storySaverService.js';
import { PasswordService } from '../services/passwordService.js';

const router = Router();

// Apply admin authentication to all admin endpoints
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/configs - List all product configurations
router.get('/configs', async (req: AuthenticatedRequest, res) => {
  try {
    const configs = await ConfigService.getAllConfigs();
    return res.status(200).json({ configs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/configs - Update product configurations
router.put('/configs', async (req: AuthenticatedRequest, res) => {
  try {
    const { configs } = req.body; // Map of { [key]: value }
    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({ error: 'Configurations payload must be an object' });
    }

    const actor = req.user?.email || 'admin';
    await ConfigService.updateMultipleConfigs(configs, actor);

    const updatedConfigs = await ConfigService.getAllConfigs();
    return res.status(200).json({ success: true, configs: updatedConfigs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users - List all registered users
router.get('/users', async (req: AuthenticatedRequest, res) => {
  try {
    const users = await query.all(`
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at, u.last_login_at,
             COUNT(s.id) as saved_stories_count
      FROM users u
      LEFT JOIN saved_stories s ON s.user_id = u.id AND s.status = 'active'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return res.status(200).json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/role - Promote/Demote user role
router.patch('/users/:id/role', async (req: AuthenticatedRequest, res) => {
  try {
    const { role } = req.body;
    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'Role must be user or admin' });
    }

    // Prevent removing admin role from oneself
    if (req.user?.userId === req.params.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot revoke your own administrator privileges.' });
    }

    await query.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

    return res.status(200).json({ success: true, role });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/status - Toggle active/suspended
router.patch('/users/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { is_active } = req.body;
    const statusVal = is_active ? 1 : 0;

    if (req.user?.userId === req.params.id && !statusVal) {
      return res.status(400).json({ error: 'You cannot deactivate your own administrator account.' });
    }

    await query.run('UPDATE users SET is_active = ? WHERE id = ?', [statusVal, req.params.id]);

    return res.status(200).json({ success: true, is_active: statusVal });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id - Delete user account
router.delete('/users/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.userId === req.params.id) {
      return res.status(400).json({ error: 'You cannot delete your own account while logged in.' });
    }

    await query.run('DELETE FROM users WHERE id = ?', [req.params.id]);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/password - Admin reset password for a user
router.post('/users/:id/password', async (req: AuthenticatedRequest, res) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const user = await query.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordHash = PasswordService.hashPassword(newPassword);
    await query.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.params.id]);

    return res.status(200).json({ success: true, message: 'User password reset successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats - System health and storage breakdown
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const storageMetrics = await StorySaverService.getStorageMetrics();
    const userStats = await query.get<{ total: number; admins: number }>(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `);

    let dbSizeBytes = 0;
    try {
      const sizeRes = await query.get<{ size: number | string }>(
        `SELECT pg_database_size(current_database()) as size`
      );
      if (sizeRes?.size) {
        dbSizeBytes = Number(sizeRes.size);
      }
    } catch {}

    return res.status(200).json({
      storageMetrics,
      totalUsers: userStats?.total || 0,
      adminCount: userStats?.admins || 0,
      databaseSizeBytes: dbSizeBytes,
      databaseSizeFormatted: StorySaverService.formatBytes(dbSizeBytes)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/purge-expired - Force TTL storage cleanup
router.post('/purge-expired', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await StorySaverService.purgeExpiredStories();
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

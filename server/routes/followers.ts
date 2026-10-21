import { Router } from 'express';
import { FollowerService } from '../services/followerService.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/followers - Paginated list with filtering
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filter, search, page, limit } = req.query;

    const result = await FollowerService.getFollowers({
      accountId: req.user?.userId || 'default-account',
      filter: filter as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50
    });

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/followers/counts - Badge metrics
router.get('/counts', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const counts = await FollowerService.getOverviewCounts(req.user?.userId || 'default-account');
    return res.status(200).json(counts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/followers/whitelist - Toggle friend whitelist protection
router.post('/whitelist', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { username, accountId } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const targetId = accountId || req.user?.userId || 'default-account';
    const result = await FollowerService.toggleWhitelist(targetId, username);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/followers/sync - Trigger snapshot comparison scan
router.post('/sync', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { accountId } = req.body || {};
    const targetId = accountId || req.user?.userId || 'default-account';
    const scanResult = await FollowerService.syncFollowersSnapshot(targetId, []);
    return res.status(200).json({ success: true, ...scanResult });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/followers/export - Export to CSV
router.get('/export', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filter, accountId } = req.query;
    const targetId = (accountId as string) || req.user?.userId || 'default-account';
    const csvContent = await FollowerService.exportToCsv(targetId, filter as string);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=instagram_followers_${filter || 'all'}_${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

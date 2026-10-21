import { Router } from 'express';
import { AutomationEngine } from '../services/automationEngine.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/automations/watchlist - List VIP watchlist friends
router.get('/watchlist', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const list = await AutomationEngine.getWatchlist(req.user?.userId);
    return res.status(200).json({ watchlist: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/automations/watchlist - Add friend to VIP auto-archiver
router.post('/watchlist', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { username, fullName, avatarUrl, frequencyMinutes, autoDownload, retentionDays } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const target = await AutomationEngine.addWatchlistTarget({
      userId: req.user?.userId,
      username,
      fullName,
      avatarUrl,
      frequencyMinutes,
      autoDownload,
      retentionDays
    });

    return res.status(201).json({ success: true, target });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/automations/watchlist/:id - Remove friend from VIP watchlist
router.delete('/watchlist/:id', async (req, res) => {
  try {
    await AutomationEngine.removeWatchlistTarget(req.params.id);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/automations/watchlist/:id/toggle - Toggle auto-download
router.patch('/watchlist/:id/toggle', async (req, res) => {
  try {
    const result = await AutomationEngine.toggleWatchlistTarget(req.params.id);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/automations/run-now - Manually execute the auto-archiver crawler
router.post('/run-now', async (req, res) => {
  try {
    const result = await AutomationEngine.runAutoArchiverJob();
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

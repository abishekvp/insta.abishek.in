import { Router } from 'express';
import { StorySaverService } from '../services/storySaverService.js';
import { InstagramService } from '../services/instagramService.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/stories - List all active stories
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetUsername, mediaType, onlyFavorites, search } = req.query;

    const stories = await StorySaverService.getActiveStories({
      userId: req.user?.userId,
      targetUsername: targetUsername as string,
      mediaType: mediaType as string,
      onlyFavorites: onlyFavorites === 'true',
      search: search as string
    });

    return res.status(200).json({ stories });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/stories/groups - Grouped by creator
router.get('/groups', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const groups = await StorySaverService.getStoryGroups(req.user?.userId);
    return res.status(200).json({ groups });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stories/save - Save story with admin-configured TTL
router.post('/save', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      targetUsername,
      userFullName,
      userAvatar,
      mediaType,
      mediaUrl,
      caption,
      postedAt,
      duration,
      customTtlDays
    } = req.body;

    if (!targetUsername || !mediaUrl || !mediaType) {
      return res.status(400).json({ error: 'targetUsername, mediaUrl, and mediaType are required' });
    }

    const story = await StorySaverService.saveStory({
      userId: req.user?.userId,
      targetUsername,
      userFullName: userFullName || targetUsername,
      userAvatar: userAvatar || '',
      mediaType,
      mediaUrl,
      caption,
      postedAt,
      duration,
      customTtlDays
    });

    return res.status(201).json({ success: true, story });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stories/:id/view - Mark story viewed
router.post('/:id/view', async (req, res) => {
  try {
    await StorySaverService.markViewed(req.params.id);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stories/:id/favorite - Toggle favorite
router.post('/:id/favorite', async (req, res) => {
  try {
    const result = await StorySaverService.toggleFavorite(req.params.id);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stories/purge-expired - Force 30-day TTL expiration cleanup
router.post('/purge-expired', async (req, res) => {
  try {
    const result = await StorySaverService.purgeExpiredStories();
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stories/quick-inspect - Inspect any public Instagram URL
router.post('/quick-inspect', async (req, res) => {
  try {
    const { url } = req.body;
    const media = await InstagramService.inspectInstagramUrl(url);
    return res.status(200).json(media);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;

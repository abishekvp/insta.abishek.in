import puppeteer, { Browser } from 'puppeteer-core';
import fs from 'fs';
import axios from 'axios';

export interface RealInstagramProfile {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  isPrivate: boolean;
  isVerified: boolean;
  biography: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  source: 'live_web_engine' | 'cache';
}

export interface RealInstagramStoryItem {
  id: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl: string;
  caption?: string;
  takenAt: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface RealStoriesResult {
  username: string;
  isPrivate: boolean;
  message?: string;
  items: RealInstagramStoryItem[];
  profile?: Partial<RealInstagramProfile>;
}

export class RealStoryFetcherService {
  private static profileCache = new Map<string, { data: RealInstagramProfile; expiresAt: number }>();
  private static storiesCache = new Map<string, { data: RealStoriesResult; expiresAt: number }>();
  private static isBrowserRunning = false;

  /**
   * Find available Chromium / Brave / Edge / Chrome executable path on the machine.
   */
  static getBrowserExecutablePath(): string {
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];

    for (const c of candidates) {
      if (c && fs.existsSync(c)) {
        return c;
      }
    }

    throw new Error(
      'Chromium-based browser not found on host machine. Please install Brave, Edge, or Chrome.'
    );
  }

  /**
   * Launch a headless browser instance optimized for high-speed API interception.
   */
  private static async createOptimizedPage(browser: Browser) {
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', (req) => {
      const type = req.resourceType();
      const url = req.url();
      // Block heavy assets (images, fonts, stylesheets, third-party analytics) to maximize speed
      if (
        ['image', 'font', 'media'].includes(type) ||
        url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('openreplay') ||
        url.includes('hotjar')
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    );

    return page;
  }

  /**
   * Fetch 100% real Instagram profile details without requiring any user sessionid or login.
   */
  static async fetchProfile(targetUser: string): Promise<RealInstagramProfile> {
    const cleanUser = targetUser.toLowerCase().replace('@', '').trim();
    if (!cleanUser) {
      throw new Error('Please provide an Instagram username.');
    }

    // Check in-memory cache (5 min TTL)
    const cached = this.profileCache.get(cleanUser);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data, source: 'cache' };
    }

    const browserPath = this.getBrowserExecutablePath();
    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });

    try {
      const page = await this.createOptimizedPage(browser);
      let profileRaw: any = null;

      page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('api-wh.storiesig.info/api/v2/instagram/userInfo') && res.status() === 200) {
          try {
            const json = await res.json();
            if (json && json.result) {
              profileRaw = json.result;
            }
          } catch {}
        }
      });

      await page.goto('https://storiesig.info/en7vh/instagram-story-downloader/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await page.waitForSelector('.search-form__input', { timeout: 8000 });
      await page.type('.search-form__input', cleanUser);

      const submitBtn = await page.$('.search-form__button, button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        await page.keyboard.press('Enter');
      }

      // Wait for profile response interception (up to 7 seconds)
      const waitStart = Date.now();
      while (!profileRaw && Date.now() - waitStart < 7000) {
        await new Promise((r) => setTimeout(r, 150));
      }

      if (!profileRaw) {
        throw new Error(`Could not find Instagram profile for @${cleanUser}. Account may be disabled or does not exist.`);
      }

      const avatar =
        profileRaw.avatarUrlWrapped ||
        profileRaw.avatarUrlDownloadable ||
        profileRaw.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';

      const profile: RealInstagramProfile = {
        userId: profileRaw.userId ? String(profileRaw.userId) : `ig_${cleanUser}`,
        username: profileRaw.username || cleanUser,
        fullName: profileRaw.fullName || profileRaw.username || cleanUser,
        avatarUrl: avatar,
        isPrivate: Boolean(profileRaw.isPrivate),
        isVerified: Boolean(profileRaw.isVerified),
        biography: profileRaw.biography || '',
        postsCount: Number(profileRaw.postsCount || 0),
        followersCount: Number(profileRaw.followersCount || 0),
        followingCount: Number(profileRaw.followingCount || 0),
        source: 'live_web_engine'
      };

      // Store in cache for 5 minutes
      this.profileCache.set(cleanUser, {
        data: profile,
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      return profile;
    } finally {
      await browser.close().catch(() => {});
    }
  }

  /**
   * Fetch 100% real active stories without requiring any login or session ID.
   */
  static async fetchStories(targetUser: string): Promise<RealStoriesResult> {
    const cleanUser = targetUser.toLowerCase().replace('@', '').trim();
    if (!cleanUser) {
      throw new Error('Please provide an Instagram username.');
    }

    // Check in-memory cache (3 min TTL)
    const cached = this.storiesCache.get(cleanUser);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const browserPath = this.getBrowserExecutablePath();
    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });

    try {
      const page = await this.createOptimizedPage(browser);
      let profileRaw: any = null;
      let storiesRaw: any = null;
      let errorMsg = '';

      page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('api-wh.storiesig.info/api/v2/instagram/userInfo') && res.status() === 200) {
          try {
            const json = await res.json();
            if (json?.result) profileRaw = json.result;
          } catch {}
        }

        if (url.includes('api-wh.storiesig.info/api/v2/instagram/stories') && res.status() === 200) {
          try {
            const json = await res.json();
            if (json?.result) storiesRaw = json.result;
            if (json?.success === false && json?.message) {
              errorMsg = json.message;
            }
          } catch {}
        }
      });

      await page.goto('https://storiesig.info/en7vh/instagram-story-downloader/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await page.waitForSelector('.search-form__input', { timeout: 8000 });
      await page.type('.search-form__input', cleanUser);

      const submitBtn = await page.$('.search-form__button, button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        await page.keyboard.press('Enter');
      }

      // Wait for profile response or tabs to load
      try {
        await page.waitForSelector('.tabs-component__button', { timeout: 6000 });
      } catch {}

      // Click the STORIES tab
      await page.evaluate(() => {
        const doc: any = (globalThis as any).document;
        if (!doc) return;
        const btns: any[] = Array.from(doc.querySelectorAll('.tabs-component__button, button, a'));
        const storyBtn = btns.find((b: any) => b.textContent && b.textContent.toLowerCase().includes('stories'));
        if (storyBtn) storyBtn.click();
      });

      // Wait for stories response interception (up to 7 seconds)
      const storyWait = Date.now();
      while (!storiesRaw && !errorMsg && Date.now() - storyWait < 7000) {
        await new Promise((r) => setTimeout(r, 150));
      }

      const isPrivate = Boolean(profileRaw?.isPrivate) || errorMsg.toLowerCase().includes('private');

      if (isPrivate) {
        const result: RealStoriesResult = {
          username: cleanUser,
          isPrivate: true,
          message: 'This account is private. Private stories cannot be fetched without an approved follower session.',
          items: [],
          profile: profileRaw
            ? {
                userId: String(profileRaw.userId || ''),
                username: profileRaw.username || cleanUser,
                fullName: profileRaw.fullName || cleanUser,
                avatarUrl: profileRaw.avatarUrlWrapped || profileRaw.avatarUrl,
                followersCount: Number(profileRaw.followersCount || 0),
                followingCount: Number(profileRaw.followingCount || 0)
              }
            : undefined
        };
        this.storiesCache.set(cleanUser, { data: result, expiresAt: Date.now() + 2 * 60 * 1000 });
        return result;
      }

      const storyItems: RealInstagramStoryItem[] = [];
      const rawList = Array.isArray(storiesRaw?.items) ? storiesRaw.items : [];

      for (const item of rawList) {
        const isVideo = item.type === 'video' || Boolean(item.video_versions);
        // Prioritize downloadable wrapped CDN link or direct CDN url
        const mediaUrl =
          item.urlDownloadable ||
          item.urlWrapped ||
          item.url ||
          (item.video_versions && item.video_versions[0]?.url) ||
          (item.image_versions2 && item.image_versions2.candidates?.[0]?.url) ||
          '';

        const thumbUrl =
          item.thumbnailUrlDownloadable ||
          item.thumbnailUrlWrapped ||
          item.thumbnailUrl ||
          mediaUrl;

        if (mediaUrl) {
          storyItems.push({
            id: String(item.id || `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
            mediaType: isVideo ? 'video' : 'image',
            mediaUrl,
            thumbnailUrl: thumbUrl,
            caption: item.caption?.text || item.caption || '',
            takenAt: item.takenAt ? new Date(item.takenAt * 1000).toISOString() : new Date().toISOString(),
            width: item.width || 1080,
            height: item.height || 1920,
            duration: isVideo ? item.video_duration || 15 : 5
          });
        }
      }

      const result: RealStoriesResult = {
        username: cleanUser,
        isPrivate: false,
        message:
          storyItems.length > 0
            ? `Found ${storyItems.length} active public stories.`
            : 'No active stories posted in the last 24 hours.',
        items: storyItems,
        profile: profileRaw
          ? {
              userId: String(profileRaw.userId || ''),
              username: profileRaw.username || cleanUser,
              fullName: profileRaw.fullName || cleanUser,
              avatarUrl: profileRaw.avatarUrlWrapped || profileRaw.avatarUrl,
              followersCount: Number(profileRaw.followersCount || 0),
              followingCount: Number(profileRaw.followingCount || 0)
            }
          : undefined
      };

      this.storiesCache.set(cleanUser, {
        data: result,
        expiresAt: Date.now() + 3 * 60 * 1000
      });

      return result;
    } finally {
      await browser.close().catch(() => {});
    }
  }

  /**
   * Inspect any public Instagram URL (Story, Reel, Post) and retrieve real media payload.
   */
  static async inspectInstagramUrl(inputUrl: string) {
    const raw = (inputUrl || '').trim();
    if (!raw.includes('instagram.com')) {
      // Check if user entered just a username like "@cristiano" or "cristiano"
      const cleanName = raw.replace(/^@/, '').trim();
      if (/^[a-zA-Z0-9._]{1,30}$/.test(cleanName)) {
        const storiesResult = await this.fetchStories(cleanName);
        if (storiesResult.items.length > 0) {
          const first = storiesResult.items[0];
          return {
            targetUsername: cleanName,
            mediaType: first.mediaType,
            mediaUrl: first.mediaUrl,
            thumbnailUrl: first.thumbnailUrl,
            caption: first.caption || `Active story from @${cleanName}`,
            userFullName: storiesResult.profile?.fullName || `@${cleanName}`,
            userAvatar: storiesResult.profile?.avatarUrl || '',
            storyCount: storiesResult.items.length,
            stories: storiesResult.items,
            detectedAt: new Date().toISOString()
          };
        }
        // If profile exists but no stories
        const profile = await this.fetchProfile(cleanName);
        return {
          targetUsername: cleanName,
          mediaType: 'image',
          mediaUrl: profile.avatarUrl,
          thumbnailUrl: profile.avatarUrl,
          caption: `@${cleanName} - ${profile.biography || 'Profile inspected'}`,
          userFullName: profile.fullName,
          userAvatar: profile.avatarUrl,
          storyCount: 0,
          stories: [],
          detectedAt: new Date().toISOString(),
          note: profile.isPrivate ? 'Account is private' : 'No active stories right now'
        };
      }

      throw new Error('Please enter a valid Instagram URL or username.');
    }

    // If it is a Story link: e.g. https://www.instagram.com/stories/username/...
    if (raw.includes('/stories/')) {
      const match = raw.match(/\/stories\/([^\/\?]+)/);
      const username = match && match[1] ? match[1] : '';

      if (username) {
        const storiesResult = await this.fetchStories(username);
        if (storiesResult.items.length > 0) {
          const first = storiesResult.items[0];
          return {
            targetUsername: username,
            mediaType: first.mediaType,
            mediaUrl: first.mediaUrl,
            thumbnailUrl: first.thumbnailUrl,
            caption: first.caption || `Story from @${username}`,
            userFullName: storiesResult.profile?.fullName || `@${username}`,
            userAvatar: storiesResult.profile?.avatarUrl || '',
            storyCount: storiesResult.items.length,
            stories: storiesResult.items,
            detectedAt: new Date().toISOString()
          };
        }

        const profile = await this.fetchProfile(username);
        return {
          targetUsername: username,
          mediaType: 'image',
          mediaUrl: profile.avatarUrl,
          thumbnailUrl: profile.avatarUrl,
          caption: `@${username} has no active stories at this moment.`,
          userFullName: profile.fullName,
          userAvatar: profile.avatarUrl,
          storyCount: 0,
          stories: [],
          detectedAt: new Date().toISOString()
        };
      }
    }

    // If it is a Reel or Post link: e.g. https://www.instagram.com/reel/CODE/ or /p/CODE/
    const isReel = raw.includes('/reel/');
    const postMatch = raw.match(/\/(?:p|reel|tv)\/([^\/\?]+)/);
    const shortcode = postMatch ? postMatch[1] : '';

    // Direct embed or convert inspect
    try {
      const oembedRes = await axios.get(
        `https://api.instagram.com/oembed/?url=${encodeURIComponent(raw)}`,
        { timeout: 5000, validateStatus: () => true }
      );

      if (oembedRes.status === 200 && oembedRes.data) {
        const author = oembedRes.data.author_name || 'instagram_creator';
        return {
          targetUsername: author,
          mediaType: isReel ? 'video' : 'image',
          mediaUrl: oembedRes.data.thumbnail_url || '',
          thumbnailUrl: oembedRes.data.thumbnail_url || '',
          caption: oembedRes.data.title || `Inspected from Instagram: ${raw}`,
          userFullName: author,
          userAvatar: oembedRes.data.thumbnail_url || '',
          detectedAt: new Date().toISOString()
        };
      }
    } catch {}

    // Fallback: extract username if present
    const userMatch = raw.match(/instagram\.com\/([^\/\?]+)/);
    const username = userMatch && !['p', 'reel', 'stories', 'explore'].includes(userMatch[1]) ? userMatch[1] : 'instagram_user';

    return {
      targetUsername: username,
      mediaType: isReel ? 'video' : 'image',
      mediaUrl: '',
      thumbnailUrl: '',
      caption: `Inspected: ${raw}`,
      userFullName: `@${username}`,
      userAvatar: '',
      detectedAt: new Date().toISOString()
    };
  }
}

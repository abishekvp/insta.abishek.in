import { Router } from 'express';
import { query } from '../db/index.js';
import { PasswordService } from '../services/passwordService.js';
import { AuthService } from '../services/authService.js';
import { ConfigService } from '../services/configService.js';
import { InstagramService } from '../services/instagramService.js';
import { InstagramOAuthService } from '../services/instagramOAuthService.js';
import { APP_BASE_URL } from '../config.js';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Redirect helper for the OAuth callback: bounces the browser back to the SPA with a status.
function redirectToApp(res: any, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  res.redirect(`${APP_BASE_URL}/?${qs}`);
}

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Check if registrations are allowed
    const registrationsAllowed = await ConfigService.getValue<boolean>('allow_user_registrations', true);
    const usersCount = await query.get<{ count: number }>('SELECT COUNT(*) as count FROM users');

    // First user is always allowed and automatically made admin if table is empty
    const isFirstUser = (usersCount?.count || 0) === 0;
    if (!registrationsAllowed && !isFirstUser) {
      return res.status(403).json({ error: 'User registration is currently closed by the Administrator.' });
    }

    const existing = await query.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const userId = `usr_${Date.now()}`;
    const passwordHash = PasswordService.hashPassword(password);
    const role: 'user' | 'admin' = isFirstUser ? 'admin' : 'user';
    const now = new Date().toISOString();

    await query.run(`
      INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `, [userId, cleanEmail, passwordHash, fullName.trim(), role, now, now]);

    const token = AuthService.generateToken({ userId, email: cleanEmail, role });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        email: cleanEmail,
        fullName: fullName.trim(),
        role
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login - Login with Email and Password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await query.get<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: 'user' | 'admin';
      is_active: number;
    }>('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.is_active === 0) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an Administrator.' });
    }

    const isValid = PasswordService.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const now = new Date().toISOString();
    await query.run('UPDATE users SET last_login_at = ? WHERE id = ?', [now, user.id]);

    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me - Current User Profile & Linked Instagram Account
router.get('/me', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(200).json({ authenticated: false, user: null, account: null });
    }

    const user = await query.get<{ id: string; email: string; full_name: string; role: string }>(
      'SELECT id, email, full_name, role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(200).json({ authenticated: false, user: null, account: null });
    }

    // Get linked Instagram account (with credentials scrubbed)
    const instagramAccount = await InstagramService.getActiveAccount(user.id);
    const safeAccount = InstagramService.sanitizeAccount(instagramAccount);

    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      },
      account: safeAccount
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/account - Get current active Instagram account
router.get('/account', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const account = await InstagramService.getActiveAccount(req.user?.userId);
    return res.status(200).json({ account: InstagramService.sanitizeAccount(account) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// OPTION 1: Official Instagram OAuth (Instagram Login) — the recommended path.
// The user authenticates on Instagram's own consent screen; we never see their
// password or session cookie.
// ============================================================================

// GET /api/auth/instagram/oauth/status - Is the official login configured on this server?
router.get('/instagram/oauth/status', async (_req, res) => {
  try {
    const settings = await InstagramOAuthService.getSettings();
    return res.status(200).json({
      configured: settings.configured,
      redirectUri: settings.redirectUri,
      scopes: settings.scopes
    });
  } catch {
    return res.status(200).json({ configured: false });
  }
});

// GET /api/auth/instagram/oauth/start - Build the Instagram consent URL for the current user.
router.get('/instagram/oauth/start', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const isConfigured = await InstagramOAuthService.isConfigured();
    if (!isConfigured) {
      return res.status(503).json({
        error: 'Official Instagram login is not configured on this server. Set Client ID & Client Secret in Admin Portal or .env.'
      });
    }
    const state = InstagramOAuthService.signState(req.user?.userId);
    const authorizeUrl = await InstagramOAuthService.buildAuthorizeUrl(state);
    return res.status(200).json({ authorizeUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/instagram/oauth/callback - Instagram redirects here with ?code & ?state.
router.get('/instagram/oauth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query as Record<string, string>;
  const settings = await InstagramOAuthService.getSettings();
  const bounce = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    res.redirect(`${settings.appBaseUrl}/?${qs}`);
  };

  if (error) {
    return bounce({ ig_connect: 'error', ig_message: error_description || error });
  }
  if (!code || !state) {
    return bounce({ ig_connect: 'error', ig_message: 'Missing authorization code or state.' });
  }

  const statePayload = InstagramOAuthService.verifyState(state);
  if (!statePayload) {
    return bounce({ ig_connect: 'error', ig_message: 'Invalid or expired login state. Please try again.' });
  }

  try {
    const result = await InstagramOAuthService.connectWithCode(code, statePayload.userId);
    return bounce({ ig_connect: 'success', ig_username: result.username });
  } catch (err: any) {
    return bounce({ ig_connect: 'error', ig_message: err.message || 'Instagram login failed.' });
  }
});

// POST /api/auth/instagram/credentials - Link Instagram Account via Credentials
router.post('/instagram/credentials', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { username, password, isSandbox } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Instagram username and password are required.' });
    }

    const userId = req.user?.userId;
    const result = await InstagramService.connectWithCredentials(username, password, Boolean(isSandbox), userId);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/instagram/fetch-session - Inspect & Fetch Profile from Session Token (Preview only)
router.post('/instagram/fetch-session', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionCookie, username } = req.body;
    if (!sessionCookie) {
      return res.status(400).json({ error: 'Session cookie or sessionid token is required.' });
    }

    const profile = await InstagramService.fetchSessionDetails(sessionCookie, username);
    return res.status(200).json({
      success: true,
      profile,
      message: `Successfully fetched profile for @${profile.username}`
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to fetch Instagram session details.' });
  }
});

// POST /api/auth/instagram/session-auto - Automatically Fetch & Link Instagram Account with Sessionid
router.post('/instagram/session-auto', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionCookie, fallbackUsername } = req.body;
    if (!sessionCookie) {
      return res.status(400).json({ error: 'Instagram sessionid or cookie string is required.' });
    }

    const userId = req.user?.userId;
    const result = await InstagramService.connectWithSessionAuto(sessionCookie, userId, fallbackUsername);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to auto-connect Instagram session.' });
  }
});

// POST /api/auth/instagram/session - Link Instagram Account via Session Cookie
router.post('/instagram/session', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { username, sessionCookie } = req.body;
    if (!sessionCookie) {
      return res.status(400).json({ error: 'Session token or cookie is required.' });
    }

    const userId = req.user?.userId;
    const result = username
      ? await InstagramService.connectWithSession(username, sessionCookie, userId)
      : await InstagramService.connectWithSessionAuto(sessionCookie, userId);

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/instagram/verify-2fa - Submit 2FA Code
router.post('/instagram/verify-2fa', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { accountId, code } = req.body;
    if (!accountId || !code) {
      return res.status(400).json({ error: 'Account ID and 2FA code are required.' });
    }

    const result = await InstagramService.verifyTwoFactor(accountId, code);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/instagram/sandbox - Toggle sandbox mode
router.post('/instagram/sandbox', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { accountId, isSandbox } = req.body;
    const isSandboxInt = isSandbox ? 1 : 0;
    if (accountId) {
      await query.run('UPDATE accounts SET is_sandbox = ? WHERE id = ?', [isSandboxInt, accountId]);
    } else {
      await query.run('UPDATE accounts SET is_sandbox = ? WHERE is_active = 1', [isSandboxInt]);
    }
    return res.status(200).json({ success: true, is_sandbox: isSandboxInt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

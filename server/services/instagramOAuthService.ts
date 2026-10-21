import axios from 'axios';
import crypto from 'crypto';
import { query } from '../db/index.js';
import { encrypt } from './encryption.js';
import { ConfigService } from './configService.js';
import {
  PORT,
  SECRET_KEY,
  APP_BASE_URL,
  IG_OAUTH_CLIENT_ID,
  IG_OAUTH_CLIENT_SECRET,
  IG_OAUTH_REDIRECT_URI,
  IG_OAUTH_SCOPES,
  isInstagramOAuthConfigured
} from '../config.js';

/**
 * Official Instagram OAuth connector.
 *
 * Implements "Instagram API with Instagram Login" (the current, supported path that
 * replaced the deprecated Basic Display API). The user is sent to Instagram's own
 * consent screen, approves there, and we exchange the returned code for an access
 * token. We never see or store the user's Instagram password or session cookie here.
 *
 * Reference flow:
 *   1. Redirect to https://www.instagram.com/oauth/authorize
 *   2. Exchange ?code=... at https://api.instagram.com/oauth/access_token (short-lived)
 *   3. Upgrade to a long-lived token at https://graph.instagram.com/access_token
 *   4. Read profile from https://graph.instagram.com/me
 */

const AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_BASE = 'https://graph.instagram.com';

export interface OAuthStatePayload {
  userId?: string;
  nonce: string;
  exp: number;
}

export interface OAuthSettings {
  appBaseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  configured: boolean;
}

export interface OAuthLinkResult {
  success: boolean;
  accountId: string;
  username: string;
  instagramUserId: string;
  accountType?: string;
  tokenExpiresAt?: string;
  message: string;
}

export class InstagramOAuthService {
  /**
   * Resolve live OAuth configuration from ConfigService (Admin Portal settings in DB),
   * falling back to .env environment variables.
   */
  static async getSettings(): Promise<OAuthSettings> {
    const rawBaseUrl = await ConfigService.getValue('app_base_url', APP_BASE_URL);
    const appBaseUrl = (rawBaseUrl || `http://localhost:${PORT}`).trim().replace(/\/$/, '');

    const clientId = ((await ConfigService.getValue('ig_oauth_client_id', '')) || IG_OAUTH_CLIENT_ID || '').trim();
    const clientSecret = ((await ConfigService.getValue('ig_oauth_client_secret', '')) || IG_OAUTH_CLIENT_SECRET || '').trim();

    let redirectUri = ((await ConfigService.getValue('ig_oauth_redirect_uri', '')) || IG_OAUTH_REDIRECT_URI || '').trim();
    if (!redirectUri) {
      redirectUri = `${appBaseUrl}/api/auth/instagram/oauth/callback`;
    }

    const rawScopes = ((await ConfigService.getValue('ig_oauth_scopes', '')) || IG_OAUTH_SCOPES || 'instagram_business_basic').trim();
    const scopes = rawScopes
      .split(/[\s,]+/)
      .filter(Boolean)
      .join(',');

    const configured = Boolean(clientId && clientSecret && redirectUri);

    return {
      appBaseUrl,
      clientId,
      clientSecret,
      redirectUri,
      scopes,
      configured
    };
  }

  static async isConfigured(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.configured;
  }

  /**
   * Sign a short-lived, CSRF-protecting state value that also carries the app user id
   * so the callback can attribute the linked account to the right user.
   */
  static signState(userId?: string, ttlSeconds = 600): string {
    const payload: OAuthStatePayload = {
      userId,
      nonce: crypto.randomBytes(12).toString('hex'),
      exp: Math.floor(Date.now() / 1000) + ttlSeconds
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', SECRET_KEY).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
  }

  static verifyState(state: string): OAuthStatePayload | null {
    try {
      const [encoded, sig] = (state || '').split('.');
      if (!encoded || !sig) return null;
      const expected = crypto.createHmac('sha256', SECRET_KEY).update(encoded).digest('base64url');
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
      }
      const payload: OAuthStatePayload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Build the Instagram consent URL the browser is redirected to.
   */
  static async buildAuthorizeUrl(state: string): Promise<string> {
    const settings = await this.getSettings();
    if (!settings.configured) {
      throw new Error('Instagram OAuth is not configured on this server. Configure Client ID and Secret in Admin Portal or .env.');
    }
    const params = new URLSearchParams({
      client_id: settings.clientId,
      redirect_uri: settings.redirectUri,
      response_type: 'code',
      scope: settings.scopes,
      state
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * Exchange an authorization code for a short-lived access token.
   */
  static async exchangeCodeForToken(code: string): Promise<{ accessToken: string; userId: string; permissions?: string }> {
    const settings = await this.getSettings();
    // Instagram strips a trailing "#_" fragment onto the redirect in some flows.
    const cleanCode = code.replace(/#_$/, '');
    const form = new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: settings.redirectUri,
      code: cleanCode
    });

    const resp = await axios.post(TOKEN_URL, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
      validateStatus: () => true
    });

    if (resp.status !== 200 || !resp.data?.access_token) {
      const detail = resp.data?.error_message || resp.data?.error?.message || `HTTP ${resp.status}`;
      throw new Error(`Instagram token exchange failed: ${detail}`);
    }

    return {
      accessToken: resp.data.access_token,
      userId: String(resp.data.user_id ?? resp.data.user?.id ?? ''),
      permissions: resp.data.permissions
    };
  }

  /**
   * Upgrade a short-lived token to a ~60 day long-lived token. Best-effort: if this
   * fails we keep the short-lived token rather than aborting the whole link.
   */
  static async exchangeForLongLivedToken(shortToken: string): Promise<{ accessToken: string; expiresInSeconds?: number }> {
    const settings = await this.getSettings();
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: settings.clientSecret,
      access_token: shortToken
    });
    const resp = await axios.get(`${GRAPH_BASE}/access_token?${params.toString()}`, {
      timeout: 10000,
      validateStatus: () => true
    });
    if (resp.status === 200 && resp.data?.access_token) {
      return { accessToken: resp.data.access_token, expiresInSeconds: resp.data.expires_in };
    }
    return { accessToken: shortToken };
  }

  /**
   * Read the connected profile from the Graph API.
   */
  static async fetchProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    accountType?: string;
    followersCount?: number;
    followsCount?: number;
    profilePictureUrl?: string;
    name?: string;
  }> {
    const fields = 'user_id,username,account_type,followers_count,follows_count,profile_picture_url,name';
    const resp = await axios.get(`${GRAPH_BASE}/me`, {
      params: { fields, access_token: accessToken },
      timeout: 10000,
      validateStatus: () => true
    });
    if (resp.status !== 200 || !resp.data) {
      const detail = resp.data?.error?.message || `HTTP ${resp.status}`;
      throw new Error(`Failed to read Instagram profile: ${detail}`);
    }
    const d = resp.data;
    return {
      id: String(d.user_id ?? d.id ?? ''),
      username: d.username,
      accountType: d.account_type,
      followersCount: typeof d.followers_count === 'number' ? d.followers_count : undefined,
      followsCount: typeof d.follows_count === 'number' ? d.follows_count : undefined,
      profilePictureUrl: d.profile_picture_url,
      name: d.name
    };
  }

  /**
   * Full server-side flow: code -> token -> long-lived token -> profile -> upsert account.
   */
  static async connectWithCode(code: string, userId?: string): Promise<OAuthLinkResult> {
    const short = await this.exchangeCodeForToken(code);
    const long = await this.exchangeForLongLivedToken(short.accessToken);

    let profile: Awaited<ReturnType<typeof InstagramOAuthService.fetchProfile>> | null = null;
    try {
      profile = await this.fetchProfile(long.accessToken);
    } catch {
      // Non-fatal: we can still persist the link using the id from the token response.
    }

    const username = (profile?.username || `ig_${short.userId}`).toLowerCase().trim();
    const instagramUserId = profile?.id || short.userId;
    const now = new Date().toISOString();
    const tokenExpiresAt = long.expiresInSeconds
      ? new Date(Date.now() + long.expiresInSeconds * 1000).toISOString()
      : null;

    const encryptedToken = encrypt(long.accessToken);
    const avatarUrl =
      profile?.profilePictureUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';
    const fullName = profile?.name || username;
    const followerCount = profile?.followersCount ?? 0;
    const followingCount = profile?.followsCount ?? 0;

    const existing = await query.get<{ id: string }>(
      'SELECT id FROM accounts WHERE username = ? AND (user_id = ? OR user_id IS NULL)',
      [username, userId || null]
    );
    const accountId = existing ? existing.id : `acc_${Date.now()}`;

    if (existing) {
      await query.run(
        `UPDATE accounts
           SET user_id = ?, full_name = ?, avatar_url = ?,
               auth_method = 'oauth', oauth_access_token = ?, oauth_token_expires_at = ?,
               instagram_user_id = ?, session_cookie = NULL, encrypted_password = NULL,
               is_active = 1, two_factor_required = 0, is_sandbox = 0,
               follower_count = ?, following_count = ?, last_synced_at = ?
         WHERE id = ?`,
        [userId || null, fullName, avatarUrl, encryptedToken, tokenExpiresAt, instagramUserId,
         followerCount, followingCount, now, accountId]
      );
    } else {
      await query.run(
        `INSERT INTO accounts (
            id, user_id, username, full_name, avatar_url, auth_method,
            oauth_access_token, oauth_token_expires_at, instagram_user_id,
            is_active, two_factor_required, is_sandbox, follower_count, following_count,
            created_at, last_synced_at
         ) VALUES (?, ?, ?, ?, ?, 'oauth', ?, ?, ?, 1, 0, 0, ?, ?, ?, ?)`,
        [accountId, userId || null, username, fullName, avatarUrl, encryptedToken, tokenExpiresAt,
         instagramUserId, followerCount, followingCount, now, now]
      );
    }

    return {
      success: true,
      accountId,
      username,
      instagramUserId,
      accountType: profile?.accountType,
      tokenExpiresAt: tokenExpiresAt || undefined,
      message: `Instagram account @${username} connected via official login.`
    };
  }
}

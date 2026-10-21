import axios from 'axios';
import {
  User,
  Account,
  Story,
  StoryGroup,
  Follower,
  WatchlistTarget,
  StorageMetrics,
  FollowerOverviewCounts,
  ProductConfig,
  AdminStats,
  InstagramSessionProfile
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization Bearer token to all outgoing API requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('instavault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ApiService = {
  // Authentication & Session
  setToken(token: string) {
    localStorage.setItem('instavault_token', token);
  },

  getToken(): string | null {
    return localStorage.getItem('instavault_token');
  },

  logout() {
    localStorage.removeItem('instavault_token');
  },

  async login(email: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.token) {
      this.setToken(res.data.token);
    }
    return res.data;
  },

  async register(email: string, password: string, fullName: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await api.post('/auth/register', { email, password, fullName });
    if (res.data.token) {
      this.setToken(res.data.token);
    }
    return res.data;
  },

  async getMe(): Promise<{ authenticated: boolean; user: User | null; account: Account | null }> {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },

  async changeName(fullName: string): Promise<{ success: boolean; user: User; message: string }> {
    const res = await api.post('/auth/change-name', { fullName });
    return res.data;
  },

  // Instagram Connection — Option 1: Official OAuth (Instagram Login)
  async getInstagramOAuthStatus(): Promise<{ configured: boolean }> {
    const res = await api.get('/auth/instagram/oauth/status');
    return res.data;
  },

  // Returns Instagram's consent URL. The caller navigates the browser to it.
  async startInstagramOAuth(): Promise<{ authorizeUrl: string }> {
    const res = await api.get('/auth/instagram/oauth/start');
    return res.data;
  },

  // Instagram Connection — Option 2: credentials / session
  async loginCredentials(username: string, passwordPlain: string, isSandbox = false): Promise<{
    success: boolean;
    accountId?: string;
    username?: string;
    twoFactorRequired?: boolean;
    message: string;
  }> {
    const res = await api.post('/auth/instagram/credentials', { username, password: passwordPlain, isSandbox });
    return res.data;
  },

  async linkInstagramCredentials(username: string, passwordPlain: string, isSandbox = false) {
    return this.loginCredentials(username, passwordPlain, isSandbox);
  },

  async loginSession(username: string, sessionCookie: string): Promise<{
    success: boolean;
    accountId?: string;
    username?: string;
    message: string;
  }> {
    const res = await api.post('/auth/instagram/session', { username, sessionCookie });
    return res.data;
  },

  async loginSessionCookie(username: string, sessionCookie: string): Promise<{
    success: boolean;
    accountId?: string;
    username?: string;
    message: string;
  }> {
    return this.loginSession(username, sessionCookie);
  },

  async linkInstagramSession(username: string, sessionCookie: string) {
    return this.loginSession(username, sessionCookie);
  },

  async fetchInstagramSession(sessionCookie: string, username?: string): Promise<{
    success: boolean;
    profile: InstagramSessionProfile;
    message: string;
  }> {
    const res = await api.post('/auth/instagram/fetch-session', { sessionCookie, username });
    return res.data;
  },

  async linkInstagramSessionAuto(sessionCookie: string, fallbackUsername?: string): Promise<{
    success: boolean;
    accountId?: string;
    username?: string;
    profile?: InstagramSessionProfile;
    message: string;
  }> {
    const res = await api.post('/auth/instagram/session-auto', { sessionCookie, fallbackUsername });
    return res.data;
  },

  async loginSessionAuto(sessionCookie: string, fallbackUsername?: string) {
    return this.linkInstagramSessionAuto(sessionCookie, fallbackUsername);
  },

  async verify2FA(accountId: string, code: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await api.post('/auth/instagram/verify-2fa', { accountId, code });
    return res.data;
  },

  async verifyInstagram2FA(accountId: string, code: string) {
    return this.verify2FA(accountId, code);
  },

  async getAccount(): Promise<{ account: Account | null }> {
    const res = await api.get('/auth/account');
    return res.data;
  },

  async getAccounts(): Promise<{ accounts: Account[] }> {
    const res = await api.get('/auth/accounts');
    return res.data;
  },

  async removeAccount(accountId: string): Promise<{ success: boolean; message: string; username?: string }> {
    const res = await api.delete(`/auth/accounts/${accountId}`);
    return res.data;
  },

  async disconnectAccount(accountId?: string): Promise<{ success: boolean; message: string; username?: string }> {
    const res = await api.post('/auth/account/disconnect', { accountId });
    return res.data;
  },

  async switchActiveAccount(accountId: string): Promise<{ success: boolean; account: Account }> {
    const res = await api.post(`/auth/accounts/${accountId}/switch`);
    return res.data;
  },

  async toggleSandbox(accountId: string, isSandbox: boolean): Promise<{ success: boolean; is_sandbox: number }> {
    const res = await api.post('/auth/instagram/sandbox', { accountId, isSandbox });
    return res.data;
  },

  // Stories
  async getStories(params?: {
    targetUsername?: string;
    mediaType?: string;
    onlyFavorites?: boolean;
    search?: string;
  }): Promise<{ stories: Story[] }> {
    const res = await api.get('/stories', { params });
    return res.data;
  },

  async getStoryGroups(): Promise<{ groups: StoryGroup[] }> {
    const res = await api.get('/stories/groups');
    return res.data;
  },

  async saveStory(data: any): Promise<{ success: boolean; story: Story }> {
    const res = await api.post('/stories/save', data);
    return res.data;
  },

  async markStoryViewed(storyId: string) {
    const res = await api.post(`/stories/${storyId}/view`);
    return res.data;
  },

  async toggleStoryFavorite(storyId: string) {
    const res = await api.post(`/stories/${storyId}/favorite`);
    return res.data;
  },

  async purgeExpiredStories(): Promise<{
    purgedCount: number;
    reclaimedBytes: number;
    reclaimedFormatted: string;
  }> {
    const res = await api.post('/stories/purge-expired');
    return res.data;
  },

  async quickInspectUrl(url: string) {
    const res = await api.post('/stories/quick-inspect', { url });
    return res.data;
  },

  async syncTargetStories(username: string, customTtlDays?: number): Promise<{
    success: boolean;
    targetUsername: string;
    newStoriesSaved: number;
    totalStoriesFound: number;
    message: string;
    stories: Story[];
  }> {
    const res = await api.post('/stories/sync-target', { username, customTtlDays });
    return res.data;
  },

  async fetchLiveStories(username: string): Promise<any> {
    const res = await api.get(`/stories/live/${encodeURIComponent(username)}`);
    return res.data;
  },

  // Follower Intelligence
  async getFollowers(params: {
    filter?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Follower[]; total: number; page: number; totalPages: number }> {
    const res = await api.get('/followers', { params });
    return res.data;
  },

  async getFollowerCounts(): Promise<FollowerOverviewCounts> {
    const res = await api.get('/followers/counts');
    return res.data;
  },

  async toggleWhitelist(usernameOrAccountId: string, username?: string): Promise<{ username: string; is_whitelisted: number }> {
    const targetUser = username || usernameOrAccountId;
    const accountId = username ? usernameOrAccountId : undefined;
    const res = await api.post('/followers/whitelist', { username: targetUser, accountId });
    return res.data;
  },

  async syncFollowers(accountId?: string): Promise<{
    success: boolean;
    syncedAt?: string;
    detectedUnfollowers: number;
    newFollowersCount: number;
    totalFollowers?: number;
    totalFollowing?: number;
  }> {
    const res = await api.post('/followers/sync', { accountId });
    return res.data;
  },

  async exportFollowersCsv(accountIdOrFilter?: string, filter?: string) {
    const targetFilter = filter !== undefined ? filter : accountIdOrFilter;
    const accountId = filter !== undefined ? accountIdOrFilter : undefined;
    const params = new URLSearchParams();
    if (targetFilter) params.set('filter', targetFilter);
    if (accountId) params.set('accountId', accountId);
    window.open(`/api/followers/export?${params.toString()}`, '_blank');
  },

  // Automations & Watchlist
  async getWatchlist(): Promise<{ watchlist: WatchlistTarget[] }> {
    const res = await api.get('/automations/watchlist');
    return res.data;
  },

  async addWatchlistTarget(data: {
    accountId?: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
    frequencyMinutes?: number;
    autoDownload?: boolean;
    retentionDays?: number;
  }) {
    const res = await api.post('/automations/watchlist', data);
    return res.data;
  },

  async removeWatchlistTarget(id: string) {
    const res = await api.delete(`/automations/watchlist/${id}`);
    return res.data;
  },

  async toggleWatchlistTarget(id: string) {
    const res = await api.patch(`/automations/watchlist/${id}/toggle`);
    return res.data;
  },

  async runAutoArchiverNow() {
    const res = await api.post('/automations/run-now');
    return res.data;
  },

  // Storage & Analytics
  async getStorageMetrics(): Promise<StorageMetrics> {
    const res = await api.get('/stats/storage');
    return res.data;
  },

  async getAnalyticsOverview() {
    const res = await api.get('/stats/overview');
    return res.data;
  },

  // ================= ADMIN PORTAL APIS =================
  async getAdminConfigs(): Promise<{ configs: ProductConfig[] }> {
    const res = await api.get('/admin/configs');
    return res.data;
  },

  async updateAdminConfigs(configs: Record<string, string>): Promise<{ success: boolean; configs: ProductConfig[] }> {
    const res = await api.put('/admin/configs', { configs });
    return res.data;
  },

  async getAdminUsers(): Promise<{ users: User[] }> {
    const res = await api.get('/admin/users');
    return res.data;
  },

  async updateUserRole(userId: string, role: 'user' | 'admin') {
    const res = await api.patch(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  async updateUserStatus(userId: string, isActive: boolean) {
    const res = await api.patch(`/admin/users/${userId}/status`, { is_active: isActive });
    return res.data;
  },

  async deleteUser(userId: string) {
    const res = await api.delete(`/admin/users/${userId}`);
    return res.data;
  },

  async adminResetPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/admin/users/${userId}/password`, { newPassword });
    return res.data;
  },

  async getAdminStats(): Promise<AdminStats> {
    const res = await api.get('/admin/stats');
    return res.data;
  },

  async forceAdminPurge() {
    const res = await api.post('/admin/purge-expired');
    return res.data;
  }
};

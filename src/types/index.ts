export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  isActive?: number;
  createdAt?: string;
  savedStoriesCount?: number;
}

export interface ProductConfig {
  key: string;
  value: string;
  type: 'number' | 'boolean' | 'string' | 'json';
  category: 'storage' | 'archiver' | 'access' | 'system' | 'oauth';
  label: string;
  description: string;
  updated_at: string;
  updated_by?: string;
}

export interface AdminStats {
  storageMetrics: StorageMetrics;
  totalUsers: number;
  adminCount: number;
  databaseSizeBytes: number;
  databaseSizeFormatted: string;
}

export interface Account {
  id: string;
  user_id?: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  is_active: number;
  two_factor_required: number;
  is_sandbox?: number;
  auth_method?: 'oauth' | 'session' | 'credentials' | 'sandbox';
  instagram_user_id?: string;
  oauth_token_expires_at?: string;
  follower_count: number;
  following_count: number;
  story_count?: number;
  created_at: string;
  last_synced_at?: string;
}

export interface InstagramSessionProfile {
  userId?: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  followerCount: number;
  followingCount: number;
  storyCount?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
  biography?: string;
  isSandbox?: boolean;
  rawSessionId: string;
  cleanCookieString: string;
  source?: 'live_api' | 'web_api' | 'sandbox_simulator' | 'fallback_detected';
}

export interface Story {
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
}

export interface StoryGroup {
  username: string;
  fullName: string;
  avatar: string;
  stories: Story[];
  hasUnviewed: boolean;
  latestPostedAt: string;
}

export interface Follower {
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

export interface WatchlistTarget {
  id: string;
  account_id?: string;
  user_id?: string;
  target_username: string;
  target_full_name: string;
  target_avatar: string;
  is_active: number;
  check_frequency_minutes: number;
  auto_download: number;
  retention_days: number;
  last_checked_at: string;
  stories_saved_count: number;
  created_at: string;
}

export interface StorageMetrics {
  activeStoriesCount: number;
  activeStorageBytes: number;
  activeStorageFormatted: string;
  purgedStoriesCount: number;
  purgedStorageBytes: number;
  purgedStorageFormatted: string;
  expiringWithin24h: number;
  ttlDaysPolicy: number;
  storageOptimizationPercentage: number;
}

export interface FollowerOverviewCounts {
  followersCount: number;
  followingCount: number;
  unfollowersCount: number;
  notFollowingBackCount: number;
  fansCount: number;
  mutualCount: number;
  whitelistedCount: number;
}

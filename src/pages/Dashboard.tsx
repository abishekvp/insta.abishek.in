import React, { useState, useEffect } from 'react';
import {
  Film,
  Users2,
  Cpu,
  HardDrive,
  RefreshCw,
  Plus,
  Play,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Story, StoryGroup, StorageMetrics, FollowerOverviewCounts } from '../types';
import { StoryCirclesBar } from '../components/StoryCirclesBar';
import { StoryCard } from '../components/StoryCard';
import { TTLPolicyBanner } from '../components/TTLPolicyBanner';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { Link } from 'react-router-dom';

interface Props {
  onOpenQuickSave: () => void;
  onOpenConnectModal: () => void;
}

export const Dashboard: React.FC<Props> = ({ onOpenQuickSave, onOpenConnectModal }) => {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [recentStories, setRecentStories] = useState<Story[]>([]);
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [followerCounts, setFollowerCounts] = useState<FollowerOverviewCounts | null>(null);
  const [activeStoryModal, setActiveStoryModal] = useState<{ stories: Story[]; initialIndex: number } | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [isSyncingFollowers, setIsSyncingFollowers] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const loadData = async () => {
    try {
      const [groupsRes, storiesRes, metricsRes, countsRes] = await Promise.all([
        ApiService.getStoryGroups(),
        ApiService.getStories({}),
        ApiService.getStorageMetrics(),
        ApiService.getFollowerCounts()
      ]);

      setStoryGroups(groupsRes.groups || []);
      setRecentStories((storiesRes.stories || []).slice(0, 8));
      setMetrics(metricsRes);
      setFollowerCounts(countsRes);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      const res = await ApiService.purgeExpiredStories();
      alert(`30-Day TTL Purge complete!\nPurged ${res.purgedCount} expired stories.\nReclaimed ${res.reclaimedFormatted} of disk storage.`);
      await loadData();
    } catch (err: any) {
      alert(`Purge failed: ${err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  const handleSyncFollowers = async () => {
    setIsSyncingFollowers(true);
    setSyncStatusMsg('');
    try {
      const res = await ApiService.syncFollowers('acc_primary_demo');
      setSyncStatusMsg(`Follower scan complete! Detected ${res.detectedUnfollowers} unfollowers and ${res.newFollowersCount} new followers.`);
      await loadData();
    } catch (err: any) {
      setSyncStatusMsg(`Sync error: ${err.message}`);
    } finally {
      setIsSyncingFollowers(false);
    }
  };

  const handleSelectGroup = (group: StoryGroup) => {
    setActiveStoryModal({
      stories: group.stories,
      initialIndex: 0
    });
  };

  const handleViewStory = (story: Story) => {
    const idx = recentStories.findIndex((s) => s.id === story.id);
    setActiveStoryModal({
      stories: recentStories,
      initialIndex: idx >= 0 ? idx : 0
    });
  };

  const handleToggleFavorite = async (storyId: string) => {
    await ApiService.toggleStoryFavorite(storyId);
    setRecentStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, is_favorited: s.is_favorited ? 0 : 1 } : s))
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Story Circles Carousel */}
      <StoryCirclesBar
        groups={storyGroups}
        onSelectGroup={handleSelectGroup}
        onOpenQuickSave={onOpenQuickSave}
      />

      {/* 2. 30-Day TTL Storage Banner */}
      <TTLPolicyBanner
        metrics={metrics}
        onPurgeClick={handlePurge}
        isPurging={isPurging}
      />

      {/* 3. Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Saved Stories */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Active Saved Stories</span>
            <div className="text-2xl font-bold text-white mt-1">
              {metrics ? metrics.activeStoriesCount : 0}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-brand-pink" />
              <span>30-Day Retention</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-brand-pink flex items-center justify-center">
            <Film className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Unfollowers / Lost */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Recent Unfollowers</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {followerCounts ? followerCounts.unfollowersCount : 0}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {followerCounts ? `${followerCounts.notFollowingBackCount} don't follow back` : '0 not following'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Users2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: VIP Auto-Archiver Targets */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Watchlist Friends</span>
            <div className="text-2xl font-bold text-white mt-1">
              {storyGroups.length} Active
            </div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Auto-Saving Enabled</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Storage Reclaimed by 30d TTL */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Reclaimed by 30d TTL</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {metrics ? metrics.purgedStorageFormatted : '0 B'}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {metrics ? `${metrics.purgedStoriesCount} expired auto-cleaned` : 'Automated purge'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-pink" />
            <span>{syncStatusMsg}</span>
          </div>
          <button onClick={() => setSyncStatusMsg('')} className="text-zinc-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* 4. Quick Automation Control Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Automations & Tools
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSyncFollowers}
            disabled={isSyncingFollowers}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-xs font-medium text-zinc-200 border border-zinc-700/80 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFollowers ? 'animate-spin text-brand-pink' : ''}`} />
            <span>{isSyncingFollowers ? 'Scanning Changes...' : 'Scan Follower Changes'}</span>
          </button>

          <Link
            to="/automations"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-xs font-medium text-zinc-200 border border-zinc-700/80 transition"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Manage Watchlist</span>
          </Link>

          <Link
            to="/followers"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-xs font-medium text-zinc-200 border border-zinc-700/80 transition"
          >
            <Users2 className="w-3.5 h-3.5 text-rose-400" />
            <span>View Unfollowers</span>
          </Link>
        </div>
      </div>

      {/* 5. Recent Saved Stories Grid */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              Recently Saved Stories
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Active 30-day storage retention lifecycle</p>
          </div>
          <Link
            to="/stories"
            className="text-xs text-brand-pink hover:underline flex items-center gap-1 font-medium"
          >
            <span>View All ({metrics?.activeStoriesCount || 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentStories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {recentStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onView={handleViewStory}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 px-4 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-zinc-400 text-xs space-y-2">
            <Film className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-zinc-300 font-medium">No saved stories yet</p>
            <p className="text-zinc-500 max-w-sm mx-auto">
              Use the Save Story button in the top bar or add accounts to your Auto-Archiver watchlist to save stories.
            </p>
          </div>
        )}
      </div>

      {/* Story Viewer Modal */}
      {activeStoryModal && (
        <StoryViewerModal
          stories={activeStoryModal.stories}
          initialIndex={activeStoryModal.initialIndex}
          onClose={() => setActiveStoryModal(null)}
          onStoryViewed={() => loadData()}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  BarChart3,
  TrendingUp,
  Clock,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Users
} from 'lucide-react';
import { ApiService } from '../services/api';
import { StorageMetrics } from '../types';

export const Analytics: React.FC = () => {
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [analyticsOverview, setAnalyticsOverview] = useState<any | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  const loadData = async () => {
    try {
      const [metrics, overview] = await Promise.all([
        ApiService.getStorageMetrics(),
        ApiService.getAnalyticsOverview()
      ]);
      setStorageMetrics(metrics);
      setAnalyticsOverview(overview);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualPurge = async () => {
    setIsPurging(true);
    try {
      const res = await ApiService.purgeExpiredStories();
      alert(`Cleanup Complete!\nPurged ${res.purgedCount} expired stories.\nReclaimed ${res.reclaimedFormatted} of disk space.`);
      await loadData();
    } catch (err: any) {
      alert(`Purge failed: ${err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Storage & Audience Analytics</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Deep dive into 30-day TTL storage preservation and account engagement metrics
          </p>
        </div>

        <button
          onClick={handleManualPurge}
          disabled={isPurging}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 hover:text-white border border-zinc-700/80 text-xs font-medium transition disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>{isPurging ? 'Cleaning Expired...' : 'Run 30d Storage Cleaner'}</span>
        </button>
      </div>

      {/* 30-Day Storage KPI Row */}
      {storageMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition shadow-card">
            <span className="text-xs text-zinc-400 font-medium">Active Media Storage</span>
            <div className="text-2xl font-bold text-white mt-1">
              {storageMetrics.activeStorageFormatted}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-brand-pink" />
              <span>{storageMetrics.activeStoriesCount} stories currently saved</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition shadow-card">
            <span className="text-xs text-zinc-400 font-medium">Storage Reclaimed by 30d TTL</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {storageMetrics.purgedStorageFormatted}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {storageMetrics.purgedStoriesCount} expired files purged
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition shadow-card">
            <span className="text-xs text-zinc-400 font-medium">Storage Optimization</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {storageMetrics.storageOptimizationPercentage}% Saved
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Preserving local disk storage
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition shadow-card">
            <span className="text-xs text-zinc-400 font-medium">Expiring in &lt; 24h</span>
            <div className={`text-2xl font-bold mt-1 ${storageMetrics.expiringWithin24h > 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
              {storageMetrics.expiringWithin24h}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Scheduled for automated purge
            </div>
          </div>
        </div>
      )}

      {/* Storage Retention Lifecycle Architecture Diagram */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-card">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-pink" />
          30-Day TTL Storage Retention Lifecycle
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5">
            <div className="flex items-center gap-2 text-brand-pink font-semibold text-xs">
              <span className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-[10px]">1</span>
              <span>Day 0: Ingestion</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Stories are saved to the database and media downloaded before Instagram's 24-hour disappearance. The retention expiry is set to <code className="text-zinc-200 bg-zinc-800 px-1.5 py-0.5 rounded text-[11px]">NOW + 30 Days</code>.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
              <span className="w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-[10px]">2</span>
              <span>Days 1 - 29: Full Access</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You can stream video, view photos in original resolution, download media files, or organize favorites anytime with full HTTP 206 partial streaming support.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px]">3</span>
              <span>Day 30+: Auto-Purge</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Background cron cleaner unlinks media files from disk to eliminate disk bloat, reclaiming server storage while keeping record metadata clean.
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Stories Trend */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Weekly Activity (Saved vs Purged)
            </h4>
            <span className="text-xs text-zinc-400">Past 7 Days</span>
          </div>

          <div className="space-y-3.5">
            {analyticsOverview?.dailyTrend?.map((item: any) => {
              const maxVal = 20;
              const savedPct = Math.min((item.saved / maxVal) * 100, 100);
              const purgedPct = Math.min((item.purged / maxVal) * 100, 100);

              return (
                <div key={item.day} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium w-8">{item.day}</span>
                    <span className="text-zinc-300">
                      <span className="text-brand-pink font-medium">{item.saved} saved</span> •{' '}
                      <span className="text-emerald-400 font-medium">{item.purged} purged</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden flex gap-1">
                    <div
                      className="h-full bg-brand-pink rounded-full transition-all"
                      style={{ width: `${savedPct}%` }}
                    />
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${purgedPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Story Creators & Audience Churn */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">
              Top Story Creators in Vault
            </h4>

            <div className="space-y-3">
              {analyticsOverview?.topCreators?.map((c: any) => (
                <div key={c.target_username} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-[1.5px] ig-gradient-bg rounded-full">
                      <img
                        src={c.user_avatar}
                        alt={c.target_username}
                        className="w-7 h-7 rounded-full object-cover border border-zinc-950"
                      />
                    </div>
                    <span className="text-xs font-semibold text-white">@{c.target_username}</span>
                  </div>
                  <span className="text-xs font-medium text-brand-pink px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    {c.story_count} stories
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Follower Churn Summary */}
          {analyticsOverview?.churnAnalysis && (
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Monthly Audience Growth:</span>
                <span className="text-emerald-400 font-bold">{analyticsOverview.churnAnalysis.growthRate}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-zinc-400">Mutual Follower Ratio:</span>
                <span className="text-brand-pink font-bold">{analyticsOverview.churnAnalysis.mutualPercentage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

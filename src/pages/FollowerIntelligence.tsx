import React, { useState, useEffect } from 'react';
import {
  Users2,
  UserX,
  UserCheck,
  Shield,
  ShieldCheck,
  RefreshCw,
  Download,
  Search,
  ExternalLink,
  Heart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Follower, FollowerOverviewCounts } from '../types';

export const FollowerIntelligence: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unfollowers' | 'not_following_back' | 'fans' | 'mutual' | 'whitelisted'>('unfollowers');
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [counts, setCounts] = useState<FollowerOverviewCounts | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultNotice, setScanResultNotice] = useState('');

  const loadFollowers = async () => {
    setIsLoading(true);
    try {
      const [listRes, countsRes] = await Promise.all([
        ApiService.getFollowers({
          filter: filter !== 'all' ? filter : undefined,
          search: search.trim() || undefined,
          page,
          limit: 20
        }),
        ApiService.getFollowerCounts()
      ]);

      setFollowers(listRes.data || []);
      setTotalPages(listRes.totalPages || 1);
      setCounts(countsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFollowers();
  }, [filter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadFollowers();
  };

  const handleToggleWhitelist = async (username: string) => {
    try {
      const res = await ApiService.toggleWhitelist('acc_primary_demo', username);
      setFollowers((prev) =>
        prev.map((f) => (f.username === username ? { ...f, is_whitelisted: res.is_whitelisted } : f))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    setScanResultNotice('');
    try {
      const res = await ApiService.syncFollowers('acc_primary_demo');
      setScanResultNotice(`Scan complete! Detected ${res.detectedUnfollowers} lost followers and ${res.newFollowersCount} new followers.`);
      await loadFollowers();
    } catch (err: any) {
      setScanResultNotice(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleExportCsv = () => {
    ApiService.exportFollowersCsv('acc_primary_demo', filter);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Scan Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Follower & Unfollower Intelligence</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Track audience shifts, detect who unfollowed you, and identify non-reciprocal accounts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/80 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Follower Changes'}</span>
          </button>
        </div>
      </div>

      {scanResultNotice && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{scanResultNotice}</span>
          </div>
          <button onClick={() => setScanResultNotice('')} className="text-zinc-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <button
            onClick={() => { setFilter('unfollowers'); setPage(1); }}
            className={`p-4 rounded-2xl border text-left transition ${
              filter === 'unfollowers'
                ? 'bg-rose-500/10 border-rose-500/40 shadow-card'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Unfollowers</span>
              <UserX className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {counts.unfollowersCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Recently lost</span>
          </button>

          <button
            onClick={() => { setFilter('not_following_back'); setPage(1); }}
            className={`p-4 rounded-2xl border text-left transition ${
              filter === 'not_following_back'
                ? 'bg-amber-500/10 border-amber-500/40 shadow-card'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Don't Follow Back</span>
              <Users2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {counts.notFollowingBackCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block">You follow them</span>
          </button>

          <button
            onClick={() => { setFilter('fans'); setPage(1); }}
            className={`p-4 rounded-2xl border text-left transition ${
              filter === 'fans'
                ? 'bg-brand-pink/10 border-brand-pink/40 shadow-card'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Fans</span>
              <Heart className="w-4 h-4 text-brand-pink" />
            </div>
            <div className="text-2xl font-bold text-brand-pink mt-1">
              {counts.fansCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block">They follow you</span>
          </button>

          <button
            onClick={() => { setFilter('mutual'); setPage(1); }}
            className={`p-4 rounded-2xl border text-left transition ${
              filter === 'mutual'
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-card'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Mutual Friends</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {counts.mutualCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Follow each other</span>
          </button>

          <button
            onClick={() => { setFilter('whitelisted'); setPage(1); }}
            className={`p-4 rounded-2xl border text-left transition ${
              filter === 'whitelisted'
                ? 'bg-purple-500/10 border-purple-500/40 shadow-card'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Protected / Whitelist</span>
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {counts.whitelistedCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Exempt from alerts</span>
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search username or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white placeholder-zinc-500 focus:outline-none transition"
          />
        </form>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {[
            { id: 'all', label: 'All Audience' },
            { id: 'unfollowers', label: 'Unfollowers' },
            { id: 'not_following_back', label: 'Not Following Back' },
            { id: 'fans', label: 'Fans' },
            { id: 'mutual', label: 'Mutual' },
            { id: 'whitelisted', label: 'Protected' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setFilter(tab.id as any); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                filter === tab.id
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Followers Table / List */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-card">
        {isLoading ? (
          <div className="py-16 text-center text-zinc-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-pink mb-2" />
            Loading audience data...
          </div>
        ) : followers.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {followers.map((follower) => {
              const isUnfollower = follower.status === 'unfollowed';

              return (
                <div
                  key={follower.id || follower.username}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-800/40 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <div className={`p-[1.5px] rounded-full ${isUnfollower ? 'border border-rose-500/40' : 'ig-gradient-bg'}`}>
                        <img
                          src={follower.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={follower.username}
                          className="w-10 h-10 rounded-full object-cover border border-zinc-950"
                        />
                      </div>
                      {follower.is_verified === 1 && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sky-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold border border-black">
                          ✓
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">@{follower.username}</span>
                        {isUnfollower && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                            Unfollowed
                          </span>
                        )}
                        {follower.is_whitelisted === 1 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" /> Whitelisted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">{follower.full_name || 'Instagram User'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleWhitelist(follower.username)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                        follower.is_whitelisted === 1
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-700/80 hover:bg-zinc-700'
                      }`}
                      title="Whitelist to exempt from unfollower alerts"
                    >
                      {follower.is_whitelisted === 1 ? 'Protected' : 'Whitelist'}
                    </button>

                    <a
                      href={`https://instagram.com/${follower.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/80 transition"
                      title="Open on Instagram"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-zinc-400 text-xs space-y-2">
            <Users2 className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-zinc-300 font-medium">No accounts found</p>
            <p className="text-zinc-500 max-w-sm mx-auto">
              No users match this filter or search query. Click "Scan Follower Changes" to check for the latest updates.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-700 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

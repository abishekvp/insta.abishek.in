import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Trash2,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Sparkles,
  Instagram
} from 'lucide-react';
import { ApiService } from '../services/api';
import { WatchlistTarget } from '../types';

export const AutoArchiver: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistTarget[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [checkFrequency, setCheckFrequency] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingJob, setIsExecutingJob] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState('');

  const loadWatchlist = async () => {
    try {
      const res = await ApiService.getWatchlist();
      setWatchlist(res.watchlist || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername) return;

    setIsLoading(true);
    setNoticeMsg('');

    try {
      await ApiService.addWatchlistTarget({
        accountId: 'acc_primary_demo',
        username: newUsername,
        fullName: newFullName || undefined,
        frequencyMinutes: checkFrequency,
        autoDownload: true,
        retentionDays: 30
      });

      setNewUsername('');
      setNewFullName('');
      setNoticeMsg(`Added @${newUsername} to Story Auto-Archiver!`);
      await loadWatchlist();
    } catch (err: any) {
      setNoticeMsg(`Failed to add target: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTarget = async (id: string) => {
    try {
      await ApiService.toggleWatchlistTarget(id);
      await loadWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTarget = async (id: string) => {
    if (!confirm('Remove this friend from your Auto-Archiver watchlist?')) return;
    try {
      await ApiService.removeWatchlistTarget(id);
      await loadWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunArchiverNow = async () => {
    setIsExecutingJob(true);
    setNoticeMsg('');
    try {
      const res = await ApiService.runAutoArchiverNow();
      setNoticeMsg(`Archiver completed! Checked ${res.checked} friends. All new stories saved with 30-day retention.`);
      await loadWatchlist();
    } catch (err: any) {
      setNoticeMsg(`Archiver job error: ${err.message}`);
    } finally {
      setIsExecutingJob(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">VIP Story Auto-Archiver</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Automatically crawl and archive stories from selected friends before they expire after 24 hours
          </p>
        </div>

        <button
          onClick={handleRunArchiverNow}
          disabled={isExecutingJob}
          className="flex items-center gap-2 px-4 py-2 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isExecutingJob ? 'animate-pulse' : 'fill-white'}`} />
          <span>{isExecutingJob ? 'Running Archiver Job...' : 'Run Archiver Now'}</span>
        </button>
      </div>

      {noticeMsg && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{noticeMsg}</span>
          </div>
          <button onClick={() => setNoticeMsg('')} className="text-zinc-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Add New Friend Target Form */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-card">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Instagram className="w-4 h-4 text-brand-pink" />
          Add Friend to Auto-Archiver Watchlist
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          The background crawler will automatically check this account's profile on your set interval and download stories into your 30-day vault.
        </p>

        <form onSubmit={handleAddTarget} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Instagram Username *
            </label>
            <input
              type="text"
              placeholder="e.g. zuck or selenagomez"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.replace('@', ''))}
              required
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white placeholder-zinc-500 focus:outline-none transition"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Friendly Display Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Mark Zuckerberg"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white placeholder-zinc-500 focus:outline-none transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Check Interval
            </label>
            <select
              value={checkFrequency}
              onChange={(e) => setCheckFrequency(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-zinc-300 focus:outline-none transition"
            >
              <option value={15}>Every 15 mins</option>
              <option value={30}>Every 30 mins</option>
              <option value={60}>Every 1 hour</option>
              <option value={180}>Every 3 hours</option>
              <option value={720}>Every 12 hours</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isLoading || !newUsername}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'Adding...' : 'Add to Watchlist'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Watchlist Targets Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Active Watchlist ({watchlist.length})
          </h3>
          <span className="text-xs text-zinc-500 font-medium">
            Automated 30-day storage expiration enabled
          </span>
        </div>

        {watchlist.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((target) => (
              <div
                key={target.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition shadow-card flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-[1.5px] ig-gradient-bg rounded-full">
                      <img
                        src={target.target_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={target.target_username}
                        className="w-11 h-11 rounded-full object-cover border border-zinc-950"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">@{target.target_username}</h4>
                      <p className="text-xs text-zinc-400">{target.target_full_name || 'Instagram User'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleTarget(target.id)}
                    className="text-zinc-400 hover:text-white transition"
                    title={target.is_active ? 'Pause archiver' : 'Resume archiver'}
                  >
                    {target.is_active ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-zinc-600" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-2 border-t border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block">Frequency:</span>
                    <span className="text-white font-medium">Every {target.check_frequency_minutes}m</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Retention:</span>
                    <span className="text-emerald-400 font-medium">{target.retention_days || 30} Days</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                  <span>
                    Last checked: {target.last_checked_at ? new Date(target.last_checked_at).toLocaleTimeString() : 'Pending first scan'}
                  </span>
                  <button
                    onClick={() => handleRemoveTarget(target.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition"
                    title="Remove friend"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl text-zinc-400 text-xs space-y-2">
            <Cpu className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-zinc-300 font-medium">Your watchlist is currently empty</p>
            <p className="text-zinc-500 max-w-sm mx-auto">
              Add your close friends or favorite creators to automatically archive their stories before they disappear.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  HardDrive,
  LogOut,
  Sliders,
  LogIn,
  Instagram,
  Clock,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { Account, StorageMetrics, User } from '../types';

interface Props {
  currentUser: User | null;
  account: Account | null;
  metrics: StorageMetrics | null;
  onOpenConnectModal: () => void;
  onOpenQuickSave: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onPurgeClick: () => void;
  isPurging: boolean;
  onDisconnectAccount?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  account,
  metrics,
  onOpenConnectModal,
  onOpenQuickSave,
  onOpenAuthModal,
  onLogout,
  onPurgeClick,
  isPurging,
  onDisconnectAccount
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-border-subtle bg-background-subtle/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl ig-gradient-bg p-[1.5px] transition-transform duration-200 group-hover:scale-105 shadow-brand">
            <div className="w-full h-full bg-[#121215] rounded-[10px] flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">
                InstaVault
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 hidden sm:inline-block">
              Story Archiver & Intel Suite
            </span>
          </div>
        </Link>
      </div>

      {/* Middle: 30-Day Storage Metric Pill */}
      {metrics && (
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-brand-pink" />
          <span className="text-zinc-400 font-medium">30-Day Retention:</span>
          <span className="text-white font-semibold">{metrics.activeStoriesCount} Active</span>
          <span className="text-zinc-700">|</span>
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-medium">{metrics.purgedStorageFormatted} Reclaimed</span>
        </div>
      )}

      {/* Right Actions, Admin Link & Top User Detail */}
      <div className="flex items-center gap-3">
        {isAdmin && (
          <Link
            to="/admin"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/80 text-xs font-medium transition"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-pink" />
            <span>Admin</span>
          </Link>
        )}

        {/* Connected Instagram Account Status & Quick Disconnect */}
        {account ? (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <div className="w-5 h-5 rounded-full p-[1px] ig-gradient-bg shrink-0">
              <img
                src={account.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60'}
                alt={account.username}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <Link
              to="/security"
              className="text-zinc-200 hover:text-white font-medium max-w-[120px] truncate"
              title={`Active Instagram: @${account.username}. Click to manage connected accounts.`}
            >
              @{account.username}
            </Link>
            {onDisconnectAccount && (
              <button
                onClick={onDisconnectAccount}
                className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition"
                title={`Remove @${account.username} from connected accounts`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenConnectModal}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-xs font-medium transition"
            title="Connect an Instagram Account"
          >
            <Instagram className="w-3.5 h-3.5 text-brand-pink" />
            <span>Connect IG</span>
          </button>
        )}

        {/* Save Story Button with Instagram Gradient */}
        <button
          onClick={onOpenQuickSave}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save Story</span>
        </button>

        {/* Polished User Profile Component */}
        {currentUser ? (
          <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-zinc-800">
            <Link
              to="/security"
              className="flex items-center gap-2.5 hover:opacity-85 transition group cursor-pointer"
              title="Manage profile name, password & security"
            >
              {/* Profile Avatar with subtle Instagram ring */}
              <div className="w-8 h-8 rounded-full p-[1.5px] ig-gradient-bg shrink-0 transition-transform group-hover:scale-105">
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold tracking-tight">
                  {getInitials(currentUser.fullName)}
                </div>
              </div>

              {/* User details */}
              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white leading-none group-hover:text-brand-pink transition-colors">
                    {currentUser.fullName}
                  </span>
                  {isAdmin ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium leading-none">
                      Admin
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-medium leading-none">
                      Member
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400 mt-0.5">
                  {currentUser.email}
                </span>
              </div>
            </Link>

            {/* Sign Out Button */}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium border border-zinc-700/80 transition"
          >
            <LogIn className="w-3.5 h-3.5 text-brand-pink" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

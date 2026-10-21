import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Key,
  CheckCircle2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Server,
  Database,
  Smartphone,
  Instagram,
  UserCheck
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Account } from '../types';

interface Props {
  onOpenConnectModal: () => void;
}

export const SecurityCenter: React.FC<Props> = ({ onOpenConnectModal }) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [isSandbox, setIsSandbox] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadAccount = async () => {
    try {
      const res = await ApiService.getAccount();
      if (res.account) {
        setAccount(res.account);
        setIsSandbox(res.account.is_sandbox === 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const handleToggleSandbox = async () => {
    if (!account) return;
    setIsLoading(true);
    setStatusMsg('');
    try {
      const newVal = !isSandbox;
      await ApiService.toggleSandbox(account.id, newVal);
      setIsSandbox(newVal);
      setStatusMsg(
        newVal
          ? 'Switched to Sandbox Simulator Mode (Safe simulated environment).'
          : 'Switched to Live Instagram Account Mode.'
      );
      await loadAccount();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Security & Credential Vault</h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Cryptographic protection, 2FA challenge handling, and zero-compromise credential architecture
        </p>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg('')} className="text-zinc-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Security Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: AES-256-GCM */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition-all shadow-card space-y-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-brand-pink" />
          </div>
          <h4 className="text-sm font-semibold text-white">AES-256-GCM Encryption</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            All Instagram passwords and session tokens stored on the server are encrypted using AES-256-GCM with unique cryptographic initialization vectors (IVs) and authentication tags.
          </p>
          <div className="pt-2 text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero plaintext secrets in DB</span>
          </div>
        </div>

        {/* Card 2: 2FA & Checkpoint Support */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition-all shadow-card space-y-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-100 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-sky-400" />
          </div>
          <h4 className="text-sm font-semibold text-white">2FA & Checkpoint Support</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            When Instagram detects logins from unfamiliar server IP ranges, it prompts for Two-Factor SMS / Authenticator codes. InstaVault handles this handshake gracefully through its verification modal.
          </p>
          <div className="pt-2 text-xs font-medium text-sky-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Safe challenge resolution</span>
          </div>
        </div>

        {/* Card 3: 30-Day TTL Auto-Purge */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition-all shadow-card space-y-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-100 flex items-center justify-center">
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <h4 className="text-sm font-semibold text-white">30-Day TTL Auto-Purge</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Privacy and product database conservation: media files are strictly purged 30 days after download, preventing infinite disk buildup and honoring temporary media principles.
          </p>
          <div className="pt-2 text-xs font-medium text-purple-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Automated 30-day lifecycle</span>
          </div>
        </div>
      </div>

      {/* Active Account Status & Mode Switcher */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Instagram className="w-4 h-4 text-brand-pink" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Active Account Configuration
            </h3>
          </div>
          {account && (
            <div className="flex flex-wrap items-center gap-2">
              {account.auth_method === 'oauth' && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full border font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Official OAuth
                </span>
              )}
              {account.auth_method === 'session' && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full border font-medium bg-amber-500/10 text-amber-300 border-amber-500/20 flex items-center gap-1">
                  <Key className="w-3 h-3" /> Manual Session (Encrypted)
                </span>
              )}
              {account.auth_method === 'credentials' && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full border font-medium bg-sky-500/10 text-sky-400 border-sky-500/20 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Direct Credentials
                </span>
              )}
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${
                isSandbox
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {isSandbox ? 'Sandbox Simulator Mode' : 'Live Sync Active'}
              </span>
            </div>
          )}
        </div>

        {account ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-5 rounded-2xl bg-zinc-900 border border-zinc-800/90">
            <div className="flex items-center gap-4">
              <div className="p-[2px] ig-gradient-bg rounded-full">
                <img
                  src={account.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                  alt={account.username}
                  className="w-14 h-14 rounded-full object-cover border-2 border-zinc-950"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">@{account.username}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{account.full_name || 'Instagram User'}</p>
                <div className="flex items-center gap-4 text-xs text-zinc-300 mt-2">
                  <span>Followers: <strong className="text-white font-semibold">{account.follower_count.toLocaleString()}</strong></span>
                  <span className="text-zinc-700">•</span>
                  <span>Following: <strong className="text-white font-semibold">{account.following_count.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={handleToggleSandbox}
                disabled={isLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-xs text-zinc-200 border border-zinc-700/80 transition"
                title="Toggle Sandbox Mode"
              >
                {isSandbox ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-amber-400" />
                    <span>Mode: Sandbox</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-emerald-400" />
                    <span>Mode: Live</span>
                  </>
                )}
              </button>

              <button
                onClick={onOpenConnectModal}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs border border-zinc-700 transition"
              >
                Switch Account
              </button>
            </div>
          </div>
        ) : (
          <div className="py-10 px-6 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/60 space-y-4">
            <div className="w-12 h-12 rounded-2xl ig-gradient-bg p-[1.5px] mx-auto shadow-brand">
              <div className="w-full h-full bg-zinc-900 rounded-[14px] flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">No active Instagram account connected</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 leading-relaxed">
                Connect your Instagram account to enable automated story saving, follower tracking, and 30-day storage archiving.
              </p>
            </div>
            <button
              onClick={onOpenConnectModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition active:scale-95"
            >
              <Instagram className="w-4 h-4" />
              <span>Connect Instagram Account</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

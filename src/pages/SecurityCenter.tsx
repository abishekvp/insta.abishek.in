import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Key,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Server,
  Database,
  Smartphone,
  Instagram,
  UserCheck,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  X,
  User as UserIcon,
  Save,
  Eye,
  EyeOff,
  LogIn
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Account, User } from '../types';

interface Props {
  currentUser?: User | null;
  onOpenConnectModal: () => void;
  onAccountUpdated?: () => void;
  onUserUpdated?: () => void;
  onOpenAuthModal?: () => void;
}

export const SecurityCenter: React.FC<Props> = ({
  currentUser,
  onOpenConnectModal,
  onAccountUpdated,
  onUserUpdated,
  onOpenAuthModal
}) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSandbox, setIsSandbox] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [accountToRemove, setAccountToRemove] = useState<Account | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Profile Name State
  const [nameInput, setNameInput] = useState(currentUser?.fullName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameNotice, setNameNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Keep name input in sync if currentUser updates
  useEffect(() => {
    if (currentUser?.fullName) {
      setNameInput(currentUser.fullName);
    }
  }, [currentUser?.fullName]);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [passNotice, setPassNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAccounts = async () => {
    try {
      const [resActive, resList] = await Promise.all([
        ApiService.getAccount(),
        ApiService.getAccounts()
      ]);
      if (resActive.account) {
        setAccount(resActive.account);
        setIsSandbox(resActive.account.is_sandbox === 1);
      } else {
        setAccount(null);
      }
      setAccounts(resList.accounts || []);
    } catch (err) {
      console.error('Failed to load accounts in SecurityCenter:', err);
    }
  };

  useEffect(() => {
    loadAccounts();
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
      await loadAccounts();
      onAccountUpdated?.();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchActive = async (targetAccountId: string) => {
    setIsLoading(true);
    setStatusMsg('');
    try {
      const res = await ApiService.switchActiveAccount(targetAccountId);
      setStatusMsg(`Switched active profile to @${res.account.username}.`);
      await loadAccounts();
      onAccountUpdated?.();
    } catch (err: any) {
      setStatusMsg(`Error switching profile: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!accountToRemove) return;
    setIsRemoving(true);
    try {
      const res = await ApiService.removeAccount(accountToRemove.id);
      setStatusMsg(res.message || `Account @${accountToRemove.username} removed from connected accounts.`);
      setAccountToRemove(null);
      await loadAccounts();
      onAccountUpdated?.();
    } catch (err: any) {
      setStatusMsg(`Error removing account: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (!clean || clean.length < 2) {
      setNameNotice({ type: 'error', message: 'Name must be at least 2 characters long.' });
      return;
    }
    if (clean === currentUser?.fullName) {
      setNameNotice({ type: 'error', message: 'Name is already up to date.' });
      return;
    }

    setIsSavingName(true);
    setNameNotice(null);
    try {
      const res = await ApiService.changeName(clean);
      setNameNotice({ type: 'success', message: res.message || 'Your name has been updated successfully!' });
      onUserUpdated?.();
    } catch (err: any) {
      setNameNotice({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to update name.'
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassNotice(null);

    if (!currentPassword) {
      setPassNotice({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPassNotice({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassNotice({ type: 'error', message: 'New password and confirmation password do not match.' });
      return;
    }
    if (newPassword === currentPassword) {
      setPassNotice({ type: 'error', message: 'New password must be different from your current password.' });
      return;
    }

    setIsSavingPass(true);
    try {
      const res = await ApiService.changePassword(currentPassword, newPassword);
      setPassNotice({ type: 'success', message: res.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassNotice({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to update password.'
      });
    } finally {
      setIsSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Account & Security</h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Manage your personal profile name, change password credentials, and configure encrypted Instagram connections.
        </p>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg('')} className="text-zinc-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Account Profile & Password Settings Section */}
      <div id="profile" className="scroll-mt-20">
        {currentUser ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card 1: Change Profile Name */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-card flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-brand-pink">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Profile Information</h3>
                      <p className="text-[11px] text-zinc-400">Update your account display name</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    currentUser.role === 'admin'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {currentUser.role.toUpperCase()}
                  </span>
                </div>

                {nameNotice && (
                  <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
                    nameNotice.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {nameNotice.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      )}
                      <span>{nameNotice.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNameNotice(null)}
                      className="text-zinc-400 hover:text-white text-xs ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleUpdateName} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Account Email
                    </label>
                    <div className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-400 font-mono flex items-center justify-between">
                      <span>{currentUser.email}</span>
                      <span className="text-[10px] text-zinc-400">Fixed ID</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="user-fullname" className="block text-xs font-medium text-zinc-300 mb-1">
                      Full Name
                    </label>
                    <input
                      id="user-fullname"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Abishek V"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white focus:outline-none transition"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      This name is displayed in the navigation bar and across system logs.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingName || !nameInput.trim() || nameInput.trim() === currentUser.fullName}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSavingName ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Name</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Card 2: Change Password */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-card flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-brand-pink">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Change Password</h3>
                      <p className="text-[11px] text-zinc-400">Update your account authentication credentials</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Scrypt Hashed
                  </span>
                </div>

                {passNotice && (
                  <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
                    passNotice.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {passNotice.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      )}
                      <span>{passNotice.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPassNotice(null)}
                      className="text-zinc-400 hover:text-white text-xs ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your existing password"
                        className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white focus:outline-none transition font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        title={showCurrentPass ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 chars"
                          className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white focus:outline-none transition font-mono"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                          title={showNewPass ? 'Hide password' : 'Show password'}
                        >
                          {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white focus:outline-none transition font-mono"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                          title={showConfirmPass ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">
                      Minimum 8 characters
                    </span>
                    <button
                      type="submit"
                      disabled={isSavingPass || !currentPassword || !newPassword || newPassword.length < 8}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSavingPass ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Change Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-5 h-5 text-brand-pink" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Account Profile & Password Management</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Sign in to your InstaVault account to change your display name or update your account password.
              </p>
            </div>
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Your Account</span>
              </button>
            )}
          </div>
        )}
      </div>

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
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                    Active Profile
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{account.full_name || 'Instagram User'}</p>
                <div className="flex items-center gap-4 text-xs text-zinc-300 mt-2">
                  <span>Followers: <strong className="text-white font-semibold">{account.follower_count.toLocaleString()}</strong></span>
                  <span className="text-zinc-700">•</span>
                  <span>Following: <strong className="text-white font-semibold">{account.following_count.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
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
                Connect / Switch
              </button>

              {/* Remove Account from Connected Account Button */}
              <button
                onClick={() => setAccountToRemove(account)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-xs font-semibold transition active:scale-95"
                title="Remove account from connected accounts"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Remove Account</span>
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

      {/* Connected Accounts Management Section */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Connected Instagram Accounts</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                {accounts.length}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage connected profiles, switch your active account, or remove accounts from the platform.
            </p>
          </div>

          <button
            onClick={onOpenConnectModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/90 text-zinc-200 border border-zinc-700/80 text-xs font-semibold transition self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-brand-pink" />
            <span>Connect Another Account</span>
          </button>
        </div>

        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {accounts.map((acc) => {
              const isActive = acc.id === account?.id || acc.is_active === 1;

              return (
                <div
                  key={acc.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                    isActive
                      ? 'bg-zinc-900 border-brand-pink/40 shadow-sm'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-[1.5px] rounded-full shrink-0 ${isActive ? 'ig-gradient-bg' : 'bg-zinc-700'}`}>
                        <img
                          src={acc.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'}
                          alt={acc.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-zinc-950"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">@{acc.username}</span>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate max-w-[180px]">
                          {acc.full_name || 'Instagram User'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {acc.auth_method === 'oauth' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                          OAuth
                        </span>
                      )}
                      {acc.auth_method === 'session' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                          Session
                        </span>
                      )}
                      {acc.auth_method === 'credentials' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-medium">
                          Direct
                        </span>
                      )}
                      {(!acc.auth_method || acc.auth_method === 'sandbox') && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                          {acc.is_sandbox === 1 ? 'Sandbox' : 'Direct'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
                    <div className="flex items-center gap-3">
                      <span>Followers: <strong className="text-zinc-200">{acc.follower_count?.toLocaleString() || 0}</strong></span>
                      <span className="text-zinc-700">•</span>
                      <span>Following: <strong className="text-zinc-200">{acc.following_count?.toLocaleString() || 0}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {!isActive && (
                      <button
                        onClick={() => handleSwitchActive(acc.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Set Active</span>
                      </button>
                    )}

                    <button
                      onClick={() => setAccountToRemove(acc)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-xs font-medium transition"
                      title="Remove this account from connected accounts"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-zinc-500">
            No connected accounts found. Click "Connect Another Account" above to link an Instagram account.
          </div>
        )}
      </div>

      {/* Confirmation Modal to Remove Account */}
      {accountToRemove && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">Remove Connected Account</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Are you sure you want to remove <strong className="text-white">@{accountToRemove.username}</strong> from your connected accounts?
                </p>
              </div>
              <button
                onClick={() => setAccountToRemove(null)}
                disabled={isRemoving}
                className="text-zinc-400 hover:text-white p-1 rounded-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-2 text-zinc-300 font-medium">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>What happens when you remove this account:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400 text-[11px]">
                <li>Stored credentials, tokens, and encrypted session data are permanently deleted.</li>
                <li>Automated story crawling and follower tracking for this account will stop.</li>
                <li>Saved stories and followers associated with this account are removed from your vault.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setAccountToRemove(null)}
                disabled={isRemoving}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isRemoving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Remove Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

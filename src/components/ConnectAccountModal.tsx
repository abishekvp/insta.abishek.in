import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Lock,
  Key,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Instagram,
  RefreshCw,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  Trash2,
  Maximize2,
  Minimize2,
  ArrowRight
} from 'lucide-react';
import { ApiService } from '../services/api';
import { InstagramSessionProfile, Account } from '../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const ConnectAccountModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [tab, setTab] = useState<'oauth' | 'session' | 'credentials' | 'sandbox'>('oauth');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);
  const [oauthStarting, setOauthStarting] = useState(false);
  const [sessionRiskAck, setSessionRiskAck] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessionCookie, setSessionCookie] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<InstagramSessionProfile | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showProfessionalHelp, setShowProfessionalHelp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [existingAccounts, setExistingAccounts] = useState<Account[]>([]);
  const [removingAccountId, setRemovingAccountId] = useState<string | null>(null);

  const loadConnectedAccounts = () => {
    ApiService.getAccounts()
      .then((res) => {
        if (res.accounts) setExistingAccounts(res.accounts);
      })
      .catch(() => {});
  };

  // Discover whether official Instagram login is configured on the server & load connected accounts.
  useEffect(() => {
    let cancelled = false;
    loadConnectedAccounts();
    ApiService.getInstagramOAuthStatus()
      .then((res) => {
        if (cancelled) return;
        setOauthConfigured(res.configured);
        // If official login isn't available, default to the session tab.
        if (!res.configured) setTab('session');
      })
      .catch(() => {
        if (!cancelled) setOauthConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keyboard shortcut: ESC to exit fullscreen or close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  const handleStartOAuth = async () => {
    setOauthStarting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { authorizeUrl } = await ApiService.startInstagramOAuth();
      // Top-level navigation to Instagram's own consent screen.
      window.location.href = authorizeUrl;
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Could not start Instagram login.');
      setOauthStarting(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please enter both your Instagram username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await ApiService.loginCredentials(username, password, false);
      if (res.twoFactorRequired) {
        setNeedsTwoFactor(true);
        setPendingAccountId(res.accountId || '');
        setSuccessMsg(res.message);
      } else {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode) {
      setErrorMsg('Please enter the 6-digit security code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await ApiService.verify2FA(pendingAccountId, twoFactorCode);
      setSuccessMsg(res.message);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || '2FA verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoFetchPreview = async () => {
    if (!sessionCookie.trim()) {
      setErrorMsg('Please enter your Instagram sessionid or cookie string first.');
      return;
    }

    setIsFetchingPreview(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await ApiService.fetchInstagramSession(sessionCookie, username || undefined);
      setPreviewProfile(res.profile);
      if (!username && res.profile.username) {
        setUsername(res.profile.username);
      }
      setSuccessMsg(`Fetched profile for @${res.profile.username}! Review and click Connect.`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to fetch Instagram profile with sessionid.');
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const handleAutoConnectSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sessionCookie.trim()) {
      setErrorMsg('Please enter your Instagram sessionid or cookie string.');
      return;
    }

    const isMock =
      sessionCookie.startsWith('sandbox_') ||
      sessionCookie.startsWith('demo_') ||
      sessionCookie === 'sandbox' ||
      sessionCookie === 'demo';

    if (!sessionRiskAck && !isMock) {
      setErrorMsg('Please acknowledge the Instagram Terms of Service risk notice below before linking.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await ApiService.linkInstagramSessionAuto(sessionCookie, username || undefined);
      setSuccessMsg(res.message || `Connected @${res.username}!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Auto-connecting session failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchSandbox = async () => {
    setIsLoading(true);
    try {
      await ApiService.loginCredentials('abishek_dev', 'demo_password_123', true);
      setSuccessMsg('Sandbox Simulator activated with full mock dataset.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId: string, accUsername: string) => {
    if (!window.confirm(`Are you sure you want to remove @${accUsername} from connected accounts?`)) {
      return;
    }
    setRemovingAccountId(accountId);
    setErrorMsg('');
    try {
      const res = await ApiService.removeAccount(accountId);
      setSuccessMsg(res.message || `Account @${accUsername} removed.`);
      setExistingAccounts((prev) => prev.filter((a) => a.id !== accountId));
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to remove account.');
    } finally {
      setRemovingAccountId(null);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center transition-all duration-200 ${
        isFullscreen ? 'p-0' : 'p-3 sm:p-5 md:p-8'
      }`}
    >
      <div
        className={`bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-full max-w-5xl xl:max-w-6xl max-h-[92vh] rounded-2xl overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl ig-gradient-bg p-[1.5px] shadow-brand shrink-0">
              <div className="w-full h-full bg-zinc-900 rounded-[10px] flex items-center justify-center">
                <Instagram className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-white">Connect Instagram Account</h3>
                {isFullscreen && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink font-semibold">
                    Full Screen
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Official OAuth 2.0 & secure local session sync</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title={isFullscreen ? 'Exit full screen (Esc)' : 'Expand to full screen'}
              aria-label={isFullscreen ? 'Exit full screen' : 'Expand to full screen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Responsive Two-Column Body */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Accounts & Security Overview */}
          <div className="lg:w-80 xl:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-zinc-950/50 p-5 space-y-5 overflow-y-auto">
            {/* Connected Accounts Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Connected Profiles</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                    {existingAccounts.length}
                  </span>
                </span>
                {existingAccounts.length > 0 && (
                  <span className="text-[11px] text-zinc-500">Active sync</span>
                )}
              </div>

              {existingAccounts.length > 0 ? (
                <div className="space-y-2 max-h-56 lg:max-h-80 overflow-y-auto pr-1">
                  {existingAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700/80 transition text-xs shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={acc.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60'}
                          alt={acc.username}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-700"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white truncate max-w-[120px]">
                              @{acc.username}
                            </span>
                            {acc.is_active === 1 && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-medium shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAccount(acc.id, acc.username)}
                        disabled={removingAccountId === acc.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition shrink-0"
                        title={`Remove @${acc.username}`}
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>{removingAccountId === acc.id ? '...' : 'Remove'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
                  <Instagram className="w-6 h-6 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    No Instagram accounts connected yet. Link your profile on the right to start auto-saving stories and tracking follower metrics.
                  </p>
                </div>
              )}
            </div>

            {/* Security Guarantee Card */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AES-256-GCM Vault</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tokens and credentials are encrypted at rest locally on your server. Credentials are never sent to third-party ad networks or tracking services.
              </p>
            </div>

            {/* 30-Day Storage Lifecycle Notice */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>30-Day Storage Policy</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Downloaded stories and snapshots automatically follow the 30-day retention schedule, keeping storage usage optimized.
              </p>
            </div>
          </div>

          {/* Right Column: Tab Switcher & Connection Forms */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-zinc-900 overflow-hidden">
            {/* Tab Selection */}
            <div className="flex border-b border-zinc-800 bg-zinc-950/60 shrink-0 overflow-x-auto">
              <button
                onClick={() => { setTab('oauth'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 min-w-[130px] py-3.5 px-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  tab === 'oauth'
                    ? 'border-brand-pink text-white bg-zinc-800/40'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Official Login</span>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                  Recommended
                </span>
              </button>
              <button
                onClick={() => { setTab('session'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 min-w-[120px] py-3.5 px-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  tab === 'session'
                    ? 'border-brand-pink text-white bg-zinc-800/40'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                <span>Session ID</span>
                <span className="hidden sm:inline-block text-[10px] text-zinc-500 font-normal">
                  (Paste)
                </span>
              </button>
              <button
                onClick={() => { setTab('credentials'); setNeedsTwoFactor(false); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 min-w-[120px] py-3.5 px-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  tab === 'credentials'
                    ? 'border-brand-pink text-white bg-zinc-800/40'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Credentials</span>
              </button>
              <button
                onClick={() => { setTab('sandbox'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 min-w-[120px] py-3.5 px-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  tab === 'sandbox'
                    ? 'border-brand-pink text-white bg-zinc-800/40'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Sandbox Demo</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 md:p-8 space-y-5">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* TAB 0: OFFICIAL INSTAGRAM OAUTH (RECOMMENDED) */}
              {tab === 'oauth' && (
                <div className="space-y-5 max-w-2xl">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-semibold text-white">Recommended Official Method. </span>
                      You authenticate directly on Instagram's official login screen. The application never sees or stores your password or browser session cookies — only an authorized OAuth access token that you can revoke at any time.
                    </div>
                  </div>

                  {oauthConfigured === null && (
                    <div className="flex items-center justify-center gap-2 py-8 text-xs text-zinc-400">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-pink" />
                      <span>Checking official login availability…</span>
                    </div>
                  )}

                  {oauthConfigured === true && (
                    <div className="space-y-4 pt-2">
                      <button
                        type="button"
                        onClick={handleStartOAuth}
                        disabled={oauthStarting}
                        className="w-full py-3.5 px-5 rounded-xl ig-gradient-bg text-white font-semibold text-sm shadow-brand hover:opacity-95 transition flex items-center justify-center gap-2.5 disabled:opacity-50"
                      >
                        {oauthStarting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Redirecting to Instagram…</span>
                          </>
                        ) : (
                          <>
                            <Instagram className="w-5 h-5" />
                            <span>Continue with Instagram</span>
                          </>
                        )}
                      </button>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 justify-center">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Secured by Instagram OAuth 2.0 · token encrypted at rest</span>
                      </div>

                      {/* Professional Account Notice & Helper */}
                      <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs space-y-3 mt-4">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-semibold text-white">Meta API Requirement: Professional Account</span>
                            <p className="text-zinc-400 leading-relaxed">
                              Meta's official Graph API restricts third-party OAuth to <strong className="text-zinc-200">Professional accounts (Creator or Business)</strong>. Personal accounts cannot log in through official OAuth.
                            </p>
                          </div>
                        </div>

                        <div className="pt-1 flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => setShowProfessionalHelp(!showProfessionalHelp)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition"
                          >
                            <span>{showProfessionalHelp ? 'Hide Switch Guide' : 'How to switch to Creator in 30s (Free)'}</span>
                            {showProfessionalHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setTab('session'); setErrorMsg(''); }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-pink/15 hover:bg-brand-pink/25 text-brand-pink text-xs font-medium border border-brand-pink/30 transition"
                          >
                            <span>Connect Any Profile via Session ID</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {showProfessionalHelp && (
                          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-2 mt-2">
                            <span className="font-semibold text-white block">Switching to a Creator account is 100% free & preserves your profile:</span>
                            <ol className="list-decimal list-inside space-y-1.5 text-zinc-400 leading-relaxed pl-1">
                              <li>Open the <strong className="text-zinc-200">Instagram mobile app</strong> & go to your <strong className="text-zinc-200">Profile</strong>.</li>
                              <li>Tap the <strong className="text-zinc-200">Menu (☰)</strong> at top-right & select <strong className="text-zinc-200">Settings and privacy</strong>.</li>
                              <li>Scroll to <strong className="text-zinc-200">For professionals</strong> & tap <strong className="text-zinc-200">Account type and tools</strong>.</li>
                              <li>Tap <strong className="text-zinc-200">Switch to professional account</strong> & choose <strong className="text-zinc-200">Creator</strong>.</li>
                              <li>Pick any category (e.g., <em>Digital Creator</em> or <em>Personal Blog</em>). You can toggle "Display on profile" off so it looks identical to a personal profile.</li>
                            </ol>
                            <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                              💡 <em>No Facebook Page or business documents required. You can switch back to personal anytime.</em>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {oauthConfigured === false && (
                    <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 space-y-3">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Official login is not configured on this server</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">
                        Instagram App OAuth credentials have not been configured on this instance. The administrator can enable official Instagram login in the Admin Portal.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => { setTab('session'); setErrorMsg(''); }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition"
                        >
                          <span>Connect using Session ID instead</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 1: SESSION COOKIE (MANUAL SELF-PASTE) */}
              {tab === 'session' && (
                <div className="space-y-5 max-w-2xl">
                  {/* Any profile support banner */}
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                      <span><strong>Works with ANY Instagram Profile:</strong> Personal, Private, Creator & Business.</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold shrink-0">
                      Universal
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-brand-pink shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-semibold text-white">Manual Self-Paste: </span>
                      Paste your own <code className="text-brand-pink font-mono">sessionid</code>. We inspect your profile details directly from Instagram and encrypt the cookie locally (<strong className="text-zinc-200">AES-256-GCM</strong>).
                    </div>
                  </div>

                  {/* ToS / Account Risk Notice */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-semibold text-amber-300">Terms of Service Risk Notice: </span>
                        Driving Instagram with an extracted session cookie violates Instagram's ToS and carries risk of checkpoint challenges. For a ToS-compliant experience, use the{' '}
                        <button
                          type="button"
                          onClick={() => { setTab('oauth'); setErrorMsg(''); }}
                          className="text-white underline font-semibold hover:text-emerald-300 transition"
                        >
                          Official Login
                        </button>{' '}
                        tab when available.
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 pt-1 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sessionRiskAck}
                        onChange={(e) => setSessionRiskAck(e.target.checked)}
                        className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-brand-pink focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-zinc-200 font-medium">
                        I understand the ToS risks and accept responsibility for any account challenges or bans.
                      </span>
                    </label>
                  </div>

                  {/* Instagram Username & Mode Input Grid */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <span>Instagram Username</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-pink/15 text-brand-pink font-semibold">
                          Recommended
                        </span>
                      </label>
                      {username && (
                        <button
                          type="button"
                          onClick={() => setUsername('')}
                          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono font-semibold">@</span>
                      <input
                        type="text"
                        placeholder="your_instagram_handle (bypasses 403 API restriction)"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value.replace('@', '').trim());
                          if (previewProfile) setPreviewProfile(null);
                        }}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white placeholder-zinc-500 focus:outline-none transition font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Providing your username guarantees immediate connection even when Instagram's edge firewall restricts server-side lookups.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-zinc-300">
                        Instagram Session Token (<code className="text-brand-pink">sessionid</code>)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSessionCookie('sandbox_sess_demo_' + Date.now());
                          setErrorMsg('');
                        }}
                        className="text-xs text-brand-pink hover:underline font-medium"
                      >
                        Paste Demo Token
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Paste your sessionid (e.g. 6528919%3AbB7j9x1f82y...) or full browser cookie string..."
                      value={sessionCookie}
                      onChange={(e) => {
                        setSessionCookie(e.target.value);
                        if (previewProfile) setPreviewProfile(null);
                      }}
                      className="w-full px-3.5 py-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition resize-none"
                    />
                  </div>

                  {/* LIVE PROFILE PREVIEW CARD (when fetched) */}
                  {previewProfile && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-emerald-500/40 shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          Verified Instagram Session
                        </span>
                        {previewProfile.isSandbox && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                            Sandbox Mode
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <img
                          src={previewProfile.avatarUrl}
                          alt={previewProfile.username}
                          className="w-14 h-14 rounded-full object-cover border-2 border-brand-pink/70 shadow-md shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';
                          }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-base font-bold text-white truncate">
                              @{previewProfile.username}
                            </h4>
                            {previewProfile.isVerified && (
                              <span className="text-sky-400 text-sm font-bold" title="Verified">✓</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate">
                            {previewProfile.fullName || previewProfile.username}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-300 font-mono">
                            <span><strong className="text-white font-semibold">{previewProfile.followerCount.toLocaleString()}</strong> followers</span>
                            <span>•</span>
                            <span><strong className="text-white font-semibold">{previewProfile.followingCount.toLocaleString()}</strong> following</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleAutoFetchPreview}
                      disabled={isFetchingPreview || isLoading || !sessionCookie.trim()}
                      className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-white font-semibold text-xs border border-zinc-700/80 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isFetchingPreview ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-pink" />
                          <span>Fetching Profile...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5 text-brand-pink" />
                          <span>{previewProfile ? 'Re-Inspect Profile' : 'Inspect & Preview'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAutoConnectSession()}
                      disabled={
                        isLoading ||
                        isFetchingPreview ||
                        !sessionCookie.trim() ||
                        (!sessionRiskAck &&
                          !sessionCookie.startsWith('sandbox_') &&
                          !sessionCookie.startsWith('demo_'))
                      }
                      className="py-3 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{previewProfile ? `Confirm @${previewProfile.username}` : 'Auto-Fetch & Link'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {!sessionRiskAck &&
                    !sessionCookie.startsWith('sandbox_') &&
                    !sessionCookie.startsWith('demo_') &&
                    sessionCookie.trim().length > 0 && (
                      <p className="text-xs text-amber-400/90 text-center font-medium">
                        * Please check the Terms of Service risk acknowledgement above to enable linking.
                      </p>
                    )}

                  {/* ADVANCED COLLAPSIBLE FOR MANUAL USERNAME */}
                  <div className="pt-2 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition"
                    >
                      {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>Advanced options (Specify custom username or override)</span>
                    </button>

                    {showAdvanced && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">
                            Instagram Username (Optional Override)
                          </label>
                          <input
                            type="text"
                            placeholder="Leave blank to auto-detect from sessionid"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* How to get sessionid guide */}
                  <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs text-zinc-400 space-y-2">
                    <span className="font-semibold text-zinc-300">How to get your sessionid token:</span>
                    <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                      <li>Log in to <strong className="text-zinc-300">instagram.com</strong> in your desktop browser (Chrome, Edge, Brave)</li>
                      <li>Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">F12</kbd> or right-click &gt; <strong className="text-zinc-300">Inspect</strong></li>
                      <li>Go to <strong className="text-zinc-300">Application</strong> tab &gt; <strong className="text-zinc-300">Cookies</strong> &gt; <code className="text-zinc-300">https://www.instagram.com</code></li>
                      <li>Copy the value of <code className="text-brand-pink font-mono">sessionid</code> and paste it above</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* TAB 2: USERNAME / PASSWORD */}
              {tab === 'credentials' && (
                <div className="max-w-xl">
                  {!needsTwoFactor ? (
                    <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-brand-pink shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          Your credentials are encrypted using <strong className="text-white">AES-256-GCM</strong> locally on your server. Passwords are never sent to third-party services.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Instagram Username
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. your_instagram_handle"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Instagram Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-2 py-3 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-sm shadow-brand hover:opacity-95 transition disabled:opacity-50"
                      >
                        {isLoading ? 'Authenticating with Instagram...' : 'Connect Instagram Account'}
                      </button>
                    </form>
                  ) : (
                    /* Two-Factor Challenge Form */
                    <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                      <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-start gap-2.5">
                        <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-white">Two-Factor Authentication Required</h4>
                          <p className="text-zinc-400 mt-1">
                            Instagram has sent a 6-digit verification code to your SMS or authenticator app. Enter it below to complete sign in.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5 text-center">
                          Security Verification Code
                        </label>
                        <input
                          type="text"
                          placeholder="123456"
                          maxLength={8}
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white text-center font-mono tracking-widest text-lg placeholder-zinc-500 focus:outline-none transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-sm shadow-brand hover:opacity-95 transition disabled:opacity-50"
                      >
                        {isLoading ? 'Verifying 2FA Code...' : 'Submit Security Code'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 3: SANDBOX SIMULATOR */}
              {tab === 'sandbox' && (
                <div className="space-y-5 text-center py-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl ig-gradient-bg p-[1.5px] mx-auto shadow-brand">
                    <div className="w-full h-full bg-zinc-900 rounded-[14px] flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Sandbox Simulator Mode</h4>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                      Test and explore all features immediately with mock Instagram accounts, story feeds, and follower metrics without connecting real credentials.
                    </p>
                  </div>

                  <button
                    onClick={handleLaunchSandbox}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-sm shadow-brand hover:opacity-95 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Activating Simulator...' : 'Launch Sandbox Demo'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

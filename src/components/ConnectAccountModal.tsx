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
  ExternalLink
} from 'lucide-react';
import { ApiService } from '../services/api';
import { InstagramSessionProfile } from '../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const ConnectAccountModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [tab, setTab] = useState<'oauth' | 'session' | 'credentials' | 'sandbox'>('oauth');
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
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Discover whether official Instagram login is configured on the server.
  useEffect(() => {
    let cancelled = false;
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
      setErrorMsg('Please acknowledge the Instagram Terms of Service risk warning below before linking.');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl ig-gradient-bg p-[1.5px] shadow-brand">
              <div className="w-full h-full bg-zinc-900 rounded-[10px] flex items-center justify-center">
                <Instagram className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Connect Instagram Account</h3>
              <p className="text-xs text-zinc-400">Automated session fetch & token sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60">
          <button
            onClick={() => { setTab('oauth'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              tab === 'oauth'
                ? 'border-brand-pink text-white bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official Login</span>
            <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
              Recommended
            </span>
          </button>
          <button
            onClick={() => { setTab('session'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              tab === 'session'
                ? 'border-brand-pink text-white bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-pink" />
            <span>Session ID</span>
            <span className="hidden sm:inline-block text-[10px] text-zinc-500 font-normal">
              (Paste)
            </span>
          </button>
          <button
            onClick={() => { setTab('credentials'); setNeedsTwoFactor(false); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition ${
              tab === 'credentials'
                ? 'border-brand-pink text-white bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Credentials (Direct)
          </button>
          <button
            onClick={() => { setTab('sandbox'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition ${
              tab === 'sandbox'
                ? 'border-brand-pink text-white bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sandbox (Demo Mode)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 0: OFFICIAL INSTAGRAM OAUTH (RECOMMENDED) */}
          {tab === 'oauth' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-white">Recommended. </span>
                  You'll approve access on Instagram's own login screen. This app never sees your
                  password or session cookie — only an official access token you can revoke anytime.
                </div>
              </div>

              {oauthConfigured === null && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-zinc-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-pink" />
                  <span>Checking official login availability…</span>
                </div>
              )}

              {oauthConfigured === true && (
                <>
                  <button
                    type="button"
                    onClick={handleStartOAuth}
                    disabled={oauthStarting}
                    className="w-full py-3 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-sm shadow-brand hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {oauthStarting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Redirecting to Instagram…</span>
                      </>
                    ) : (
                      <>
                        <Instagram className="w-4 h-4" />
                        <span>Continue with Instagram</span>
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 justify-center">
                    <Lock className="w-3 h-3" />
                    <span>Secured by Instagram OAuth · token encrypted at rest</span>
                  </div>
                </>
              )}

              {oauthConfigured === false && (
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Official login isn't configured yet</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    The administrator needs to add Instagram app credentials
                    (<code className="text-zinc-300">IG_OAUTH_CLIENT_ID</code> and
                    {' '}<code className="text-zinc-300">IG_OAUTH_CLIENT_SECRET</code>) to the server's
                    environment. See <code className="text-zinc-300">.env.example</code> for setup steps.
                  </p>
                  <a
                    href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-brand-pink hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Instagram Login setup guide
                  </a>
                  <p className="text-zinc-500 pt-1">
                    In the meantime you can use the <strong className="text-zinc-300">Session ID</strong> or
                    {' '}<strong className="text-zinc-300">Sandbox</strong> tabs.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: SESSION COOKIE (MANUAL SELF-PASTE) */}
          {tab === 'session' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-brand-pink shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-white">Manual Self-Paste (No Browser Scanning): </span>
                  Paste your own <code className="text-brand-pink font-mono">sessionid</code>. We will inspect your profile details directly from Instagram and encrypt the cookie at rest (<strong className="text-zinc-200">AES-256-GCM</strong>).
                </div>
              </div>

              {/* ToS / Account Risk Notice */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-semibold text-amber-300">Terms of Service Risk Notice: </span>
                    Driving Instagram with an extracted session cookie violates Instagram's ToS and carries risk of checkpoint challenges or account bans. For a secure, ToS-compliant experience, use the{' '}
                    <button
                      type="button"
                      onClick={() => { setTab('oauth'); setErrorMsg(''); }}
                      className="text-white underline font-semibold hover:text-emerald-300 transition"
                    >
                      Official Login
                    </button>{' '}
                    tab instead.
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-[11px] text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sessionRiskAck}
                    onChange={(e) => setSessionRiskAck(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-zinc-950 border-zinc-700 text-brand-pink focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-zinc-200 font-medium">
                    I understand the ToS risks and accept responsibility for any account challenges or bans.
                  </span>
                </label>
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
                    className="text-[11px] text-brand-pink hover:underline"
                  >
                    Paste Demo Token
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Paste your sessionid (e.g. 6528919%3AbB7j9x1f82y...) or full browser cookie string..."
                  value={sessionCookie}
                  onChange={(e) => {
                    setSessionCookie(e.target.value);
                    if (previewProfile) setPreviewProfile(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition resize-none"
                />
              </div>

              {/* LIVE PROFILE PREVIEW CARD (when fetched) */}
              {previewProfile && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-emerald-500/30 shadow-lg space-y-3">
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

                  <div className="flex items-center gap-3.5">
                    <img
                      src={previewProfile.avatarUrl}
                      alt={previewProfile.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-brand-pink/60 shadow-md shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white truncate">
                          @{previewProfile.username}
                        </h4>
                        {previewProfile.isVerified && (
                          <span className="text-sky-400 text-xs font-bold" title="Verified">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        {previewProfile.fullName || previewProfile.username}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 font-mono">
                        <span><strong className="text-white font-semibold">{previewProfile.followerCount.toLocaleString()}</strong> followers</span>
                        <span>•</span>
                        <span><strong className="text-white font-semibold">{previewProfile.followingCount.toLocaleString()}</strong> following</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleAutoFetchPreview}
                  disabled={isFetchingPreview || isLoading || !sessionCookie.trim()}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-white font-semibold text-xs border border-zinc-700/80 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
                  className="py-2.5 px-3 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  <p className="text-[11px] text-amber-400/90 text-center font-medium">
                    * Please check the Terms of Service risk acknowledgement above to enable linking.
                  </p>
                )}

              {/* ADVANCED COLLAPSIBLE FOR MANUAL USERNAME */}
              <div className="pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
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
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* How to get sessionid guide */}
              <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-[11px] text-zinc-400 space-y-1">
                <span className="font-semibold text-zinc-300">How to get your sessionid:</span>
                <ol className="list-decimal list-inside space-y-0.5 text-zinc-500">
                  <li>Log in to <strong className="text-zinc-400">instagram.com</strong> in Chrome or Edge</li>
                  <li>Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">F12</kbd> &gt; <strong className="text-zinc-400">Application</strong> tab &gt; <strong className="text-zinc-400">Cookies</strong></li>
                  <li>Copy the value of <code className="text-zinc-300">sessionid</code> and paste it above</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: USERNAME / PASSWORD */}
          {tab === 'credentials' && (
            <div>
              {!needsTwoFactor ? (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-brand-pink shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Your credentials are encrypted using <strong className="text-white">AES-256-GCM</strong> on your local server. Passwords are never sent to third-party tracking services.
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
                    className="w-full mt-2 py-2.5 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-sm shadow-brand hover:opacity-95 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Authenticating with Instagram...' : 'Connect Instagram Account'}
                  </button>
                </form>
              ) : (
                /* Two-Factor Challenge Form */
                <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-start gap-2.5">
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-sm text-white text-center font-mono tracking-widest text-lg placeholder-zinc-500 focus:outline-none transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-sm shadow-brand hover:opacity-95 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Verifying 2FA Code...' : 'Submit Security Code'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: SANDBOX SIMULATOR */}
          {tab === 'sandbox' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-2xl ig-gradient-bg p-[1.5px] mx-auto shadow-brand">
                <div className="w-full h-full bg-zinc-900 rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Sandbox Simulator Mode</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Test and explore all features immediately with mock Instagram accounts, story feeds, and follower metrics without connecting real credentials.
                </p>
              </div>

              <button
                onClick={handleLaunchSandbox}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-sm shadow-brand hover:opacity-95 transition disabled:opacity-50"
              >
                {isLoading ? 'Activating Simulator...' : 'Launch Sandbox Demo'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sliders,
  Users,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Clock,
  RefreshCw,
  Search,
  Database,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  X,
  Instagram,
  KeyRound,
  Globe
} from 'lucide-react';
import { ApiService } from '../services/api';
import { ProductConfig, User, AdminStats } from '../types';

const STANDARD_IG_SCOPES = [
  { id: 'instagram_business_basic', label: 'Basic Profile', desc: 'Read profile, username, media count (Essential)' },
  { id: 'instagram_business_manage_messages', label: 'Direct Messages', desc: 'Read & reply to Instagram DMs' },
  { id: 'instagram_business_manage_comments', label: 'Comments', desc: 'Read & reply to comments on posts' },
  { id: 'instagram_business_content_publish', label: 'Publish Media', desc: 'Publish photos, videos, and stories' },
  { id: 'instagram_business_manage_insights', label: 'Insights & Analytics', desc: 'Read account and media metrics' }
];

interface Props {
  currentUser: User | null;
}

export const AdminPortal: React.FC<Props> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'configs' | 'users' | 'system'>('configs');
  const [configs, setConfigs] = useState<ProductConfig[]>([]);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showClientSecret, setShowClientSecret] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [customScopeInput, setCustomScopeInput] = useState('');

  const currentScopes = (configValues['ig_oauth_scopes'] || 'instagram_business_basic')
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const toggleScope = (scopeId: string) => {
    let updated: string[];
    if (currentScopes.includes(scopeId)) {
      updated = currentScopes.filter((s) => s !== scopeId);
    } else {
      updated = [...currentScopes, scopeId];
    }
    handleConfigChange('ig_oauth_scopes', updated.join(','));
  };

  const handleAddCustomScope = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customScopeInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean) return;
    if (!currentScopes.includes(clean)) {
      handleConfigChange('ig_oauth_scopes', [...currentScopes, clean].join(','));
    }
    setCustomScopeInput('');
  };

  const handleRemoveScope = (scopeToRemove: string) => {
    const updated = currentScopes.filter((s) => s !== scopeToRemove);
    handleConfigChange('ig_oauth_scopes', updated.join(','));
  };

  const effectiveBaseUrl = (configValues['app_base_url'] || 'http://localhost:5500').trim().replace(/\/$/, '');
  const calculatedRedirectUri =
    (configValues['ig_oauth_redirect_uri'] || '').trim() || `${effectiveBaseUrl}/api/auth/instagram/oauth/callback`;

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(calculatedRedirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  const isOAuthConfigured = Boolean(
    configValues['ig_oauth_client_id']?.trim() &&
    configValues['ig_oauth_client_secret']?.trim()
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cfgRes, usersRes, statsRes] = await Promise.all([
        ApiService.getAdminConfigs(),
        ApiService.getAdminUsers(),
        ApiService.getAdminStats()
      ]);

      setConfigs(cfgRes.configs || []);
      const valMap: Record<string, string> = {};
      (cfgRes.configs || []).forEach((c) => {
        valMap[c.key] = c.value;
      });
      setConfigValues(valMap);
      setUsers(usersRes.users || []);
      setAdminStats(statsRes);
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfigChange = (key: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusNotice(null);

    try {
      await ApiService.updateAdminConfigs(configValues);
      setStatusNotice({ type: 'success', message: 'Product configurations updated successfully! Changes are active immediately.' });
      await loadData();
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleUserRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to change @${user.email}'s role to ${newRole.toUpperCase()}?`)) return;

    try {
      await ApiService.updateUserRole(user.id, newRole);
      setStatusNotice({ type: 'success', message: `Updated @${user.email} role to ${newRole}.` });
      await loadData();
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err.response?.data?.error || err.message });
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = !(user.isActive === 1);
    try {
      await ApiService.updateUserStatus(user.id, newStatus);
      setStatusNotice({ type: 'success', message: `Updated user @${user.email} status.` });
      await loadData();
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err.response?.data?.error || err.message });
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Permanently delete @${user.email} and all their saved stories? This action is irreversible.`)) return;

    try {
      await ApiService.deleteUser(user.id);
      setStatusNotice({ type: 'success', message: `Deleted user @${user.email}.` });
      await loadData();
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err.response?.data?.error || err.message });
    }
  };

  const handleForcePurge = async () => {
    try {
      const res = await ApiService.forceAdminPurge();
      alert(`Manual 30-Day TTL Purge Complete!\nPurged ${res.purgedCount} expired stories.\nReclaimed: ${res.reclaimedFormatted}`);
      await loadData();
    } catch (err: any) {
      alert(`Purge failed: ${err.message}`);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-2xl max-w-xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Administrator Access Required</h3>
        <p className="text-xs text-zinc-400">
          This portal allows managing product-wide settings, storage limits, and user privileges. Please log in with an Administrator account or promote your user via CLI command:
        </p>
        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300">
          npm run make:admin -- {currentUser?.email || 'your-email@example.com'}
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.fullName.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Admin Management Portal</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
              SUPERUSER
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Maintain dynamic product configurations, adjust 30-day retention limits, and manage platform users
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/80 text-xs font-medium transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-pink' : ''}`} />
          <span>Refresh Live Stats</span>
        </button>
      </div>

      {statusNotice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            statusNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusNotice.message}</span>
          </div>
          <button onClick={() => setStatusNotice(null)} className="text-zinc-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/60 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setActiveTab('configs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'configs'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-brand-pink" />
          <span>Product Configurations ({configs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'users'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'system'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Storage Health</span>
        </button>
      </div>

      {/* TAB 1: PRODUCT CONFIGURATIONS */}
      {activeTab === 'configs' && (
        <form onSubmit={handleSaveConfigs} className="space-y-6">
          {/* TOP SAVE ACTION BAR */}
          <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-white">Product & OAuth Configurations</h3>
              <p className="text-xs text-zinc-400">Settings maintained live in SQLite; changes take effect immediately without restarting.</p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Configurations...' : 'Save All Configurations'}</span>
            </button>
          </div>

          {/* INSTAGRAM OAUTH & META GRAPH API SETTINGS */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl ig-gradient-bg p-[1.5px] shadow-brand shrink-0">
                  <div className="w-full h-full bg-zinc-900 rounded-[10px] flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Instagram OAuth & Meta Graph API</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isOAuthConfigured
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {isOAuthConfigured ? 'CONFIGURED & READY' : 'SETUP REQUIRED'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Live dynamic credentials for Meta's official "Instagram API with Instagram Login"
                  </p>
                </div>
              </div>

              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 text-xs font-medium border border-zinc-700/80 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Meta Developer Dashboard</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* APP_BASE_URL */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>Application Base URL (APP_BASE_URL)</span>
                  </label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                    app_base_url
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Canonical URL of your deployment (e.g. <code>http://localhost:5500</code> or <code>https://insta.abishek.in</code>).
                </p>
                <input
                  type="text"
                  placeholder="http://localhost:5500"
                  value={configValues['app_base_url'] ?? ''}
                  onChange={(e) => handleConfigChange('app_base_url', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white font-mono focus:outline-none transition"
                />
              </div>

              {/* IG_OAUTH_CLIENT_ID */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-brand-pink" />
                    <span>Instagram App / Client ID (IG_OAUTH_CLIENT_ID)</span>
                  </label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                    ig_oauth_client_id
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  App ID from Meta Developer Dashboard &gt; Instagram product settings.
                </p>
                <input
                  type="text"
                  placeholder="e.g. 17841401234567890"
                  value={configValues['ig_oauth_client_id'] ?? ''}
                  onChange={(e) => handleConfigChange('ig_oauth_client_id', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white font-mono focus:outline-none transition"
                />
              </div>

              {/* IG_OAUTH_CLIENT_SECRET */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Instagram App Secret (IG_OAUTH_CLIENT_SECRET)</span>
                  </label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                    ig_oauth_client_secret
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  App Secret for authorization code exchanges.
                </p>
                <div className="relative">
                  <input
                    type={showClientSecret ? 'text' : 'password'}
                    placeholder="••••••••••••••••••••••••"
                    value={configValues['ig_oauth_client_secret'] ?? ''}
                    onChange={(e) => handleConfigChange('ig_oauth_client_secret', e.target.value)}
                    className="w-full pl-3 pr-10 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white font-mono focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition"
                  >
                    {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* IG_OAUTH_REDIRECT_URI */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instagram Redirect URI (IG_OAUTH_REDIRECT_URI)</span>
                  </label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                    ig_oauth_redirect_uri
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Custom redirect URI (optional). Leave empty to auto-derive from Base URL.
                </p>
                <input
                  type="text"
                  placeholder={`Default: ${effectiveBaseUrl}/api/auth/instagram/oauth/callback`}
                  value={configValues['ig_oauth_redirect_uri'] ?? ''}
                  onChange={(e) => handleConfigChange('ig_oauth_redirect_uri', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white font-mono focus:outline-none transition"
                />
              </div>
            </div>

            {/* EFFECTIVE REDIRECT URI & ONE-CLICK COPY HELPER */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Active Meta Whitelist Callback URI</span>
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Add this exact URI to Meta App Dashboard &gt; Instagram Login &gt; Settings &gt; Valid OAuth Redirect URIs:
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyRedirect}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-zinc-700 transition shrink-0 self-start sm:self-auto"
                >
                  {copiedRedirect ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Callback URI</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-300 break-all select-all">
                {calculatedRedirectUri}
              </div>
            </div>

            {/* MULTI-SCOPES SELECTOR & BUILDER */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-brand-pink" />
                    <span>OAuth Permissions & Scopes ({currentScopes.length} Active)</span>
                  </label>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Select standard Instagram Graph API scopes or add custom ones. Multiple scopes are combined into the consent request.
                  </p>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono self-start sm:self-auto">
                  ig_oauth_scopes
                </span>
              </div>

              {/* ACTIVE SCOPES BADGES */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentScopes.length > 0 ? (
                  currentScopes.map((scope) => (
                    <span
                      key={scope}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-pink/15 text-brand-pink border border-brand-pink/30 text-xs font-mono font-medium"
                    >
                      <span>{scope}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveScope(scope)}
                        className="text-zinc-400 hover:text-white transition"
                        title={`Remove ${scope}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-amber-400 font-medium italic">
                    No scopes selected. (At least 'instagram_business_basic' is recommended)
                  </span>
                )}
              </div>

              {/* QUICK TOGGLE PILLS FOR STANDARD META SCOPES */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Standard Instagram Graph API Scopes (Click to Toggle):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {STANDARD_IG_SCOPES.map((s) => {
                    const active = currentScopes.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleScope(s.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          active
                            ? 'bg-zinc-800/90 border-brand-pink/60 text-white shadow-sm'
                            : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold">{s.label}</span>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              active ? 'bg-brand-pink text-white' : 'border border-zinc-700 text-zinc-500'
                            }`}
                          >
                            {active ? '✓' : '+'}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-1 leading-snug line-clamp-1 font-mono">
                          {s.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ADD CUSTOM SCOPE */}
              <div className="pt-2 border-t border-zinc-800/80">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter custom scope (e.g. pages_show_list, pages_read_engagement)..."
                    value={customScopeInput}
                    onChange={(e) => setCustomScopeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomScope();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white font-mono placeholder-zinc-500 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomScope()}
                    disabled={!customScopeInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Scope</span>
                  </button>
                </div>
              </div>

              {/* RAW COMMA-SEPARATED VALUE INPUT */}
              <div className="pt-1">
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Raw Comma-Separated Scope String (Auto-Synchronized):
                </label>
                <input
                  type="text"
                  value={configValues['ig_oauth_scopes'] ?? ''}
                  onChange={(e) => handleConfigChange('ig_oauth_scopes', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-brand-pink transition"
                />
              </div>
            </div>
          </div>

          {/* GENERAL STORAGE & SYSTEM PRODUCT CONFIGURATIONS */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-card space-y-5">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white">General Product & Storage Configurations</h3>
              <p className="text-xs text-zinc-400">Core TTL policies, quotas, maintenance modes, and announcement banners</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {configs
                .filter((cfg) => cfg.category !== 'oauth')
                .map((cfg) => {
                  const isBool = cfg.type === 'boolean';
                  const currentVal = configValues[cfg.key] ?? cfg.value;

                  return (
                    <div key={cfg.key} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{cfg.label}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">
                            {cfg.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                          {cfg.description}
                        </p>
                      </div>

                      <div className="pt-2">
                        {isBool ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleConfigChange(cfg.key, currentVal === 'true' ? 'false' : 'true')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                currentVal === 'true'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              {currentVal === 'true' ? 'ENABLED' : 'DISABLED'}
                            </button>
                            <span className="text-[11px] text-zinc-400">
                              Currently {currentVal === 'true' ? 'Active' : 'Turned Off'}
                            </span>
                          </div>
                        ) : (
                          <input
                            type={cfg.type === 'number' ? 'number' : 'text'}
                            value={currentVal}
                            onChange={(e) => handleConfigChange(cfg.key, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white focus:outline-none transition"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving Configurations...' : 'Save All Configurations'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-card">
          <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search user by email or name..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white placeholder-zinc-500 focus:outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>CLI Admin Command:</span>
              <code className="text-zinc-200 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-[11px]">
                npm run make:admin -- email@example.com
              </code>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Saved Stories</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const isAdmin = u.role === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{u.fullName}</div>
                        <div className="text-[11px] text-zinc-400">{u.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isAdmin
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-200 font-medium">
                        {u.savedStoriesCount || 0} active
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold ${u.isActive === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {u.isActive === 1 ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isCurrent && (
                            <>
                              <button
                                onClick={() => handleToggleUserRole(u)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 border border-zinc-700 transition"
                                title="Promote or Demote role"
                              >
                                {isAdmin ? 'Demote to User' : 'Make Admin'}
                              </button>

                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                                title={u.isActive === 1 ? 'Suspend Account' : 'Activate Account'}
                              >
                                {u.isActive === 1 ? <UserX className="w-3.5 h-3.5 text-amber-400" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                              </button>

                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] text-brand-pink px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 font-medium">
                              You (Current)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM HEALTH & STORAGE */}
      {activeTab === 'system' && adminStats && (
        <div className="space-y-6">
          {/* Storage Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-card">
              <span className="text-xs text-zinc-400 font-medium">SQLite Database File Size</span>
              <div className="text-2xl font-bold text-white mt-1">
                {adminStats.databaseSizeFormatted}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                WAL Mode Enabled
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-card">
              <span className="text-xs text-zinc-400 font-medium">Active Storage Consumed</span>
              <div className="text-2xl font-bold text-white mt-1">
                {adminStats.storageMetrics.activeStorageFormatted}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {adminStats.storageMetrics.activeStoriesCount} stories retained
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-card">
              <span className="text-xs text-zinc-400 font-medium">30-Day TTL Reclaimed Space</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {adminStats.storageMetrics.purgedStorageFormatted}
              </div>
              <div className="text-xs text-zinc-400 mt-1 flex items-center justify-between">
                <span>{adminStats.storageMetrics.purgedStoriesCount} expired purged</span>
                <button
                  onClick={handleForcePurge}
                  className="text-xs text-brand-pink hover:underline font-medium"
                >
                  Force Purge Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

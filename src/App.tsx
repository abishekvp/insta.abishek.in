import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Users2,
  Cpu,
  ShieldCheck,
  Sliders,
  AlertCircle,
  X
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ConnectAccountModal } from './components/ConnectAccountModal';
import { QuickUrlDownloaderModal } from './components/QuickUrlDownloaderModal';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './pages/Dashboard';
import { StoryVault } from './pages/StoryVault';
import { FollowerIntelligence } from './pages/FollowerIntelligence';
import { AutoArchiver } from './pages/AutoArchiver';
import { Analytics } from './pages/Analytics';
import { SecurityCenter } from './pages/SecurityCenter';
import { AdminPortal } from './pages/AdminPortal';
import { ApiService } from './services/api';
import { Account, StorageMetrics, FollowerOverviewCounts, User } from './types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [followerCounts, setFollowerCounts] = useState<FollowerOverviewCounts | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isQuickSaveOpen, setIsQuickSaveOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [oauthBanner, setOauthBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const refreshGlobalState = async () => {
    try {
      const [authRes, metRes, countsRes] = await Promise.all([
        ApiService.getMe(),
        ApiService.getStorageMetrics(),
        ApiService.getFollowerCounts()
      ]);

      if (authRes.authenticated && authRes.user) {
        setCurrentUser(authRes.user);
      } else {
        setCurrentUser(null);
      }

      if (authRes.account) {
        setAccount(authRes.account);
      } else {
        setAccount(null);
      }

      setMetrics(metRes);
      setFollowerCounts(countsRes);
    } catch (err) {
      console.error('Failed to load global state:', err);
    }
  };

  useEffect(() => {
    refreshGlobalState();

    // Check for Instagram OAuth callback status in URL query parameters
    const params = new URLSearchParams(window.location.search);
    const igConnect = params.get('ig_connect');
    const igUsername = params.get('ig_username');
    const igMessage = params.get('ig_message');

    if (igConnect === 'success') {
      setOauthBanner({
        type: 'success',
        message: `Official Instagram Login successful! Connected @${igUsername || 'account'}.`
      });
      // Scrub the query parameters from the browser address bar cleanly
      const url = new URL(window.location.href);
      url.searchParams.delete('ig_connect');
      url.searchParams.delete('ig_username');
      window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
      refreshGlobalState();
    } else if (igConnect === 'error') {
      setOauthBanner({
        type: 'error',
        message: igMessage || 'Instagram official login failed. Please try again.'
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('ig_connect');
      url.searchParams.delete('ig_message');
      window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
    }
  }, []);

  const handleLogout = () => {
    ApiService.logout();
    setCurrentUser(null);
    setAccount(null);
    refreshGlobalState();
  };

  const handleGlobalPurge = async () => {
    setIsPurging(true);
    try {
      const res = await ApiService.purgeExpiredStories();
      alert(`30-Day TTL Purge complete!\nPurged ${res.purgedCount} expired stories.\nReclaimed ${res.reclaimedFormatted} storage.`);
      await refreshGlobalState();
    } catch (err: any) {
      alert(`Purge failed: ${err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-zinc-100 flex flex-col font-sans">
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          account={account}
          metrics={metrics}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
          onOpenQuickSave={() => setIsQuickSaveOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          onPurgeClick={handleGlobalPurge}
          isPurging={isPurging}
        />

        {/* Global OAuth Callback Notification Banner */}
        {oauthBanner && (
          <div
            className={`px-4 py-3 flex items-center justify-between border-b text-xs sm:text-sm font-medium transition-all ${
              oauthBanner.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full px-2">
              {oauthBanner.type === 'success' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="flex-1">{oauthBanner.message}</span>
              <button
                onClick={() => setOauthBanner(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-md transition"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Sidebar */}
          <Sidebar
            currentUser={currentUser}
            unfollowerCount={followerCounts?.unfollowersCount || 0}
            activeStoryCount={metrics?.activeStoriesCount || 0}
          />

          {/* Page View Container */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route
                  path="/"
                  element={
                    <Dashboard
                      onOpenQuickSave={() => setIsQuickSaveOpen(true)}
                      onOpenConnectModal={() => setIsConnectModalOpen(true)}
                    />
                  }
                />
                <Route
                  path="/stories"
                  element={<StoryVault onOpenQuickSave={() => setIsQuickSaveOpen(true)} />}
                />
                <Route path="/followers" element={<FollowerIntelligence />} />
                <Route path="/automations" element={<AutoArchiver />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route
                  path="/security"
                  element={<SecurityCenter onOpenConnectModal={() => setIsConnectModalOpen(true)} />}
                />
                <Route
                  path="/admin"
                  element={<AdminPortal currentUser={currentUser} />}
                />
              </Routes>
            </div>
          </main>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 flex items-center justify-around py-2.5 px-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
                isActive ? 'text-brand-pink' : 'text-zinc-400'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/stories"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
                isActive ? 'text-brand-pink' : 'text-zinc-400'
              }`
            }
          >
            <Film className="w-5 h-5" />
            <span>Vault</span>
          </NavLink>

          <NavLink
            to="/followers"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
                isActive ? 'text-brand-pink' : 'text-zinc-400'
              }`
            }
          >
            <Users2 className="w-5 h-5" />
            <span>Intel</span>
          </NavLink>

          <NavLink
            to="/automations"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
                isActive ? 'text-brand-pink' : 'text-zinc-400'
              }`
            }
          >
            <Cpu className="w-5 h-5" />
            <span>Auto</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[10px] font-bold transition ${
                  isActive ? 'text-brand-pink' : 'text-zinc-400'
                }`
              }
            >
              <Sliders className="w-5 h-5" />
              <span>Admin</span>
            </NavLink>
          )}
        </div>

        {/* Global Modals */}
        {isConnectModalOpen && (
          <ConnectAccountModal
            onClose={() => setIsConnectModalOpen(false)}
            onSuccess={refreshGlobalState}
          />
        )}

        {isQuickSaveOpen && (
          <QuickUrlDownloaderModal
            onClose={() => setIsQuickSaveOpen(false)}
            onSuccess={refreshGlobalState}
          />
        )}

        {isAuthModalOpen && (
          <AuthModal
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={(user) => {
              setCurrentUser(user);
              refreshGlobalState();
            }}
          />
        )}
      </div>
    </BrowserRouter>
  );
};

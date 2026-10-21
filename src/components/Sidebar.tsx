import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Users2,
  Cpu,
  BarChart3,
  ShieldCheck,
  Sliders,
  Clock,
  Sparkles
} from 'lucide-react';
import { User } from '../types';

interface Props {
  currentUser: User | null;
  unfollowerCount?: number;
  activeStoryCount?: number;
}

export const Sidebar: React.FC<Props> = ({ currentUser, unfollowerCount = 0, activeStoryCount = 0 }) => {
  const isAdmin = currentUser?.role === 'admin';

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      to: '/stories',
      label: 'Story Vault',
      icon: Film,
      badge: activeStoryCount > 0 ? activeStoryCount : null,
      badgeColor: 'bg-zinc-800 text-zinc-200 border-zinc-700'
    },
    {
      to: '/followers',
      label: 'Follower Intel',
      icon: Users2,
      badge: unfollowerCount > 0 ? `${unfollowerCount} lost` : null,
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    },
    {
      to: '/automations',
      label: 'Auto-Archiver',
      icon: Cpu,
      badge: null
    },
    {
      to: '/analytics',
      label: 'Storage & Analytics',
      icon: BarChart3,
      badge: null
    },
    {
      to: '/security',
      label: 'Account & Security',
      icon: ShieldCheck,
      badge: null
    }
  ];

  return (
    <aside className="w-64 border-r border-border-subtle bg-background-subtle flex flex-col justify-between p-4 shrink-0 hidden md:flex">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-3">
            Navigation
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${
                      isActive
                        ? 'bg-zinc-900 text-white border border-zinc-800 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-brand-pink' : 'text-zinc-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                            item.badgeColor || 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Administration Section (for Admins) */}
        {isAdmin && (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-3 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              Administration
            </span>
            <nav className="mt-2">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-zinc-900 text-white border border-zinc-800 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-brand-pink" />
                  <span>Admin Portal</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                  Superuser
                </span>
              </NavLink>
            </nav>
          </div>
        )}

        {/* 30-Day Storage Policy Card */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-brand-pink" />
            <span>30-Day TTL Retention</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Stories are automatically preserved for 30 days. Media files are auto-purged after 30 days to optimize storage.
          </p>
        </div>
      </div>

      {/* Note: The old bottom-left "InstaVault Pro / Production" footer has been completely removed as requested */}
    </aside>
  );
};

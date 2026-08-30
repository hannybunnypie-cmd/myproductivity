'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar as CalendarIcon,
  Target,
  Repeat,
  Timer,
  BarChart3,
  Trophy,
  BookOpen,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  Flame,
  Zap,
  Menu,
  X,
  FileText,
  Heart,
} from 'lucide-react';
import { UserPreferences, UserXP } from '@/lib/types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [userXP, setUserXP] = useState<UserXP | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [pathname]);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUserXP(data.xp);
        setPreferences(data.preferences);
        if (data.preferences?.theme) {
          setTheme(data.preferences.theme);
          document.documentElement.classList.toggle('dark', data.preferences.theme === 'dark');
        }
      } else {
        if (!['/login', '/signup'].includes(pathname)) {
          router.push('/login');
        }
      }

      // Fetch streak
      const analyticsRes = await fetch('/api/analytics?timeframe=7');
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setStreak(analyticsData.summary?.streakInfo?.currentStreak || 0);
      }
    } catch (err) {
      console.error('Error fetching user auth data:', err);
    }
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');

    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: nextTheme }),
      });
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Habits', href: '/habits', icon: Repeat },
    { name: 'Focus', href: '/focus', icon: Timer },
    { name: 'Meditation', href: '/meditation', icon: Heart },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Achievements', href: '/achievements', icon: Trophy },
    { name: 'Journal', href: '/journal', icon: BookOpen },
    { name: 'Weekly Review', href: '/review', icon: FileText },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  if (['/login', '/signup'].includes(pathname)) {
    return <>{children}</>;
  }

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 ${theme === 'light' ? 'light-mode bg-slate-50 text-slate-900' : ''}`}>
      {/* Top Navbar Mobile */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            P
          </div>
          <span className="font-semibold text-slate-100">Productivity Companion</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-slate-900/60 border-r border-slate-800/80 p-4 justify-between z-30">
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 text-lg">
                ⚡
              </div>
              <div>
                <h1 className="font-bold text-slate-100 text-sm leading-tight">Productivity</h1>
                <p className="text-xs text-slate-400">Study Companion</p>
              </div>
            </div>

            {/* User XP & Level Card */}
            {userXP && (
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-blue-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-blue-400" /> Level {userXP.level}
                  </span>
                  <span className="text-amber-400 flex items-center gap-1 font-bold">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" /> {streak}d streak
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>{userXP.total_xp} Total XP</span>
                </div>
              </div>
            )}

            {/* Navigation items */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom user profile & settings */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-200 shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="truncate text-xs">
                  <p className="font-medium text-slate-200 truncate">{user?.name || 'User'}</p>
                  <p className="text-slate-400 truncate">{currentDateFormatted}</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        </aside>

        {/* Mobile slide-over menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-6">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white">
                  ⚡
                </div>
                <span className="font-bold text-slate-100">Productivity Companion</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-rose-400 bg-rose-950/40 border border-rose-900/30"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 lg:p-8 pb-20 lg:pb-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-800 px-2 py-2 flex items-center justify-around z-40 backdrop-blur-md">
        {[
          { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Tasks', href: '/tasks', icon: CheckSquare },
          { name: 'Focus', href: '/focus', icon: Timer },
          { name: 'Habits', href: '/habits', icon: Repeat },
          { name: 'Stats', href: '/analytics', icon: BarChart3 },
        ].map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition ${
                isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  FolderClosed,
  Coins,
  BarChart3,
  Bot,
  BookOpenText,
  Settings,
  LogOut,
  HardDrive,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';

export type NavItemKey =
  | 'home'
  | 'businesses'
  | 'orders'
  | 'files'
  | 'finance'
  | 'analytics'
  | 'ai'
  | 'blog'
  | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onNavigate: (tab: NavItemKey) => void;
  storageUsageMb?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onNavigate, storageUsageMb = 7.8 }) => {
  const { user, logout } = useAuth();
  const { activeBusiness } = useBusiness();

  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bizflow_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bizflow_sidebar_collapsed', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const navItems = [
    { key: 'home', label: 'Home', icon: LayoutDashboard },
    { key: 'businesses', label: 'My Businesses', icon: Building2 },
    { key: 'orders', label: 'Orders & Calendar', icon: CalendarCheck },
    { key: 'files', label: 'My Files', icon: FolderClosed },
    { key: 'finance', label: 'Financial Management', icon: Coins },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'ai', label: 'AI Assistant', icon: Bot },
    { key: 'blog', label: 'Personal Blog', icon: BookOpenText },
    { key: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const storageMaxMb = 50; // 50MB quota
  const storagePercent = Math.min(100, Math.round((storageUsageMb / storageMaxMb) * 100));

  return (
    <aside
      className={`bg-white border-r border-sky-100/80 flex flex-col shrink-0 h-screen sticky top-0 select-none transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-sky-100/60 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm shadow-indigo-100 shrink-0">
              <span className="font-bold text-sm tracking-tighter">BF</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">BizFlow</h1>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-700 font-mono">v2.5</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-tight mt-0.5 truncate">Multi-Brand Workspace</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm shadow-indigo-100">
            <span className="font-bold text-xs tracking-tighter">BF</span>
          </div>
        )}

        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar (Ikon Saja)'}
          aria-label="Toggle Sidebar"
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-sky-50 transition-colors ml-auto"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Active Business Badge */}
      {!isCollapsed ? (
        <div className="px-4 py-2.5 bg-sky-50/40 border-b border-sky-100/60 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium text-[11px]">Bisnis Aktif:</span>
          <span
            className="font-semibold text-indigo-700 truncate max-w-[130px] bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-2xs"
            title={activeBusiness?.name}
          >
            {activeBusiness?.name || 'Memuat...'}
          </span>
        </div>
      ) : (
        <div className="py-2 flex justify-center border-b border-sky-100/60 group relative">
          <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
            {activeBusiness?.name?.charAt(0) || 'B'}
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-md shadow-lg z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
            Bisnis: {activeBusiness?.name}
          </div>
        </div>
      )}

      {/* Read-Only Badge Warning if Baliyoutevolution */}
      {user?.isReadOnly && !isCollapsed && (
        <div className="mx-3 mt-2 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="truncate">Akses Read-Only Baliyoutevolution</span>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;
          return (
            <div key={item.key} className="relative group">
              <button
                onClick={() => onNavigate(item.key as NavItemKey)}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-all ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5 text-left'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-50 to-indigo-50/70 text-indigo-700 font-semibold shadow-xs border border-sky-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>

              {/* Hover Tooltip for Collapsed Mode (PRD Section 2) */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Storage Indicator (PRD Section 6.2) */}
      {!isCollapsed ? (
        <div className="p-3 mx-3 mb-2 rounded-xl bg-gradient-to-br from-sky-50/70 to-indigo-50/60 border border-sky-100/80">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
              Storage Used
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-medium tabular-nums">
              {storageUsageMb} MB / {storageMaxMb} MB
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">Cloud Workspace File Manager</p>
        </div>
      ) : (
        <div className="p-2 flex justify-center group relative mb-2">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-indigo-600 flex items-center justify-center border border-sky-100">
            <HardDrive className="w-4 h-4" />
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] rounded-md shadow-lg z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
            Storage: {storageUsageMb} MB / {storageMaxMb} MB ({storagePercent}%)
          </div>
        </div>
      )}

      {/* User Profile & Logout */}
      <div className="p-3 border-t border-sky-100/70 flex items-center justify-between gap-2 bg-white">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-sky-200 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate leading-tight capitalize">
                  {user?.role === 'admin' ? 'Admin Baliyoutevolution' : user?.role || 'Owner'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Keluar / Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full flex flex-col items-center gap-2">
            <div className="relative group">
              <img
                src={
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={user?.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-sky-200 shrink-0 cursor-pointer"
                referrerPolicy="no-referrer"
              />
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-md shadow-lg z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                {user?.name} ({user?.role})
              </div>
            </div>
            <button
              onClick={logout}
              title="Keluar / Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

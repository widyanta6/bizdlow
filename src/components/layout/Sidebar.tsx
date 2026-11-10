import React, { useState } from 'react';
import {
  Home,
  Briefcase,
  CalendarCheck,
  FolderClosed,
  DollarSign,
  BarChart3,
  Sparkles,
  BookOpenText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  HardDrive,
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

  // Collapsed state persisted in localStorage - default true to match screenshot!
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('bizflow_sidebar_collapsed');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
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
    { key: 'home', label: 'Home', icon: Home },
    { key: 'businesses', label: 'My Businesses', icon: Briefcase },
    { key: 'orders', label: 'Orders & Calendar', icon: CalendarCheck },
    { key: 'files', label: 'My Files', icon: FolderClosed },
    { key: 'finance', label: 'Financial Management', icon: DollarSign },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'ai', label: 'AI Assistant', icon: Sparkles },
    { key: 'blog', label: 'Personal Blog', icon: BookOpenText },
    { key: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const storageMaxMb = 50;
  const storagePercent = Math.min(100, Math.round((storageUsageMb / storageMaxMb) * 100));

  return (
    <aside
      className={`bg-white/70 backdrop-blur-xl border-r border-sky-100/80 flex flex-col shrink-0 h-screen sticky top-0 select-none transition-all duration-300 z-40 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-20 border-b border-sky-100/50 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-5'}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            {/* 3 Vertical Bars Logo matching image */}
            <div className="flex items-end gap-1 h-6 shrink-0">
              <span className="w-1.5 h-4 bg-sky-500 rounded-full" />
              <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
              <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-extrabold text-slate-900 tracking-tight leading-none block">
                BizFlow
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-tight">Workspace</span>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-1 h-6">
            <span className="w-1.5 h-4 bg-sky-500 rounded-full" />
            <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
            <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
          </div>
        )}

        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            title="Ciutkan Sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-sky-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation List matching image */}
      <nav className="flex-1 px-3 py-6 space-y-3 overflow-y-auto flex flex-col items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;
          return (
            <div key={item.key} className="relative group w-full flex justify-center">
              <button
                onClick={() => onNavigate(item.key as NavItemKey)}
                className={`flex items-center transition-all duration-200 ${
                  isCollapsed
                    ? 'w-12 h-12 justify-center rounded-2xl'
                    : 'w-full gap-3 px-3 py-2.5 rounded-xl text-left'
                } ${
                  isActive
                    ? 'bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-lg shadow-sky-300/50'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/60'
                }`}
              >
                <Icon
                  className={`shrink-0 transition-transform ${
                    isCollapsed ? 'w-5 h-5' : 'w-4 h-4'
                  } ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`}
                />
                {!isCollapsed && (
                  <span className={`text-xs truncate ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                    {item.label}
                  </span>
                )}
              </button>

              {/* Hover Tooltip when Collapsed */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Controls matching screenshot with circular expand button */}
      <div className="p-4 border-t border-sky-100/50 flex flex-col items-center gap-3 bg-transparent">
        {isCollapsed ? (
          <button
            onClick={toggleCollapse}
            title="Perluas Sidebar"
            className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-indigo-600 shadow-md shadow-sky-200/50 border border-sky-100/80 flex items-center justify-center transition-transform hover:scale-105"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-full space-y-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100/80">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="font-semibold text-slate-700">Storage Used</span>
                <span className="font-mono text-[11px] text-slate-500">{storageUsageMb} MB / {storageMaxMb} MB</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                title="Keluar"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

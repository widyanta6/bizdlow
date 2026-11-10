import React, { useState } from 'react';
import {
  Store,
  Calendar,
  ChevronDown,
  Search,
  Bell,
  Lock,
  LogOut,
  User,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { PeriodFilter } from '../../types/index';

interface HeaderProps {
  pageTitle: string;
  onOpenExportModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExportModal }) => {
  const { user, logout } = useAuth();
  const {
    businesses,
    activeBusiness,
    setActiveBusinessId,
    periodFilter,
    setPeriodFilter,
    startDate,
    endDate,
    setDateRange,
  } = useBusiness();

  const [isBizDropdownOpen, setIsBizDropdownOpen] = useState(false);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart, setCustomStart] = useState(startDate || '2026-11-01');
  const [customEnd, setCustomEnd] = useState(endDate || '2026-11-30');

  const periodLabels: Record<PeriodFilter, string> = {
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    custom: 'Custom Range',
  };

  const handleApplyCustom = () => {
    setDateRange(customStart, customEnd);
    setShowCustomModal(false);
    setIsPeriodDropdownOpen(false);
  };

  return (
    <header className="h-20 px-8 flex items-center justify-between gap-4 sticky top-0 z-30 select-none bg-transparent">
      {/* Left: Brand Logo & Pill Search Bar matching screenshot */}
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-end gap-1 h-6">
            <span className="w-1.5 h-4 bg-sky-500 rounded-full" />
            <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
            <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
          </div>
          <span className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">
            BizFlow
          </span>
        </div>

        {/* Search Bar matching screenshot */}
        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search anything... ⌘ K"
            className="w-full bg-white/90 backdrop-blur-md border border-slate-200/70 pl-11 pr-12 py-2.5 text-xs text-slate-700 placeholder-slate-400 rounded-full shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:bg-white transition-all"
          />
          <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right: Brand Selector, Period Filter, Bell Notification, Avatar */}
      <div className="flex items-center gap-3">
        {/* Brand Selector Pill */}
        <div className="relative">
          <button
            onClick={() => {
              setIsBizDropdownOpen(!isBizDropdownOpen);
              setIsPeriodDropdownOpen(false);
              setIsUserDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 hover:border-sky-300 text-xs font-semibold text-slate-800 shadow-2xs transition-all"
          >
            <Store className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="max-w-[140px] truncate">
              {activeBusiness ? activeBusiness.name : 'Pilih Bisnis'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {isBizDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-4 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Bisnis Aktif ({user?.name})
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBusinessId(b.id);
                      setIsBizDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                      activeBusiness?.id === b.id
                        ? 'bg-sky-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="leading-tight font-semibold">{b.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{b.category}</p>
                    </div>
                    {activeBusiness?.id === b.id && (
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Period Filter Pill */}
        <div className="relative">
          <button
            onClick={() => {
              setIsPeriodDropdownOpen(!isPeriodDropdownOpen);
              setIsBizDropdownOpen(false);
              setIsUserDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 hover:border-sky-300 text-xs font-semibold text-slate-800 shadow-2xs transition-all"
          >
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="hidden sm:inline">{periodLabels[periodFilter]}</span>
            <span className="sm:hidden">Periode</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {isPeriodDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs">
              <div className="px-4 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pilih Periode
              </div>
              {(['today', 'this_week', 'this_month', 'last_month', 'this_year'] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriodFilter(p);
                    setIsPeriodDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left transition-colors ${
                    periodFilter === p
                      ? 'bg-sky-50 text-blue-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => setShowCustomModal(true)}
                  className={`w-full px-4 py-2 text-left font-semibold transition-colors ${
                    periodFilter === 'custom' ? 'bg-sky-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Kustom Rentang Tanggal...
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell matching screenshot */}
        <div className="relative">
          <button
            title="Notifikasi Pengingat Tagihan & Order"
            className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 hover:border-sky-300 shadow-2xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all relative"
          >
            <Bell className="w-4 h-4" />
            {/* Red count badge '2' as seen in the mockup */}
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
              2
            </span>
          </button>
        </div>

        {/* User Profile Pill matching screenshot */}
        <div className="relative">
          <button
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
              setIsBizDropdownOpen(false);
              setIsPeriodDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 hover:border-sky-300 shadow-2xs transition-all"
          >
            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-200"
              referrerPolicy="no-referrer"
            />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-xs">
              <div className="p-3 border-b border-slate-100">
                <p className="font-bold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{user?.email}</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 capitalize mt-1 inline-block">
                  Role: {user?.role === 'admin' ? 'Baliyoutevolution' : user?.role}
                </span>
              </div>

              <div className="pt-1">
                {onOpenExportModal && (
                  <button
                    onClick={() => {
                      onOpenExportModal();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 font-medium"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Ekspor Excel (.xlsx)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar / Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Tentukan Rentang Tanggal</h3>
            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Dari Tanggal:</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Sampai Tanggal:</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleApplyCustom}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

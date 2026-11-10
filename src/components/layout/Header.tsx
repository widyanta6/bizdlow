import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { PeriodFilter } from '../../types/index';

interface HeaderProps {
  pageTitle: string;
  onOpenExportModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, onOpenExportModal }) => {
  const { user } = useAuth();
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
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart, setCustomStart] = useState(startDate || new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(endDate || new Date().toISOString().split('T')[0]);

  const periodLabels: Record<PeriodFilter, string> = {
    today: 'Hari Ini',
    this_week: 'Minggu Ini',
    this_month: 'Bulan Ini (Nov 2026)',
    last_month: 'Bulan Lalu (Okt 2026)',
    this_year: 'Tahun 2026',
    custom: 'Kustom Rentang',
  };

  const handleApplyCustom = () => {
    setDateRange(customStart, customEnd);
    setShowCustomModal(false);
    setIsPeriodDropdownOpen(false);
  };

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">{pageTitle}</h2>
        <span className="text-slate-300 font-normal">/</span>
        <span className="text-xs font-medium text-slate-500 truncate hidden sm:inline">
          {activeBusiness ? activeBusiness.name : 'Pilih Bisnis'}
        </span>
        {activeBusiness?.isArchived && (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded">
            Diarsipkan
          </span>
        )}
      </div>

      {/* Right: Business Selector, Period Filter, Actions */}
      <div className="flex items-center gap-3">
        {/* Business Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsBizDropdownOpen(!isBizDropdownOpen);
              setIsPeriodDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate">
              {activeBusiness ? activeBusiness.name : 'Pilih Bisnis'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isBizDropdownOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Bisnis Terdaftar ({user?.name})
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBusinessId(b.id);
                      setIsBizDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                      activeBusiness?.id === b.id
                        ? 'bg-purple-50 text-purple-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="leading-tight">{b.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{b.category}</p>
                    </div>
                    {b.isArchived && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Arsip</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Period Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsPeriodDropdownOpen(!isPeriodDropdownOpen);
              setIsBizDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-xs font-medium text-slate-700 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">{periodLabels[periodFilter]}</span>
            <span className="md:hidden">Periode</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isPeriodDropdownOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 py-1.5 z-50 text-xs">
              <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pilih Periode
              </div>
              {(['today', 'this_week', 'this_month', 'last_month', 'this_year'] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriodFilter(p);
                    setIsPeriodDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left transition-colors ${
                    periodFilter === p ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowCustomModal(true);
                  }}
                  className={`w-full px-3 py-2 text-left font-medium transition-colors ${
                    periodFilter === 'custom' ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Kustom Rentang Tanggal...
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export Excel Button */}
        <button
          onClick={onOpenExportModal}
          title="Ekspor Laporan Resmi ke Excel (.xlsx)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-all whitespace-nowrap"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export Excel</span>
        </button>

        {/* Transparency note if read-only */}
        {user?.isReadOnly && (
          <div
            title="Anda login sebagai Admin Baliyoutevolution dengan akses transparansi (baca saja)"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-amber-700 bg-amber-50 rounded-lg border border-amber-200/80"
          >
            <Lock className="w-3 h-3 text-amber-600" />
            <span>Read-Only</span>
          </div>
        )}
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Sampai Tanggal:</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg"
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

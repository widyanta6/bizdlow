import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Shield,
  User,
  History,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  ShieldAlert,
  Palette,
  Trash2,
  Sparkles,
  Check,
  RefreshCw,
  RotateCcw,
  Database,
  Archive,
  Layers,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { api } from '../../services/api';
import { AuditLog, DataResetSummary } from '../../types/index';
import { ResetDataModal } from '../common/ResetDataModal';
import { formatRupiah } from '../../utils/formatters';

export const SettingsPage: React.FC = () => {
  const { user, changePassword } = useAuth();
  const { activeBusiness, businesses, refreshSummary } = useBusiness();

  // Navigation tab inside Settings: 'profile' | 'data' | 'audit'
  const [activeTab, setActiveTab] = useState<'profile' | 'data' | 'audit'>('data');

  // Reset Data Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetSummary, setResetSummary] = useState<DataResetSummary | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Demo Cleaner state
  const [demoSummary, setDemoSummary] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Theme Preset State
  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    return localStorage.getItem('bizflow_theme_preset') || 'sky_lavender';
  });

  const loadSettingsData = async () => {
    if (!activeBusiness) return;
    setLogsLoading(true);
    try {
      const [logs, demo, summary] = await Promise.all([
        api.getAuditLogs(activeBusiness.id),
        api.getDemoDataSummary(activeBusiness.id),
        api.getDataResetSummary(activeBusiness.id).catch(() => null),
      ]);
      setAuditLogs(logs);
      setDemoSummary(demo);
      if (summary) setResetSummary(summary);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, [activeBusiness]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const msg = await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: msg });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Gagal mengubah password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCleanDemoData = async () => {
    if (!activeBusiness) return;
    if (
      !confirm(
        `Konfirmasi pembersihan data demo untuk ${activeBusiness.name}?\n\nHanya data contoh (demo: true) yang akan dibersihkan. Seluruh transaksi produksi riil Anda tetap aman.`
      )
    ) {
      return;
    }

    setDemoLoading(true);
    setCleanMsg(null);
    try {
      const res = await api.cleanDemoData(activeBusiness.id, { clearTransactions: true, clearOrders: true });
      setCleanMsg({ type: 'success', text: res.message });
      await loadSettingsData();
      await refreshSummary();
    } catch (err: any) {
      setCleanMsg({ type: 'error', text: err.message || 'Gagal membersihkan data demo' });
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSelectTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    localStorage.setItem('bizflow_theme_preset', themeId);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-sky-600" />
            Pengaturan & Manajemen Data
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola profil bisnis, opsi reset data berlapis, tema visual workspace, dan riwayat audit trail.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="inline-flex bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'data'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-rose-500" />
            Manajemen Data & Reset
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5 text-sky-500" />
            Profil & Tampilan
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-500" />
            Audit Log ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: DATA MANAGEMENT & RESET */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Main Hero Card for Reset Data */}
          <div className="bg-gradient-to-br from-rose-50/70 via-white to-amber-50/50 rounded-3xl border border-rose-200/80 shadow-sm p-6 sm:p-7 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Pusat Kendali Data & Reset
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Reset Data Bisnis: {activeBusiness?.name || 'Bisnis Aktif'}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lakukan pembersihan data secara terarah dengan 5 tingkat cakupan: data demo, transaksi kas, aktivitas operasional, preferensi tema, hingga total reset data bisnis. Semua proses dilindungi backup snapshot otomatis dan jejak audit permanen.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Snapshot Backup Otomatis
                  </span>
                  <span className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Lock className="w-3 h-3 text-blue-600" />
                    Proteksi Tenant Terisolasi
                  </span>
                  <span className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Shield className="w-3 h-3 text-purple-600" />
                    Konfirmasi Ganda Kata Kunci
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setIsResetModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-200 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Buka Opsi Reset Data
                </button>
              </div>
            </div>

            {/* Decorative background circle */}
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-rose-100/40 pointer-events-none blur-2xl" />
          </div>

          {/* Current Business Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block mb-1">Transaksi Kas</span>
              <p className="text-xl font-bold text-slate-900">{resetSummary?.transactionsCount ?? '...'}</p>
              <p className="text-[10px] text-slate-400 mt-1">Mutasi masuk & keluar</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block mb-1">Pesanan & Jadwal</span>
              <p className="text-xl font-bold text-slate-900">
                {(resetSummary?.ordersCount || 0) + (resetSummary?.eventsCount || 0)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Order aktif & kalender</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block mb-1">Berkas & Dokumen</span>
              <p className="text-xl font-bold text-slate-900">{resetSummary?.filesCount ?? '...'}</p>
              <p className="text-[10px] text-slate-400 mt-1">Invoice, nota, & arsip</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block mb-1">Total Saldo Kas</span>
              <p className="text-base font-bold text-emerald-700 truncate">
                {resetSummary ? formatRupiah(resetSummary.totalCashBalance) : '...'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Tersebar di {resetSummary?.accountsCount || 0} akun</p>
            </div>
          </div>

          {/* Quick Demo Data Cleaner Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pembersihan Cepat Data Demo (Sample Only)</h3>
                  <p className="text-xs text-slate-500">
                    Opsi aman untuk membersihkan entri dummy awal tanpa memengaruhi data asli yang Anda buat.
                  </p>
                </div>
              </div>

              {!user?.isReadOnly && (
                <button
                  type="button"
                  onClick={handleCleanDemoData}
                  disabled={demoLoading}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>{demoLoading ? 'Membersihkan...' : 'Bersihkan Data Demo'}</span>
                </button>
              )}
            </div>

            {cleanMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  cleanMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {cleanMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{cleanMsg.text}</span>
              </div>
            )}

            {demoSummary && (
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Transaksi Demo:</span>
                  <p className="font-bold text-slate-800">{demoSummary.transactions}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Order Demo:</span>
                  <p className="font-bold text-slate-800">{demoSummary.orders}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Agenda Demo:</span>
                  <p className="font-bold text-slate-800">{demoSummary.events}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROFIL & TAMPILAN */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    user?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={user?.name}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-sky-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 capitalize mt-1 inline-block border border-sky-100">
                    Role: {user?.role === 'admin' ? 'Admin Baliyoutevolution' : user?.role}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                <span className="font-semibold text-slate-700 block">Bisnis yang Dapat Diakses:</span>
                <ul className="space-y-1.5">
                  {businesses.map((b) => (
                    <li key={b.id} className="flex items-center gap-2 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-medium text-slate-800">{b.name}</span>
                      <span className="text-[10px] text-slate-400">({b.category})</span>
                    </li>
                  ))}
                </ul>
              </div>

              {user?.isReadOnly && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Akses Transparansi Read-Only</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Akun ini berhak memantau seluruh performa keuangan bisnis tanpa wewenang mengubah data, menyetujui mutasi, atau mereset kas.
                  </p>
                </div>
              )}
            </div>

            {/* Theme Customizer Preset */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Tema Visual Workspace</h3>
              </div>
              <p className="text-[11px] text-slate-500">
                Palet utama bernuansa modern, ringan, dan bersih sesuai panduan desain.
              </p>

              <div className="space-y-2 text-xs">
                <button
                  onClick={() => handleSelectTheme('sky_lavender')}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    selectedTheme === 'sky_lavender'
                      ? 'border-indigo-600 bg-sky-50/50 ring-1 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">Sky Blue & Lavender (Default)</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-400" />
                      <span className="w-3.5 h-3.5 rounded-full bg-indigo-500" />
                      <span className="w-3.5 h-3.5 rounded-full bg-purple-400" />
                    </div>
                  </div>
                  {selectedTheme === 'sky_lavender' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  onClick={() => handleSelectTheme('periwinkle')}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    selectedTheme === 'periwinkle'
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">Periwinkle Soft</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-indigo-400" />
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-300" />
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                    </div>
                  </div>
                  {selectedTheme === 'periwinkle' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Ubah Password Akun</h3>
            </div>
            <p className="text-xs text-slate-500">
              Password hanya diketahui pemilik akun dan diverifikasi secara aman oleh sistem backend terenkripsi.
            </p>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-md">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Password Saat Ini *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Password Baru (min. 6 karakter) *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Konfirmasi Password Baru *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {passwordLoading ? 'Memverifikasi...' : 'Simpan Password Baru'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOG & KEAMANAN */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Audit Log & Rekam Jejak Sistem</h3>
                <p className="text-xs text-slate-500">
                  Mencatat login, mutasi kas, koreksi saldo, pembuatan order, reset data, dan akses ditolak.
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
              {auditLogs.length} entri tercatat
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[650px] pr-1">
            {logsLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Memuat rekam jejak audit...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Belum ada aktivitas audit tercatat.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-colors ${
                    log.status === 'denied'
                      ? 'border-rose-200 bg-rose-50/40'
                      : log.status === 'warning'
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase ${
                          log.status === 'denied'
                            ? 'bg-rose-100 text-rose-800'
                            : log.status === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-800">{log.userName}</span>
                      {log.businessName && (
                        <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {log.businessName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {log.timestamp.replace('T', ' ').slice(0, 19)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reset Data Modal Component */}
      {activeBusiness && (
        <ResetDataModal
          business={activeBusiness}
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          onSuccess={() => {
            loadSettingsData();
            refreshSummary();
          }}
        />
      )}
    </div>
  );
};

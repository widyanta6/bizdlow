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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { api } from '../../services/api';
import { AuditLog } from '../../types/index';

export const SettingsPage: React.FC = () => {
  const { user, changePassword } = useAuth();
  const { activeBusiness, businesses, refreshSummary } = useBusiness();

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
      const [logs, demo] = await Promise.all([
        api.getAuditLogs(activeBusiness.id),
        api.getDemoDataSummary(activeBusiness.id),
      ]);
      setAuditLogs(logs);
      setDemoSummary(demo);
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
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pengaturan & Keamanan Akun</h1>
        <p className="text-xs text-slate-500 mt-1">
          Kelola profil pengguna, proteksi autentikasi, tema workspace, pembersihan data demo, dan telusuri riwayat audit log.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Profile & Security Info */}
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={user?.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-sky-200"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-900">{user?.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-indigo-700 capitalize mt-1 inline-block border border-sky-100">
                  Role: {user?.role === 'admin' ? 'Admin Baliyoutevolution' : user?.role}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
              <span className="font-semibold text-slate-700 block">Bisnis yang Dapat Diakses:</span>
              <ul className="space-y-1">
                {businesses.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{b.name}</span>
                    <span className="text-[10px] text-slate-400">({b.category})</span>
                  </li>
                ))}
              </ul>
            </div>

            {user?.isReadOnly && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
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

          {/* Theme Customizer Preset (PRD Section 2) */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Tema Visual Workspace</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Palet utama bernuansa modern, ringan, dan bersih sesuai PRD.
            </p>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => handleSelectTheme('sky_lavender')}
                className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between ${
                  selectedTheme === 'sky_lavender'
                    ? 'border-indigo-600 bg-sky-50/50 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="font-semibold text-slate-900 block">Sky Blue & Lavender (Default PRD)</span>
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
                className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between ${
                  selectedTheme === 'periwinkle'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
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

          {/* Demo Data Cleaner Tool (Additional Requirements) */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Pembersihan Data Demo</h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Bersihkan seluruh data dummy / sample awal dari sistem sebelum aplikasi dipublikasikan ke produksi.
            </p>

            {cleanMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
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
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 font-mono text-[11px]">
                <div className="text-slate-500 font-sans font-semibold mb-1">Status Data Demo Bisnis Ini:</div>
                <div className="flex justify-between">
                  <span>Transaksi Demo:</span>
                  <span className="font-bold text-slate-900">{demoSummary.transactions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Demo:</span>
                  <span className="font-bold text-slate-900">{demoSummary.orders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agenda / Tagihan Demo:</span>
                  <span className="font-bold text-slate-900">{demoSummary.events}</span>
                </div>
              </div>
            )}

            {!user?.isReadOnly && (
              <button
                type="button"
                onClick={handleCleanDemoData}
                disabled={demoLoading}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                <span>{demoLoading ? 'Membersihkan...' : 'Bersihkan Data Demo Sekarang'}</span>
              </button>
            )}
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Ubah Password Akun</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Password hanya diketahui pemilik akun dan diverifikasi secara aman oleh sistem backend.
            </p>

            {passwordMsg && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
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

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Password Saat Ini *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Password Baru (min. 6 karakter) *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Konfirmasi Password Baru *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {passwordLoading ? 'Memverifikasi...' : 'Simpan Password Baru'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Audit Logs Viewer (PRD Section 13) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Audit Log & Rekam Jejak Sistem</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{auditLogs.length} entri tercatat</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Mencatat login, mutasi kas, koreksi saldo, pembuatan order, pengunggahan dokumen, dan upaya akses ditolak.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[650px] pr-1">
            {logsLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Memuat rekam jejak audit...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Belum ada aktivitas audit tercatat.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 transition-colors ${
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
                        className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase ${
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
      </div>
    </div>
  );
};

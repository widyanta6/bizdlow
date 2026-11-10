import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, ShieldAlert, CheckCircle2, RotateCcw,
  Database, FileSpreadsheet, Calendar, FolderArchive, Wallet,
  Info, Lock, Loader2, X
} from 'lucide-react';
import { Business, DataResetType, DataResetSummary, DataResetResult } from '../../types/index';
import { api } from '../../services/api';
import { formatRupiah } from '../../utils/formatters';

interface ResetDataModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: DataResetResult) => void;
}

export const ResetDataModal: React.FC<ResetDataModalProps> = ({
  business,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<DataResetSummary | null>(null);
  const [selectedType, setSelectedType] = useState<DataResetType>('demo');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DataResetResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSummary();
      setConfirmationInput('');
      setErrorMessage(null);
      setResult(null);
    }
  }, [isOpen, business.id]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await api.getDataResetSummary(business.id);
      setSummary(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat ringkasan data');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const requiresConfirmationWord = ['transactions', 'operational', 'all_business_data'].includes(selectedType);
  const isConfirmDisabled =
    submitting ||
    loading ||
    (summary?.isReadOnly ?? false) ||
    (requiresConfirmationWord && confirmationInput.trim() !== 'RESET');

  const handleExecute = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);
      const res = await api.executeDataReset(business.id, selectedType, confirmationInput);
      setResult(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengeksekusi reset data');
    } finally {
      setSubmitting(false);
    }
  };

  const resetOptions: Array<{
    type: DataResetType;
    title: string;
    badge: string;
    badgeColor: string;
    description: string;
    impact: string;
    dangerLevel: 'low' | 'medium' | 'high';
  }> = [
    {
      type: 'demo',
      title: 'Reset Data Demo / Sample',
      badge: 'Aman',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Menghapus data simulasi / dummy yang dibuat sistem saat onboarding awal.',
      impact: `Hanya memengaruhi ~${summary?.demoTransactionsCount || 0} transaksi dummy dan ${summary?.demoOrdersCount || 0} order dummy. Data transaksi riil Anda tetap utuh.`,
      dangerLevel: 'low',
    },
    {
      type: 'transactions',
      title: 'Reset Transaksi Keuangan',
      badge: 'Perhatian',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Menghapus seluruh mutasi kas masuk, kas keluar, dan penyesuaian transaksi pada bisnis ini.',
      impact: `Menghapus ${summary?.transactionsCount || 0} transaksi. Saldo akun kas disinkronkan kembali dengan jejak audit. Katalog produk, order, dan file tetap aman.`,
      dangerLevel: 'medium',
    },
    {
      type: 'operational',
      title: 'Reset Seluruh Data Operasional',
      badge: 'Kritis',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      description: 'Membersihkan aktivitas harian: transaksi keuangan, pesanan customer, agenda kalender, dan file.',
      impact: `Menghapus ${summary?.transactionsCount || 0} transaksi, ${summary?.ordersCount || 0} pesanan, ${summary?.eventsCount || 0} agenda kalender, dan ${summary?.filesCount || 0} file. Profil bisnis dan master akun kas tetap ada.`,
      dangerLevel: 'high',
    },
    {
      type: 'settings',
      title: 'Reset Pengaturan & Preferensi Tampilan',
      badge: 'Aman',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Mengembalikan konfigurasi tema warna, layout sidebar, dan preferensi dashboard ke setelan pabrik.',
      impact: 'Tidak ada data keuangan, order, atau file yang dihapus.',
      dangerLevel: 'low',
    },
    {
      type: 'all_business_data',
      title: 'Reset Seluruh Data Bisnis (Fresh Start)',
      badge: 'Destruktif',
      badgeColor: 'bg-red-100 text-red-800 border-red-300 font-bold',
      description: 'Mengosongkan seluruh data operasional bisnis ini dan mengembalikan saldo semua rekening ke Rp 0.',
      impact: `Membersihkan total: ${summary?.transactionsCount || 0} transaksi, ${summary?.ordersCount || 0} pesanan, ${summary?.eventsCount || 0} agenda kalender, ${summary?.filesCount || 0} file. Akun bisnis tetap ada dalam keadaan kosong siap pakai.`,
      dangerLevel: 'high',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-50/60 via-amber-50/30 to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
              <RotateCcw className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-800">Pusat Reset Data Bisnis</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                  {business.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih cakupan reset data dengan perlindungan backup otomatis snapshot.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Read Only Warning for Viewer Role */}
          {summary?.isReadOnly && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Akses Terbatas: Mode Auditor / Viewer</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Akun Anda tidak memiliki hak akses destruktif untuk menghapus atau mereset data brand <strong>{business.name}</strong>. Fitur ini hanya dapat dieksekusi oleh Owner pemilik bisnis.
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {result ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-4 animate-scaleUp">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-emerald-800">Reset Data Berhasil Dijalankan</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">{result.message}</p>
                </div>
              </div>

              {result.backupSnapshotId && (
                <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-xs text-slate-700 flex items-center justify-between">
                  <span className="font-medium text-slate-600">ID Snapshot Backup Otomatis:</span>
                  <code className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold">
                    {result.backupSnapshotId}
                  </code>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                {result.affected.transactions !== undefined && (
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-slate-500 font-medium">Transaksi Direset</p>
                    <p className="text-base font-bold text-slate-800">{result.affected.transactions}</p>
                  </div>
                )}
                {result.affected.orders !== undefined && (
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-slate-500 font-medium">Pesanan Direset</p>
                    <p className="text-base font-bold text-slate-800">{result.affected.orders}</p>
                  </div>
                )}
                {result.affected.events !== undefined && (
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-slate-500 font-medium">Agenda Direset</p>
                    <p className="text-base font-bold text-slate-800">{result.affected.events}</p>
                  </div>
                )}
                {result.affected.files !== undefined && (
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-slate-500 font-medium">File Direset</p>
                    <p className="text-base font-bold text-slate-800">{result.affected.files}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
                >
                  Selesai & Muat Ulang Tampilan
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Live Data Summary of Active Business */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    Data Aktif Bisnis Saat Ini
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {summary?.snapshotsCount || 0} snapshot backup tersimpan
                  </span>
                </div>

                {loading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    Memuat ringkasan data bisnis...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-center text-blue-600 mb-1">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <p className="text-base font-bold text-slate-800">{summary?.transactionsCount || 0}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Transaksi Kas</p>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-center text-indigo-600 mb-1">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {(summary?.ordersCount || 0) + (summary?.eventsCount || 0)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">Order & Kalender</p>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-center text-amber-600 mb-1">
                        <FolderArchive className="w-4 h-4" />
                      </div>
                      <p className="text-base font-bold text-slate-800">{summary?.filesCount || 0}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Berkas/File</p>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-center text-emerald-600 mb-1">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-emerald-700 truncate">
                        {formatRupiah(summary?.totalCashBalance || 0)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">Saldo Kas Total</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 5 Reset Options */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pilih Cakupan Reset Data
                </label>

                {resetOptions.map((opt) => {
                  const isSelected = selectedType === opt.type;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => !summary?.isReadOnly && setSelectedType(opt.type)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-200 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      } ${summary?.isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="resetType"
                            checked={isSelected}
                            onChange={() => !summary?.isReadOnly && setSelectedType(opt.type)}
                            disabled={summary?.isReadOnly}
                            className="mt-1 text-rose-600 focus:ring-rose-500 w-4 h-4"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-800">{opt.title}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] border font-semibold ${opt.badgeColor}`}
                              >
                                {opt.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-snug">{opt.description}</p>
                            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
                              <Info className="w-3 h-3 shrink-0 text-slate-400" />
                              {opt.impact}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Safety notice & Snapshot info */}
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-blue-900">Perlindungan Snapshot Otomatis</p>
                  <p className="text-blue-700 leading-relaxed">
                    Sistem akan secara otomatis membuat backup snapshot arsip seluruh data bisnis ini sebelum proses eksekusi dijalankan. Catatan audit transaksi juga dicatat secara permanen.
                  </p>
                </div>
              </div>

              {/* Confirmation Word Prompt for destructive types */}
              {requiresConfirmationWord && !summary?.isReadOnly && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Konfirmasi Keamanan Ganda
                  </div>
                  <p className="text-xs text-rose-700 leading-snug">
                    Tindakan ini permanen. Ketik kata <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-rose-300">RESET</span> (huruf besar semua) di bawah untuk membuka kunci:
                  </p>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder="Ketik RESET untuk konfirmasi"
                    className="w-full px-3.5 py-2 rounded-xl border border-rose-300 text-sm font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 tracking-wider"
                  />
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {errorMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!result && (
          <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleExecute}
              disabled={isConfirmDisabled}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md ${
                isConfirmDisabled
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                  : selectedType === 'demo' || selectedType === 'settings'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses Reset...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Eksekusi Reset Data
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Edit3,
  Info,
  DollarSign,
  History,
  RotateCcw,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Order,
  Transaction,
  FileItem,
  Account,
  BalanceCorrection,
  BalanceAdjustmentType,
} from '../../types/index';
import { NavItemKey } from '../layout/Sidebar';

interface HomePageProps {
  onNavigate: (tab: NavItemKey) => void;
  onOpenNewTransactionModal?: (type?: 'income' | 'expense') => void;
  onOpenNewOrderModal?: () => void;
  onOpenFileUploadModal?: () => void;
}

type MetricDetailType =
  | 'penjualan'
  | 'hpp'
  | 'laba_kotor'
  | 'beban_operasional'
  | 'laba_bersih'
  | 'saldo_kas'
  | 'dana_dialokasikan';

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenNewTransactionModal,
  onOpenNewOrderModal,
  onOpenFileUploadModal,
}) => {
  const { user } = useAuth();
  const {
    activeBusiness,
    financialSummary,
    summaryLoading,
    periodFilter,
    refreshBusinesses,
    refreshSummary,
  } = useBusiness();

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [corrections, setCorrections] = useState<BalanceCorrection[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showManageAccountsModal, setShowManageAccountsModal] = useState(false);
  const [showResetBalanceModal, setShowResetBalanceModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<MetricDetailType | null>(null);

  // Target Account for Reset
  const [selectedAccountForReset, setSelectedAccountForReset] = useState<Account | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<BalanceAdjustmentType>('reset_zero');
  const [newTargetBalance, setNewTargetBalance] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [adjustmentDate, setAdjustmentDate] = useState<string>('2026-11-10');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Business Profile Form
  const [profileForm, setProfileForm] = useState({
    name: '',
    category: '',
    tagline: '',
    description: '',
    currency: 'IDR',
    taxRate: 11,
  });

  // New Account Form
  const [showAddAccountInline, setShowAddAccountInline] = useState(false);
  const [newAccForm, setNewAccForm] = useState({
    bankName: '',
    accountNumber: '',
    holderName: '',
    type: 'bank' as 'bank' | 'cash' | 'ewallet',
    initialBalance: 0,
  });

  const loadDashboardData = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const [orders, txs, files, accList, corrs] = await Promise.all([
        api.getOrders(activeBusiness.id),
        api.getTransactions(activeBusiness.id),
        api.getFiles(activeBusiness.id),
        api.getAccounts(activeBusiness.id),
        api.getBalanceCorrections(activeBusiness.id),
      ]);
      setRecentOrders(orders.slice(0, 5));
      setRecentTransactions(txs.slice(0, 5));
      setRecentFiles(files.slice(0, 4));
      setAccounts(accList);
      setCorrections(corrs);

      setProfileForm({
        name: activeBusiness.name,
        category: activeBusiness.category,
        tagline: activeBusiness.tagline || '',
        description: activeBusiness.description || '',
        currency: activeBusiness.currency || 'IDR',
        taxRate: activeBusiness.taxRate ?? 11,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeBusiness]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  // Handle Edit Business Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      await api.updateBusiness(activeBusiness.id, profileForm);
      await refreshBusinesses();
      setShowEditProfileModal(false);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui profil bisnis');
    }
  };

  // Open Reset Saldo modal for a specific account
  const handleOpenResetBalance = (acc: Account) => {
    setSelectedAccountForReset(acc);
    setAdjustmentType('reset_zero');
    setNewTargetBalance(0);
    setAdjustmentReason('');
    setAdjustmentDate('2026-11-10');
    setShowResetBalanceModal(true);
  };

  // Submit 3-option balance reset
  const handleExecuteResetBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !selectedAccountForReset) return;

    if (!adjustmentReason.trim()) {
      alert('Alasan penyesuaian saldo wajib diisi sebagai dokumentasi audit trail.');
      return;
    }

    const calculatedNewBal =
      adjustmentType === 'reset_zero' ? 0 : Number(newTargetBalance);

    const typeLabels = {
      reset_zero: 'Reset saldo ke Rp 0',
      set_amount: `Atur saldo ke nominal ${formatRupiah(calculatedNewBal)}`,
      correct_actual: `Koreksi saldo fisik menjadi ${formatRupiah(calculatedNewBal)}`,
    };

    if (
      !confirm(
        `Konfirmasi: ${typeLabels[adjustmentType]} pada rekening ${selectedAccountForReset.bankName} (${selectedAccountForReset.accountNumber})?\n\nAlasan: ${adjustmentReason}\n\nCatatan: Histori transaksi lampau TIDAK akan dihapus demi kepatuhan audit.`
      )
    ) {
      return;
    }

    setIsSubmittingReset(true);
    try {
      await api.resetAccountBalance(
        activeBusiness.id,
        selectedAccountForReset.id,
        adjustmentType,
        calculatedNewBal,
        adjustmentReason,
        adjustmentDate
      );
      await loadDashboardData();
      await refreshSummary();
      setShowResetBalanceModal(false);
      setSelectedAccountForReset(null);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui saldo rekening');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Add new account handler
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      await api.createAccount(activeBusiness.id, newAccForm);
      await loadDashboardData();
      await refreshSummary();
      setShowAddAccountInline(false);
      setNewAccForm({
        bankName: '',
        accountNumber: '',
        holderName: '',
        type: 'bank',
        initialBalance: 0,
      });
    } catch (err: any) {
      alert(err.message || 'Gagal membuat rekening kas');
    }
  };

  if (!activeBusiness) {
    return (
      <div className="p-8 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700">Belum Ada Bisnis Terpilih</h3>
        <p className="text-xs text-slate-500 mt-1">
          Silakan pilih atau tambahkan bisnis baru untuk mengelola workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Workspace Banner with Editable Profile Trigger */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-md shadow-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              {activeBusiness.category}
            </span>
            <span className="text-xs text-sky-100">Mata Uang: {activeBusiness.currency}</span>

            {!user?.isReadOnly && (
              <button
                onClick={() => setShowEditProfileModal(true)}
                className="flex items-center gap-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded-full backdrop-blur-xs transition-colors ml-2"
                title="Edit Profil Bisnis"
              >
                <Edit3 className="w-3 h-3" />
                <span>Ubah Profil Bisnis</span>
              </button>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{activeBusiness.name}</h1>
          <p className="text-xs text-sky-100 max-w-xl leading-relaxed">
            {activeBusiness.tagline || activeBusiness.description || 'Workspace manajemen multi-brand BizFlow.'}
          </p>
        </div>

        {/* Quick Summary Pill on Banner */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 shrink-0">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-sky-200 uppercase tracking-wider block font-medium">
                Saldo Kas Berjalan
              </span>
              <button
                onClick={() => setSelectedMetricDetail('saldo_kas')}
                className="text-[10px] text-sky-200 hover:text-white underline underline-offset-2"
              >
                Detail
              </button>
            </div>
            <span className="text-lg font-bold font-mono tracking-tight tabular-nums">
              {summaryLoading ? '...' : formatRupiah(financialSummary?.saldoKasAktual || 0)}
            </span>
          </div>

          <div className="h-8 w-px bg-white/20" />

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-sky-200 uppercase tracking-wider block font-medium">
                Laba Bersih ({periodFilter})
              </span>
              <button
                onClick={() => setSelectedMetricDetail('laba_bersih')}
                className="text-[10px] text-sky-200 hover:text-white underline underline-offset-2"
              >
                Detail
              </button>
            </div>
            <span
              className={`text-lg font-bold font-mono tracking-tight tabular-nums ${
                (financialSummary?.labaBersih || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {summaryLoading ? '...' : formatRupiah(financialSummary?.labaBersih || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards with "Lihat Detail" Buttons (PRD Section 4 & Additional Requirements) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Penjualan */}
        <div className="bg-white rounded-xl p-4 border border-sky-100/90 shadow-2xs hover:border-sky-200 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">Total Penjualan</span>
              <TrendingUp className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
              {summaryLoading ? '...' : formatRupiah(financialSummary?.totalPenjualan || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Omzet produk & jasa tercatat</p>
          </div>
          <button
            onClick={() => setSelectedMetricDetail('penjualan')}
            className="mt-3 flex items-center justify-between text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 pt-2 border-t border-slate-100"
          >
            <span>Lihat Detail Formula</span>
            <Info className="w-3 h-3" />
          </button>
        </div>

        {/* Total HPP */}
        <div className="bg-white rounded-xl p-4 border border-sky-100/90 shadow-2xs hover:border-amber-200 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">Total HPP (COGS)</span>
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
              {summaryLoading ? '...' : formatRupiah(financialSummary?.totalHPP || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Biaya bahan baku & modal langsung</p>
          </div>
          <button
            onClick={() => setSelectedMetricDetail('hpp')}
            className="mt-3 flex items-center justify-between text-[11px] font-semibold text-amber-700 hover:text-amber-900 pt-2 border-t border-slate-100"
          >
            <span>Lihat Detail Formula</span>
            <Info className="w-3 h-3" />
          </button>
        </div>

        {/* Laba Kotor */}
        <div className="bg-white rounded-xl p-4 border border-sky-100/90 shadow-2xs hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">Laba Kotor (Gross)</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-600 font-mono tracking-tight tabular-nums">
              {summaryLoading ? '...' : formatRupiah(financialSummary?.labaKotor || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Penjualan − Total HPP</p>
          </div>
          <button
            onClick={() => setSelectedMetricDetail('laba_kotor')}
            className="mt-3 flex items-center justify-between text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 pt-2 border-t border-slate-100"
          >
            <span>Lihat Detail Formula</span>
            <Info className="w-3 h-3" />
          </button>
        </div>

        {/* Pengeluaran Operasional */}
        <div className="bg-white rounded-xl p-4 border border-sky-100/90 shadow-2xs hover:border-rose-200 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">Beban Operasional</span>
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
              {summaryLoading ? '...' : formatRupiah(financialSummary?.bebanOperasional || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Sewa, listrik, gaji, iklan</p>
          </div>
          <button
            onClick={() => setSelectedMetricDetail('beban_operasional')}
            className="mt-3 flex items-center justify-between text-[11px] font-semibold text-rose-700 hover:text-rose-900 pt-2 border-t border-slate-100"
          >
            <span>Lihat Detail Formula</span>
            <Info className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Additional 2 Metric Cards: Saldo Kas Aktual & Dana Dialokasikan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-50/70 to-sky-50/70 rounded-xl p-4 border border-indigo-100/80 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-900">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Saldo Kas Riil / Aktual</span>
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-950 tabular-nums">
              {summaryLoading ? '...' : formatRupiah(financialSummary?.saldoKasAktual || 0)}
            </div>
            <p className="text-[11px] text-indigo-700">Akumulasi seluruh rekening kas bank & e-wallet aktif</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowManageAccountsModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Kelola Rekening Kas
            </button>
            <button
              onClick={() => setSelectedMetricDetail('saldo_kas')}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 text-right underline underline-offset-2"
            >
              Lihat Detail Sumber
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50/70 to-slate-50/70 rounded-xl p-4 border border-purple-100/80 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-purple-900">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Dana Dialokasikan / Komitmen</span>
            </div>
            <div className="text-2xl font-bold font-mono text-purple-950 tabular-nums">
              {summaryLoading ? '...' : formatRupiah(financialSummary?.danaDialokasikan || 0)}
            </div>
            <p className="text-[11px] text-purple-700">Tagihan & komitmen terjadwal belum dibayarkan</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onNavigate('orders')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Jadwal & Deadline
            </button>
            <button
              onClick={() => setSelectedMetricDetail('dana_dialokasikan')}
              className="text-[11px] text-purple-600 hover:text-purple-800 text-right underline underline-offset-2"
            >
              Lihat Detail Komitmen
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions Workspace</h3>
        <div className="flex flex-wrap items-center gap-2">
          {!user?.isReadOnly && (
            <>
              <button
                onClick={onOpenNewOrderModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Order</span>
              </button>

              <button
                onClick={() => onOpenNewTransactionModal?.('income')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Add Income</span>
              </button>

              <button
                onClick={() => onOpenNewTransactionModal?.('expense')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>

              <button
                onClick={onOpenFileUploadModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Upload File</span>
              </button>
            </>
          )}

          <button
            onClick={() => setShowManageAccountsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Kelola Rekening Kas</span>
          </button>

          <button
            onClick={() => onNavigate('orders')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalender & Pengingat Tagihan</span>
          </button>

          <button
            onClick={() => onNavigate('ai')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-sky-50 to-purple-50 hover:from-sky-100 hover:to-purple-100 text-indigo-900 text-xs font-semibold border border-indigo-200 transition-colors ml-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tanya AI BizFlow</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split: Upcoming Orders & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Orders */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Pesanan Mendatang & Deadline</h3>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Lihat Semua
            </button>
          </div>

          <div className="p-4 flex-1">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada pesanan aktif untuk bisnis ini.
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800">{order.orderNumber}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-medium text-slate-700 truncate">{order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Deadline: {order.deadline}</span>
                        <span>·</span>
                        <span>Sisa: {formatRupiah(order.remainingBalance)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900 block tabular-nums">
                        {formatRupiah(order.totalAmount)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          order.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.paymentStatus === 'partial'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {order.paymentStatus === 'paid'
                          ? 'Lunas'
                          : order.paymentStatus === 'partial'
                          ? 'DP Terbayar'
                          : 'Belum Bayar'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions & Activities */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Aktivitas & Transaksi Kas Terbaru</h3>
            </div>
            <button
              onClick={() => onNavigate('finance')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Lihat Finansial
            </button>
          </div>

          <div className="p-4 flex-1">
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada transaksi mutasi kas tercatat.
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-semibold text-slate-800 truncate">
                          {tx.description || tx.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        <span>{tx.date}</span>
                        <span className="mx-1.5">·</span>
                        <span className="text-slate-500">{tx.category}</span>
                        {tx.isCOGS && <span className="text-amber-600 ml-1 font-medium">(HPP)</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-bold tabular-nums text-xs ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">{tx.createdBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Files Showcase */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Dokumen & Lampiran Terkait ({activeBusiness.name})</h3>
          </div>
          <button
            onClick={() => onNavigate('files')}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Buka Cloud Drive My Files
          </button>
        </div>

        {recentFiles.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Belum ada file tersimpan untuk bisnis ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => onNavigate('files')}
                className="p-3.5 rounded-xl border border-sky-100 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/50"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs mb-2">
                  {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                  {(file.sizeBytes / 1024).toFixed(1)} KB · {file.uploadDate.split('T')[0]}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL: EDIT BUSINESS PROFILE ================= */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Ubah Profil Bisnis</h3>
              </div>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Brand / Bisnis *</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kategori Usaha *</label>
                <input
                  type="text"
                  required
                  value={profileForm.category}
                  onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tagline Singkat</label>
                <input
                  type="text"
                  value={profileForm.tagline}
                  onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                  placeholder="Misal: Busana muslimah elegan dan modern"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Deskripsi Bisnis</label>
                <textarea
                  rows={2}
                  value={profileForm.description}
                  onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mata Uang</label>
                  <select
                    value={profileForm.currency}
                    onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="IDR">IDR (Rupiah)</option>
                    <option value="USD">USD ($)</option>
                    <option value="SGD">SGD (S$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tarif Pajak PPN (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={profileForm.taxRate}
                    onChange={(e) => setProfileForm({ ...profileForm, taxRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KELOLA REKENING KAS ================= */}
      {showManageAccountsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kelola Rekening Kas ({activeBusiness.name})</h3>
                  <p className="text-[11px] text-slate-500">
                    Atur rekening bank, kas kecil operasional, dan lakukan reset atau koreksi saldo terverifikasi.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManageAccountsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Account list */}
              <div className="space-y-2.5">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{acc.bankName}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono text-slate-600">{acc.accountNumber}</span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          {acc.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Atas Nama: {acc.holderName}</p>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Saldo Saat Ini</span>
                        <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                          {formatRupiah(acc.currentBalance)}
                        </span>
                      </div>

                      {!user?.isReadOnly && (
                        <button
                          onClick={() => handleOpenResetBalance(acc)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs flex items-center gap-1 transition-colors"
                          title="Reset atau Koreksi Saldo"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Saldo</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Account Inline Form */}
              {!user?.isReadOnly && (
                <div>
                  {!showAddAccountInline ? (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setShowAddAccountInline(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>+ Tambah Rekening Kas Baru</span>
                      </button>

                      <button
                        onClick={() => setShowHistoryModal(true)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Lihat Riwayat Penyesuaian Saldo</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleAddAccount} className="p-4 border border-indigo-100 bg-indigo-50/40 rounded-xl space-y-3 mt-2">
                      <div className="font-semibold text-slate-800 text-xs">Form Rekening Baru</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">Nama Bank / Kas *</label>
                          <input
                            type="text"
                            required
                            placeholder="Misal: BCA, Kas Tunai Toko"
                            value={newAccForm.bankName}
                            onChange={(e) => setNewAccForm({ ...newAccForm, bankName: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">Nomor Rekening *</label>
                          <input
                            type="text"
                            required
                            placeholder="Misal: 1234567890"
                            value={newAccForm.accountNumber}
                            onChange={(e) => setNewAccForm({ ...newAccForm, accountNumber: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">Pemilik Rekening *</label>
                          <input
                            type="text"
                            required
                            placeholder="Nama pemilik"
                            value={newAccForm.holderName}
                            onChange={(e) => setNewAccForm({ ...newAccForm, holderName: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">Tipe Rekening</label>
                          <select
                            value={newAccForm.type}
                            onChange={(e) => setNewAccForm({ ...newAccForm, type: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                          >
                            <option value="bank">Bank</option>
                            <option value="cash">Kas Tunai</option>
                            <option value="ewallet">E-Wallet</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">Saldo Awal (IDR)</label>
                          <input
                            type="number"
                            min={0}
                            value={newAccForm.initialBalance}
                            onChange={(e) => setNewAccForm({ ...newAccForm, initialBalance: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddAccountInline(false)}
                          className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-md"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                        >
                          Simpan Rekening
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: 3-WAY RESET SALDO REKENING ================= */}
      {showResetBalanceModal && selectedAccountForReset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reset & Penyesuaian Saldo: {selectedAccountForReset.bankName}
                  </h3>
                  <p className="text-[11px] text-slate-500">Rekening: {selectedAccountForReset.accountNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetBalanceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetBalance} className="space-y-4 text-xs">
              {/* Account current info */}
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <span className="text-slate-600 font-medium">Saldo Sistem Saat Ini:</span>
                <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                  {formatRupiah(selectedAccountForReset.currentBalance)}
                </span>
              </div>

              {/* 3 Explicit Radio Options (PRD Additional Requirement) */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-semibold mb-1">
                  Pilih Metode Penyesuaian Saldo:
                </label>

                {/* Option 1: Reset to Rp 0 */}
                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    adjustmentType === 'reset_zero'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    checked={adjustmentType === 'reset_zero'}
                    onChange={() => setAdjustmentType('reset_zero')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">1. Reset Saldo Menjadi Rp 0</span>
                    <span className="text-[11px] text-slate-500">
                      Mengosongkan saldo kas saat tutup buku atau pembukaan periode baru.
                    </span>
                  </div>
                </label>

                {/* Option 2: Set to Custom Amount */}
                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    adjustmentType === 'set_amount'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    checked={adjustmentType === 'set_amount'}
                    onChange={() => setAdjustmentType('set_amount')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">2. Tentukan Saldo ke Jumlah Tertentu</span>
                    <span className="text-[11px] text-slate-500">
                      Menetapkan saldo patokan baru secara manual sesuai angka target.
                    </span>
                  </div>
                </label>

                {/* Option 3: Correct Based on Physical Count */}
                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    adjustmentType === 'correct_actual'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    checked={adjustmentType === 'correct_actual'}
                    onChange={() => setAdjustmentType('correct_actual')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">3. Koreksi Berdasarkan Saldo Fisik / Aktual</span>
                    <span className="text-[11px] text-slate-500">
                      Menyesuaikan selisih kas fisik di brankas atau rekening koran bank riil.
                    </span>
                  </div>
                </label>
              </div>

              {/* Amount input if not reset_zero */}
              {adjustmentType !== 'reset_zero' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nominal Saldo Baru (IDR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newTargetBalance}
                    onChange={(e) => setNewTargetBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono font-bold text-sm"
                  />
                </div>
              )}

              {/* Reason (Mandatory) */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Alasan Penyesuaian Saldo (Wajib untuk Audit Trail) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Penyesuaian selisih rekonsiliasi kas opname November 2026"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tanggal Efektif *</label>
                <input
                  type="date"
                  required
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Audit Warning notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Kepatuhan Audit & Keamanan Transaksi</span>
                </div>
                <p>
                  Penyesuaian saldo ini <strong>TIDAK AKAN MENGHAPUS</strong> riwayat transaksi lampau. Semua mutasi
                  dan nota transaksi tetap tersimpan utuh demi akuntabilitas akuntansi.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetBalanceModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingReset ? 'Memproses...' : 'Terapkan Penyesuaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RIWAYAT PENYESUAIAN SALDO ================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Riwayat Penyesuaian Saldo Kas ({activeBusiness.name})
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {corrections.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Belum ada penyesuaian atau reset saldo yang tercatat pada bisnis ini.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {corrections.map((corr) => {
                  const acc = accounts.find((a) => a.id === corr.accountId);
                  return (
                    <div key={corr.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {acc ? `${acc.bankName} (${acc.accountNumber})` : corr.accountId}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">{corr.effectiveDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Saldo Sebelumnya: {formatRupiah(corr.previousBalance)}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-indigo-700">Saldo Baru: {formatRupiah(corr.newBalance)}</span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            corr.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          ({corr.difference >= 0 ? '+' : ''}
                          {formatRupiah(corr.difference)})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 italic">"Alasan: {corr.reason}"</p>
                      <div className="text-[10px] text-slate-400">
                        Dicatat oleh: {corr.createdBy} · {corr.createdAt.slice(0, 10)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: LIHAT DETAIL PERHITUNGAN FINANSIAL ================= */}
      {selectedMetricDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Detail Perhitungan Finansial</h3>
              </div>
              <button
                onClick={() => setSelectedMetricDetail(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {selectedMetricDetail === 'penjualan' && (
                <div>
                  <div className="text-sm font-bold text-slate-800 mb-1">Total Penjualan</div>
                  <div className="text-2xl font-bold font-mono text-sky-600 mb-2">
                    {formatRupiah(financialSummary?.totalPenjualan || 0)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Formula & Logika Perhitungan:</span>
                    <p className="text-slate-600 leading-relaxed">
                      <code>Total Penjualan = Total Nilai Pesanan (Orders) + Pendapatan Kas Langsung</code>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Mencakup seluruh omzet penjualan produk butik/pesanan klien pada periode aktif ({periodFilter}).
                      Semua transaksi dihitung otomatis oleh sistem tanpa manipulasi manual.
                    </p>
                  </div>
                </div>
              )}

              {selectedMetricDetail === 'hpp' && (
                <div>
                  <div className="text-sm font-bold text-slate-800 mb-1">Total HPP (Harga Pokok Penjualan)</div>
                  <div className="text-2xl font-bold font-mono text-amber-600 mb-2">
                    {formatRupiah(financialSummary?.totalHPP || 0)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Formula & Logika Perhitungan:</span>
                    <p className="text-slate-600 leading-relaxed">
                      <code>Total HPP = ∑ (Biaya Bahan Baku + Jahit/Produksi Langsung + Pengeluaran bertanda isCOGS)</code>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hanya pengeluaran yang secara langsung berkaitan dengan produksi unit barang yang dihitung sebagai modal HPP.
                    </p>
                  </div>
                </div>
              )}

              {selectedMetricDetail === 'laba_kotor' && (
                <div>
                  <div className="text-sm font-bold text-slate-800 mb-1">Laba Kotor (Gross Profit)</div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 mb-2">
                    {formatRupiah(financialSummary?.labaKotor || 0)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Formula & Logika Perhitungan:</span>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span>Total Penjualan:</span>
                        <span>{formatRupiah(financialSummary?.totalPenjualan || 0)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>Dikurangi Total HPP:</span>
                        <span>- {formatRupiah(financialSummary?.totalHPP || 0)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-1 font-bold text-emerald-700 flex justify-between">
                        <span>Laba Kotor:</span>
                        <span>{formatRupiah(financialSummary?.labaKotor || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedMetricDetail === 'beban_operasional' && (
                <div>
                  <div className="text-sm font-bold text-slate-800 mb-1">Beban Operasional (Opex)</div>
                  <div className="text-2xl font-bold font-mono text-rose-600 mb-2">
                    {formatRupiah(financialSummary?.bebanOperasional || 0)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Formula & Logika Perhitungan:</span>
                    <p className="text-slate-600 leading-relaxed">
                      <code>Beban Operasional = ∑ Pengeluaran Non-HPP (Gaji + Sewa + Utilitas + Iklan/KOL + Operasional)</code>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Seluruh biaya rutin yang dikeluarkan untuk menjalankan kegiatan usaha di luar modal langsung barang.
                    </p>
                  </div>
                </div>
              )}

              {selectedMetricDetail === 'laba_bersih' && (
                <div>
                  <div className="text-sm font-bold text-slate-800 mb-1">Laba Bersih (Net Profit)</div>
                  <div
                    className={`text-2xl font-bold font-mono mb-2 ${
                      (financialSummary?.labaBersih || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatRupiah(financialSummary?.labaBersih || 0)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Formula & Logika Perhitungan:</span>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span>Laba Kotor:</span>
                        <span>{formatRupiah(financialSummary?.labaKotor || 0)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>Dikurangi Beban Operasional:</span>
                        <span>- {formatRupiah(financialSummary?.bebanOperasional || 0)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-1 font-bold text-indigo-700 flex justify-between">
                        <span>Laba Bersih Riil:</span>
                        <span>{formatRupiah(financialSummary?.labaBersih || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedMetricDetail === 'saldo_kas' && (
                <div>
                  <div className="text-sm font-bold text-slate-800 mb-1">Saldo Kas Riil / Berjalan</div>
                  <div className="text-2xl font-bold font-mono text-indigo-700 mb-2">
                    {formatRupiah(financialSummary?.saldoKasAktual || 0)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Rincian Saldo per Rekening Kas:</span>
                    <div className="space-y-1.5">
                      {accounts.map((a) => (
                        <div key={a.id} className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-600">{a.bankName} ({a.accountNumber}):</span>
                          <span className="font-mono font-semibold text-slate-900">{formatRupiah(a.currentBalance)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 pt-1 text-[10px] text-slate-400">
                      Total saldo merefleksikan posisi uang fisik dan bank yang benar-benar ada saat ini.
                    </div>
                  </div>
                </div>
              )}

              {selectedMetricDetail === 'dana_dialokasikan' && (
                <div>
                  <div className="text-sm font-bold text-slate-800 mb-1">Dana Dialokasikan / Komitmen</div>
                  <div className="text-2xl font-bold font-mono text-purple-700 mb-2">
                    {formatRupiah(financialSummary?.danaDialokasikan || 0)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Definisi & Sumber Komitmen:</span>
                    <p className="text-slate-600 leading-relaxed">
                      <code>Dana Dialokasikan = ∑ Pembayaran & Tagihan Terjadwal yang Belum Dibayarkan</code>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Menandai komitmen pembayaran di masa depan (seperti sewa gedung, domain/hosting, tagihan vendor)
                      sehingga Anda dapat mengalokasikan kas tanpa risiko kekurangan likuiditas.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 text-right">
                <button
                  onClick={() => setSelectedMetricDetail(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

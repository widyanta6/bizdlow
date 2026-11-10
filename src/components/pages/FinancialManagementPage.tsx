import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PlusCircle,
  FileSpreadsheet,
  Layers,
  Users,
  Award,
  BookOpen,
  Filter,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Transaction,
  Account,
  Product,
  KOLCommission,
  PayrollRecord,
  FinancialArchive,
  BalanceCorrection,
  BalanceAdjustmentType,
} from '../../types/index';

export const FinancialManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { activeBusiness, financialSummary, refreshSummary, periodFilter } = useBusiness();

  // Tabs per PRD Section 8.2
  type FinTab =
    | 'transaksi'
    | 'rekening'
    | 'hpp_produk'
    | 'kol'
    | 'gaji'
    | 'laporan_arsip';

  const [activeTab, setActiveTab] = useState<FinTab>('transaksi');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kolList, setKolList] = useState<KOLCommission[]>([]);
  const [payrollList, setPayrollList] = useState<PayrollRecord[]>([]);
  const [archives, setArchives] = useState<FinancialArchive[]>([]);
  const [corrections, setCorrections] = useState<BalanceCorrection[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Selected for correction & 3-way reset
  const [targetAccountForCorrection, setTargetAccountForCorrection] = useState<Account | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<BalanceAdjustmentType>('reset_zero');
  const [correctionNewBalance, setCorrectionNewBalance] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionDate, setCorrectionDate] = useState<string>('2026-11-10');

  // New Transaction Form
  const [txForm, setTxForm] = useState({
    date: '2026-11-09',
    type: 'income' as 'income' | 'expense',
    category: 'Penjualan Produk',
    amount: 0,
    accountId: '',
    description: '',
    isCOGS: false,
  });

  // New Account Form
  const [accForm, setAccForm] = useState({
    bankName: '',
    accountNumber: '',
    holderName: '',
    type: 'bank' as 'bank' | 'cash' | 'ewallet',
    initialBalance: 0,
  });

  // New Product Form
  const [prodForm, setProdForm] = useState({
    sku: '',
    name: '',
    category: 'Dress & Abaya',
    sellingPrice: 0,
    cogs: 0,
    stockQuantity: 10,
    minStock: 5,
    unit: 'pcs',
  });

  // Archive Form
  const [archiveForm, setArchiveForm] = useState({
    title: 'Laporan Keuangan Resmi November 2026',
    periodMonth: '2026-11',
    notes: 'Arsip resmi terkunci untuk rapat pemegang saham dan evaluasi bisnis.',
  });

  const loadAllData = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const [txs, accs, prods, kols, pays, arcs, corrs] = await Promise.all([
        api.getTransactions(activeBusiness.id),
        api.getAccounts(activeBusiness.id),
        api.getProducts(activeBusiness.id),
        api.getKOL(activeBusiness.id),
        api.getPayroll(activeBusiness.id),
        api.getArchives(activeBusiness.id),
        api.getBalanceCorrections(activeBusiness.id),
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setProducts(prods);
      setKolList(kols);
      setPayrollList(pays);
      setArchives(arcs);
      setCorrections(corrs);
      if (accs.length > 0 && !txForm.accountId) {
        setTxForm((prev) => ({ ...prev, accountId: accs[0].id }));
      }
    } catch (err) {
      console.error('Failed to load financial records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeBusiness]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    if (txForm.amount <= 0 || !txForm.accountId) {
      alert('Jumlah transaksi dan rekening wajib diisi');
      return;
    }
    try {
      await api.createTransaction(activeBusiness.id, {
        date: txForm.date,
        type: txForm.type,
        category: txForm.category,
        amount: Number(txForm.amount),
        accountId: txForm.accountId,
        description: txForm.description,
        isCOGS: txForm.isCOGS,
      });
      await loadAllData();
      await refreshSummary();
      setShowTxModal(false);
      setTxForm({
        date: '2026-11-09',
        type: 'income',
        category: 'Penjualan Produk',
        amount: 0,
        accountId: accounts[0]?.id || '',
        description: '',
        isCOGS: false,
      });
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat transaksi');
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!activeBusiness) return;
    if (!confirm('Hapus transaksi ini? Saldo rekening akan secara otomatis dikembalikan.')) return;
    try {
      await api.deleteTransaction(activeBusiness.id, txId);
      await loadAllData();
      await refreshSummary();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus transaksi');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      await api.createAccount(activeBusiness.id, accForm);
      await loadAllData();
      await refreshSummary();
      setShowAccountModal(false);
      setAccForm({ bankName: '', accountNumber: '', holderName: '', type: 'bank', initialBalance: 0 });
    } catch (err: any) {
      alert(err.message || 'Gagal menambah rekening');
    }
  };

  const handleOpenCorrection = (acc: Account) => {
    setTargetAccountForCorrection(acc);
    setAdjustmentType('reset_zero');
    setCorrectionNewBalance(0);
    setCorrectionReason('');
    setCorrectionDate('2026-11-10');
    setShowCorrectionModal(true);
  };

  const handleExecuteCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !targetAccountForCorrection) return;
    if (!correctionReason.trim()) {
      alert('Alasan koreksi/reset saldo wajib dicantumkan untuk rekam jejak audit.');
      return;
    }
    const targetVal = adjustmentType === 'reset_zero' ? 0 : Number(correctionNewBalance);
    const typeLabel =
      adjustmentType === 'reset_zero'
        ? 'Reset ke Rp 0'
        : adjustmentType === 'set_amount'
        ? `Atur saldo ke ${formatRupiah(targetVal)}`
        : `Koreksi fisik menjadi ${formatRupiah(targetVal)}`;

    if (
      !confirm(
        `Konfirmasi: ${typeLabel} pada rekening ${targetAccountForCorrection.bankName} (${targetAccountForCorrection.accountNumber})?\n\nAlasan: ${correctionReason}\n\nHistori transaksi lampau tetap tersimpan utuh dan tidak dihapus.`
      )
    ) {
      return;
    }
    try {
      await api.resetAccountBalance(
        activeBusiness.id,
        targetAccountForCorrection.id,
        adjustmentType,
        targetVal,
        correctionReason,
        correctionDate
      );
      await loadAllData();
      await refreshSummary();
      setShowCorrectionModal(false);
      setTargetAccountForCorrection(null);
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan penyesuaian saldo');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      await api.createProduct(activeBusiness.id, prodForm);
      await loadAllData();
      setShowProductModal(false);
      setProdForm({
        sku: '',
        name: '',
        category: 'Dress & Abaya',
        sellingPrice: 0,
        cogs: 0,
        stockQuantity: 10,
        minStock: 5,
        unit: 'pcs',
      });
    } catch (err: any) {
      alert(err.message || 'Gagal menambah produk');
    }
  };

  const handleCreateArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      await api.createArchive(activeBusiness.id, archiveForm.title, archiveForm.periodMonth, archiveForm.notes);
      await loadAllData();
      setShowArchiveModal(false);
      alert('Arsip laporan keuangan resmi berhasil disimpan dan dikunci!');
    } catch (err: any) {
      alert(err.message || 'Gagal membuat arsip');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Formula Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Management & Kas</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan arus kas, HPP (COGS), mutasi operasional, rekening bank, serta laporan laba rugi.
          </p>
        </div>

        {!user?.isReadOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTxForm((prev) => ({ ...prev, type: 'income', category: 'Penjualan Produk' }));
                setShowTxModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Pemasukan</span>
            </button>
            <button
              onClick={() => {
                setTxForm((prev) => ({ ...prev, type: 'expense', category: 'Operasional & Utilitas' }));
                setShowTxModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Pengeluaran</span>
            </button>
          </div>
        )}
      </div>

      {/* Financial Formula Bar (PRD Section 8.1) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Struktur Alur Keuangan (Audit Rumus Aktual)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px]">1. Total Penjualan</span>
            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
              {formatRupiah(financialSummary?.totalPenjualan || 0)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px]">2. Dikurangi HPP</span>
            <span className="font-mono font-bold text-amber-600 text-sm tabular-nums">
              - {formatRupiah(financialSummary?.totalHPP || 0)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
            <span className="text-purple-700 block text-[10px] font-semibold">3. Laba Kotor (Gross)</span>
            <span className="font-mono font-bold text-purple-700 text-sm tabular-nums">
              = {formatRupiah(financialSummary?.labaKotor || 0)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px]">4. Beban Operasional</span>
            <span className="font-mono font-bold text-rose-600 text-sm tabular-nums">
              - {formatRupiah(financialSummary?.bebanOperasional || 0)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <span className="text-emerald-700 block text-[10px] font-semibold">5. Laba Bersih (Net)</span>
            <span className="font-mono font-bold text-emerald-700 text-sm tabular-nums">
              = {formatRupiah(financialSummary?.labaBersih || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Submenu Tabs (PRD Section 3 & 8.2) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-semibold select-none">
        {[
          { key: 'transaksi', label: 'Semua Transaksi', count: transactions.length },
          { key: 'rekening', label: 'Rekening & Kas', count: accounts.length },
          { key: 'hpp_produk', label: 'Produk & HPP', count: products.length },
          { key: 'kol', label: 'Komisi KOL', count: kolList.length },
          { key: 'gaji', label: 'Gaji & Tim', count: payrollList.length },
          { key: 'laporan_arsip', label: 'Arsip Laporan', count: archives.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as FinTab)}
            className={`px-3 py-2 rounded-t-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-white border-t-2 border-purple-600 text-purple-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Transaksi */}
      {activeTab === 'transaksi' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Buku Kas & Mutasi Transaksi</h3>
            <span className="text-xs text-slate-400 font-mono">{transactions.length} mutasi tercatat</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Jenis</th>
                  <th className="px-4 py-2.5">Kategori</th>
                  <th className="px-4 py-2.5">Deskripsi / Keterangan</th>
                  <th className="px-4 py-2.5">Rekening</th>
                  <th className="px-4 py-2.5 text-right">Nominal</th>
                  <th className="px-4 py-2.5">Dicatat Oleh</th>
                  {!user?.isReadOnly && <th className="px-4 py-2.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada transaksi tercatat pada periode ini.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const acc = accounts.find((a) => a.id === tx.accountId);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-700">{tx.date}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              tx.type === 'income'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium">
                          {tx.category}
                          {tx.isCOGS && (
                            <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
                              HPP
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{tx.description}</td>
                        <td className="px-4 py-3 text-slate-500">{acc ? acc.bankName : tx.accountId}</td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${
                            tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">{tx.createdBy}</td>
                        {!user?.isReadOnly && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Rekening & Kas (PRD Section 8.3) */}
      {activeTab === 'rekening' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daftar Rekening Bank & Kas Operasional</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengguna berizin dapat mengubah nama rekening, saldo awal, dan melakukan koreksi saldo dengan audit log lengkap.
              </p>
            </div>
            {!user?.isReadOnly && (
              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Tambah Rekening</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize">
                    {acc.type}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{acc.bankName}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{acc.accountNumber}</p>
                  <p className="text-[11px] text-slate-400">a/n {acc.holderName}</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Saldo Berjalan Saat Ini</span>
                  <span className="text-lg font-bold font-mono text-purple-700 tabular-nums">
                    {formatRupiah(acc.currentBalance)}
                  </span>
                </div>

                {!user?.isReadOnly && (
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">Saldo Awal: {formatRupiah(acc.initialBalance)}</span>
                    <button
                      onClick={() => handleOpenCorrection(acc)}
                      className="px-2.5 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md transition-colors"
                    >
                      Koreksi Saldo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Audit Koreksi Saldo History */}
          {corrections.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Histori Audit Koreksi Saldo (Penyesuaian Tanpa Hapus Transaksi)
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                {corrections.map((corr) => {
                  const acc = accounts.find((a) => a.id === corr.accountId);
                  return (
                    <div key={corr.id} className="py-2.5 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {acc?.bankName} ({acc?.accountNumber}) — Selisih: {formatRupiah(corr.difference)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Alasan: "{corr.reason}"</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Tgl Efektif: {corr.effectiveDate} · Dibuat oleh: {corr.createdBy} pada {corr.createdAt.split('T')[0]}
                        </p>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <span className="text-slate-400 line-through block">{formatRupiah(corr.previousBalance)}</span>
                        <span className="text-purple-700 font-bold">{formatRupiah(corr.newBalance)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Produk & HPP */}
      {activeTab === 'hpp_produk' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Katalog Produk & Struktur HPP (COGS)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Harga jual, biaya modal per unit (HPP), dan estimasi margin kotor produk.
              </p>
            </div>
            {!user?.isReadOnly && (
              <button
                onClick={() => setShowProductModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Tambah Produk</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="px-4 py-2.5">SKU & Nama Produk</th>
                  <th className="px-4 py-2.5">Kategori</th>
                  <th className="px-4 py-2.5 text-right">Harga Jual</th>
                  <th className="px-4 py-2.5 text-right">HPP Modal</th>
                  <th className="px-4 py-2.5 text-right">Margin Kotor / Unit</th>
                  <th className="px-4 py-2.5 text-center">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const margin = p.sellingPrice - p.cogs;
                  const marginPct = p.sellingPrice > 0 ? ((margin / p.sellingPrice) * 100).toFixed(0) : '0';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-slate-400 block">{p.sku}</span>
                        <span className="font-bold text-slate-900">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.category}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatRupiah(p.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600 tabular-nums">
                        {formatRupiah(p.cogs)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold tabular-nums">
                        {formatRupiah(margin)} ({marginPct}%)
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            p.stockQuantity <= p.minStock
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {p.stockQuantity} {p.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Komisi KOL */}
      {activeTab === 'kol' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rekapitulasi Komisi KOL & Afiliasi</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan komisi influencer, omzet yang dihasilkan, dan status pembayaran komisi.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="px-4 py-2.5">Nama KOL / Handle</th>
                  <th className="px-4 py-2.5">Platform</th>
                  <th className="px-4 py-2.5 text-right">Omzet Tercipta</th>
                  <th className="px-4 py-2.5 text-center">Komisi %</th>
                  <th className="px-4 py-2.5 text-right">Nominal Komisi</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kolList.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{k.kolName}</td>
                    <td className="px-4 py-3 text-slate-600">{k.platform}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 tabular-nums">
                      {formatRupiah(k.salesGenerated)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{k.commissionRate}%</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-purple-700 tabular-nums">
                      {formatRupiah(k.commissionAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          k.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {k.paymentStatus === 'paid' ? 'Sudah Dibayar' : 'Menunggu Bayar'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Gaji & Tim */}
      {activeTab === 'gaji' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daftar Payroll Gaji Tim</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Struktur gaji pokok, tunjangan, potongan, dan status pembayaran gaji karyawan.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="px-4 py-2.5">Nama Anggota Tim</th>
                  <th className="px-4 py-2.5">Posisi / Peran</th>
                  <th className="px-4 py-2.5 text-right">Gaji Pokok</th>
                  <th className="px-4 py-2.5 text-right">Tunjangan</th>
                  <th className="px-4 py-2.5 text-right">Gaji Bersih</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.employeeName}</td>
                    <td className="px-4 py-3 text-slate-600">{p.role}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {formatRupiah(p.baseSalary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 tabular-nums">
                      {formatRupiah(p.allowance)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-purple-700 tabular-nums">
                      {formatRupiah(p.netSalary)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {p.status === 'paid' ? 'Dibayarkan' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Laporan & Arsip (PRD Section 10.2) */}
      {activeTab === 'laporan_arsip' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Arsip Laporan Keuangan Terkunci</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Snapshot resmi laporan keuangan berkala untuk arsip pajak, investor, dan laporan audit.
              </p>
            </div>
            {!user?.isReadOnly && (
              <button
                onClick={() => setShowArchiveModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Kunci & Simpan Arsip Laporan</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archives.length === 0 ? (
              <div className="col-span-2 py-10 bg-white rounded-xl border border-slate-200/80 text-center text-xs text-slate-400">
                Belum ada arsip laporan terkunci. Klik tombol di atas untuk membuat snapshot arsip pertama.
              </div>
            ) : (
              archives.map((arc) => (
                <div key={arc.id} className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{arc.title}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">Periode: {arc.periodMonth}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                      Terkunci
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Penjualan:</span>
                      <span className="font-bold text-slate-800">{formatRupiah(arc.summary.totalSales)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Laba Bersih:</span>
                      <span className="font-bold text-emerald-600">{formatRupiah(arc.summary.netProfit)}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">"{arc.notes}"</p>
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    Dibuat oleh: {arc.generatedBy} pada {arc.generatedAt.split('T')[0]}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: New Transaction */}
      {showTxModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Catat {txForm.type === 'income' ? 'Pemasukan Kas' : 'Pengeluaran Kas'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Transaksi ini akan langsung memperbarui saldo rekening dan laporan keuangan {activeBusiness?.name}.
            </p>

            <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jenis Transaksi</label>
                  <select
                    value={txForm.type}
                    onChange={(e) => {
                      const t = e.target.value as 'income' | 'expense';
                      setTxForm({
                        ...txForm,
                        type: t,
                        category: t === 'income' ? 'Penjualan Produk' : 'Operasional & Utilitas',
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="income">Pemasukan (+)</option>
                    <option value="expense">Pengeluaran (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kategori Transaksi *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: HPP Bahan Baku, Gaji Tim, Sewa, Iklan Meta..."
                  value={txForm.category}
                  onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {txForm.type === 'expense' && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <input
                    type="checkbox"
                    id="cogsCheck"
                    checked={txForm.isCOGS}
                    onChange={(e) => setTxForm({ ...txForm, isCOGS: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="cogsCheck" className="text-amber-900 font-semibold cursor-pointer">
                    Termasuk HPP (Harga Pokok Penjualan / Biaya Produksi Langsung)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nominal (IDR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rekening Kas *</label>
                <select
                  value={txForm.accountId}
                  onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} - {a.accountNumber} ({formatRupiah(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  placeholder="Detail transaksi, nomor nota, atau supplier..."
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Safe 3-Way Balance Reset & Correction (PRD Section 8.3) */}
      {showCorrectionModal && targetAccountForCorrection && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Reset & Penyesuaian Saldo: {targetAccountForCorrection.bankName}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Penyesuaian saldo aman tidak menghapus transaksi historis. Seluruh mutasi lampau tetap tersimpan utuh dan dicatat dalam audit log.
            </p>

            <form onSubmit={handleExecuteCorrection} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo Tercatat Saat Ini:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatRupiah(targetAccountForCorrection.currentBalance)}
                  </span>
                </div>
              </div>

              {/* 3 Explicit Radio Options */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-semibold mb-1">Pilih Metode Penyesuaian Saldo:</label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    adjustmentType === 'reset_zero'
                      ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    checked={adjustmentType === 'reset_zero'}
                    onChange={() => setAdjustmentType('reset_zero')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">1. Reset Saldo ke Rp 0</span>
                    <span className="text-[11px] text-slate-500">
                      Mengosongkan saldo kas untuk periode baru atau pembukuan ulang.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    adjustmentType === 'set_amount'
                      ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    checked={adjustmentType === 'set_amount'}
                    onChange={() => setAdjustmentType('set_amount')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">2. Tentukan Saldo ke Jumlah Tertentu</span>
                    <span className="text-[11px] text-slate-500">
                      Menetapkan saldo kas baru secara presisi ke angka yang diinginkan.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    adjustmentType === 'correct_actual'
                      ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    checked={adjustmentType === 'correct_actual'}
                    onChange={() => setAdjustmentType('correct_actual')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">3. Koreksi Berdasarkan Saldo Fisik / Aktual</span>
                    <span className="text-[11px] text-slate-500">
                      Menyesuaikan selisih kas fisik brankas atau rekening koran bank riil.
                    </span>
                  </div>
                </label>
              </div>

              {adjustmentType !== 'reset_zero' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nominal Saldo Baru (IDR) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={correctionNewBalance}
                    onChange={(e) => setCorrectionNewBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono font-bold text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Alasan Penyesuaian Saldo (Wajib Audit) *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Misal: Penyesuaian selisih rekonsiliasi kas opname atau reset buku kas..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tanggal Efektif Penyesuaian *</label>
                <input
                  type="date"
                  required
                  value={correctionDate}
                  onChange={(e) => setCorrectionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Terapkan Penyesuaian Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Account */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Tambah Rekening / Kas Baru</h3>
            <p className="text-xs text-slate-500 mb-4">Daftarkan rekening bank operasional atau kas tunai.</p>
            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Bank / Kas *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: BCA Giro Bisnis, Mandiri Operasional..."
                  value={accForm.bankName}
                  onChange={(e) => setAccForm({ ...accForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    required
                    placeholder="8820-xxxx"
                    value={accForm.accountNumber}
                    onChange={(e) => setAccForm({ ...accForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jenis</label>
                  <select
                    value={accForm.type}
                    onChange={(e) => setAccForm({ ...accForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="bank">Bank</option>
                    <option value="cash">Kas Tunai</option>
                    <option value="ewallet">E-Wallet</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Pemilik Rekening</label>
                <input
                  type="text"
                  required
                  placeholder="Nama PT atau Pemilik"
                  value={accForm.holderName}
                  onChange={(e) => setAccForm({ ...accForm, holderName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Saldo Awal (IDR)</label>
                <input
                  type="number"
                  min={0}
                  value={accForm.initialBalance}
                  onChange={(e) => setAccForm({ ...accForm, initialBalance: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Simpan Rekening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Product */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Tambah Produk & HPP</h3>
            <p className="text-xs text-slate-500 mb-4">Tambahkan item ke katalog produk untuk melacak HPP dan margin.</p>
            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Produk / Jasa *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Raya Pleated Cullote"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori</label>
                  <input
                    type="text"
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">SKU</label>
                  <input
                    type="text"
                    placeholder="TRM-01"
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Harga Jual (IDR) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodForm.sellingPrice}
                    onChange={(e) => setProdForm({ ...prodForm, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">HPP Modal (IDR) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodForm.cogs}
                    onChange={(e) => setProdForm({ ...prodForm, cogs: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-amber-600 font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jumlah Stok Awal</label>
                  <input
                    type="number"
                    min={0}
                    value={prodForm.stockQuantity}
                    onChange={(e) => setProdForm({ ...prodForm, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Satuan</label>
                  <input
                    type="text"
                    value={prodForm.unit}
                    onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Archive */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Kunci & Simpan Arsip Laporan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Snapshot akan mengunci metrik keuangan bulan terpilih agar tidak terpengaruh mutasi di masa depan.
            </p>
            <form onSubmit={handleCreateArchive} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Judul Arsip *</label>
                <input
                  type="text"
                  required
                  value={archiveForm.title}
                  onChange={(e) => setArchiveForm({ ...archiveForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bulan Periode (YYYY-MM) *</label>
                <input
                  type="month"
                  required
                  value={archiveForm.periodMonth}
                  onChange={(e) => setArchiveForm({ ...archiveForm, periodMonth: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Catatan Auditor / Direksi</label>
                <textarea
                  rows={2}
                  value={archiveForm.notes}
                  onChange={(e) => setArchiveForm({ ...archiveForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Kunci & Buat Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

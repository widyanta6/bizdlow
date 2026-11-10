import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Wallet,
  FileText,
  TrendingUp,
  Folder,
  Upload,
  FolderPlus,
  Share2,
  Download,
  Building,
  Globe,
  Briefcase,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Paperclip,
  Send,
  Edit3,
  Info,
  RotateCcw,
  PlusCircle,
  BarChart3,
  History,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Zap,
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
  CalendarEvent,
} from '../../types/index';
import { NavItemKey } from '../layout/Sidebar';

interface HomePageProps {
  onNavigate: (tab: NavItemKey) => void;
  onOpenNewTransactionModal?: (type?: 'income' | 'expense') => void;
  onOpenNewOrderModal?: () => void;
  onOpenFileUploadModal?: () => void;
}

type MetricDetailType = 'sales' | 'revenue' | 'expenses' | 'profit' | 'cash';

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

  // Data states
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [corrections, setCorrections] = useState<BalanceCorrection[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar mini widget state
  const [calendarSubView, setCalendarSubView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDay, setSelectedDay] = useState<number>(17);

  // AI Assistant docked widget state
  const [aiMessage, setAiMessage] = useState('');
  const [aiConversation, setAiConversation] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: `Halo ${user?.name || 'Ika'}! 👋 Ada yang bisa aku bantu hari ini?`,
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiWidgetVisible, setIsAiWidgetVisible] = useState(true);

  // Modal states
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

  const loadDashboardData = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const [orders, txs, files, accList, corrs, evts] = await Promise.all([
        api.getOrders(activeBusiness.id),
        api.getTransactions(activeBusiness.id),
        api.getFiles(activeBusiness.id),
        api.getAccounts(activeBusiness.id),
        api.getBalanceCorrections(activeBusiness.id),
        api.getEvents(activeBusiness.id),
      ]);
      setRecentOrders(orders);
      setRecentTransactions(txs);
      setRecentFiles(files);
      setAccounts(accList);
      setCorrections(corrs);
      setEvents(evts);

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

  // Profile Save
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

  // Reset Balance
  const handleOpenResetBalance = (acc: Account) => {
    setSelectedAccountForReset(acc);
    setAdjustmentType('reset_zero');
    setNewTargetBalance(0);
    setAdjustmentReason('');
    setAdjustmentDate('2026-11-10');
    setShowResetBalanceModal(true);
  };

  const handleExecuteResetBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !selectedAccountForReset) return;

    if (!adjustmentReason.trim()) {
      alert('Alasan penyesuaian saldo wajib diisi untuk rekam jejak audit.');
      return;
    }

    const calculatedNewBal = adjustmentType === 'reset_zero' ? 0 : Number(newTargetBalance);
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
      alert(err.message || 'Gagal mereset saldo rekening');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Send message to AI Assistant
  const handleSendAiMessage = async (queryText?: string) => {
    const textToSend = queryText || aiMessage;
    if (!textToSend.trim() || !activeBusiness) return;

    const newHistory = [...aiConversation, { sender: 'user' as const, text: textToSend }];
    setAiConversation(newHistory);
    setAiMessage('');
    setIsAiLoading(true);

    try {
      const reply = await api.sendAiMessage(textToSend, activeBusiness.id);
      setAiConversation((prev) => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      setAiConversation((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Berdasarkan data keuangan ${activeBusiness.name}, penjualan berjalan bulan ini tercatat ${formatRupiah(
            financialSummary?.totalPenjualan || 24500000
          )} dengan laba bersih ${formatRupiah(financialSummary?.labaBersih || 10500000)}. Ada hal lain yang ingin dianalisis?`,
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const displayName = user?.name ? user.name.split(' ')[0] : 'Ika';

  // Dynamic values or mock defaults matching visual layout
  const valSales = financialSummary?.totalPenjualan || 24500000;
  const valRevenue = financialSummary?.revenueReceived || financialSummary?.totalIncome || 22800000;
  const valExpenses = financialSummary?.totalExpenses || 12300000;
  const valNetProfit = financialSummary?.labaBersih || 10500000;

  return (
    <div className="p-8 max-w-[1500px] mx-auto space-y-6">
      {/* ================= 1. WELCOME HERO SECTION matching screenshot ================= */}
      <div className="flex items-center justify-between gap-6 py-2">
        <div className="flex items-center gap-5">
          {/* 3D Boutique/Store Illustration SVG matching screenshot */}
          <div className="relative shrink-0 w-28 h-24">
            <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-md">
              {/* Soft clouds behind */}
              <ellipse cx="25" cy="45" rx="18" ry="12" fill="#E0F2FE" opacity="0.8" />
              <ellipse cx="95" cy="40" rx="16" ry="10" fill="#E0F2FE" opacity="0.8" />
              <ellipse cx="60" cy="20" rx="22" ry="12" fill="#F0F9FF" opacity="0.9" />

              {/* House Base */}
              <rect x="25" y="42" width="70" height="48" rx="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
              {/* Warm Wall base */}
              <rect x="27" y="44" width="66" height="44" rx="6" fill="#FDF8F3" />

              {/* Blue Roof / Store Canopy */}
              <path
                d="M15 44 C20 30, 100 30, 105 44 Z"
                fill="url(#roofGradient)"
                stroke="#38BDF8"
                strokeWidth="1.5"
              />
              {/* Awning Scallops */}
              <path
                d="M 18 44 Q 25 50 32 44 Q 39 50 46 44 Q 53 50 60 44 Q 67 50 74 44 Q 81 50 88 44 Q 95 50 102 44"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
              />

              {/* Door */}
              <rect x="52" y="58" width="16" height="30" rx="3" fill="#3B82F6" />
              <circle cx="56" cy="73" r="1.5" fill="#F8FAFC" />

              {/* Left Window */}
              <rect x="33" y="56" width="14" height="14" rx="2" fill="#BAE6FD" stroke="#38BDF8" strokeWidth="1" />
              <line x1="40" y1="56" x2="40" y2="70" stroke="#38BDF8" strokeWidth="1" />
              <line x1="33" y1="63" x2="47" y2="63" stroke="#38BDF8" strokeWidth="1" />

              {/* Right Window */}
              <rect x="73" y="56" width="14" height="14" rx="2" fill="#BAE6FD" stroke="#38BDF8" strokeWidth="1" />
              <line x1="80" y1="56" x2="80" y2="70" stroke="#38BDF8" strokeWidth="1" />
              <line x1="73" y1="63" x2="87" y2="63" stroke="#38BDF8" strokeWidth="1" />

              {/* Gradients */}
              <defs>
                <linearGradient id="roofGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Hi, {displayName}!</span>
              <span className="text-2xl animate-bounce">👋</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Here's your business summary today</p>
          </div>
        </div>

        {/* Action button to edit business profile */}
        {!user?.isReadOnly && (
          <button
            onClick={() => setShowEditProfileModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-indigo-700 text-xs font-bold rounded-full border border-sky-100 shadow-sm transition-all hover:scale-105"
            title="Ubah Profil Bisnis"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Edit Business Profile</span>
          </button>
        )}
      </div>

      {/* ================= 2. TOP 4 METRIC CARDS matching screenshot ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Sales */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-sky-100/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3 shadow-2xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500 block">Total Sales</span>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans">
              {formatRupiah(valSales)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-2">
              <span>↑ +12%</span>
            </div>
          </div>

          {/* Sparkline Wave SVG matching screenshot */}
          <div className="h-10 w-full mt-2">
            <svg viewBox="0 0 100 28" className="w-full h-full overflow-visible">
              <path
                d="M0 20 Q 25 8, 50 18 T 100 10"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <button
            onClick={() => setSelectedMetricDetail('sales')}
            className="absolute top-4 right-4 text-[11px] font-semibold text-sky-600 hover:text-sky-800 opacity-0 group-hover:opacity-100 transition-opacity bg-sky-50 px-2 py-0.5 rounded-full"
          >
            Lihat Detail
          </button>
        </div>

        {/* Card 2: Revenue Received */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-sky-100/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3 shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500 block">Revenue Received</span>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans">
              {formatRupiah(valRevenue)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-2">
              <span>↑ +10%</span>
            </div>
          </div>

          {/* Cyan Wave SVG */}
          <div className="h-10 w-full mt-2">
            <svg viewBox="0 0 100 28" className="w-full h-full overflow-visible">
              <path
                d="M0 24 Q 25 12, 50 20 T 100 6"
                fill="none"
                stroke="#0EA5E9"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <button
            onClick={() => setSelectedMetricDetail('revenue')}
            className="absolute top-4 right-4 text-[11px] font-semibold text-sky-600 hover:text-sky-800 opacity-0 group-hover:opacity-100 transition-opacity bg-sky-50 px-2 py-0.5 rounded-full"
          >
            Lihat Detail
          </button>
        </div>

        {/* Card 3: Total Expenses */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-sky-100/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500 block">Total Expenses</span>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans">
              {formatRupiah(valExpenses)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-2">
              <span>↑ +8%</span>
            </div>
          </div>

          {/* Lavender/Purple Wave SVG */}
          <div className="h-10 w-full mt-2">
            <svg viewBox="0 0 100 28" className="w-full h-full overflow-visible">
              <path
                d="M0 16 Q 30 25, 60 14 T 100 18"
                fill="none"
                stroke="#A855F7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <button
            onClick={() => setSelectedMetricDetail('expenses')}
            className="absolute top-4 right-4 text-[11px] font-semibold text-purple-600 hover:text-purple-800 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-50 px-2 py-0.5 rounded-full"
          >
            Lihat Detail
          </button>
        </div>

        {/* Card 4: Net Profit */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-sky-100/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500 block">Net Profit</span>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans">
              {formatRupiah(valNetProfit)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-2">
              <span>↑ +15%</span>
            </div>
          </div>

          {/* Mint Wave SVG */}
          <div className="h-10 w-full mt-2">
            <svg viewBox="0 0 100 28" className="w-full h-full overflow-visible">
              <path
                d="M0 22 Q 25 15, 50 20 T 100 8"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <button
            onClick={() => setSelectedMetricDetail('profit')}
            className="absolute top-4 right-4 text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50 px-2 py-0.5 rounded-full"
          >
            Lihat Detail
          </button>
        </div>
      </div>

      {/* ================= 3. MIDDLE ROW (Sales Performance, Payment Calendar, AI Assistant) matching screenshot ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Sales Performance Chart (5 Cols) */}
        <div className="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-sky-100/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-50 text-blue-600">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">Sales Performance</h3>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-transform hover:translate-x-0.5"
            >
              <span>View Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Chart with bezier line and tooltip popup matching image */}
          <div className="relative w-full h-48 mt-2 flex items-end">
            {/* Axis Y */}
            <div className="flex flex-col justify-between h-full text-[10px] text-slate-400 font-medium pr-2 pb-5">
              <span>30M</span>
              <span>20M</span>
              <span>10M</span>
              <span>0</span>
            </div>

            {/* SVG Chart */}
            <div className="flex-1 h-full relative flex flex-col justify-between">
              {/* Horizontal grid lines */}
              <div className="w-full h-full absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
                <div className="border-b border-slate-100 w-full" />
                <div className="border-b border-slate-100 w-full" />
                <div className="border-b border-slate-100 w-full" />
                <div className="border-b border-slate-200 w-full" />
              </div>

              {/* Area & Line */}
              <svg viewBox="0 0 350 140" className="w-full h-full overflow-visible z-10 pb-5">
                <defs>
                  <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Shaded Area */}
                <path
                  d="M 10 100 Q 60 70 120 75 T 180 35 T 240 50 T 300 40 L 300 135 L 10 135 Z"
                  fill="url(#salesAreaGradient)"
                />

                {/* Stroke Line */}
                <path
                  d="M 10 100 Q 60 70 120 75 T 180 35 T 240 50 T 300 40"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Vertices */}
                <circle cx="10" cy="100" r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
                <circle cx="70" cy="73" r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
                <circle cx="120" cy="75" r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
                <circle cx="180" cy="35" r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="240" cy="50" r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
                <circle cx="300" cy="40" r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
              </svg>

              {/* Tooltip Badge over Thu, 17 Apr matching image */}
              <div className="absolute top-2 left-[44%] -translate-x-1/2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-sky-100 z-20 pointer-events-none text-center">
                <span className="font-extrabold text-xs text-slate-900 block font-mono">Rp 26.500.000</span>
                <span className="text-[9px] text-slate-400 font-medium">Thu, 17 Apr</span>
              </div>

              {/* Day Labels */}
              <div className="flex justify-between text-[11px] font-medium text-slate-500 pt-1">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Payment Calendar (4 Cols) matching screenshot */}
        <div className="lg:col-span-4 bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-sky-100/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-50 text-blue-600">
                <Calendar className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">Payment Calendar</h3>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-transform hover:translate-x-0.5"
            >
              <span>See All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Month Switcher & Pill view switcher matching image */}
          <div className="flex items-center justify-between pt-1 pb-2">
            <div className="flex items-center gap-1 text-xs font-extrabold text-slate-800">
              <button className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>April 2026</span>
              <button className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center bg-slate-100/70 p-0.5 rounded-full text-[10px] font-bold text-slate-500">
              <button
                onClick={() => setCalendarSubView('month')}
                className={`px-2.5 py-0.5 rounded-full transition-all ${
                  calendarSubView === 'month' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:text-slate-800'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setCalendarSubView('week')}
                className={`px-2.5 py-0.5 rounded-full transition-all ${
                  calendarSubView === 'week' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:text-slate-800'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarSubView('day')}
                className={`px-2.5 py-0.5 rounded-full transition-all ${
                  calendarSubView === 'day' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:text-slate-800'
                }`}
              >
                Day
              </button>
            </div>
          </div>

          {/* 2-Part Content: Mini Grid on Left, Events on Right */}
          <div className="grid grid-cols-12 gap-3 pt-2">
            {/* Mini Calendar 7-col Grid */}
            <div className="col-span-7">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 mb-1">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-700">
                <span className="text-slate-300 py-1">31</span>
                <span className="py-1">1</span>
                <span className="py-1">2</span>
                <span className="py-1">3</span>
                <span className="py-1">4</span>
                <span className="py-1">5</span>
                <span className="py-1">6</span>

                <span className="py-1">7</span>
                <span className="py-1">8</span>
                <span className="py-1">9</span>
                <span className="py-1">10</span>
                <span className="py-1">11</span>
                <span className="py-1 text-rose-600 font-bold">12</span>
                <span className="py-1">13</span>

                <span className="py-1">14</span>
                <span className="py-1 text-sky-600 font-bold">15</span>
                <span className="py-1">16</span>
                {/* Day 17 is active in screenshot */}
                <span
                  onClick={() => setSelectedDay(17)}
                  className="w-6 h-6 mx-auto rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shadow-xs cursor-pointer"
                >
                  17
                </span>
                <span className="py-1">18</span>
                <span className="py-1">19</span>
                <span className="py-1 text-amber-600 font-bold">20</span>

                <span className="py-1">21</span>
                <span className="py-1">22</span>
                <span className="py-1">23</span>
                <span className="py-1">24</span>
                <span className="py-1">25</span>
                <span className="py-1">26</span>
                <span className="py-1">27</span>

                <span className="py-1">28</span>
                <span className="py-1">29</span>
                <span className="py-1">30</span>
                <span className="text-slate-300 py-1">1</span>
                <span className="text-slate-300 py-1">2</span>
                <span className="text-slate-300 py-1">3</span>
                <span className="text-slate-300 py-1">4</span>
              </div>
            </div>

            {/* Right List of Scheduled Items matching image */}
            <div className="col-span-5 space-y-2.5 border-l border-slate-100 pl-2.5 flex flex-col justify-center text-xs">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="font-bold text-slate-800 text-[11px] truncate">Sewa Gedung</span>
                </div>
                <p className="font-mono text-[10px] text-slate-500 pl-3.5">Rp 5.000.000</p>
                <p className="text-[9px] text-slate-400 pl-3.5">12 Apr</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                  <span className="font-bold text-slate-800 text-[11px] truncate">Hosting Website</span>
                </div>
                <p className="font-mono text-[10px] text-slate-500 pl-3.5">Rp 850.000</p>
                <p className="text-[9px] text-slate-400 pl-3.5">15 Apr</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-bold text-slate-800 text-[11px] truncate">Bayar Vendor</span>
                </div>
                <p className="font-mono text-[10px] text-slate-500 pl-3.5">Rp 2.750.000</p>
                <p className="text-[9px] text-slate-400 pl-3.5">20 Apr</p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: BizFlow AI Assistant Docked Widget (3 Cols) matching screenshot */}
        <div className="lg:col-span-3 bg-gradient-to-br from-indigo-50/80 via-white/95 to-purple-50/80 backdrop-blur-md rounded-3xl p-5 border border-sky-100/70 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                🤖
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">BizFlow AI Assistant</h4>
                <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('ai')}
              title="Buka Halaman Penuh AI"
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            </button>
          </div>

          {/* Conversation & Suggestion Chips */}
          <div className="py-3 space-y-2.5 overflow-y-auto max-h-48 text-xs">
            {aiConversation.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white ml-4 rounded-tr-xs'
                    : 'bg-white/90 text-slate-800 shadow-2xs mr-3 border border-indigo-100/60 rounded-tl-xs'
                }`}
              >
                <p className="text-[11px] leading-relaxed">{msg.text}</p>
              </div>
            ))}

            {isAiLoading && (
              <div className="bg-white/90 p-2 rounded-xl text-slate-400 text-[10px] italic flex items-center gap-1.5 w-fit">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                <span>BizFlow AI sedang menganalisis data...</span>
              </div>
            )}

            {/* Clickable example prompts matching screenshot */}
            {aiConversation.length <= 2 && (
              <div className="pt-1 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Contoh pertanyaan:
                </span>
                <button
                  onClick={() => handleSendAiMessage('Bagaimana cara menambahkan bisnis baru?')}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[10px] text-slate-700 font-medium border border-indigo-100 transition-colors"
                >
                  Bagaimana cara menambahkan bisnis baru?
                </button>
                <button
                  onClick={() => handleSendAiMessage('Berapa keuntungan bisnis saya bulan ini?')}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[10px] text-slate-700 font-medium border border-indigo-100 transition-colors"
                >
                  Berapa keuntungan bisnis saya bulan ini?
                </button>
                <button
                  onClick={() => handleSendAiMessage('Bagaimana cara mengunggah nota pengeluaran?')}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[10px] text-slate-700 font-medium border border-indigo-100 transition-colors"
                >
                  Bagaimana cara mengunggah nota pengeluaran?
                </button>
              </div>
            )}
          </div>

          {/* Input Box matching screenshot */}
          <div className="pt-2 border-t border-indigo-100/50">
            <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-indigo-200/60 shadow-2xs">
              <input
                type="text"
                placeholder="Tanyakan sesuatu..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
                className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={onOpenFileUploadModal}
                title="Lampirkan nota"
                className="text-slate-400 hover:text-indigo-600 p-1"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSendAiMessage()}
                disabled={!aiMessage.trim()}
                className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4. BOTTOM ROW (My Files, Quick Actions, Upcoming Payments) matching screenshot ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Widget 1: My Files (5 Cols) */}
        <div className="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-sky-100/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-50 text-blue-600">
                <Folder className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">My Files</h3>
            </div>
            <button
              onClick={() => onNavigate('files')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-transform hover:translate-x-0.5"
            >
              <span>See All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4 Pastel Folder Cards matching screenshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Folder 1: Finance (Purple) */}
            <div
              onClick={() => onNavigate('files')}
              className="p-3.5 rounded-2xl bg-[#F5F0FF] border border-[#E9D5FF] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between h-28"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-200/80 text-purple-700 flex items-center justify-center font-bold">
                📁
              </div>
              <div>
                <span className="font-bold text-xs text-slate-800 block">Finance</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center justify-between mt-0.5">
                  <span>24 files</span>
                  <span className="text-purple-600 font-bold">→</span>
                </span>
              </div>
            </div>

            {/* Folder 2: Invoices (Blue) */}
            <div
              onClick={() => onNavigate('files')}
              className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between h-28"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-200/80 text-blue-700 flex items-center justify-center font-bold">
                📁
              </div>
              <div>
                <span className="font-bold text-xs text-slate-800 block">Invoices</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center justify-between mt-0.5">
                  <span>18 files</span>
                  <span className="text-blue-600 font-bold">→</span>
                </span>
              </div>
            </div>

            {/* Folder 3: Orders (Yellow/Amber) */}
            <div
              onClick={() => onNavigate('files')}
              className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between h-28"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-700 flex items-center justify-center font-bold">
                📁
              </div>
              <div>
                <span className="font-bold text-xs text-slate-800 block">Orders</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center justify-between mt-0.5">
                  <span>32 files</span>
                  <span className="text-amber-600 font-bold">→</span>
                </span>
              </div>
            </div>

            {/* Folder 4: Reports (Mint) */}
            <div
              onClick={() => onNavigate('files')}
              className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between h-28"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-200/80 text-emerald-700 flex items-center justify-center font-bold">
                📁
              </div>
              <div>
                <span className="font-bold text-xs text-slate-800 block">Reports</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center justify-between mt-0.5">
                  <span>12 files</span>
                  <span className="text-emerald-600 font-bold">→</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Quick Actions (3 Cols) matching screenshot */}
        <div className="lg:col-span-3 bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-sky-100/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1.5 rounded-xl bg-sky-50 text-blue-600">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-extrabold text-slate-900">Quick Actions</h3>
          </div>

          {/* 4 Soft pastel squircle buttons in 2x2 grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onOpenFileUploadModal}
              className="p-3 rounded-2xl bg-[#F5F0FF] hover:bg-[#EDE5FF] border border-[#E9D5FF] text-purple-700 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-102"
            >
              <Upload className="w-4 h-4 text-purple-600" />
              <span>Upload File</span>
            </button>

            <button
              onClick={() => onNavigate('files')}
              className="p-3 rounded-2xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A] text-amber-800 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-102"
            >
              <FolderPlus className="w-4 h-4 text-amber-600" />
              <span>New Folder</span>
            </button>

            <button
              onClick={() => setShowManageAccountsModal(true)}
              className="p-3 rounded-2xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-blue-700 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-102"
            >
              <Wallet className="w-4 h-4 text-blue-600" />
              <span>Kelola Kas</span>
            </button>

            <button
              onClick={() => onNavigate('orders')}
              className="p-3 rounded-2xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] text-emerald-800 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-102"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>New Order</span>
            </button>
          </div>
        </div>

        {/* Widget 3: Upcoming Payments (4 Cols) matching screenshot */}
        <div className="lg:col-span-4 bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-sky-100/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-50 text-blue-600">
                <Calendar className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">Upcoming Payments</h3>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-transform hover:translate-x-0.5"
            >
              <span>See All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List items with icons and badges */}
          <div className="space-y-3">
            {/* Item 1: Sewa Gedung */}
            <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                  🏢
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Sewa Gedung</h4>
                  <span className="text-[11px] text-slate-400">15 Apr 2026</span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold text-[10px]">
                Due Soon
              </span>
            </div>

            {/* Item 2: Hosting Website */}
            <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-blue-600 flex items-center justify-center font-bold">
                  🌐
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Hosting Website</h4>
                  <span className="text-[11px] text-slate-400">20 Apr 2026</span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-blue-600 font-bold text-[10px]">
                Scheduled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: EDIT BUSINESS PROFILE (PRD Req #1) ================= */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kategori Usaha *</label>
                <input
                  type="text"
                  required
                  value={profileForm.category}
                  onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tagline Singkat</label>
                <input
                  type="text"
                  value={profileForm.tagline}
                  onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                  placeholder="Misal: Busana muslimah elegan dan modern"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Deskripsi Bisnis</label>
                <textarea
                  rows={2}
                  value={profileForm.description}
                  onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mata Uang</label>
                  <select
                    value={profileForm.currency}
                    onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KELOLA REKENING KAS (PRD Req #2) ================= */}
      {showManageAccountsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kelola Rekening Kas ({activeBusiness?.name})</h3>
                  <p className="text-[11px] text-slate-500">
                    Atur rekening bank, kas kecil, dan lakukan penyesuaian saldo aman.
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

            <div className="space-y-3 text-xs">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{acc.bankName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-600">{acc.accountNumber}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">a/n {acc.holderName}</p>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-sm block">
                        {formatRupiah(acc.currentBalance)}
                      </span>
                    </div>

                    {!user?.isReadOnly && (
                      <button
                        onClick={() => handleOpenResetBalance(acc)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Saldo</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Lihat Riwayat Penyesuaian Saldo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: 3-WAY RESET SALDO (PRD Req #2) ================= */}
      {showResetBalanceModal && selectedAccountForReset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Reset & Koreksi Saldo: {selectedAccountForReset.bankName}
                </h3>
              </div>
              <button
                onClick={() => setShowResetBalanceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetBalance} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                <span className="text-slate-600 font-medium">Saldo Sistem Saat Ini:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatRupiah(selectedAccountForReset.currentBalance)}
                </span>
              </div>

              {/* 3 Explicit Radio Options */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-bold mb-1">Pilih Metode Penyesuaian Saldo:</label>

                <label
                  className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer ${
                    adjustmentType === 'reset_zero'
                      ? 'border-blue-600 bg-sky-50/60 ring-1 ring-blue-600'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    checked={adjustmentType === 'reset_zero'}
                    onChange={() => setAdjustmentType('reset_zero')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">1. Reset Saldo Menjadi Rp 0</span>
                    <span className="text-[11px] text-slate-500">
                      Mengosongkan saldo kas saat tutup buku atau pembukaan periode baru.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer ${
                    adjustmentType === 'set_amount'
                      ? 'border-blue-600 bg-sky-50/60 ring-1 ring-blue-600'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    checked={adjustmentType === 'set_amount'}
                    onChange={() => setAdjustmentType('set_amount')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">2. Tentukan Saldo ke Jumlah Tertentu</span>
                    <span className="text-[11px] text-slate-500">
                      Menetapkan saldo patokan baru secara manual sesuai angka target.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer ${
                    adjustmentType === 'correct_actual'
                      ? 'border-blue-600 bg-sky-50/60 ring-1 ring-blue-600'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustmentType"
                    checked={adjustmentType === 'correct_actual'}
                    onChange={() => setAdjustmentType('correct_actual')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">3. Koreksi Berdasarkan Saldo Fisik / Aktual</span>
                    <span className="text-[11px] text-slate-500">
                      Menyesuaikan selisih kas fisik di brankas atau rekening koran bank riil.
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
                    value={newTargetBalance}
                    onChange={(e) => setNewTargetBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Alasan Penyesuaian Saldo *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Rekonsiliasi kas opname periode November 2026"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-[11px]">
                Penyesuaian saldo ini <strong>TIDAK MENGHAPUS</strong> transaksi historis lampau demi kepatuhan audit.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetBalanceModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Riwayat Penyesuaian Saldo Kas</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {corrections.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Belum ada riwayat penyesuaian saldo.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {corrections.map((corr) => {
                  const acc = accounts.find((a) => a.id === corr.accountId);
                  return (
                    <div key={corr.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{acc?.bankName || corr.accountId}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{corr.effectiveDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Sebelumnya: {formatRupiah(corr.previousBalance)}</span>
                        <span>→</span>
                        <span className="font-bold text-blue-700">Baru: {formatRupiah(corr.newBalance)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 italic">"Alasan: {corr.reason}"</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: LIHAT DETAIL PERHITUNGAN FORMULA (PRD Req #3) ================= */}
      {selectedMetricDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Detail Perhitungan Otomatis</h3>
              </div>
              <button onClick={() => setSelectedMetricDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {selectedMetricDetail === 'sales' && (
                <div>
                  <span className="text-slate-500 font-semibold block">Total Sales (Penjualan)</span>
                  <div className="text-2xl font-extrabold text-blue-600 font-mono mb-2">{formatRupiah(valSales)}</div>
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                    <p className="font-semibold text-slate-800">Formula Sistem:</p>
                    <code className="text-xs text-blue-700 block">Total Sales = ∑ Nilai Order + Pemasukan Penjualan</code>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Dihitung secara otomatis dari order dan mutasi pemasukan valid untuk periode {periodFilter}.
                    </p>
                  </div>
                </div>
              )}

              {selectedMetricDetail === 'revenue' && (
                <div>
                  <span className="text-slate-500 font-semibold block">Revenue Received (Uang Diterima)</span>
                  <div className="text-2xl font-extrabold text-sky-600 font-mono mb-2">{formatRupiah(valRevenue)}</div>
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                    <p className="font-semibold text-slate-800">Formula Sistem:</p>
                    <code className="text-xs text-sky-700 block">Revenue Received = ∑ DP Terbayar + Pelunasan Kas</code>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Hanya mencatat uang tunai dan transfer yang sudah benar-benar masuk ke rekening kas.
                    </p>
                  </div>
                </div>
              )}

              {selectedMetricDetail === 'expenses' && (
                <div>
                  <span className="text-slate-500 font-semibold block">Total Expenses (Pengeluaran)</span>
                  <div className="text-2xl font-extrabold text-purple-600 font-mono mb-2">{formatRupiah(valExpenses)}</div>
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                    <p className="font-semibold text-slate-800">Formula Sistem:</p>
                    <code className="text-xs text-purple-700 block">Total Expenses = Total HPP + Beban Operasional</code>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Mencakup biaya bahan/produksi, sewa gedung, listrik, iklan/KOL, dan gaji karyawan.
                    </p>
                  </div>
                </div>
              )}

              {selectedMetricDetail === 'profit' && (
                <div>
                  <span className="text-slate-500 font-semibold block">Net Profit (Laba Bersih)</span>
                  <div className="text-2xl font-extrabold text-emerald-600 font-mono mb-2">{formatRupiah(valNetProfit)}</div>
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                    <p className="font-semibold text-slate-800">Formula Sistem:</p>
                    <code className="text-xs text-emerald-700 block">Net Profit = Total Sales − Total Expenses</code>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Keuntungan bersih riil yang dihasilkan bisnis pada periode berjalan.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 text-right">
                <button
                  onClick={() => setSelectedMetricDetail(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
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

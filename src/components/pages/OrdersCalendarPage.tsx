import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  CreditCard,
  User,
  Phone,
  FileText,
  DollarSign,
  Search,
  Calendar as CalendarIcon,
  Tag,
  Building,
  Globe,
  Zap,
  Briefcase,
  Users,
  Sparkles,
  Check,
  X,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Order,
  Account,
  Product,
  CalendarEvent,
  EventCategory,
} from '../../types/index';

export const OrdersCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const { activeBusiness, refreshSummary } = useBusiness();

  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & View States
  const [activeTab, setActiveTab] = useState<'orders' | 'calendar'>('orders');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 10, 9)); // Nov 2026 base
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('2026-11-10');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('all');

  // Modal States
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showOrderPaymentModal, setShowOrderPaymentModal] = useState(false);
  const [showPayEventModal, setShowPayEventModal] = useState(false);

  // Selected Order for Payment
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState('');

  // Selected Event for Pay & Record Expense
  const [selectedEventForPay, setSelectedEventForPay] = useState<CalendarEvent | null>(null);
  const [eventPayAccountId, setEventPayAccountId] = useState<string>('');
  const [eventPayDate, setEventPayDate] = useState<string>('2026-11-10');
  const [eventPayNote, setEventPayNote] = useState<string>('');
  const [isPayingEvent, setIsPayingEvent] = useState(false);

  // New Order Form
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderDate: '2026-11-09',
    deadline: '2026-11-16',
    notes: '',
    downPayment: 0,
    accountId: '',
    items: [{ name: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
  });

  // New Calendar Event Form
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    category: 'rent' as EventCategory,
    date: '2026-11-15',
    dueDate: '2026-11-15',
    amount: 1500000,
    description: '',
    isRecurring: false,
    recurringInterval: 'monthly' as 'monthly' | 'yearly',
    actionType: 'schedule_only' as 'schedule_only' | 'pay_now',
    payAccountId: '',
  });

  const loadData = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const [ordList, evtList, accList, prodList] = await Promise.all([
        api.getOrders(activeBusiness.id),
        api.getEvents(activeBusiness.id),
        api.getAccounts(activeBusiness.id),
        api.getProducts(activeBusiness.id),
      ]);
      setOrders(ordList);
      setEvents(evtList);
      setAccounts(accList);
      setProducts(prodList);
      if (accList.length > 0) {
        setPaymentAccountId(accList[0].id);
        setEventPayAccountId(accList[0].id);
        setNewOrderForm((prev) => ({ ...prev, accountId: accList[0].id }));
        setNewEventForm((prev) => ({ ...prev, payAccountId: accList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load orders, events & accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusiness]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.fulfillmentStatus === statusFilter;
    const matchesPayment = paymentFilter === 'all' || o.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Filtered events
  const filteredEvents = events.filter((e) => {
    if (eventCategoryFilter === 'all') return true;
    return e.category === eventCategoryFilter;
  });

  // Reminders (PRD Section 7.3)
  const todayStr = '2026-11-09';
  const approachingDeadlineOrders = orders.filter((o) => {
    if (o.fulfillmentStatus === 'completed' || o.fulfillmentStatus === 'cancelled') return false;
    const diffDays = Math.ceil(
      (new Date(o.deadline).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays >= 0 && diffDays <= 4;
  });

  const overdueOrders = orders.filter((o) => {
    if (o.fulfillmentStatus === 'completed' || o.fulfillmentStatus === 'cancelled') return false;
    return new Date(o.deadline) < new Date(todayStr);
  });

  const unpaidOrders = orders.filter((o) => o.paymentStatus !== 'paid' && o.remainingBalance > 0);

  // Upcoming unpaid events (due within 7 days)
  const upcomingUnpaidEvents = events.filter((e) => e.status === 'scheduled');

  // Calculations
  const calculateTotalOrderAmount = () => {
    return newOrderForm.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleAddItemRow = () => {
    setNewOrderForm({
      ...newOrderForm,
      items: [...newOrderForm.items, { name: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...newOrderForm.items];
    const current = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      current.totalPrice = Number(current.quantity) * Number(current.unitPrice);
    }
    updated[index] = current;
    setNewOrderForm({ ...newOrderForm, items: updated });
  };

  const handleSelectProduct = (index: number, prodId: string) => {
    const p = products.find((prod) => prod.id === prodId);
    if (!p) return;
    const updated = [...newOrderForm.items];
    updated[index] = {
      name: p.name,
      quantity: 1,
      unitPrice: p.sellingPrice,
      totalPrice: p.sellingPrice,
    };
    setNewOrderForm({ ...newOrderForm, items: updated });
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    const totalAmount = calculateTotalOrderAmount();
    if (totalAmount <= 0) {
      alert('Total nilai order harus lebih besar dari 0');
      return;
    }
    try {
      await api.createOrder(activeBusiness.id, {
        customerName: newOrderForm.customerName,
        customerPhone: newOrderForm.customerPhone,
        customerEmail: newOrderForm.customerEmail,
        orderDate: newOrderForm.orderDate,
        deadline: newOrderForm.deadline,
        items: newOrderForm.items,
        totalAmount,
        downPayment: Number(newOrderForm.downPayment) || 0,
        accountId: newOrderForm.accountId,
        notes: newOrderForm.notes,
      });
      await loadData();
      await refreshSummary();
      setShowNewOrderModal(false);
      setNewOrderForm({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        orderDate: todayStr,
        deadline: '2026-11-16',
        notes: '',
        downPayment: 0,
        accountId: accounts[0]?.id || '',
        items: [{ name: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
      });
    } catch (err: any) {
      alert(err.message || 'Gagal membuat pesanan');
    }
  };

  // Create new Calendar Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      const created = await api.createEvent(activeBusiness.id, {
        title: newEventForm.title,
        category: newEventForm.category,
        date: newEventForm.date,
        dueDate: newEventForm.dueDate,
        amount: Number(newEventForm.amount) || 0,
        description: newEventForm.description,
        isRecurring: newEventForm.isRecurring,
        recurringInterval: newEventForm.isRecurring ? newEventForm.recurringInterval : undefined,
        status: newEventForm.actionType === 'pay_now' ? 'paid' : 'scheduled',
      });

      // If user selected "Bayar sekarang & catat pengeluaran kas"
      if (newEventForm.actionType === 'pay_now' && newEventForm.payAccountId && newEventForm.amount > 0) {
        await api.payEvent(activeBusiness.id, created.id, {
          accountId: newEventForm.payAccountId,
          date: newEventForm.date,
          note: `Pembayaran langsung jadwal: ${newEventForm.title}`,
        });
      }

      await loadData();
      await refreshSummary();
      setShowNewEventModal(false);
      setNewEventForm({
        title: '',
        category: 'rent',
        date: '2026-11-15',
        dueDate: '2026-11-15',
        amount: 1500000,
        description: '',
        isRecurring: false,
        recurringInterval: 'monthly',
        actionType: 'schedule_only',
        payAccountId: accounts[0]?.id || '',
      });
    } catch (err: any) {
      alert(err.message || 'Gagal membuat agenda kalender');
    }
  };

  // Open Pay Modal for a Scheduled Event
  const handleOpenPayEvent = (event: CalendarEvent) => {
    setSelectedEventForPay(event);
    setEventPayAccountId(accounts[0]?.id || '');
    setEventPayDate('2026-11-10');
    setEventPayNote(`Pembayaran kewajiban: ${event.title}`);
    setShowPayEventModal(true);
  };

  // Execute Pay Event (Records expense automatically in 1 click without double counting)
  const handleConfirmPayEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !selectedEventForPay) return;
    setIsPayingEvent(true);
    try {
      await api.payEvent(activeBusiness.id, selectedEventForPay.id, {
        accountId: eventPayAccountId,
        date: eventPayDate,
        note: eventPayNote,
      });
      await loadData();
      await refreshSummary();
      setShowPayEventModal(false);
      setSelectedEventForPay(null);
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat pembayaran kewajiban');
    } finally {
      setIsPayingEvent(false);
    }
  };

  const handleOpenPayment = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentAmount(order.remainingBalance);
    setPaymentNote(`Pelunasan Order ${order.orderNumber}`);
    setShowOrderPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !selectedOrderForPayment) return;
    try {
      await api.recordOrderPayment(activeBusiness.id, selectedOrderForPayment.id, {
        amount: Number(paymentAmount),
        accountId: paymentAccountId,
        date: todayStr,
        type: paymentAmount >= selectedOrderForPayment.remainingBalance ? 'settlement' : 'installment',
        note: paymentNote,
      });
      await loadData();
      await refreshSummary();
      setShowOrderPaymentModal(false);
      setSelectedOrderForPayment(null);
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat pembayaran');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: any) => {
    if (!activeBusiness) return;
    try {
      await api.updateOrderStatus(activeBusiness.id, orderId, status);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status');
    }
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push(dStr);
  }

  // Selected date events & orders
  const selectedDateOrders = orders.filter(
    (o) => o.deadline === selectedCalendarDate || o.orderDate === selectedCalendarDate
  );
  const selectedDateEvents = events.filter(
    (e) => e.date === selectedCalendarDate || e.dueDate === selectedCalendarDate
  );

  // Category Icon & Label mapping
  const getCategoryMeta = (cat: EventCategory) => {
    switch (cat) {
      case 'rent':
        return { label: 'Sewa Gedung / Toko', icon: Building, color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'domain_hosting':
        return { label: 'Hosting & Domain', icon: Globe, color: 'text-sky-600 bg-sky-50 border-sky-200' };
      case 'utilities':
        return { label: 'Listrik & Utilitas', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'vendor':
        return { label: 'Tagihan Vendor', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
      case 'payroll':
        return { label: 'Gaji Karyawan', icon: Users, color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'workshop':
        return { label: 'Workshop & Event', icon: Sparkles, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      default:
        return { label: 'Agenda Lainnya', icon: CalendarIcon, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Orders & Calendar Workspace</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau pesanan pelanggan, jadwal deadline, tagihan berkala (sewa, domain, vendor), serta eksekusi bayar langsung.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Segmented Tab */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'orders' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Pesanan ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'calendar' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kalender & Agenda ({events.length})
            </button>
          </div>

          {!user?.isReadOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewEventModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors"
                title="Tambah Jadwal Tagihan / Event"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Jadwal / Tagihan</span>
              </button>

              <button
                onClick={() => setShowNewOrderModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat Pesanan Baru</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reminders Bar (PRD Section 7.3) */}
      {(approachingDeadlineOrders.length > 0 || overdueOrders.length > 0 || upcomingUnpaidEvents.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {approachingDeadlineOrders.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-900 block">Deadline Order Mendekat (H-4)</span>
                <span className="text-amber-800 text-[11px]">
                  {approachingDeadlineOrders.length} order perlu diselesaikan ({approachingDeadlineOrders.map((o) => o.orderNumber).slice(0, 2).join(', ')})
                </span>
              </div>
            </div>
          )}

          {overdueOrders.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-rose-900 block">Order Terlambat</span>
                <span className="text-rose-800 text-[11px]">
                  {overdueOrders.length} order melewati tanggal deadline!
                </span>
              </div>
            </div>
          )}

          {upcomingUnpaidEvents.length > 0 && (
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200/80 flex items-start gap-3">
              <CalendarIcon className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-purple-900 block">Kewajiban Tagihan Terjadwal</span>
                <span className="text-purple-800 text-[11px]">
                  {upcomingUnpaidEvents.length} tagihan belum dibayar: total {formatRupiah(upcomingUnpaidEvents.reduce((s, e) => s + (e.amount || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'orders' ? (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nomor order atau nama klien..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Status Kerja:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="all">Semua Status</option>
                  <option value="new">New Order</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_payment">Waiting Payment</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Status Bayar:</span>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="all">Semua Pembayaran</option>
                  <option value="unpaid">Belum Bayar</option>
                  <option value="partial">DP Sebagian</option>
                  <option value="paid">Lunas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">No. Order & Pelanggan</th>
                    <th className="px-4 py-3">Tanggal & Deadline</th>
                    <th className="px-4 py-3 text-right">Total Nilai</th>
                    <th className="px-4 py-3 text-right">DP / Terbayar</th>
                    <th className="px-4 py-3 text-right">Sisa Tagihan</th>
                    <th className="px-4 py-3">Status Bayar</th>
                    <th className="px-4 py-3">Status Pengerjaan</th>
                    <th className="px-4 py-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada pesanan yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-slate-900">{order.orderNumber}</p>
                          <p className="text-slate-600 font-medium">{order.customerName}</p>
                          {order.customerPhone && (
                            <p className="text-[10px] text-slate-400">{order.customerPhone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700">Order: {order.orderDate}</p>
                          <p className="text-indigo-600 font-medium mt-0.5">Deadline: {order.deadline}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatRupiah(order.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 tabular-nums">
                          {formatRupiah(order.totalPaid)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600 tabular-nums font-semibold">
                          {formatRupiah(order.remainingBalance)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              order.paymentStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : order.paymentStatus === 'partial'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {order.paymentStatus === 'paid'
                              ? 'Lunas'
                              : order.paymentStatus === 'partial'
                              ? 'DP Terbayar'
                              : 'Belum Bayar'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {!user?.isReadOnly ? (
                            <select
                              value={order.fulfillmentStatus}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                              className="px-2 py-1 text-[11px] font-medium border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="new">New Order</option>
                              <option value="in_progress">In Progress</option>
                              <option value="waiting_payment">Waiting Payment</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          ) : (
                            <span className="text-slate-700 capitalize font-medium">
                              {order.fulfillmentStatus.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!user?.isReadOnly && order.remainingBalance > 0 && (
                            <button
                              onClick={() => handleOpenPayment(order)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-semibold text-[11px] transition-colors"
                            >
                              Catat Pembayaran
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Calendar & Events View (PRD Section 7.2) */
        <div className="space-y-4">
          {/* Calendar View Switcher & Category Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Tampilan:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    calendarView === 'month' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Bulan
                </button>
                <button
                  onClick={() => setCalendarView('agenda')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    calendarView === 'agenda' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Agenda / Daftar Tagihan
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Kategori:</span>
              <select
                value={eventCategoryFilter}
                onChange={(e) => setEventCategoryFilter(e.target.value)}
                className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white"
              >
                <option value="all">Semua Kategori</option>
                <option value="rent">Sewa Gedung / Toko</option>
                <option value="domain_hosting">Hosting & Domain</option>
                <option value="utilities">Listrik & Internet</option>
                <option value="vendor">Tagihan Vendor</option>
                <option value="payroll">Gaji Karyawan</option>
                <option value="workshop">Workshop & Event</option>
              </select>
            </div>
          </div>

          {calendarView === 'month' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5">
                {/* Calendar Controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {monthNames[month]} {year}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded-md"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date(2026, 10, 9))}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md"
                    >
                      Hari Ini
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded-md"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                    <div key={d} className="py-1.5 font-bold text-slate-400 text-[10px] uppercase">
                      {d}
                    </div>
                  ))}

                  {calendarDays.map((dStr, idx) => {
                    if (!dStr) {
                      return <div key={`empty-${idx}`} className="h-24 bg-slate-50/30 rounded-lg" />;
                    }
                    const dayNum = parseInt(dStr.split('-')[2]);
                    const dayOrders = orders.filter((o) => o.deadline === dStr || o.orderDate === dStr);
                    const dayEvents = filteredEvents.filter((e) => e.date === dStr || e.dueDate === dStr);
                    const isSelected = selectedCalendarDate === dStr;
                    const isToday = dStr === todayStr;

                    return (
                      <div
                        key={dStr}
                        onClick={() => setSelectedCalendarDate(dStr)}
                        className={`h-24 p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : isToday
                            ? 'border-amber-400 bg-amber-50/30'
                            : 'border-slate-100 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold ${
                              isToday ? 'text-amber-600 font-extrabold' : 'text-slate-700'
                            }`}
                          >
                            {dayNum}
                          </span>
                          <div className="flex items-center gap-1">
                            {dayEvents.length > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Ada tagihan/kegiatan" />
                            )}
                            {dayOrders.length > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" title="Ada order" />
                            )}
                          </div>
                        </div>

                        <div className="space-y-0.5 overflow-hidden">
                          {/* Event tags */}
                          {dayEvents.slice(0, 1).map((e) => (
                            <div
                              key={e.id}
                              className={`text-[9px] truncate px-1 py-0.5 rounded font-medium ${
                                e.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                              title={`${e.title} (${formatRupiah(e.amount || 0)})`}
                            >
                              📌 {e.title}
                            </div>
                          ))}

                          {/* Order tags */}
                          {dayOrders.slice(0, 1).map((o) => (
                            <div
                              key={o.id}
                              className="text-[9px] truncate px-1 py-0.5 rounded bg-sky-100 text-sky-800 font-medium"
                              title={`${o.orderNumber}: ${o.customerName}`}
                            >
                              📦 {o.orderNumber}
                            </div>
                          ))}

                          {dayOrders.length + dayEvents.length > 2 && (
                            <span className="text-[9px] text-slate-400 block leading-none">
                              +{dayOrders.length + dayEvents.length - 2} lagi
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date Details Drawer */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Agenda: {selectedCalendarDate}</h3>
                    <p className="text-[11px] text-slate-500">Order dan komitmen tagihan pada tanggal ini.</p>
                  </div>
                  {!user?.isReadOnly && (
                    <button
                      onClick={() => {
                        setNewEventForm((prev) => ({ ...prev, date: selectedCalendarDate, dueDate: selectedCalendarDate }));
                        setShowNewEventModal(true);
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      + Agenda
                    </button>
                  )}
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[500px] flex-1">
                  {/* Scheduled Events / Bills Section */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Kewajiban Tagihan & Kegiatan ({selectedDateEvents.length})
                    </span>

                    {selectedDateEvents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada jadwal tagihan pada tanggal ini.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDateEvents.map((evt) => {
                          const meta = getCategoryMeta(evt.category);
                          const Icon = meta.icon;
                          return (
                            <div
                              key={evt.id}
                              className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className={`p-1 rounded-md ${meta.color}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                  </span>
                                  <span className="font-bold text-slate-900">{evt.title}</span>
                                </div>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    evt.status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {evt.status === 'paid' ? 'Sudah Dibayar' : 'Terjadwal (Belum Bayar)'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500">{meta.label}</span>
                                <span className="font-mono font-bold text-slate-900">{formatRupiah(evt.amount || 0)}</span>
                              </div>

                              {evt.description && (
                                <p className="text-[11px] text-slate-500">{evt.description}</p>
                              )}

                              {!user?.isReadOnly && evt.status === 'scheduled' && (
                                <div className="pt-1.5 flex justify-end">
                                  <button
                                    onClick={() => handleOpenPayEvent(evt)}
                                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-[11px] shadow-xs flex items-center gap-1"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Bayar & Catat Pengeluaran</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Orders Deadline Section */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Pesanan Deadline ({selectedDateOrders.length})
                    </span>

                    {selectedDateOrders.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada deadline pesanan pada tanggal ini.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDateOrders.map((o) => (
                          <div
                            key={o.id}
                            className="p-3 rounded-xl border border-sky-100 bg-sky-50/40 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-indigo-700">{o.orderNumber}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                                {o.fulfillmentStatus}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-800">{o.customerName}</p>
                            <div className="flex justify-between text-[11px]">
                              <span>Total: {formatRupiah(o.totalAmount)}</span>
                              <span className="text-rose-600 font-semibold">Sisa: {formatRupiah(o.remainingBalance)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Agenda / List View of All Events */
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Agenda & Daftar Kewajiban Pembayaran</h3>
                  <p className="text-xs text-slate-500">
                    Mencatat seluruh sewa gedung, hosting, utilitas, vendor, dan kegiatan operasional.
                  </p>
                </div>
                {!user?.isReadOnly && (
                  <button
                    onClick={() => setShowNewEventModal(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    + Tambah Agenda
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {filteredEvents.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Belum ada agenda atau komitmen tercatat pada filter ini.
                  </div>
                ) : (
                  filteredEvents.map((evt) => {
                    const meta = getCategoryMeta(evt.category);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={evt.id}
                        className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className={`p-2 rounded-lg mt-0.5 ${meta.color} shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm truncate">{evt.title}</h4>
                              {evt.isRecurring && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                  Rutin: {evt.recurringInterval}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                              <span>Kategori: {meta.label}</span>
                              <span>·</span>
                              <span>Jatuh Tempo: {evt.dueDate || evt.date}</span>
                            </div>
                            {evt.description && (
                              <p className="text-slate-600 text-[11px] mt-1">{evt.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums block">
                              {formatRupiah(evt.amount || 0)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                evt.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {evt.status === 'paid' ? 'Lunas / Terbayar' : 'Belum Dibayar'}
                            </span>
                          </div>

                          {!user?.isReadOnly && evt.status === 'scheduled' && (
                            <button
                              onClick={() => handleOpenPayEvent(evt)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Bayar & Catat Kas</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: BAYAR & CATAT PENGELUARAN JADWAL ================= */}
      {showPayEventModal && selectedEventForPay && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Bayar Kewajiban & Catat Kas</h3>
              </div>
              <button
                onClick={() => setShowPayEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayEvent} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Judul Kewajiban:</span>
                  <span className="font-bold text-slate-800">{selectedEventForPay.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nominal Tagihan:</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    {formatRupiah(selectedEventForPay.amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Jatuh Tempo:</span>
                  <span>{selectedEventForPay.dueDate || selectedEventForPay.date}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pilih Rekening Kas Pembayar *</label>
                <select
                  required
                  value={eventPayAccountId}
                  onChange={(e) => setEventPayAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} - {a.accountNumber} (Saldo: {formatRupiah(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tanggal Pembayaran *</label>
                <input
                  type="date"
                  required
                  value={eventPayDate}
                  onChange={(e) => setEventPayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Catatan Mutasi Kas</label>
                <input
                  type="text"
                  value={eventPayNote}
                  onChange={(e) => setEventPayNote(e.target.value)}
                  placeholder="Misal: Dibayar via transfer mobile banking"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px]">
                Tindakan ini akan memotong saldo rekening terpilih sebesar{' '}
                <strong>{formatRupiah(selectedEventForPay.amount || 0)}</strong> dan menandai kewajiban lunas tanpa double counting.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayEventModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPayingEvent}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {isPayingEvent ? 'Memproses...' : 'Konfirmasi Bayar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAMBAH AGENDA / TAGIHAN ================= */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Jadwalkan Kewajiban / Kegiatan Baru</h3>
              </div>
              <button
                onClick={() => setShowNewEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Judul Agenda / Tagihan *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Sewa Ruko Butik Tahap 2, Hosting Niagahoster..."
                  value={newEventForm.title}
                  onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori Kewajiban *</label>
                  <select
                    value={newEventForm.category}
                    onChange={(e) => setNewEventForm({ ...newEventForm, category: e.target.value as EventCategory })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="rent">Sewa Gedung / Toko</option>
                    <option value="domain_hosting">Hosting & Domain</option>
                    <option value="utilities">Listrik & Internet</option>
                    <option value="vendor">Pembayaran Vendor</option>
                    <option value="payroll">Gaji Karyawan</option>
                    <option value="workshop">Workshop & Event</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nominal (IDR)</label>
                  <input
                    type="number"
                    min={0}
                    value={newEventForm.amount}
                    onChange={(e) => setNewEventForm({ ...newEventForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={newEventForm.date}
                    onChange={(e) => setNewEventForm({ ...newEventForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batas Waktu (Jatuh Tempo) *</label>
                  <input
                    type="date"
                    required
                    value={newEventForm.dueDate}
                    onChange={(e) => setNewEventForm({ ...newEventForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Recurring Switch */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={newEventForm.isRecurring}
                    onChange={(e) => setNewEventForm({ ...newEventForm, isRecurring: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Tagihan Berulang (Recurring)</span>
                </label>

                {newEventForm.isRecurring && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-slate-500">Interval Berulang:</span>
                    <select
                      value={newEventForm.recurringInterval}
                      onChange={(e) => setNewEventForm({ ...newEventForm, recurringInterval: e.target.value as any })}
                      className="px-2 py-1 border border-slate-200 rounded-md bg-white text-xs"
                    >
                      <option value="monthly">Bulanan (Monthly)</option>
                      <option value="yearly">Tahunan (Yearly)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action Type: Schedule vs Pay Now (PRD Key Requirement) */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-semibold">Tindakan Eksekusi:</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer ${
                      newEventForm.actionType === 'schedule_only'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="actionType"
                        checked={newEventForm.actionType === 'schedule_only'}
                        onChange={() => setNewEventForm({ ...newEventForm, actionType: 'schedule_only' })}
                        className="text-indigo-600"
                      />
                      <span className="font-bold text-slate-900">Jadwalkan Saja</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Dicatat sebagai komitmen, belum memotong saldo kas saat ini.
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer ${
                      newEventForm.actionType === 'pay_now'
                        ? 'border-rose-600 bg-rose-50/50 ring-1 ring-rose-600'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="actionType"
                        checked={newEventForm.actionType === 'pay_now'}
                        onChange={() => setNewEventForm({ ...newEventForm, actionType: 'pay_now' })}
                        className="text-rose-600"
                      />
                      <span className="font-bold text-slate-900">Bayar Sekarang</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Langsung catat pengeluaran kas dan potong rekening terpilih.
                    </span>
                  </label>
                </div>
              </div>

              {newEventForm.actionType === 'pay_now' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Potong dari Rekening Kas *</label>
                  <select
                    value={newEventForm.payAccountId}
                    onChange={(e) => setNewEventForm({ ...newEventForm, payAccountId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName} ({a.accountNumber}) - Saldo: {formatRupiah(a.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Deskripsi Tambahan</label>
                <textarea
                  rows={2}
                  value={newEventForm.description}
                  onChange={(e) => setNewEventForm({ ...newEventForm, description: e.target.value })}
                  placeholder="Keterangan kontrak, rekening tujuan vendor, dll..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CATAT PEMBAYARAN ORDER ================= */}
      {showOrderPaymentModal && selectedOrderForPayment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Catat Pembayaran: {selectedOrderForPayment.orderNumber}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pembayaran ini akan langsung menambah kas pada rekening terpilih dan memperbarui sisa tagihan order.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Pelanggan:</span>
                  <span className="font-semibold text-slate-900">{selectedOrderForPayment.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Order:</span>
                  <span className="font-mono text-slate-900">{formatRupiah(selectedOrderForPayment.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sudah Terbayar:</span>
                  <span className="font-mono text-emerald-600">{formatRupiah(selectedOrderForPayment.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-bold border-t border-slate-200 pt-1 mt-1">
                  <span>Sisa Tagihan:</span>
                  <span className="font-mono text-rose-600">{formatRupiah(selectedOrderForPayment.remainingBalance)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Jumlah Pembayaran Diterima (IDR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedOrderForPayment.remainingBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Masuk ke Rekening Kas *</label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} - {a.accountNumber} (Saldo: {formatRupiah(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Catatan Pembayaran</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Misal: Pelunasan transfer Mandiri"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOrderPaymentModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold shadow-xs"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BUAT PESANAN BARU ================= */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">Buat Pesanan Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Isi rincian pemesan, produk yang dipesan, deadline pengerjaan, dan uang muka (DP).
            </p>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Klien / Pelanggan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap atau butik"
                    value={newOrderForm.customerName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nomor WhatsApp / Kontak</label>
                  <input
                    type="text"
                    placeholder="+62812..."
                    value={newOrderForm.customerPhone}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal Deadline *</label>
                  <input
                    type="date"
                    required
                    value={newOrderForm.deadline}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs">Rincian Item & Produk</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold text-xs"
                  >
                    + Tambah Baris
                  </button>
                </div>

                {newOrderForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      {products.length > 0 ? (
                        <select
                          onChange={(e) => handleSelectProduct(idx, e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="">-- Pilih dari Katalog atau ketik manual --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatRupiah(p.sellingPrice)})
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <input
                        type="text"
                        placeholder="Nama produk/layanan..."
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-center"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        min={0}
                        placeholder="Harga Satuan"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-right"
                      />
                    </div>
                  </div>
                ))}

                <div className="text-right pt-2 border-t border-slate-200 font-bold text-slate-800 font-mono text-xs">
                  Total Nilai Order: {formatRupiah(calculateTotalOrderAmount())}
                </div>
              </div>

              {/* Down Payment & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Uang Muka (DP) Diterima</label>
                  <input
                    type="number"
                    min={0}
                    max={calculateTotalOrderAmount()}
                    value={newOrderForm.downPayment}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, downPayment: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Bila DP diisi, akan otomatis dicatat sebagai pemasukan kas.</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Rekening Kas Penerima</label>
                  <select
                    value={newOrderForm.accountId}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, accountId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName} ({a.accountNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Instruksi pengerjaan, spesifikasi bahan, catatan pengiriman..."
                  value={newOrderForm.notes}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-semibold shadow-xs"
                >
                  Simpan Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

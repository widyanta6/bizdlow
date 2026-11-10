import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import { storage } from './server/storage.js';
import { User } from './src/types/index.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Setup uploads directory
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  },
});
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers['x-user-id'] as string;

  let userId: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.substring(7).trim();
  } else if (userIdHeader) {
    userId = userIdHeader.trim();
  }

  if (!userId) {
    // Default to Ika if no user provided, or return 401 for protected
    userId = 'u_ika';
  }

  const user = storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ error: 'Sesi tidak valid. Silakan login kembali.' });
  }

  req.user = user;
  next();
};

// ================= API ROUTES =================

// Auth Endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }
  const user = storage.authenticate(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }
  return res.json({
    user,
    token: user.id, // Bearer token uses user ID for clean stateful verification
  });
});

app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

app.post('/api/auth/change-password', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi' });
  }
  const result = storage.changePassword(req.user!.id, currentPassword, newPassword);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  return res.json({ message: result.message });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email dan password baru wajib diisi' });
  }
  const result = storage.forgotPassword(email, newPassword);
  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }
  return res.json({ message: result.message });
});

app.post('/api/auth/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  storage.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'USER_LOGOUT',
    details: `User ${req.user!.name} logout`,
    status: 'success',
  });
  return res.json({ message: 'Logout berhasil' });
});

// Businesses Endpoints
app.get('/api/businesses', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const businesses = storage.getBusinessesForUser(req.user!);
  return res.json({ businesses });
});

app.get('/api/businesses/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const biz = storage.getBusiness(req.user!, req.params.id);
  if (!biz) {
    return res.status(403).json({ error: 'Akses ditolak ke data bisnis ini' });
  }
  return res.json({ business: biz });
});

app.post('/api/businesses', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, tagline, description, category, currency, taxRate } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Nama dan kategori bisnis wajib diisi' });
    }
    const newBiz = storage.createBusiness(req.user!, {
      name,
      tagline: tagline || '',
      description: description || '',
      category,
      currency: currency || 'IDR',
      isArchived: false,
      taxRate: taxRate || 0.11,
    });
    return res.json({ business: newBiz });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.put('/api/businesses/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = storage.updateBusiness(req.user!, req.params.id, req.body);
    return res.json({ business: updated });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.post('/api/businesses/:id/archive', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { archive } = req.body;
    const updated = storage.archiveBusiness(req.user!, req.params.id, !!archive);
    return res.json({ business: updated });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.get('/api/businesses/:id/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = req.query.period as any;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const summary = storage.getFinancialSummary(req.user!, req.params.id, period, startDate, endDate);
    return res.json({ summary });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.get('/api/businesses/:id/monthly-performance', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const year = req.query.year ? parseInt(req.query.year as string) : 2026;
  const performance = storage.getMonthlyPerformance(req.user!, req.params.id, year);
  return res.json({ performance });
});

// Accounts Endpoints
app.get('/api/businesses/:id/accounts', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const accounts = storage.getAccounts(req.user!, req.params.id);
  return res.json({ accounts });
});

app.post('/api/businesses/:id/accounts', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bankName, accountNumber, holderName, type, initialBalance } = req.body;
    const acc = storage.createAccount(req.user!, req.params.id, {
      bankName,
      accountNumber,
      holderName,
      type: type || 'bank',
      initialBalance: Number(initialBalance) || 0,
    });
    return res.json({ account: acc });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.put('/api/businesses/:id/accounts/:accId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const acc = storage.updateAccount(req.user!, req.params.id, req.params.accId, req.body);
    return res.json({ account: acc });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.post('/api/businesses/:id/accounts/:accId/reset', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mode, targetAmount, reason, effectiveDate } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Alasan penyesuaian/koreksi saldo wajib disertakan untuk audit' });
    }
    const correction = storage.resetAccountBalance(
      req.user!,
      req.params.id,
      req.params.accId,
      mode || 'correct_actual',
      Number(targetAmount) || 0,
      reason,
      effectiveDate || new Date().toISOString().split('T')[0]
    );
    return res.json({ correction });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.post('/api/businesses/:id/accounts/:accId/archive', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { archive } = req.body;
    const acc = storage.archiveAccount(req.user!, req.params.id, req.params.accId, !!archive);
    return res.json({ account: acc });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.get('/api/businesses/:id/balance-corrections', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.query.accountId as string | undefined;
  const corrections = storage.getBalanceCorrections(req.user!, req.params.id, accountId);
  return res.json({ corrections });
});

// Transactions Endpoints
app.get('/api/businesses/:id/transactions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const period = req.query.period as any;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const transactions = storage.getTransactions(req.user!, req.params.id, { period, startDate, endDate });
  return res.json({ transactions });
});

app.post('/api/businesses/:id/transactions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, type, category, amount, accountId, description, isCOGS, receiptFileId, receiptFileName, orderId } = req.body;
    if (!amount || !accountId || !category || !type) {
      return res.status(400).json({ error: 'Jumlah, rekening, kategori, dan jenis transaksi wajib diisi' });
    }
    const tx = storage.createTransaction(req.user!, req.params.id, {
      date: date || new Date().toISOString().split('T')[0],
      type,
      category,
      amount: Number(amount),
      accountId,
      description: description || '',
      isCOGS: !!isCOGS,
      receiptFileId,
      receiptFileName,
      orderId,
    });
    return res.json({ transaction: tx });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.delete('/api/businesses/:id/transactions/:txId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = storage.deleteTransaction(req.user!, req.params.id, req.params.txId);
    if (!success) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    return res.json({ message: 'Transaksi berhasil dihapus dan saldo rekening disesuaikan' });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Products Endpoints
app.get('/api/businesses/:id/products', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const products = storage.getProducts(req.user!, req.params.id);
  return res.json({ products });
});

app.post('/api/businesses/:id/products', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sku, name, category, sellingPrice, cogs, stockQuantity, minStock, unit } = req.body;
    const prod = storage.createProduct(req.user!, req.params.id, {
      sku: sku || 'SKU-' + Math.floor(Math.random() * 1000),
      name,
      category: category || 'Umum',
      sellingPrice: Number(sellingPrice) || 0,
      cogs: Number(cogs) || 0,
      stockQuantity: Number(stockQuantity) || 0,
      minStock: Number(minStock) || 5,
      unit: unit || 'pcs',
    });
    return res.json({ product: prod });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.put('/api/businesses/:id/products/:prodId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = storage.updateProduct(req.user!, req.params.id, req.params.prodId, req.body);
    return res.json({ product: updated });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Orders Endpoints
app.get('/api/businesses/:id/orders', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const orders = storage.getOrders(req.user!, req.params.id);
  return res.json({ orders });
});

app.post('/api/businesses/:id/orders', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerName, customerPhone, customerEmail, orderDate, deadline, items, totalAmount, downPayment, accountId, notes } = req.body;
    if (!customerName || !deadline || !totalAmount) {
      return res.status(400).json({ error: 'Nama pelanggan, deadline, dan total order wajib diisi' });
    }
    const order = storage.createOrder(req.user!, req.params.id, {
      customerName,
      customerPhone,
      customerEmail,
      orderDate: orderDate || new Date().toISOString().split('T')[0],
      deadline,
      items: items || [],
      totalAmount: Number(totalAmount),
      downPayment: Number(downPayment) || 0,
      accountId,
      notes,
    });
    return res.json({ order });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.post('/api/businesses/:id/orders/:orderId/pay', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, accountId, date, type, note } = req.body;
    if (!amount || !accountId) {
      return res.status(400).json({ error: 'Jumlah pembayaran dan rekening penerima wajib disertakan' });
    }
    const updatedOrder = storage.recordOrderPayment(req.user!, req.params.id, req.params.orderId, {
      amount: Number(amount),
      accountId,
      date: date || new Date().toISOString().split('T')[0],
      type: type || 'settlement',
      note,
    });
    return res.json({ order: updatedOrder });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.put('/api/businesses/:id/orders/:orderId/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fulfillmentStatus } = req.body;
    const order = storage.updateOrderStatus(req.user!, req.params.id, req.params.orderId, fulfillmentStatus);
    return res.json({ order });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Calendar Events & Activities Endpoints (PRD Section 6)
app.get('/api/businesses/:id/events', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const events = storage.getEvents(req.user!, req.params.id);
  return res.json({ events });
});

app.post('/api/businesses/:id/events', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, category, date, time, dueDate, amount, recipient, notes, reminderDays } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: 'Judul dan tanggal kegiatan wajib diisi' });
    }
    const ev = storage.createEvent(req.user!, req.params.id, {
      title,
      category: category || 'other',
      date,
      time,
      dueDate,
      amount: amount ? Number(amount) : undefined,
      recipient,
      notes,
      reminderDays: reminderDays ? Number(reminderDays) : undefined,
    });
    return res.json({ event: ev });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.put('/api/businesses/:id/events/:eventId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = storage.updateEvent(req.user!, req.params.id, req.params.eventId, req.body);
    return res.json({ event: updated });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.delete('/api/businesses/:id/events/:eventId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = storage.deleteEvent(req.user!, req.params.id, req.params.eventId);
    return res.json({ success });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.post('/api/businesses/:id/events/:eventId/pay', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, accountId, date, category, note, receiptFileId } = req.body;
    if (!amount || !accountId) {
      return res.status(400).json({ error: 'Nominal pembayaran dan rekening wajib disertakan' });
    }
    const result = storage.payEventAndRecordExpense(req.user!, req.params.id, req.params.eventId, {
      amount: Number(amount),
      accountId,
      date: date || new Date().toISOString().split('T')[0],
      category,
      note,
      receiptFileId,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Demo Data Management Endpoints (PRD Additional Requirements Section 4)
app.get('/api/businesses/:id/demo-data', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = storage.getDemoDataSummary(req.user!, req.params.id);
    return res.json(summary);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.post('/api/businesses/:id/demo-data/clean', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clearTransactions, clearOrders } = req.body;
    const result = storage.cleanDemoData(req.user!, req.params.id, {
      clearTransactions: !!clearTransactions,
      clearOrders: !!clearOrders,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Comprehensive Data Reset Endpoints (PRD Section 4)
app.get('/api/businesses/:id/data-reset/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = storage.getDataResetSummary(req.user!, req.params.id);
    return res.json(summary);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.post('/api/businesses/:id/data-reset/execute', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resetType, confirmationWord, customOptions } = req.body;
    if (!resetType) {
      return res.status(400).json({ error: 'Jenis reset data wajib dipilih' });
    }
    const result = storage.executeDataReset(req.user!, req.params.id, {
      resetType,
      confirmationWord,
      customOptions,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Files & Folders Endpoints
app.get('/api/businesses/:id/folders', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const folders = storage.getFolders(req.user!, req.params.id);
  return res.json({ folders });
});

app.post('/api/businesses/:id/folders', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama folder wajib diisi' });
    const folder = storage.createFolder(req.user!, req.params.id, name, color);
    return res.json({ folder });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.delete('/api/businesses/:id/folders/:folderId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = storage.deleteFolder(req.user!, req.params.id, req.params.folderId);
    return res.json({ success });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.get('/api/businesses/:id/files', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const files = storage.getFiles(req.user!, req.params.id);
  return res.json({ files });
});

app.post('/api/businesses/:id/files/upload', authMiddleware, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan' });
    }
    const folderId = req.body.folderId || undefined;
    const newFile = storage.createFile(req.user!, req.params.id, {
      name: req.file.originalname,
      folderId,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      url: `/uploads/${req.file.filename}`,
    });
    return res.json({ file: newFile });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.delete('/api/businesses/:id/files/:fileId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = storage.deleteFile(req.user!, req.params.id, req.params.fileId);
    return res.json({ success });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// KOL & Payroll
app.get('/api/businesses/:id/kol', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const kol = storage.getKOL(req.user!, req.params.id);
  return res.json({ kol });
});

app.get('/api/businesses/:id/payroll', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const payroll = storage.getPayroll(req.user!, req.params.id);
  return res.json({ payroll });
});

// Archives
app.get('/api/businesses/:id/archives', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const archives = storage.getArchives(req.user!, req.params.id);
  return res.json({ archives });
});

app.post('/api/businesses/:id/archives', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, periodMonth, notes } = req.body;
    if (!title || !periodMonth) {
      return res.status(400).json({ error: 'Judul dan bulan periode wajib diisi' });
    }
    const arc = storage.createArchive(req.user!, req.params.id, title, periodMonth, notes);
    return res.json({ archive: arc });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Excel Export (.xlsx)
app.get('/api/businesses/:id/export-excel', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const biz = storage.getBusiness(req.user!, req.params.id);
    if (!biz) return res.status(403).json({ error: 'Akses ditolak' });

    const summary = storage.getFinancialSummary(req.user!, biz.id);
    const txs = storage.getTransactions(req.user!, biz.id);
    const orders = storage.getOrders(req.user!, biz.id);
    const prods = storage.getProducts(req.user!, biz.id);
    const accounts = storage.getAccounts(req.user!, biz.id);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Bisnis & Laba Rugi
    const summaryData = [
      ['BIZFLOW MULTI-BRAND — LAPORAN KEUANGAN BISNIS'],
      ['Nama Bisnis:', biz.name],
      ['Kategori:', biz.category],
      ['Tanggal Ekspor:', new Date().toLocaleString('id-ID')],
      ['Diekspor Oleh:', req.user!.name],
      [],
      ['KOMPONEN LABA RUGI', 'JUMLAH (IDR)', 'KETERANGAN'],
      ['Total Penjualan / Omzet', summary.totalPenjualan, 'Nilai seluruh penjualan produk & jasa'],
      ['Harga Pokok Penjualan (HPP)', summary.totalHPP, 'Biaya langsung bahan baku & produksi'],
      ['LABA KOTOR (Gross Profit)', summary.labaKotor, 'Penjualan - HPP'],
      ['Beban Operasional', summary.bebanOperasional, 'Gaji, sewa, listrik, marketing, dll'],
      ['LABA BERSIH (Net Profit)', summary.labaBersih, 'Laba Kotor - Beban Operasional'],
      [],
      ['POSISI KAS & DANA TERIKAT', 'JUMLAH (IDR)'],
      ['Saldo Kas Aktual', summary.saldoKasAktual],
      ['Piutang / Dana Dialokasikan', summary.danaDialokasikan],
      [],
      ['REKENING KAS TERDAFTAR', 'NOMOR REKENING', 'SALDO SAAT INI (IDR)'],
      ...accounts.map((a) => [a.bankName, a.accountNumber, a.currentBalance]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laba Rugi');

    // Sheet 2: Mutasi Transaksi
    const txHeader = ['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah (IDR)', 'Rekening', 'Dicatat Oleh'];
    const txRows = txs.map((t) => {
      const acc = accounts.find((a) => a.id === t.accountId);
      return [
        t.date,
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        t.category,
        t.description,
        t.amount,
        acc ? `${acc.bankName} (${acc.accountNumber})` : t.accountId,
        t.createdBy,
      ];
    });
    const wsTx = XLSX.utils.aoa_to_sheet([txHeader, ...txRows]);
    XLSX.utils.book_append_sheet(wb, wsTx, 'Mutasi Transaksi');

    // Sheet 3: Pesanan & Order
    const ordHeader = ['No. Order', 'Pelanggan', 'Tanggal Order', 'Deadline', 'Total (IDR)', 'DP / Terbayar (IDR)', 'Sisa (IDR)', 'Status Bayar', 'Status Kerja'];
    const ordRows = orders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.orderDate,
      o.deadline,
      o.totalAmount,
      o.totalPaid,
      o.remainingBalance,
      o.paymentStatus === 'paid' ? 'Lunas' : o.paymentStatus === 'partial' ? 'DP Sebagian' : 'Belum Bayar',
      o.fulfillmentStatus,
    ]);
    const wsOrd = XLSX.utils.aoa_to_sheet([ordHeader, ...ordRows]);
    XLSX.utils.book_append_sheet(wb, wsOrd, 'Daftar Pesanan');

    // Sheet 4: Produk & HPP
    const prodHeader = ['SKU', 'Nama Produk/Jasa', 'Kategori', 'Harga Jual (IDR)', 'HPP / Modal (IDR)', 'Margin Unit (IDR)', 'Stok'];
    const prodRows = prods.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.sellingPrice,
      p.cogs,
      p.sellingPrice - p.cogs,
      p.stockQuantity,
    ]);
    const wsProd = XLSX.utils.aoa_to_sheet([prodHeader, ...prodRows]);
    XLSX.utils.book_append_sheet(wb, wsProd, 'Katalog Produk & HPP');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const filename = `BizFlow_${biz.name.replace(/\s+/g, '_')}_Laporan_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Personal Blog Endpoints
app.get('/api/blogs', authMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  const blogs = storage.getBlogs();
  return res.json({ blogs });
});

app.post('/api/blogs', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan isi tulisan wajib diisi' });
    }
    const blog = storage.createBlog(req.user!, { title, content, tags: tags || [] });
    return res.json({ blog });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.delete('/api/blogs/:blogId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = storage.deleteBlog(req.user!, req.params.blogId);
    return res.json({ success });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Audit Logs
app.get('/api/audit-logs', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.query.businessId as string | undefined;
  const logs = storage.getAuditLogs(req.user!, businessId);
  return res.json({ logs });
});

// BizFlow AI Assistant
app.post('/api/ai/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt, businessId, mode = 'general' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt pesan tidak boleh kosong' });
    }

    if (!process.env.GEMINI_API_KEY || !geminiClient) {
      return res.status(503).json({
        error: 'Layanan AI belum dikonfigurasi. Kunci API Gemini belum tersedia di server.',
      });
    }

    // Verify tenant access for businessId
    const targetBizId = businessId || req.user!.allowedBusinessIds[0];
    if (!storage.checkBusinessAccess(req.user!, targetBizId, false)) {
      return res.status(403).json({ error: 'Akses ditolak ke data bisnis ini' });
    }

    const biz = storage.getBusiness(req.user!, targetBizId);
    const summary = storage.getFinancialSummary(req.user!, targetBizId);
    const txs = storage.getTransactions(req.user!, targetBizId).slice(0, 10);
    const orders = storage.getOrders(req.user!, targetBizId).slice(0, 10);
    const products = storage.getProducts(req.user!, targetBizId).slice(0, 8);

    const systemInstruction = `Anda adalah BizFlow AI Assistant — asisten cerdas untuk platform "BizFlow Multi-Brand Business Management Workspace".
Anda melayani pengguna: ${req.user!.name} (${req.user!.role === 'admin' ? 'Admin Read-Only' : 'Pemilik Bisnis'}).
Bisnis aktif yang sedang dianalisis: "${biz?.name || 'Multi-Brand'}" (Kategori: ${biz?.category}).

ATURAN KEAMANAN & INTEGRITAS KETAT:
1. Hanya gunakan data aktual yang disediakan di bawah. Jangan pernah mengarang angka, transaksi, atau order fiktif.
2. JANGAN PERNAH mencampur data antara bisnis milik Ika (Tirama, CHEMI) dengan bisnis milik Redi (BYE, Metamorph, Presta Media).
3. Jika pengguna adalah Admin read-only, jelaskan bahwa tindakan tulis/edit/pembayaran tidak diizinkan untuk peran mereka.
4. Anda TIDAK dapat secara otomatis menghapus atau mengubah transaksi; selalu arahkan pengguna ke menu dan formulir yang aman di UI.
5. Format mata uang selalu dalam Rupiah Indonesia (Rp).
6. Berikan jawaban yang ramah, profesional, ringkas, dan actionable.

DATA BISNIS AKTIF (${biz?.name}):
- Total Penjualan: Rp ${summary.totalPenjualan.toLocaleString('id-ID')}
- Pemasukan Diterima: Rp ${summary.pemasukanDiterima.toLocaleString('id-ID')}
- Total HPP (Bahan/Modal): Rp ${summary.totalHPP.toLocaleString('id-ID')}
- Laba Kotor: Rp ${summary.labaKotor.toLocaleString('id-ID')}
- Beban Operasional: Rp ${summary.bebanOperasional.toLocaleString('id-ID')}
- Laba Bersih: Rp ${summary.labaBersih.toLocaleString('id-ID')}
- Saldo Kas Aktual: Rp ${summary.saldoKasAktual.toLocaleString('id-ID')}
- Piutang / Dana Terikat: Rp ${summary.danaDialokasikan.toLocaleString('id-ID')}
- Total Order Aktif: ${orders.length} order
- 3 Order Terakhir: ${orders.slice(0, 3).map((o) => `${o.orderNumber} (${o.customerName}, Rp ${o.totalAmount.toLocaleString('id-ID')}, status: ${o.fulfillmentStatus})`).join('; ') || 'Belum ada'}
- Produk Unggulan: ${products.slice(0, 3).map((p) => `${p.name} (Harga Rp ${p.sellingPrice.toLocaleString('id-ID')}, HPP Rp ${p.cogs.toLocaleString('id-ID')})`).join('; ')}

Bila mode adalah 'report', susun draf Laporan Analisis Keuangan Eksekutif dengan struktur:
1. Ringkasan Eksekutif Performa
2. Analisis Margin Laba (Kotor vs Bersih)
3. Evaluasi Arus Kas & Piutang Order
4. Risiko & Rekomendasi Langkah Konkret.`;

    const aiResponse = await geminiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    const reply = aiResponse.text || 'Maaf, tidak dapat menghasilkan tanggapan saat ini.';

    storage.logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      businessId: targetBizId,
      action: 'AI_ASSISTANT_QUERY',
      details: `Menanyakan AI (${mode}): "${prompt.slice(0, 60)}..."`,
      status: 'success',
    });

    return res.json({ reply });
  } catch (err: any) {
    console.error('AI chat error:', err);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan pada layanan AI' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BizFlow server listening on port ${PORT}`);
  });
}

startServer();

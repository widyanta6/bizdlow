import fs from 'fs';
import path from 'path';
import {
  User, Business, Account, BalanceCorrection, BalanceAdjustmentType, Transaction, Product,
  Order, FileItem, FolderItem, KOLCommission, PayrollRecord,
  FinancialArchive, BlogPost, AuditLog, PeriodFilter, CalendarEvent
} from '../src/types/index.js';
import {
  INITIAL_USERS, INITIAL_BUSINESSES, INITIAL_ACCOUNTS, INITIAL_PRODUCTS,
  INITIAL_ORDERS, INITIAL_TRANSACTIONS, INITIAL_FOLDERS, INITIAL_FILES,
  INITIAL_KOL, INITIAL_PAYROLL, INITIAL_BLOG, INITIAL_AUDIT_LOGS, INITIAL_EVENTS
} from './initialData.js';

interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  businesses: Business[];
  accounts: Account[];
  balanceCorrections: BalanceCorrection[];
  transactions: Transaction[];
  products: Product[];
  orders: Order[];
  folders: FolderItem[];
  files: FileItem[];
  events: CalendarEvent[];
  kol: KOLCommission[];
  payroll: PayrollRecord[];
  archives: FinancialArchive[];
  blogs: BlogPost[];
  auditLogs: AuditLog[];
}

const DB_FILE = path.resolve(process.cwd(), 'data', 'db.json');

export class StorageEngine {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.events) parsed.events = INITIAL_EVENTS;
        return parsed;
      }
    } catch (err) {
      console.error('Error reading DB_FILE, fallback to initial data', err);
    }

    const defaultData: DatabaseSchema = {
      users: INITIAL_USERS,
      businesses: INITIAL_BUSINESSES,
      accounts: INITIAL_ACCOUNTS,
      balanceCorrections: [],
      transactions: INITIAL_TRANSACTIONS,
      products: INITIAL_PRODUCTS,
      orders: INITIAL_ORDERS,
      folders: INITIAL_FOLDERS,
      files: INITIAL_FILES,
      events: INITIAL_EVENTS,
      kol: INITIAL_KOL,
      payroll: INITIAL_PAYROLL,
      archives: [],
      blogs: INITIAL_BLOG,
      auditLogs: INITIAL_AUDIT_LOGS,
    };

    this.saveDatabase(defaultData);
    return defaultData;
  }

  private saveDatabase(data: DatabaseSchema = this.data) {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file', err);
    }
  }

  // --- Security & Permissions ---
  public checkBusinessAccess(user: User, businessId: string, writeOperation = false): boolean {
    if (!user || !user.allowedBusinessIds.includes(businessId)) {
      this.logAudit({
        userId: user ? user.id : 'anonymous',
        userName: user ? user.name : 'Anonymous',
        businessId,
        action: 'ACCESS_DENIED',
        details: `Upaya akses bisnis ${businessId} ditolak untuk user ${user?.name || 'anonymous'}`,
        status: 'denied',
      });
      return false;
    }
    if (writeOperation && user.isReadOnly) {
      this.logAudit({
        userId: user.id,
        userName: user.name,
        businessId,
        action: 'WRITE_DENIED_READ_ONLY',
        details: `User read-only ${user.name} mencoba operasi modifikasi pada ${businessId}`,
        status: 'denied',
      });
      return false;
    }
    return true;
  }

  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.saveDatabase();
  }

  // --- User / Auth ---
  public getUser(userId: string): User | undefined {
    const u = this.data.users.find((user) => user.id === userId);
    if (!u) return undefined;
    const { passwordHash, ...safeUser } = u;
    return safeUser;
  }

  public getUserByEmail(email: string) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public authenticate(email: string, passwordAttempt: string): User | null {
    const user = this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    if (user.passwordHash === passwordAttempt) {
      this.logAudit({
        userId: user.id,
        userName: user.name,
        action: 'USER_LOGIN',
        details: `User ${user.name} (${user.email}) berhasil login`,
        status: 'success',
      });
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    }
    this.logAudit({
      userId: user.id,
      userName: user.name,
      action: 'FAILED_LOGIN',
      details: `Gagal autentikasi password untuk ${email}`,
      status: 'warning',
    });
    return null;
  }

  public changePassword(userId: string, currentPass: string, newPass: string): { success: boolean; message: string } {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User tidak ditemukan' };
    if (user.passwordHash !== currentPass) {
      return { success: false, message: 'Password saat ini tidak sesuai' };
    }
    if (newPass.length < 6) {
      return { success: false, message: 'Password baru minimal 6 karakter' };
    }
    user.passwordHash = newPass;
    this.saveDatabase();
    this.logAudit({
      userId: user.id,
      userName: user.name,
      action: 'CHANGE_PASSWORD',
      details: `Password berhasil diubah untuk user ${user.name}`,
      status: 'success',
    });
    return { success: true, message: 'Password berhasil diperbarui' };
  }

  public forgotPassword(email: string, newPass: string): { success: boolean; message: string } {
    const user = this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { success: false, message: 'Email tidak terdaftar dalam sistem BizFlow' };
    user.passwordHash = newPass;
    this.saveDatabase();
    this.logAudit({
      userId: user.id,
      userName: user.name,
      action: 'RESET_PASSWORD',
      details: `Password di-reset melalui alur pemulihan untuk ${user.email}`,
      status: 'success',
    });
    return { success: true, message: 'Password berhasil di-reset' };
  }

  // --- Businesses ---
  public getBusinessesForUser(user: User): Business[] {
    return this.data.businesses.filter((b) => user.allowedBusinessIds.includes(b.id));
  }

  public getBusiness(user: User, businessId: string): Business | null {
    if (!this.checkBusinessAccess(user, businessId, false)) return null;
    return this.data.businesses.find((b) => b.id === businessId) || null;
  }

  public createBusiness(user: User, business: Omit<Business, 'id' | 'createdAt' | 'ownerId'>): Business {
    if (user.isReadOnly) {
      throw new Error('Akses read-only tidak diizinkan menambahkan bisnis');
    }
    const newId = 'b_' + Date.now().toString(36);
    const newBiz: Business = {
      id: newId,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      ...business,
    };
    this.data.businesses.push(newBiz);
    user.allowedBusinessIds.push(newId);

    // Also update in users list
    const dbUser = this.data.users.find((u) => u.id === user.id);
    if (dbUser && !dbUser.allowedBusinessIds.includes(newId)) {
      dbUser.allowedBusinessIds.push(newId);
    }

    // Create default accounts for new business
    const defaultAcc: Account = {
      id: 'acc_' + newId + '_main',
      businessId: newId,
      bankName: 'BCA Utama',
      accountNumber: 'Rekening Operasional',
      holderName: newBiz.name,
      type: 'bank',
      initialBalance: 0,
      currentBalance: 0,
      updatedAt: new Date().toISOString(),
    };
    this.data.accounts.push(defaultAcc);

    // Create default folders
    const defaultFolders = ['Finance', 'Invoices', 'Orders', 'Receipts', 'Reports', 'Products', 'Marketing', 'Documents'];
    const pastelColors = ['#DDD6FE', '#BAE6FD', '#FED7AA', '#A7F3D0', '#FBCFE8', '#E9D5FF', '#FEF08A', '#CFFAFE'];
    defaultFolders.forEach((name, i) => {
      this.data.folders.push({
        id: `f_${newId}_${i}`,
        businessId: newId,
        name,
        color: pastelColors[i % pastelColors.length],
        createdAt: new Date().toISOString(),
      });
    });

    this.saveDatabase();
    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId: newId,
      businessName: newBiz.name,
      action: 'CREATE_BUSINESS',
      details: `Menambahkan bisnis baru: ${newBiz.name} (${newBiz.category})`,
      status: 'success',
    });
    return newBiz;
  }

  public updateBusiness(user: User, businessId: string, updates: Partial<Business>): Business {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Akses ditolak untuk modifikasi bisnis');
    }
    const biz = this.data.businesses.find((b) => b.id === businessId);
    if (!biz) throw new Error('Bisnis tidak ditemukan');
    Object.assign(biz, updates);
    this.saveDatabase();
    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      businessName: biz.name,
      action: 'UPDATE_BUSINESS',
      details: `Memperbarui profil bisnis: ${biz.name}`,
      status: 'success',
    });
    return biz;
  }

  public archiveBusiness(user: User, businessId: string, archive: boolean): Business {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Akses ditolak untuk mengarsipkan bisnis');
    }
    const biz = this.data.businesses.find((b) => b.id === businessId);
    if (!biz) throw new Error('Bisnis tidak ditemukan');
    biz.isArchived = archive;
    this.saveDatabase();
    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      businessName: biz.name,
      action: archive ? 'ARCHIVE_BUSINESS' : 'UNARCHIVE_BUSINESS',
      details: `${archive ? 'Mengarsipkan' : 'Mengaktifkan kembali'} bisnis ${biz.name} tanpa menghapus riwayat transaksi`,
      status: 'success',
    });
    return biz;
  }

  // --- Accounts & Balance Correction ---
  public getAccounts(user: User, businessId: string): Account[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    return this.data.accounts.filter((a) => a.businessId === businessId);
  }

  public createAccount(user: User, businessId: string, accountData: Omit<Account, 'id' | 'businessId' | 'updatedAt' | 'currentBalance'> & { initialBalance: number }): Account {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Akses ditolak');
    }
    const newAcc: Account = {
      id: 'acc_' + Date.now().toString(36),
      businessId,
      bankName: accountData.bankName,
      accountNumber: accountData.accountNumber,
      holderName: accountData.holderName,
      type: accountData.type,
      initialBalance: accountData.initialBalance,
      currentBalance: accountData.initialBalance,
      updatedAt: new Date().toISOString(),
    };
    this.data.accounts.push(newAcc);
    this.saveDatabase();
    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'CREATE_ACCOUNT',
      details: `Menambahkan rekening kas baru: ${newAcc.bankName} (${newAcc.accountNumber})`,
      status: 'success',
    });
    return newAcc;
  }

  public updateAccount(user: User, businessId: string, accountId: string, data: Partial<Pick<Account, 'bankName' | 'accountNumber' | 'holderName' | 'type'>>): Account {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Akses ditolak');
    }
    const acc = this.data.accounts.find((a) => a.id === accountId && a.businessId === businessId);
    if (!acc) throw new Error('Rekening tidak ditemukan');
    Object.assign(acc, data, { updatedAt: new Date().toISOString() });
    this.saveDatabase();
    return acc;
  }

  public archiveAccount(user: User, businessId: string, accountId: string, archive: boolean): Account {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Akses ditolak');
    }
    const acc = this.data.accounts.find((a) => a.id === accountId && a.businessId === businessId);
    if (!acc) throw new Error('Rekening tidak ditemukan');
    acc.isArchived = archive;
    acc.updatedAt = new Date().toISOString();
    this.saveDatabase();
    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: archive ? 'ARCHIVE_ACCOUNT' : 'UNARCHIVE_ACCOUNT',
      details: `${archive ? 'Mengarsipkan' : 'Mengaktifkan kembali'} rekening ${acc.bankName} (${acc.accountNumber})`,
      status: 'warning',
    });
    return acc;
  }

  public resetAccountBalance(
    user: User,
    businessId: string,
    accountId: string,
    mode: BalanceAdjustmentType,
    targetAmount: number,
    reason: string,
    effectiveDate: string
  ): BalanceCorrection {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Akses ditolak untuk reset/koreksi saldo');
    }
    const acc = this.data.accounts.find((a) => a.id === accountId && a.businessId === businessId);
    if (!acc) throw new Error('Rekening tidak ditemukan');

    let newBalance = targetAmount;
    if (mode === 'reset_zero') {
      newBalance = 0;
    }

    const previousBalance = acc.currentBalance;
    const difference = newBalance - previousBalance;

    acc.currentBalance = newBalance;
    acc.updatedAt = new Date().toISOString();

    const modeLabels: Record<BalanceAdjustmentType, string> = {
      reset_zero: 'Reset Saldo ke Rp 0',
      set_amount: 'Atur Saldo ke Nominal Tertentu',
      correct_actual: 'Koreksi Berdasarkan Saldo Fisik Aktual',
    };

    const correctionRecord: BalanceCorrection = {
      id: 'cor_' + Date.now().toString(36),
      businessId,
      accountId,
      type: mode,
      previousBalance,
      newBalance,
      difference,
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      reason: `[${modeLabels[mode]}] ${reason}`,
      createdAt: new Date().toISOString(),
      createdBy: user.name,
    };

    this.data.balanceCorrections.unshift(correctionRecord);
    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'RESET_ACCOUNT_BALANCE',
      details: `${modeLabels[mode]} pada rekening ${acc.bankName} (${acc.accountNumber}): Sebelumnya Rp ${previousBalance.toLocaleString('id-ID')} -> Menjadi Rp ${newBalance.toLocaleString('id-ID')} (Selisih: Rp ${difference.toLocaleString('id-ID')}). Alasan: "${reason}". Tidak menghapus transaksi historis.`,
      status: 'warning',
    });

    return correctionRecord;
  }

  public correctAccountBalance(
    user: User,
    businessId: string,
    accountId: string,
    newBalance: number,
    reason: string,
    effectiveDate: string
  ): BalanceCorrection {
    return this.resetAccountBalance(
      user,
      businessId,
      accountId,
      'correct_actual',
      newBalance,
      reason,
      effectiveDate
    );
  }

  public getBalanceCorrections(user: User, businessId: string, accountId?: string): BalanceCorrection[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    let list = this.data.balanceCorrections.filter((c) => c.businessId === businessId);
    if (accountId) {
      list = list.filter((c) => c.accountId === accountId);
    }
    return list;
  }

  // --- Transactions ---
  public getTransactions(user: User, businessId: string, query?: { period?: PeriodFilter; startDate?: string; endDate?: string }): Transaction[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    let list = this.data.transactions.filter((t) => t.businessId === businessId);

    if (query?.startDate && query?.endDate) {
      list = list.filter((t) => t.date >= query.startDate! && t.date <= query.endDate!);
    } else if (query?.period) {
      const now = new Date();
      if (query.period === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        list = list.filter((t) => t.date === todayStr);
      } else if (query.period === 'this_month') {
        const monthPrefix = now.toISOString().slice(0, 7);
        list = list.filter((t) => t.date.startsWith(monthPrefix));
      } else if (query.period === 'this_year') {
        const yearPrefix = now.toISOString().slice(0, 4);
        list = list.filter((t) => t.date.startsWith(yearPrefix));
      }
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public createTransaction(user: User, businessId: string, tx: Omit<Transaction, 'id' | 'businessId' | 'createdAt' | 'createdBy'>): Transaction {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Akses ditolak untuk menambah transaksi');
    }
    const acc = this.data.accounts.find((a) => a.id === tx.accountId && a.businessId === businessId);
    if (!acc) throw new Error('Rekening tujuan tidak ditemukan');

    const newTx: Transaction = {
      id: 'tx_' + Date.now().toString(36),
      businessId,
      createdAt: new Date().toISOString(),
      createdBy: user.name,
      ...tx,
    };

    // Update account running balance
    if (tx.type === 'income') {
      acc.currentBalance += tx.amount;
    } else {
      acc.currentBalance -= tx.amount;
    }
    acc.updatedAt = new Date().toISOString();

    this.data.transactions.unshift(newTx);
    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'CREATE_TRANSACTION',
      details: `Mencatat ${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} [${tx.category}] sebesar Rp ${tx.amount.toLocaleString('id-ID')}: "${tx.description}"`,
      status: 'success',
    });

    return newTx;
  }

  public deleteTransaction(user: User, businessId: string, txId: string): boolean {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Akses ditolak');
    }
    const idx = this.data.transactions.findIndex((t) => t.id === txId && t.businessId === businessId);
    if (idx === -1) return false;

    const tx = this.data.transactions[idx];
    const acc = this.data.accounts.find((a) => a.id === tx.accountId);
    if (acc) {
      // reverse balance mutation safely
      if (tx.type === 'income') {
        acc.currentBalance -= tx.amount;
      } else {
        acc.currentBalance += tx.amount;
      }
      acc.updatedAt = new Date().toISOString();
    }

    this.data.transactions.splice(idx, 1);
    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'DELETE_TRANSACTION',
      details: `Menghapus transaksi ${tx.id} (${tx.category}) Rp ${tx.amount.toLocaleString('id-ID')} dan membalikkan saldo rekening`,
      status: 'warning',
    });

    return true;
  }

  // --- Products ---
  public getProducts(user: User, businessId: string): Product[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    return this.data.products.filter((p) => p.businessId === businessId);
  }

  public createProduct(user: User, businessId: string, pData: Omit<Product, 'id' | 'businessId'>): Product {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const newProd: Product = {
      id: 'prod_' + Date.now().toString(36),
      businessId,
      ...pData,
    };
    this.data.products.push(newProd);
    this.saveDatabase();
    return newProd;
  }

  public updateProduct(user: User, businessId: string, prodId: string, pData: Partial<Product>): Product {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const p = this.data.products.find((item) => item.id === prodId && item.businessId === businessId);
    if (!p) throw new Error('Produk tidak ditemukan');
    Object.assign(p, pData);
    this.saveDatabase();
    return p;
  }

  // --- Orders & Calendar ---
  public getOrders(user: User, businessId: string): Order[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    return this.data.orders
      .filter((o) => o.businessId === businessId)
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }

  public createOrder(user: User, businessId: string, orderData: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    orderDate: string;
    deadline: string;
    items: { productId?: string; name: string; quantity: number; unitPrice: number; totalPrice: number; cogsPerUnit?: number }[];
    totalAmount: number;
    downPayment: number;
    accountId?: string;
    notes?: string;
  }): Order {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');

    const orderNum = `ORD-${businessId.slice(2, 5).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const newId = 'ord_' + Date.now().toString(36);

    const payments = [];
    let totalPaid = 0;

    // If DP paid, record payment
    if (orderData.downPayment > 0 && orderData.accountId) {
      const payId = 'pay_' + Date.now().toString(36);
      payments.push({
        id: payId,
        date: orderData.orderDate,
        amount: orderData.downPayment,
        accountId: orderData.accountId,
        type: (orderData.downPayment >= orderData.totalAmount ? 'settlement' : 'dp') as 'settlement' | 'dp',
        note: `DP Order ${orderNum}`,
      });
      totalPaid = orderData.downPayment;

      // Automatically register the transaction so money hits cash flow once and accurately!
      this.createTransaction(user, businessId, {
        date: orderData.orderDate,
        type: 'income',
        category: 'Penjualan Produk',
        amount: orderData.downPayment,
        accountId: orderData.accountId,
        description: `Penerimaan DP Order ${orderNum} - ${orderData.customerName}`,
        orderId: newId,
      });
    }

    const remaining = Math.max(0, orderData.totalAmount - totalPaid);
    const paymentStatus: Order['paymentStatus'] = totalPaid === 0 ? 'unpaid' : remaining === 0 ? 'paid' : 'partial';

    const newOrder: Order = {
      id: newId,
      orderNumber: orderNum,
      businessId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerEmail: orderData.customerEmail,
      orderDate: orderData.orderDate,
      deadline: orderData.deadline,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      downPayment: orderData.downPayment,
      totalPaid,
      remainingBalance: remaining,
      paymentStatus,
      fulfillmentStatus: 'new',
      payments,
      notes: orderData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.orders.unshift(newOrder);
    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'CREATE_ORDER',
      details: `Membuat Order baru ${orderNum} (${newOrder.customerName}) senilai Rp ${newOrder.totalAmount.toLocaleString('id-ID')}`,
      status: 'success',
    });

    return newOrder;
  }

  public recordOrderPayment(user: User, businessId: string, orderId: string, paymentData: {
    amount: number;
    accountId: string;
    date: string;
    type: 'dp' | 'installment' | 'settlement';
    note?: string;
  }): Order {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');

    const order = this.data.orders.find((o) => o.id === orderId && o.businessId === businessId);
    if (!order) throw new Error('Order tidak ditemukan');

    const payId = 'pay_' + Date.now().toString(36);
    order.payments.push({
      id: payId,
      date: paymentData.date,
      amount: paymentData.amount,
      accountId: paymentData.accountId,
      type: paymentData.type,
      note: paymentData.note || `Pembayaran Order ${order.orderNumber}`,
    });

    order.totalPaid += paymentData.amount;
    order.remainingBalance = Math.max(0, order.totalAmount - order.totalPaid);
    order.paymentStatus = order.remainingBalance === 0 ? 'paid' : 'partial';
    order.updatedAt = new Date().toISOString();

    // Create single income transaction for this payment
    this.createTransaction(user, businessId, {
      date: paymentData.date,
      type: 'income',
      category: 'Penjualan Produk',
      amount: paymentData.amount,
      accountId: paymentData.accountId,
      description: `Pelunasan/Cicilan Order ${order.orderNumber} - ${order.customerName}`,
      orderId: order.id,
    });

    this.saveDatabase();
    return order;
  }

  public updateOrderStatus(user: User, businessId: string, orderId: string, fulfillmentStatus: Order['fulfillmentStatus']): Order {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const order = this.data.orders.find((o) => o.id === orderId && o.businessId === businessId);
    if (!order) throw new Error('Order tidak ditemukan');

    order.fulfillmentStatus = fulfillmentStatus;
    order.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return order;
  }

  // --- Files & Folders (Cloud Storage) ---
  public getFolders(user: User, businessId: string): FolderItem[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    return this.data.folders.filter((f) => f.businessId === businessId);
  }

  public createFolder(user: User, businessId: string, name: string, color?: string): FolderItem {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const newFolder: FolderItem = {
      id: 'f_' + Date.now().toString(36),
      businessId,
      name,
      color: color || '#DDD6FE',
      createdAt: new Date().toISOString(),
    };
    this.data.folders.push(newFolder);
    this.saveDatabase();
    return newFolder;
  }

  public deleteFolder(user: User, businessId: string, folderId: string): boolean {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const idx = this.data.folders.findIndex((f) => f.id === folderId && f.businessId === businessId);
    if (idx === -1) return false;
    // Don't delete files inside without caution: files will just lose their folder association
    this.data.files.forEach((f) => {
      if (f.folderId === folderId) {
        f.folderId = undefined;
      }
    });
    this.data.folders.splice(idx, 1);
    this.saveDatabase();
    return true;
  }

  public getFiles(user: User, businessId: string): FileItem[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    return this.data.files.filter((f) => f.businessId === businessId);
  }

  public createFile(user: User, businessId: string, fileData: Omit<FileItem, 'id' | 'businessId' | 'uploadDate' | 'uploadedBy'>): FileItem {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const newFile: FileItem = {
      id: 'file_' + Date.now().toString(36),
      businessId,
      uploadDate: new Date().toISOString(),
      uploadedBy: user.name,
      ...fileData,
    };
    this.data.files.unshift(newFile);
    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'UPLOAD_FILE',
      details: `Mengunggah file "${newFile.name}" (${(newFile.sizeBytes / 1024).toFixed(1)} KB)`,
      status: 'success',
    });

    return newFile;
  }

  public deleteFile(user: User, businessId: string, fileId: string): boolean {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const idx = this.data.files.findIndex((f) => f.id === fileId && f.businessId === businessId);
    if (idx === -1) return false;
    const f = this.data.files[idx];
    this.data.files.splice(idx, 1);
    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'DELETE_FILE',
      details: `Menghapus file "${f.name}"`,
      status: 'warning',
    });

    return true;
  }

  // --- Financial Summary Calculation ---
  public getFinancialSummary(user: User, businessId: string, period?: PeriodFilter, startDate?: string, endDate?: string) {
    if (!this.checkBusinessAccess(user, businessId, false)) {
      throw new Error('Akses ditolak');
    }

    const txs = this.getTransactions(user, businessId, { period, startDate, endDate });
    const accounts = this.getAccounts(user, businessId);
    const orders = this.getOrders(user, businessId);

    // Filter orders if needed
    let filteredOrders = orders;
    if (startDate && endDate) {
      filteredOrders = orders.filter((o) => o.orderDate >= startDate && o.orderDate <= endDate);
    } else if (period === 'this_month') {
      const curMonth = new Date().toISOString().slice(0, 7);
      filteredOrders = orders.filter((o) => o.orderDate.startsWith(curMonth));
    }

    let totalPenjualan = 0;
    let pemasukanDiterima = 0;
    let totalHPP = 0;
    let bebanOperasional = 0;

    txs.forEach((t) => {
      if (t.type === 'income') {
        pemasukanDiterima += t.amount;
        totalPenjualan += t.amount;
      } else {
        if (t.isCOGS || t.category.toLowerCase().includes('hpp') || t.category.toLowerCase().includes('bahan baku')) {
          totalHPP += t.amount;
        } else {
          bebanOperasional += t.amount;
        }
      }
    });

    const labaKotor = totalPenjualan - totalHPP;
    const totalPengeluaran = totalHPP + bebanOperasional;
    const labaBersih = labaKotor - bebanOperasional;
    const saldoKasAktual = accounts.reduce((acc, a) => acc + a.currentBalance, 0);

    // Unpaid balances in upcoming orders
    const danaDialokasikan = filteredOrders
      .filter((o) => o.fulfillmentStatus !== 'completed' && o.fulfillmentStatus !== 'cancelled')
      .reduce((acc, o) => acc + o.remainingBalance, 0);

    return {
      totalPenjualan,
      pemasukanDiterima,
      totalHPP,
      labaKotor,
      bebanOperasional,
      totalPengeluaran,
      labaBersih,
      saldoKasAktual,
      danaDialokasikan,
      orderCount: filteredOrders.length,
      txCount: txs.length,
    };
  }

  // --- Monthly Performance breakdown (Jan - Dec) ---
  public getMonthlyPerformance(user: User, businessId: string, year = 2026) {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    const allTxs = this.data.transactions.filter((t) => t.businessId === businessId && t.date.startsWith(`${year}-`));
    const allOrders = this.data.orders.filter((o) => o.businessId === businessId && o.orderDate.startsWith(`${year}-`));

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    let prevLabaBersih: number | null = null;

    return months.map((monthName, idx) => {
      const monthStr = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const mOrders = allOrders.filter((o) => o.orderDate.startsWith(monthStr));
      const mTxs = allTxs.filter((t) => t.date.startsWith(monthStr));

      let penjualan = 0;
      let income = 0;
      let hpp = 0;
      let expense = 0;

      mTxs.forEach((t) => {
        if (t.type === 'income') {
          income += t.amount;
          penjualan += t.amount;
        } else {
          if (t.isCOGS || t.category.toLowerCase().includes('hpp') || t.category.toLowerCase().includes('bahan baku')) {
            hpp += t.amount;
          } else {
            expense += t.amount;
          }
        }
      });

      const totalPengeluaran = hpp + expense;
      const labaKotor = penjualan - hpp;
      const labaBersih = labaKotor - expense;

      let momChangePct: number | null = null;
      if (prevLabaBersih !== null && prevLabaBersih !== 0) {
        momChangePct = Number((((labaBersih - prevLabaBersih) / Math.abs(prevLabaBersih)) * 100).toFixed(1));
      }
      prevLabaBersih = labaBersih;

      return {
        month: monthName,
        monthKey: monthStr,
        orderCount: mOrders.length,
        totalPenjualan: penjualan,
        pemasukanDiterima: income,
        hpp,
        pengeluaran: totalPengeluaran,
        labaKotor,
        labaBersih,
        momChangePct,
      };
    });
  }

  // --- KOL & Payroll ---
  public getKOL(user: User, businessId: string): KOLCommission[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    return this.data.kol.filter((k) => k.businessId === businessId);
  }

  public getPayroll(user: User, businessId: string): PayrollRecord[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    return this.data.payroll.filter((p) => p.businessId === businessId);
  }

  // --- Archives ---
  public getArchives(user: User, businessId: string): FinancialArchive[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    return this.data.archives.filter((a) => a.businessId === businessId);
  }

  public createArchive(user: User, businessId: string, title: string, periodMonth: string, notes?: string): FinancialArchive {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');

    const summary = this.getFinancialSummary(user, businessId, 'custom', `${periodMonth}-01`, `${periodMonth}-31`);

    const newArchive: FinancialArchive = {
      id: 'arc_' + Date.now().toString(36),
      businessId,
      title,
      periodMonth,
      generatedAt: new Date().toISOString(),
      generatedBy: user.name,
      summary: {
        totalSales: summary.totalPenjualan,
        totalIncome: summary.pemasukanDiterima,
        totalCOGS: summary.totalHPP,
        grossProfit: summary.labaKotor,
        totalExpenses: summary.totalPengeluaran,
        netProfit: summary.labaBersih,
        orderCount: summary.orderCount,
      },
      notes,
    };

    this.data.archives.unshift(newArchive);
    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'CREATE_ARCHIVE',
      details: `Membuat arsip laporan keuangan terkunci: "${title}" periode ${periodMonth}`,
      status: 'success',
    });

    return newArchive;
  }

  // --- Personal Blog ---
  public getBlogs(user?: User): BlogPost[] {
    // Personal blog separated from home and finance
    return this.data.blogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createBlog(user: User, post: { title: string; content: string; tags: string[] }): BlogPost {
    const newPost: BlogPost = {
      id: 'blog_' + Date.now().toString(36),
      authorId: user.id,
      authorName: user.name,
      title: post.title,
      content: post.content,
      tags: post.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.blogs.unshift(newPost);
    this.saveDatabase();
    return newPost;
  }

  public deleteBlog(user: User, blogId: string): boolean {
    const idx = this.data.blogs.findIndex((b) => b.id === blogId);
    if (idx === -1) return false;
    if (this.data.blogs[idx].authorId !== user.id && user.role !== 'admin') {
      throw new Error('Hanya penulis yang dapat menghapus catatan ini');
    }
    this.data.blogs.splice(idx, 1);
    this.saveDatabase();
    return true;
  }

  // --- Audit Logs ---
  public getAuditLogs(user: User, businessId?: string): AuditLog[] {
    if (user.role === 'admin') {
      if (businessId) {
        return this.data.auditLogs.filter((l) => l.businessId === businessId);
      }
      return this.data.auditLogs;
    }
    // Owner can only see audit logs of their own businesses
    return this.data.auditLogs.filter((l) => l.businessId && user.allowedBusinessIds.includes(l.businessId));
  }

  // --- Calendar Events & Payment Reminders (PRD Section 6) ---
  public getEvents(user: User, businessId: string): CalendarEvent[] {
    if (!this.checkBusinessAccess(user, businessId, false)) return [];
    if (!this.data.events) this.data.events = [];
    return this.data.events
      .filter((e) => e.businessId === businessId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  public createEvent(
    user: User,
    businessId: string,
    eventData: Omit<CalendarEvent, 'id' | 'businessId' | 'createdAt' | 'createdBy' | 'status'> & { status?: CalendarEvent['status'] }
  ): CalendarEvent {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Akses ditolak untuk menambah kegiatan/pengingat');
    }
    if (!this.data.events) this.data.events = [];

    const newEv: CalendarEvent = {
      id: 'ev_' + Date.now().toString(36),
      businessId,
      status: eventData.status || 'scheduled',
      createdAt: new Date().toISOString(),
      createdBy: user.name,
      ...eventData,
    };

    this.data.events.push(newEv);
    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'CREATE_EVENT',
      details: `Menambahkan agenda/pengingat [${newEv.category}]: "${newEv.title}" pada tanggal ${newEv.date}`,
      status: 'success',
    });

    return newEv;
  }

  public updateEvent(user: User, businessId: string, eventId: string, updates: Partial<CalendarEvent>): CalendarEvent {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const ev = (this.data.events || []).find((e) => e.id === eventId && e.businessId === businessId);
    if (!ev) throw new Error('Kegiatan/pengingat tidak ditemukan');
    Object.assign(ev, updates);
    this.saveDatabase();
    return ev;
  }

  public deleteEvent(user: User, businessId: string, eventId: string): boolean {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const idx = (this.data.events || []).findIndex((e) => e.id === eventId && e.businessId === businessId);
    if (idx === -1) return false;
    this.data.events.splice(idx, 1);
    this.saveDatabase();
    return true;
  }

  public payEventAndRecordExpense(
    user: User,
    businessId: string,
    eventId: string,
    payment: {
      amount: number;
      accountId: string;
      date: string;
      category?: string;
      note?: string;
      receiptFileId?: string;
    }
  ): { event: CalendarEvent; transaction: Transaction } {
    if (!this.checkBusinessAccess(user, businessId, true)) throw new Error('Akses ditolak');
    const ev = (this.data.events || []).find((e) => e.id === eventId && e.businessId === businessId);
    if (!ev) throw new Error('Kegiatan/pengingat tidak ditemukan');

    if (ev.status === 'paid') {
      throw new Error('Jadwal ini sudah dibayarkan sebelumnya. Pembayaran ganda dicegah.');
    }

    const txCategory = payment.category || 'Operasional & Tagihan';
    const txDesc = `Pembayaran ${ev.title} (${ev.recipient || 'Vendor'}) - ${payment.note || 'Lunas via kalender'}`;

    // Create actual expense transaction in financial module
    const tx = this.createTransaction(user, businessId, {
      date: payment.date || new Date().toISOString().split('T')[0],
      type: 'expense',
      category: txCategory,
      amount: payment.amount,
      accountId: payment.accountId,
      description: txDesc,
      receiptFileId: payment.receiptFileId,
    });

    ev.status = 'paid';
    ev.linkedExpenseTxId = tx.id;
    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'PAY_SCHEDULED_EVENT',
      details: `Melunasi jadwal "${ev.title}" sebesar Rp ${payment.amount.toLocaleString('id-ID')} dan mencatat pengeluaran kas`,
      status: 'success',
    });

    return { event: ev, transaction: tx };
  }

  // --- Demo Data Cleaner (PRD Additional Requirements Section 4) ---
  public getDemoDataSummary(user: User, businessId: string) {
    if (!this.checkBusinessAccess(user, businessId, false)) {
      throw new Error('Akses ditolak');
    }
    const demoTxs = this.data.transactions.filter((t) => t.businessId === businessId && t.isDemo);
    const demoOrders = this.data.orders.filter((o) => o.businessId === businessId && o.isDemo);
    return {
      demoTransactionsCount: demoTxs.length,
      demoOrdersCount: demoOrders.length,
      demoTransactions: demoTxs,
      demoOrders: demoOrders,
    };
  }

  public cleanDemoData(user: User, businessId: string, options: { clearTransactions?: boolean; clearOrders?: boolean }) {
    if (!this.checkBusinessAccess(user, businessId, true)) {
      throw new Error('Hanya pemilik bisnis yang dapat menjalankan pembersihan data demo');
    }

    let removedTxs = 0;
    let removedOrders = 0;

    if (options.clearTransactions) {
      const remainingTxs: Transaction[] = [];
      for (const tx of this.data.transactions) {
        if (tx.businessId === businessId && tx.isDemo) {
          removedTxs++;
          // Reverse account balance effect
          const acc = this.data.accounts.find((a) => a.id === tx.accountId);
          if (acc) {
            if (tx.type === 'income') acc.currentBalance -= tx.amount;
            else acc.currentBalance += tx.amount;
          }
        } else {
          remainingTxs.push(tx);
        }
      }
      this.data.transactions = remainingTxs;
    }

    if (options.clearOrders) {
      const remainingOrders = this.data.orders.filter((o) => !(o.businessId === businessId && o.isDemo));
      removedOrders = this.data.orders.length - remainingOrders.length;
      this.data.orders = remainingOrders;
    }

    this.saveDatabase();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      businessId,
      action: 'CLEAN_DEMO_DATA',
      details: `Membersihkan data demo/placeholder: ${removedTxs} transaksi demo, ${removedOrders} order demo. Data produksi aktual tetap aman.`,
      status: 'warning',
    });

    return { removedTransactions: removedTxs, removedOrders };
  }
}

export const storage = new StorageEngine();

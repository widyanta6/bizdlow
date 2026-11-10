import {
  User, Business, Account, BalanceCorrection, BalanceAdjustmentType, Transaction, Product,
  Order, FileItem, FolderItem, KOLCommission, PayrollRecord,
  FinancialArchive, BlogPost, AuditLog, PeriodFilter, CalendarEvent,
  DataResetType, DataResetSummary, DataResetResult
} from '../types/index';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('bizflow_token') || 'u_ika';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  // Auth
  async login(email: string, password: string):Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login gagal');
    }
    const data = await res.json();
    localStorage.setItem('bizflow_token', data.token);
    return data;
  }

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('bizflow_token');
    if (!token) return null;
    const res = await fetch('/api/auth/me', { headers: this.getHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah password');
    return data;
  }

  async forgotPassword(email: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mereset password');
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: this.getHeaders() });
    } finally {
      localStorage.removeItem('bizflow_token');
      localStorage.removeItem('bizflow_active_business_id');
    }
  }

  // Businesses
  async getBusinesses(): Promise<Business[]> {
    const res = await fetch('/api/businesses', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat bisnis');
    const data = await res.json();
    return data.businesses;
  }

  async getBusiness(id: string): Promise<Business> {
    const res = await fetch(`/api/businesses/${id}`, { headers: this.getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Akses ditolak');
    return data.business;
  }

  async createBusiness(business: Partial<Business>): Promise<Business> {
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(business),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat bisnis baru');
    return data.business;
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    const res = await fetch(`/api/businesses/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui bisnis');
    return data.business;
  }

  async archiveBusiness(id: string, archive: boolean): Promise<Business> {
    const res = await fetch(`/api/businesses/${id}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ archive }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengarsipkan bisnis');
    return data.business;
  }

  async getFinancialSummary(businessId: string, period?: PeriodFilter, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const res = await fetch(`/api/businesses/${businessId}/summary?${params.toString()}`, { headers: this.getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat ringkasan keuangan');
    return data.summary;
  }

  async getMonthlyPerformance(businessId: string, year = 2026) {
    const res = await fetch(`/api/businesses/${businessId}/monthly-performance?year=${year}`, { headers: this.getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat analitik bulanan');
    return data.performance;
  }

  // Accounts
  async getAccounts(businessId: string): Promise<Account[]> {
    const res = await fetch(`/api/businesses/${businessId}/accounts`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.accounts || [];
  }

  async createAccount(businessId: string, accountData: Partial<Account>): Promise<Account> {
    const res = await fetch(`/api/businesses/${businessId}/accounts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(accountData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menambah rekening');
    return data.account;
  }

  async updateAccount(businessId: string, accountId: string, accountData: Partial<Account>): Promise<Account> {
    const res = await fetch(`/api/businesses/${businessId}/accounts/${accountId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(accountData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui rekening');
    return data.account;
  }

  async archiveAccount(businessId: string, accountId: string, archive: boolean): Promise<Account> {
    const res = await fetch(`/api/businesses/${businessId}/accounts/${accountId}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ archive }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengarsipkan rekening');
    return data.account;
  }

  async resetAccountBalance(
    businessId: string,
    accountId: string,
    mode: BalanceAdjustmentType,
    targetAmount: number,
    reason: string,
    effectiveDate?: string
  ): Promise<BalanceCorrection> {
    const res = await fetch(`/api/businesses/${businessId}/accounts/${accountId}/reset`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ mode, targetAmount, reason, effectiveDate }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal melakukan reset/penyesuaian saldo');
    return data.correction;
  }

  async correctBalance(businessId: string, accountId: string, newBalance: number, reason: string, effectiveDate?: string): Promise<BalanceCorrection> {
    return this.resetAccountBalance(businessId, accountId, 'correct_actual', newBalance, reason, effectiveDate);
  }

  async getBalanceCorrections(businessId: string, accountId?: string): Promise<BalanceCorrection[]> {
    const url = accountId
      ? `/api/businesses/${businessId}/balance-corrections?accountId=${accountId}`
      : `/api/businesses/${businessId}/balance-corrections`;
    const res = await fetch(url, { headers: this.getHeaders() });
    const data = await res.json();
    return data.corrections || [];
  }

  // Transactions
  async getTransactions(businessId: string, period?: PeriodFilter, startDate?: string, endDate?: string): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const res = await fetch(`/api/businesses/${businessId}/transactions?${params.toString()}`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.transactions || [];
  }

  async createTransaction(businessId: string, tx: Partial<Transaction>): Promise<Transaction> {
    const res = await fetch(`/api/businesses/${businessId}/transactions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(tx),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mencatat transaksi');
    return data.transaction;
  }

  async deleteTransaction(businessId: string, txId: string): Promise<void> {
    const res = await fetch(`/api/businesses/${businessId}/transactions/${txId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus transaksi');
  }

  // Products
  async getProducts(businessId: string): Promise<Product[]> {
    const res = await fetch(`/api/businesses/${businessId}/products`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.products || [];
  }

  async createProduct(businessId: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/businesses/${businessId}/products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(product),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menambah produk');
    return data.product;
  }

  async updateProduct(businessId: string, prodId: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/businesses/${businessId}/products/${prodId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(product),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui produk');
    return data.product;
  }

  // Orders
  async getOrders(businessId: string): Promise<Order[]> {
    const res = await fetch(`/api/businesses/${businessId}/orders`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.orders || [];
  }

  async createOrder(businessId: string, orderData: any): Promise<Order> {
    const res = await fetch(`/api/businesses/${businessId}/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(orderData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat pesanan');
    return data.order;
  }

  async recordOrderPayment(businessId: string, orderId: string, paymentData: any): Promise<Order> {
    const res = await fetch(`/api/businesses/${businessId}/orders/${orderId}/pay`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(paymentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mencatat pembayaran');
    return data.order;
  }

  async updateOrderStatus(businessId: string, orderId: string, fulfillmentStatus: string): Promise<Order> {
    const res = await fetch(`/api/businesses/${businessId}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ fulfillmentStatus }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui status order');
    return data.order;
  }

  // Files & Folders
  async getFolders(businessId: string): Promise<FolderItem[]> {
    const res = await fetch(`/api/businesses/${businessId}/folders`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.folders || [];
  }

  async createFolder(businessId: string, name: string, color?: string): Promise<FolderItem> {
    const res = await fetch(`/api/businesses/${businessId}/folders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat folder');
    return data.folder;
  }

  async deleteFolder(businessId: string, folderId: string): Promise<void> {
    const res = await fetch(`/api/businesses/${businessId}/folders/${folderId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus folder');
  }

  async getFiles(businessId: string): Promise<FileItem[]> {
    const res = await fetch(`/api/businesses/${businessId}/files`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.files || [];
  }

  async uploadFile(businessId: string, file: File, folderId?: string): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    const token = localStorage.getItem('bizflow_token') || 'u_ika';
    const res = await fetch(`/api/businesses/${businessId}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengunggah file');
    return data.file;
  }

  async deleteFile(businessId: string, fileId: string): Promise<void> {
    const res = await fetch(`/api/businesses/${businessId}/files/${fileId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus file');
  }

  // KOL & Payroll
  async getKOL(businessId: string): Promise<KOLCommission[]> {
    const res = await fetch(`/api/businesses/${businessId}/kol`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.kol || [];
  }

  async getPayroll(businessId: string): Promise<PayrollRecord[]> {
    const res = await fetch(`/api/businesses/${businessId}/payroll`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.payroll || [];
  }

  // Archives
  async getArchives(businessId: string): Promise<FinancialArchive[]> {
    const res = await fetch(`/api/businesses/${businessId}/archives`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.archives || [];
  }

  async createArchive(businessId: string, title: string, periodMonth: string, notes?: string): Promise<FinancialArchive> {
    const res = await fetch(`/api/businesses/${businessId}/archives`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title, periodMonth, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat arsip laporan');
    return data.archive;
  }

  // Events & Scheduled Activities
  async getEvents(businessId: string): Promise<CalendarEvent[]> {
    const res = await fetch(`/api/businesses/${businessId}/events`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.events || [];
  }

  async createEvent(businessId: string, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const res = await fetch(`/api/businesses/${businessId}/events`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(eventData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat kegiatan');
    return data.event;
  }

  async updateEvent(businessId: string, eventId: string, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const res = await fetch(`/api/businesses/${businessId}/events/${eventId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(eventData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui kegiatan');
    return data.event;
  }

  async deleteEvent(businessId: string, eventId: string): Promise<void> {
    const res = await fetch(`/api/businesses/${businessId}/events/${eventId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus kegiatan');
  }

  async payScheduledEvent(businessId: string, eventId: string, paymentData: any): Promise<any> {
    const res = await fetch(`/api/businesses/${businessId}/events/${eventId}/pay`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(paymentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal melunasi jadwal pengeluaran');
    return data;
  }

  async payEvent(businessId: string, eventId: string, paymentData: any): Promise<any> {
    return this.payScheduledEvent(businessId, eventId, paymentData);
  }

  // Demo Data Management
  async getDemoDataSummary(businessId: string) {
    const res = await fetch(`/api/businesses/${businessId}/demo-data`, { headers: this.getHeaders() });
    const data = await res.json();
    return data;
  }

  async cleanDemoData(businessId: string, options: { clearTransactions?: boolean; clearOrders?: boolean } = {}) {
    const res = await fetch(`/api/businesses/${businessId}/demo-data/clean`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(options),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membersihkan data demo');
    return data;
  }

  // Excel Export URL with optional module
  getExcelExportUrl(businessId: string, moduleName = 'all'): string {
    const token = localStorage.getItem('bizflow_token') || 'u_ika';
    return `/api/businesses/${businessId}/export-excel?module=${encodeURIComponent(moduleName)}&token=${encodeURIComponent(token)}`;
  }

  // Personal Blog
  async getBlogs(): Promise<BlogPost[]> {
    const res = await fetch('/api/blogs', { headers: this.getHeaders() });
    const data = await res.json();
    return data.blogs || [];
  }

  async createBlog(title: string, content: string, tags: string[]): Promise<BlogPost> {
    const res = await fetch('/api/blogs', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title, content, tags }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan catatan');
    return data.blog;
  }

  async deleteBlog(blogId: string): Promise<void> {
    const res = await fetch(`/api/blogs/${blogId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus catatan');
  }

  // Audit Logs
  async getAuditLogs(businessId?: string): Promise<AuditLog[]> {
    const url = businessId ? `/api/audit-logs?businessId=${businessId}` : '/api/audit-logs';
    const res = await fetch(url, { headers: this.getHeaders() });
    const data = await res.json();
    return data.logs || [];
  }

  // AI Assistant
  async sendAiMessage(prompt: string, businessId: string, mode = 'general'): Promise<string> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ prompt, businessId, mode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Layanan AI mengalami kendala');
    return data.reply;
  }

  // Data Reset & Snapshots
  async getDataResetSummary(businessId: string): Promise<DataResetSummary> {
    const res = await fetch(`/api/businesses/${businessId}/data-reset/summary`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat ringkasan reset data');
    return data;
  }

  async executeDataReset(
    businessId: string,
    resetType: DataResetType,
    confirmationWord?: string,
    customOptions?: { keepAccounts?: boolean }
  ): Promise<DataResetResult> {
    const res = await fetch(`/api/businesses/${businessId}/data-reset/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ resetType, confirmationWord, customOptions }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Eksekusi reset data gagal');
    return data;
  }
}

export const api = new ApiService();

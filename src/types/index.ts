export type UserRole = 'owner' | 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isReadOnly?: boolean;
  avatar?: string;
  allowedBusinessIds: string[];
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  currency: string;
  logo?: string;
  isArchived: boolean;
  createdAt: string;
  taxRate?: number;
}

export interface Account {
  id: string;
  businessId: string;
  bankName: string;
  accountNumber: string;
  holderName: string;
  type: 'bank' | 'cash' | 'ewallet';
  initialBalance: number;
  currentBalance: number;
  isArchived?: boolean;
  updatedAt: string;
}

export type BalanceAdjustmentType = 'reset_zero' | 'set_amount' | 'correct_actual';

export interface BalanceCorrection {
  id: string;
  businessId: string;
  accountId: string;
  type?: BalanceAdjustmentType;
  previousBalance: number;
  newBalance: number;
  difference: number;
  effectiveDate: string;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  businessId: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  accountId: string;
  description: string;
  orderId?: string;
  receiptFileId?: string;
  receiptFileName?: string;
  isCOGS?: boolean; // HPP
  isDemo?: boolean;
  createdAt: string;
  createdBy: string;
}

export interface Product {
  id: string;
  businessId: string;
  sku: string;
  name: string;
  category: string;
  sellingPrice: number;
  cogs: number; // HPP per unit
  stockQuantity: number;
  minStock: number;
  unit: string;
}

export type OrderPaymentStatus = 'unpaid' | 'partial' | 'paid';
export type OrderFulfillmentStatus = 'new' | 'in_progress' | 'waiting_payment' | 'completed' | 'cancelled';

export interface OrderPayment {
  id: string;
  date: string;
  amount: number;
  accountId: string;
  type: 'dp' | 'installment' | 'settlement';
  receiptFileId?: string;
  note?: string;
}

export interface OrderItem {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cogsPerUnit?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  businessId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  orderDate: string;
  deadline: string;
  items: OrderItem[];
  totalAmount: number;
  downPayment: number;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  payments: OrderPayment[];
  notes?: string;
  attachments?: string[];
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EventCategory =
  | 'deadline'
  | 'rent'
  | 'hosting_domain'
  | 'domain_hosting'
  | 'vendor'
  | 'utility'
  | 'utilities'
  | 'salary'
  | 'payroll'
  | 'installment'
  | 'workshop'
  | 'event'
  | 'other';

export interface CalendarEvent {
  id: string;
  businessId: string;
  title: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  time?: string;
  dueDate?: string;
  amount?: number;
  recipient?: string;
  notes?: string;
  description?: string;
  isRecurring?: boolean;
  recurringInterval?: 'monthly' | 'yearly';
  reminderDays?: number;
  status: 'scheduled' | 'paid' | 'overdue' | 'completed';
  linkedExpenseTxId?: string;
  createdAt: string;
  createdBy: string;
}

export interface FileItem {
  id: string;
  businessId: string;
  name: string;
  folderId?: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadDate: string;
  uploadedBy: string;
  isShared?: boolean;
  sharedWith?: string[];
  attachedTo?: {
    type: 'transaction' | 'order' | 'report' | 'event';
    id: string;
  };
}

export interface FolderItem {
  id: string;
  businessId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface KOLCommission {
  id: string;
  businessId: string;
  kolName: string;
  platform: string;
  handle: string;
  salesGenerated: number;
  commissionRate: number; // e.g. 10%
  commissionAmount: number;
  paymentStatus: 'unpaid' | 'paid';
  paidDate?: string;
  linkedTransactionId?: string;
}

export interface PayrollRecord {
  id: string;
  businessId: string;
  employeeName: string;
  role: string;
  periodMonth: string; // YYYY-MM
  baseSalary: number;
  allowance: number;
  deduction: number;
  netSalary: number;
  status: 'pending' | 'paid';
  paidDate?: string;
  linkedTransactionId?: string;
}

export interface FinancialArchive {
  id: string;
  businessId: string;
  title: string;
  periodMonth: string; // YYYY-MM
  generatedAt: string;
  generatedBy: string;
  summary: {
    totalSales: number;
    totalIncome: number;
    totalCOGS: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    orderCount: number;
  };
  notes?: string;
}

export interface BlogPost {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  businessId?: string;
  businessName?: string;
  action: string;
  details: string;
  status: 'success' | 'warning' | 'denied';
}

export type PeriodFilter = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface ThemeConfig {
  accentColor: 'blue_sky' | 'lavender' | 'periwinkle' | 'navy';
  isCompactSidebar: boolean;
  showQuickActionsBanner: boolean;
}

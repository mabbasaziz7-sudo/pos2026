export type PaymentType = 'cash' | 'card' | 'credit' | 'mixed' | 'wallet';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  cash: 'نقدي',
  card: 'بطاقة',
  credit: 'آجل',
  mixed: 'مختلط',
  wallet: 'محفظة',
};

export const PAYMENT_TYPE_BADGE_CLASSES: Record<PaymentType, string> = {
  cash: 'bg-emerald-100 text-emerald-700',
  card: 'bg-indigo-100 text-indigo-700',
  credit: 'bg-amber-100 text-amber-700',
  mixed: 'bg-blue-100 text-blue-700',
  wallet: 'bg-purple-100 text-purple-700',
};

export interface Product {
  id?: number;
  name: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string;
  unit: string;
  discount?: number;
  image?: string;
  plu?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  address: string;
  email?: string;
  creditLimit: number;
  balance: number;
  walletBalance: number;
  loyaltyPoints: number;
  createdAt: Date;
}

export interface WalletTransaction {
  id?: number;
  customerId: number;
  customerName: string;
  type: 'topup' | 'purchase' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
  saleId?: number;
  date: Date;
  userId: number;
  userName: string;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  address: string;
  email?: string;
  balance: number;
  createdAt: Date;
}

export interface SupplierInvoice {
  id?: number;
  supplierId: number;
  invoiceNumber: string;
  total: number;
  paid: number;
  remaining: number;
  items: SupplierInvoiceItem[];
  date: Date;
  notes?: string;
}

export interface SupplierInvoiceItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface User {
  id?: number;
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'manager' | 'cashier';
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface Shift {
  id?: number;
  userId: number;
  userName: string;
  startTime: Date;
  endTime?: Date;
  startingCash: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  totalSales: number;
  totalCashSales: number;
  totalCardSales: number;
  totalCreditSales: number;
  totalReturns: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface Sale {
  id?: number;
  invoiceNumber: string;
  customerId?: number;
  customerName?: string;
  shiftId: number;
  userId: number;
  userName: string;
  warehouseId?: number;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  paymentType: PaymentType;
  status: 'completed' | 'pending' | 'cancelled';
  date: Date;
  notes?: string;
  couponCode?: string;
  couponDiscount: number;
  voucherCode?: string;
  voucherAmount: number;
  loyaltyPointsRedeemed: number;
  loyaltyDiscount: number;
  loyaltyPointsEarned: number;
  hasDelivery?: boolean;
  deliveryId?: number;
  deliveryFee?: number;
}

export interface SaleItem {
  productId: number;
  productName: string;
  barcode: string;
  quantity: number;
  price: number;
  cost: number;
  discount: number;
  total: number;
}

export interface Category {
  id?: number;
  name: string;
  createdAt: Date;
}

export interface Payment {
  id?: number;
  saleId: number;
  customerId?: number;
  amount: number;
  type: 'collection' | 'payment';
  method: 'cash' | 'transfer';
  date: Date;
  notes?: string;
}

export interface Settings {
  id?: number;
  storeName: string;
  storeLogo: string;
  favicon: string;
  storeAddress: string;
  storePhone: string;
  taxNumber: string;
  taxRate: number;
  currencyCode: string;
  receiptFooter: string;
  showAddressOnReceipt: boolean;
  showPhoneOnReceipt: boolean;
  showTaxNumberOnReceipt: boolean;
  paperWidth: '58mm' | '80mm';
  displayWelcomeMessage: string;
  displayIdleImage: string;
  displayBgColor: string;
  displayAccentColor: string;
  loyaltyPointValue: number;
  whatsappCountryCode: string;
  // WhatsApp Business API الرسمي من Meta
  whatsappApiEnabled: boolean;
  whatsappApiToken: string;
  whatsappPhoneNumberId: string;
  enableScaleBarcodes: boolean;
  scaleBarcodePrefix: string;
  printAccentColor: string;
  printFontFamily: string;
  sidebarBg: string;
  themeId: string;
  // ===== تخصيص حقول المطبوعات =====
  // الفاتورة
  receiptShowLogo: boolean;
  receiptShowCustomer: boolean;
  receiptShowBarcode: boolean;
  receiptShowPaymentMethod: boolean;
  receiptShowTax: boolean;
  receiptShowDiscounts: boolean;
  receiptShowRemaining: boolean;
  // ملخص الوردية
  shiftShowLogo: boolean;
  shiftShowSalesList: boolean;
  shiftShowCashDetails: boolean;
  // إيصال المرتجع
  returnShowBarcode: boolean;
  returnShowOriginalInvoice: boolean;
  returnShowReason: boolean;
  // تقرير المبيعات
  reportShowProfit: boolean;
  reportShowTopProducts: boolean;
  // ===== بطاقات العروض والكوبونات والقسائم والولاء =====
  offerCardShowLogo: boolean;
  offerCardShowTarget: boolean;
  offerCardShowDates: boolean;
  offerCardShowStatus: boolean;
  couponCardShowLogo: boolean;
  couponCardShowBarcode: boolean;
  couponCardShowExpiry: boolean;
  couponCardShowMinPurchase: boolean;
  couponCardShowUsageCount: boolean;
  voucherCardShowLogo: boolean;
  voucherCardShowBarcode: boolean;
  voucherCardShowBalance: boolean;
  voucherCardShowStatus: boolean;
  loyaltyCardShowLogo: boolean;
  loyaltyCardShowBarcode: boolean;
  loyaltyCardShowBalance: boolean;
  loyaltyCardShowPhone: boolean;
}

export interface BundleProduct { productId: number; productName: string; qty: number; }

export interface Offer {
  id?: number;
  name: string;
  targetType: 'product' | 'category' | 'bundle';
  productIds: number[];
  category: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  // عرض مجمّع
  bundleProducts?: BundleProduct[];
  bundlePrice?: number;
}

export interface Coupon {
  id?: number;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  expiryDate: Date;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
}

export interface Voucher {
  id?: number;
  code: string;
  initialAmount: number;
  balance: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CampaignRecipient {
  customerId: number;
  customerName: string;
  phone: string;
  status: 'pending' | 'sent';
  sentAt?: Date;
}

export interface Campaign {
  id?: number;
  name: string;
  message: string;
  recipients: CampaignRecipient[];
  createdAt: Date;
}

export interface CustomerGroup {
  id?: number;
  name: string;
  customerIds: number[];
  createdAt: Date;
}

export interface WhatsAppLog {
  id?: number;
  date: Date;
  phone: string;
  customerName?: string;
  message: string;
  success: boolean;
  method: 'gateway' | 'wa.me';
  context: 'campaign' | 'invoice' | 'quick';
  error?: string;
}

export interface ReturnItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Return {
  id?: number;
  returnNumber: string;
  originalSaleId: number;
  originalInvoiceNumber: string;
  customerId?: number;
  customerName?: string;
  items: ReturnItem[];
  refundAmount: number;
  refundMethod: 'cash' | 'credit';
  voucherCode?: string;
  reason?: string;
  userId: number;
  userName: string;
  shiftId?: number;
  date: Date;
}

// ===== ميزة تعليق الفاتورة (Park/Hold) =====
export interface ParkedCartItem {
  productId: number;
  productName: string;
  barcode: string;
  price: number;
  cost: number;
  quantity: number;
  discount: number;
  image?: string;
}
export interface ParkedSale {
  id?: number;
  label?: string;
  cartItems: ParkedCartItem[];
  customerId?: number;
  customerName?: string;
  couponCode?: string;
  couponDiscount: number;
  voucherCode?: string;
  voucherAmount: number;
  loyaltyPointsRedeemed: number;
  paymentType: PaymentType;
  notes?: string;
  createdAt: Date;
}

// ===== ميزة التوصيل =====
export interface Delivery {
  id?: number;
  saleId?: number;
  invoiceNumber?: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  notes?: string;
  deliveryFee: number;
  status: 'pending' | 'on_way' | 'delivered' | 'cancelled';
  createdAt: Date;
  deliveredAt?: Date;
}

// ===== عروض الجملة (تسعيرة متدرجة) =====
export interface PriceTier {
  id?: number;
  productId: number;
  minQty: number;
  price: number;
  createdAt: Date;
}

// ===== الموظفون =====
export interface Employee {
  id?: number;
  name: string;
  userId?: number;
  phone: string;
  email?: string;
  position: string;
  department: string;
  salary: number;
  hireDate: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
}

// ===== الطلبات =====
export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}
export interface Order {
  id?: number;
  orderNumber: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  deliveryAddress?: string;
  notes?: string;
  date: Date;
  userId: number;
  userName: string;
}

// ===== مستويات الولاء =====
export interface LoyaltyTier {
  id?: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  discountPercent: number;
  color: string;
  benefits: string;
  isActive: boolean;
  createdAt: Date;
}

// ===== المستودعات وحركة المخزون =====
export interface Warehouse {
  id?: number;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductWarehouseStock {
  id?: number;
  productId: number;
  warehouseId: number;
  stock: number;
  minStock: number;
  updatedAt: Date;
}

export type StockMovementType =
  | 'sale' | 'return' | 'purchase' | 'purchase_return'
  | 'adjustment' | 'transfer_in' | 'transfer_out';

export interface StockMovement {
  id?: number;
  productId: number;
  productName: string;
  warehouseId?: number;
  type: StockMovementType;
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  refType?: string;
  refId?: number;
  reason?: string;
  userId: number;
  userName: string;
  date: Date;
}

// ===== مرتجع الشراء =====
export interface PurchaseReturnItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface PurchaseReturn {
  id?: number;
  purchaseReturnNumber: string;
  originalInvoiceId: number;
  originalInvoiceNumber: string;
  supplierId: number;
  supplierName: string;
  items: PurchaseReturnItem[];
  refundAmount: number;
  reason?: string;
  userId: number;
  userName: string;
  date: Date;
}

// ===== سلف الموظفين =====
export interface EmployeeAdvance {
  id?: number;
  employeeId: number;
  employeeName: string;
  amount: number;
  remainingBalance: number;
  reason?: string;
  status: 'active' | 'settled';
  userId: number;
  userName: string;
  date: Date;
}

// ===== سجل التدقيق =====
export interface AuditLog {
  id?: number;
  userId: number;
  userName: string;
  action: string;
  tableName?: string;
  recordId?: number;
  details?: Record<string, unknown>;
  date: Date;
}

// ===== طبقة توافق مع واجهة Dexie القديمة، مدعومة بـ API حقيقي + قاعدة بيانات مشتركة =====
// كل الشاشات في النظام تستورد `db` من هذا الملف وتستخدم نفس الاستدعاءات التي كانت تُستخدم
// مع IndexedDB (toArray, add, update, where().equals()...) — لذا أبقينا الواجهة كما هي
// تمامًا، واستبدلنا التنفيذ الداخلي فقط بطلبات شبكة إلى /api/db/[table] بدل قاعدة بيانات
// محلية في المتصفح، حتى تُحفظ البيانات في قاعدة بيانات حقيقية مشتركة بين كل الأجهزة.

import { getOfflineDb, CACHEABLE_TABLES, type SyncOp } from './offline-db';

const DATE_FIELDS = new Set([
  'date', 'createdAt', 'updatedAt', 'startTime', 'endTime', 'sentAt', 'expiryDate', 'startDate', 'endDate',
  'lastLoginAt', 'paidAt',
]);

function reviveDates<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const val = (obj as Record<string, unknown>)[key];
      if (DATE_FIELDS.has(key) && typeof val === 'string') {
        (obj as Record<string, unknown>)[key] = new Date(val);
      }
    }
  }
  return obj;
}

async function parseJsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── offline helper ──────────────────────────────────────────────────────────
function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

async function cacheRows(tableName: string, rows: unknown[]) {
  const db = getOfflineDb();
  if (!db || !CACHEABLE_TABLES.has(tableName)) return;
  try {
    await db.table(tableName).bulkPut(rows);
  } catch { /* ignore */ }
}

async function queueOp(op: Omit<SyncOp, 'id' | 'retries'>) {
  const db = getOfflineDb();
  if (!db) return;
  await db.syncOps.add({ ...op, retries: 0 });
}

// ── WhereEqualsClause ───────────────────────────────────────────────────────
class WhereEqualsClause<T> {
  constructor(private tableName: string, private field: string, private value: unknown) {}

  private url() {
    return `/api/db/${this.tableName}?${encodeURIComponent(this.field)}=${encodeURIComponent(String(this.value))}`;
  }

  async toArray(): Promise<T[]> {
    if (!isOnline()) {
      const db = getOfflineDb();
      if (db && CACHEABLE_TABLES.has(this.tableName)) {
        const all = await db.table(this.tableName).toArray() as T[];
        return all.filter(r => (r as Record<string, unknown>)[this.field] == this.value).map(reviveDates);
      }
      return [];
    }
    try {
      const res = await fetch(this.url());
      const rows = (await parseJsonOrThrow(res)) as T[];
      const revived = rows.map(reviveDates);
      await cacheRows(this.tableName, revived as unknown[]);
      return revived;
    } catch {
      const db = getOfflineDb();
      if (db && CACHEABLE_TABLES.has(this.tableName)) {
        const all = await db.table(this.tableName).toArray() as T[];
        return all.filter(r => (r as Record<string, unknown>)[this.field] == this.value).map(reviveDates);
      }
      return [];
    }
  }

  async first(): Promise<T | undefined> {
    const rows = await this.toArray();
    return rows[0];
  }

  async modify(changes: Partial<T>): Promise<number> {
    // update local cache optimistically
    const db = getOfflineDb();
    if (db && CACHEABLE_TABLES.has(this.tableName)) {
      const all = await db.table(this.tableName).toArray() as (T & { id: number })[];
      const matches = all.filter(r => (r as Record<string, unknown>)[this.field] == this.value);
      for (const m of matches) await db.table(this.tableName).update(m.id, changes as object);
    }
    if (!isOnline()) {
      await queueOp({ table: this.tableName, method: 'PATCH', url: this.url(), body: JSON.stringify(changes), createdAt: Date.now() });
      return 0;
    }
    try {
      const res = await fetch(this.url(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const data = await parseJsonOrThrow(res);
      return data.count ?? 0;
    } catch {
      await queueOp({ table: this.tableName, method: 'PATCH', url: this.url(), body: JSON.stringify(changes), createdAt: Date.now() });
      return 0;
    }
  }
}

class WhereClause<T> {
  constructor(private tableName: string, private field: string) {}
  equals(value: unknown): WhereEqualsClause<T> {
    return new WhereEqualsClause<T>(this.tableName, this.field, value);
  }
}

async function fetchOrdered<T>(tableName: string, field: string, dir: 'asc' | 'desc'): Promise<T[]> {
  if (!isOnline()) {
    const db = getOfflineDb();
    if (db && CACHEABLE_TABLES.has(tableName)) {
      const all = await db.table(tableName).toArray() as T[];
      const sorted = all.sort((a, b) => {
        const av = (a as Record<string, unknown>)[field];
        const bv = (b as Record<string, unknown>)[field];
        const cmp = av == null ? -1 : bv == null ? 1 : (av as string) < (bv as string) ? -1 : (av as string) > (bv as string) ? 1 : 0;
        return cmp * (dir === 'asc' ? 1 : -1);
      });
      return sorted.map(reviveDates);
    }
    return [];
  }
  try {
    const res = await fetch(`/api/db/${tableName}?orderBy=${encodeURIComponent(field)}&dir=${dir}`);
    const rows = (await parseJsonOrThrow(res)) as T[];
    const revived = rows.map(reviveDates);
    await cacheRows(tableName, revived as unknown[]);
    return revived;
  } catch {
    const db = getOfflineDb();
    if (db && CACHEABLE_TABLES.has(tableName)) {
      const all = await db.table(tableName).toArray() as T[];
      return all.map(reviveDates);
    }
    return [];
  }
}

class OrderByReversedClause<T> {
  constructor(private tableName: string, private field: string) {}
  async toArray(): Promise<T[]> { return fetchOrdered<T>(this.tableName, this.field, 'desc'); }
}

class OrderByClause<T> {
  constructor(private tableName: string, private field: string) {}
  async toArray(): Promise<T[]> { return fetchOrdered<T>(this.tableName, this.field, 'asc'); }
  reverse(): OrderByReversedClause<T> { return new OrderByReversedClause<T>(this.tableName, this.field); }
}

class FilterClause<T> {
  constructor(private all: Promise<T[]>, private predicate: (item: T) => boolean) {}
  async toArray(): Promise<T[]> {
    return (await this.all).filter(this.predicate);
  }
  async first(): Promise<T | undefined> {
    return (await this.all).find(this.predicate);
  }
}

// ── ApiTable (offline-aware) ─────────────────────────────────────────────────
class ApiTable<T extends { id?: number }> {
  constructor(private tableName: string) {}

  async toArray(): Promise<T[]> {
    if (!isOnline()) {
      const db = getOfflineDb();
      if (db && CACHEABLE_TABLES.has(this.tableName)) {
        return (await db.table(this.tableName).toArray() as T[]).map(reviveDates);
      }
      return [];
    }
    try {
      const res = await fetch(`/api/db/${this.tableName}`);
      const rows = (await parseJsonOrThrow(res)) as T[];
      const revived = rows.map(reviveDates);
      await cacheRows(this.tableName, revived as unknown[]);
      return revived;
    } catch {
      const db = getOfflineDb();
      if (db && CACHEABLE_TABLES.has(this.tableName)) {
        return (await db.table(this.tableName).toArray() as T[]).map(reviveDates);
      }
      return [];
    }
  }

  async add(obj: Omit<T, 'id'> | T): Promise<number> {
    const db = getOfflineDb();
    // Generate a stable temp ID so local references work
    const tempId = Date.now() + Math.floor(Math.random() * 9999);
    const localObj = { ...obj, id: tempId };
    if (db && CACHEABLE_TABLES.has(this.tableName)) {
      await db.table(this.tableName).put(localObj).catch(() => {});
    }
    if (!isOnline()) {
      await queueOp({
        table: this.tableName, method: 'POST',
        url: `/api/db/${this.tableName}`,
        body: JSON.stringify(obj),
        localTempId: tempId, createdAt: Date.now(),
      });
      return tempId;
    }
    try {
      const res = await fetch(`/api/db/${this.tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj),
      });
      const data = await parseJsonOrThrow(res);
      if (db && CACHEABLE_TABLES.has(this.tableName)) {
        await db.table(this.tableName).delete(tempId).catch(() => {});
        await db.table(this.tableName).put(data).catch(() => {});
      }
      return data.id;
    } catch {
      await queueOp({
        table: this.tableName, method: 'POST',
        url: `/api/db/${this.tableName}`,
        body: JSON.stringify(obj),
        localTempId: tempId, createdAt: Date.now(),
      });
      return tempId;
    }
  }

  async bulkAdd(arr: (Omit<T, 'id'> | T)[]): Promise<void> {
    if (!isOnline()) {
      for (const item of arr) { await this.add(item); }
      return;
    }
    try {
      const res = await fetch(`/api/db/${this.tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arr),
      });
      await parseJsonOrThrow(res);
    } catch {
      for (const item of arr) { await this.add(item); }
    }
  }

  async get(id: number): Promise<T | undefined> {
    if (!isOnline()) {
      const db = getOfflineDb();
      if (db && CACHEABLE_TABLES.has(this.tableName)) {
        const r = await db.table(this.tableName).get(id) as T | undefined;
        return r ? reviveDates(r) : undefined;
      }
      return undefined;
    }
    try {
      const res = await fetch(`/api/db/${this.tableName}/${id}`);
      if (res.status === 404) return undefined;
      const data = await parseJsonOrThrow(res);
      const revived = reviveDates(data as T);
      const db = getOfflineDb();
      if (db && CACHEABLE_TABLES.has(this.tableName)) await db.table(this.tableName).put(revived).catch(() => {});
      return revived;
    } catch {
      const db = getOfflineDb();
      if (db && CACHEABLE_TABLES.has(this.tableName)) {
        const r = await db.table(this.tableName).get(id) as T | undefined;
        return r ? reviveDates(r) : undefined;
      }
      return undefined;
    }
  }

  async update(id: number, changes: Partial<T>): Promise<number> {
    const db = getOfflineDb();
    if (db && CACHEABLE_TABLES.has(this.tableName)) {
      await db.table(this.tableName).update(id, changes as object).catch(() => {});
    }
    if (!isOnline()) {
      await queueOp({
        table: this.tableName, method: 'PATCH',
        url: `/api/db/${this.tableName}/${id}`,
        body: JSON.stringify(changes), createdAt: Date.now(),
      });
      return 1;
    }
    try {
      const res = await fetch(`/api/db/${this.tableName}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      return res.ok ? 1 : 0;
    } catch {
      await queueOp({
        table: this.tableName, method: 'PATCH',
        url: `/api/db/${this.tableName}/${id}`,
        body: JSON.stringify(changes), createdAt: Date.now(),
      });
      return 1;
    }
  }

  async put(obj: T): Promise<number> {
    const id = obj.id;
    const db = getOfflineDb();
    if (db && CACHEABLE_TABLES.has(this.tableName)) {
      await db.table(this.tableName).put(obj).catch(() => {});
    }
    if (!isOnline()) {
      await queueOp({
        table: this.tableName, method: 'PUT',
        url: `/api/db/${this.tableName}/${id}`,
        body: JSON.stringify(obj), createdAt: Date.now(),
      });
      return id ?? 0;
    }
    try {
      const res = await fetch(`/api/db/${this.tableName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj),
      });
      const data = await parseJsonOrThrow(res);
      return data.id;
    } catch {
      await queueOp({
        table: this.tableName, method: 'PUT',
        url: `/api/db/${this.tableName}/${id}`,
        body: JSON.stringify(obj), createdAt: Date.now(),
      });
      return id ?? 0;
    }
  }

  async delete(id: number): Promise<void> {
    const db = getOfflineDb();
    if (db && CACHEABLE_TABLES.has(this.tableName)) {
      await db.table(this.tableName).delete(id).catch(() => {});
    }
    if (!isOnline()) {
      await queueOp({
        table: this.tableName, method: 'DELETE',
        url: `/api/db/${this.tableName}/${id}`,
        createdAt: Date.now(),
      });
      return;
    }
    try {
      const res = await fetch(`/api/db/${this.tableName}/${id}`, { method: 'DELETE' });
      await parseJsonOrThrow(res);
    } catch {
      await queueOp({
        table: this.tableName, method: 'DELETE',
        url: `/api/db/${this.tableName}/${id}`,
        createdAt: Date.now(),
      });
    }
  }

  async clear(): Promise<void> {
    const db = getOfflineDb();
    if (db && CACHEABLE_TABLES.has(this.tableName)) {
      await db.table(this.tableName).clear().catch(() => {});
    }
    if (!isOnline()) return;
    try {
      const res = await fetch(`/api/db/${this.tableName}`, { method: 'DELETE' });
      await parseJsonOrThrow(res);
    } catch { /* ignore */ }
  }

  async count(): Promise<number> {
    return (await this.toArray()).length;
  }

  where(field: keyof T & string): WhereClause<T> {
    return new WhereClause<T>(this.tableName, field);
  }

  orderBy(field: keyof T & string): OrderByClause<T> {
    return new OrderByClause<T>(this.tableName, field);
  }

  filter(predicate: (item: T) => boolean): FilterClause<T> {
    return new FilterClause<T>(this.toArray(), predicate);
  }
}

// ===== فئات المصروفات =====
export interface ExpenseCategory {
  id?: number;
  name: string;
  icon: string;
  budgetMonthly?: number;
  isActive: boolean;
}

// ===== المصروفات =====
export interface Expense {
  id?: number;
  date: Date;
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'check';
  checkNumber?: string;
  bankName?: string;
  receiptNumber?: string;
  notes?: string;
  userId: number;
  userName: string;
  createdAt: Date;
}

// ===== السندات المالية =====
export interface FinancialVoucher {
  id?: number;
  voucherNumber: string;
  type: 'receipt' | 'payment' | 'collection';
  date: Date;
  amount: number;
  partyName: string;
  partyType: 'customer' | 'supplier' | 'employee' | 'other';
  partyId?: number;
  description: string;
  paymentMethod: 'cash' | 'transfer' | 'check';
  checkNumber?: string;
  bankName?: string;
  notes?: string;
  userId: number;
  userName: string;
  createdAt: Date;
}

// ===== الرواتب =====
export interface SalaryPayment {
  id?: number;
  voucherNumber: string;
  employeeId: number;
  employeeName: string;
  employeePosition: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'pending' | 'paid';
  paidAt?: Date;
  paymentMethod: 'cash' | 'transfer';
  notes?: string;
  userId: number;
  userName: string;
  createdAt: Date;
}

class ApiDatabase {
  products = new ApiTable<Product>('products');
  customers = new ApiTable<Customer>('customers');
  suppliers = new ApiTable<Supplier>('suppliers');
  supplierInvoices = new ApiTable<SupplierInvoice>('supplierInvoices');
  users = new ApiTable<User>('users');
  shifts = new ApiTable<Shift>('shifts');
  sales = new ApiTable<Sale>('sales');
  categories = new ApiTable<Category>('categories');
  payments = new ApiTable<Payment>('payments');
  settings = new ApiTable<Settings>('settings');
  offers = new ApiTable<Offer>('offers');
  coupons = new ApiTable<Coupon>('coupons');
  vouchers = new ApiTable<Voucher>('vouchers');
  campaigns = new ApiTable<Campaign>('campaigns');
  returns = new ApiTable<Return>('returns');
  parkedSales = new ApiTable<ParkedSale>('parkedSales');
  deliveries = new ApiTable<Delivery>('deliveries');
  priceTiers = new ApiTable<PriceTier>('priceTiers');
  employees = new ApiTable<Employee>('employees');
  orders = new ApiTable<Order>('orders');
  loyaltyTiers = new ApiTable<LoyaltyTier>('loyaltyTiers');
  customerGroups = new ApiTable<CustomerGroup>('customerGroups');
  whatsappLogs = new ApiTable<WhatsAppLog>('whatsappLogs');
  walletTransactions = new ApiTable<WalletTransaction>('walletTransactions');
  financialVouchers = new ApiTable<FinancialVoucher>('financialVouchers');
  salaryPayments = new ApiTable<SalaryPayment>('salaryPayments');
  expenseCategories = new ApiTable<ExpenseCategory>('expenseCategories');
  expenses = new ApiTable<Expense>('expenses');
  warehouses = new ApiTable<Warehouse>('warehouses');
  productWarehouseStock = new ApiTable<ProductWarehouseStock>('productWarehouseStock');
  stockMovements = new ApiTable<StockMovement>('stockMovements');
  purchaseReturns = new ApiTable<PurchaseReturn>('purchaseReturns');
  employeeAdvances = new ApiTable<EmployeeAdvance>('employeeAdvances');
  auditLogs = new ApiTable<AuditLog>('auditLogs');
}

export const db = new ApiDatabase();

// التهيئة (إنشاء الجداول وحساب المدير الافتراضي) تتم تلقائيًا على الخادم عند أول طلب —
// هذه الدالة باقية فقط للتوافق مع الشاشات التي كانت تستدعيها، ولا تحتاج عمل أي شيء بنفسها.
export async function seedDefaultData(): Promise<void> {}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const prefix = 'INV';
  const timestamp = now.getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

export function generateReturnNumber(): string {
  const now = new Date();
  const prefix = 'RET';
  const timestamp = now.getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

// يحدّث مخزون المنتج (الإجمالي) ويسجّل حركة في stockMovements في آن واحد —
// نقطة مركزية واحدة تُستدعى من كل مكان يُغيَّر فيه المخزون (بيع، شراء، مرتجع، تسوية، تحويل).
export async function recordStockMovement(params: {
  productId: number;
  productName: string;
  stockBefore: number;
  quantityDelta: number; // موجب = زيادة، سالب = نقص
  type: StockMovementType;
  userId: number;
  userName: string;
  warehouseId?: number;
  refType?: string;
  refId?: number;
  reason?: string;
}): Promise<number> {
  const stockAfter = params.stockBefore + params.quantityDelta;
  await db.products.update(params.productId, { stock: stockAfter, updatedAt: new Date() });
  await db.stockMovements.add({
    productId: params.productId,
    productName: params.productName,
    warehouseId: params.warehouseId,
    type: params.type,
    quantityDelta: params.quantityDelta,
    stockBefore: params.stockBefore,
    stockAfter,
    refType: params.refType,
    refId: params.refId,
    reason: params.reason,
    userId: params.userId,
    userName: params.userName,
    date: new Date(),
  });
  return stockAfter;
}

export function generatePurchaseReturnNumber(): string {
  const now = new Date();
  const prefix = 'PRET';
  const timestamp = now.getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

// يسجّل حدثًا في سجل التدقيق لعملية حساسة (إدارة مستخدمين، تعديل مخزون يدوي، سندات مالية...)
export async function logAudit(
  userId: number,
  userName: string,
  action: string,
  tableName?: string,
  recordId?: number,
  details?: Record<string, unknown>
): Promise<void> {
  await db.auditLogs.add({ userId, userName, action, tableName, recordId, details, date: new Date() });
}

export function generateBarcode(): string {
  const prefix = '8';
  const random = Math.floor(Math.random() * 100000000000).toString().padStart(11, '0');
  return prefix + random;
}

function generateCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${part()}-${part()}`;
}

export function generateCouponCode(): string {
  return generateCode('CPN');
}

export function generateVoucherCode(): string {
  return generateCode('GFT');
}

export function formatWhatsAppPhone(phone: string, countryCode: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith(countryCode)) return digits;
  if (digits.startsWith('0')) return countryCode + digits.slice(1);
  return countryCode + digits;
}

export interface ScaleBarcodeResult {
  plu: string;
  weightKg: number;
}

// Decodes a 13-digit scale-printed barcode (common weighted-item format):
// [prefix:1][plu:5][weight in grams:5][check digit:1] (digit 12 unused/spare)
export function decodeScaleBarcode(code: string, prefix: string): ScaleBarcodeResult | null {
  const digits = code.replace(/\D/g, '');
  if (digits.length !== 13 || !digits.startsWith(prefix)) return null;
  const plu = digits.slice(1, 6);
  const weightGrams = parseInt(digits.slice(6, 11), 10);
  if (Number.isNaN(weightGrams) || weightGrams <= 0) return null;
  return { plu, weightKg: weightGrams / 1000 };
}

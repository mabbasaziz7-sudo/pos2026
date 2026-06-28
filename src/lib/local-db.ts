import Dexie, { type Table } from 'dexie';

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
  loyaltyPoints: number;
  createdAt: Date;
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
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  paymentType: 'cash' | 'credit' | 'mixed';
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
  enableScaleBarcodes: boolean;
  scaleBarcodePrefix: string;
}

export interface Offer {
  id?: number;
  name: string;
  targetType: 'product' | 'category';
  productIds: number[];
  category: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
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

export class CashierDatabase extends Dexie {
  products!: Table<Product>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  supplierInvoices!: Table<SupplierInvoice>;
  users!: Table<User>;
  shifts!: Table<Shift>;
  sales!: Table<Sale>;
  categories!: Table<Category>;
  payments!: Table<Payment>;
  settings!: Table<Settings>;
  offers!: Table<Offer>;
  coupons!: Table<Coupon>;
  vouchers!: Table<Voucher>;
  campaigns!: Table<Campaign>;
  returns!: Table<Return>;
  customerGroups!: Table<CustomerGroup>;
  whatsappLogs!: Table<WhatsAppLog>;

  constructor() {
    super('CashierDB');
    this.version(1).stores({
      products: '++id, name, barcode, category',
      customers: '++id, name, phone',
      suppliers: '++id, name, phone',
      supplierInvoices: '++id, supplierId, invoiceNumber, date',
      users: '++id, username, role',
      shifts: '++id, userId, status, startTime',
      sales: '++id, invoiceNumber, customerId, shiftId, date, status',
      categories: '++id, name',
      payments: '++id, saleId, customerId, date',
    });
    this.version(2).stores({
      products: '++id, name, barcode, category',
      customers: '++id, name, phone',
      suppliers: '++id, name, phone',
      supplierInvoices: '++id, supplierId, invoiceNumber, date',
      users: '++id, username, role',
      shifts: '++id, userId, status, startTime',
      sales: '++id, invoiceNumber, customerId, shiftId, date, status',
      categories: '++id, name',
      payments: '++id, saleId, customerId, date',
      settings: '++id',
    });
    this.version(3).stores({
      products: '++id, name, barcode, category',
      customers: '++id, name, phone',
      suppliers: '++id, name, phone',
      supplierInvoices: '++id, supplierId, invoiceNumber, date',
      users: '++id, username, role',
      shifts: '++id, userId, status, startTime',
      sales: '++id, invoiceNumber, customerId, shiftId, date, status',
      categories: '++id, name',
      payments: '++id, saleId, customerId, date',
      settings: '++id',
      offers: '++id, targetType',
      coupons: '++id, &code',
      vouchers: '++id, &code',
    });
    this.version(4).stores({
      products: '++id, name, barcode, category',
      customers: '++id, name, phone',
      suppliers: '++id, name, phone',
      supplierInvoices: '++id, supplierId, invoiceNumber, date',
      users: '++id, username, role',
      shifts: '++id, userId, status, startTime',
      sales: '++id, invoiceNumber, customerId, shiftId, date, status',
      categories: '++id, name',
      payments: '++id, saleId, customerId, date',
      settings: '++id',
      offers: '++id, targetType',
      coupons: '++id, &code',
      vouchers: '++id, &code',
      campaigns: '++id',
    });
    this.version(5).stores({
      products: '++id, name, barcode, category',
      customers: '++id, name, phone',
      suppliers: '++id, name, phone',
      supplierInvoices: '++id, supplierId, invoiceNumber, date',
      users: '++id, username, role',
      shifts: '++id, userId, status, startTime',
      sales: '++id, invoiceNumber, customerId, shiftId, date, status',
      categories: '++id, name',
      payments: '++id, saleId, customerId, date',
      settings: '++id',
      offers: '++id, targetType',
      coupons: '++id, &code',
      vouchers: '++id, &code',
      campaigns: '++id',
      returns: '++id, originalSaleId',
    });
    this.version(6).stores({
      products: '++id, name, barcode, category',
      customers: '++id, name, phone',
      suppliers: '++id, name, phone',
      supplierInvoices: '++id, supplierId, invoiceNumber, date',
      users: '++id, username, role',
      shifts: '++id, userId, status, startTime',
      sales: '++id, invoiceNumber, customerId, shiftId, date, status',
      categories: '++id, name',
      payments: '++id, saleId, customerId, date',
      settings: '++id',
      offers: '++id, targetType',
      coupons: '++id, &code',
      vouchers: '++id, &code',
      campaigns: '++id',
      returns: '++id, originalSaleId',
      customerGroups: '++id',
      whatsappLogs: '++id, date',
    });
  }
}

export const db = new CashierDatabase();

// Seed default admin user
export async function seedDefaultData() {
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.add({
      name: 'مدير النظام',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      permissions: ['all'],
      isActive: true,
      createdAt: new Date(),
    });
  }

  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd([
      { name: 'عام', createdAt: new Date() },
      { name: 'مأكولات', createdAt: new Date() },
      { name: 'مشروبات', createdAt: new Date() },
      { name: 'إلكترونيات', createdAt: new Date() },
      { name: 'ملابس', createdAt: new Date() },
    ]);
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      id: 1,
      storeName: 'نظام الكاشير',
      storeLogo: '',
      storeAddress: '',
      storePhone: '',
      taxNumber: '',
      taxRate: 0.15,
      currencyCode: 'SAR',
      receiptFooter: 'شكراً لتسوقكم معنا',
      showAddressOnReceipt: true,
      showPhoneOnReceipt: true,
      showTaxNumberOnReceipt: true,
      paperWidth: '80mm',
      displayWelcomeMessage: 'مرحباً بكم',
      displayIdleImage: '',
      displayBgColor: '#0f172a',
      displayAccentColor: '#10b981',
      loyaltyPointValue: 0.1,
      whatsappCountryCode: '966',
      enableScaleBarcodes: false,
      scaleBarcodePrefix: '2',
    });
  }
}

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

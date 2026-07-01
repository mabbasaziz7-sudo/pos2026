// وصف كل الجداول: الأعمدة المسموحة وأنواعها — يُستخدم لإنشاء الجداول تلقائيًا
// (CREATE TABLE IF NOT EXISTS) وللتحقق من صحة أسماء الأعمدة في الـ API العام،
// بحيث تطابق بنية البيانات الأصلية في src/lib/local-db.ts حقلًا بحقل (camelCase) دون أي تحويل.

export type ColType = 'serial' | 'fixedId' | 'text' | 'numeric' | 'integer' | 'boolean' | 'timestamp' | 'jsonb';

export interface ColumnDef {
  name: string;
  type: ColType;
  nullable?: boolean;
  unique?: boolean;
  default?: string; // SQL literal, e.g. '0', 'true', "''"
}

export interface TableDef {
  columns: ColumnDef[];
}

const id = (): ColumnDef => ({ name: 'id', type: 'serial' });

export const SCHEMA: Record<string, TableDef> = {
  products: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'barcode', type: 'text', unique: true },
      { name: 'price', type: 'numeric', default: '0' },
      { name: 'cost', type: 'numeric', default: '0' },
      { name: 'stock', type: 'numeric', default: '0' },
      { name: 'minStock', type: 'numeric', default: '0' },
      { name: 'category', type: 'text', default: "''" },
      { name: 'unit', type: 'text', default: "'قطعة'" },
      { name: 'discount', type: 'numeric', nullable: true },
      { name: 'image', type: 'text', nullable: true },
      { name: 'plu', type: 'text', nullable: true },
      { name: 'createdAt', type: 'timestamp' },
      { name: 'updatedAt', type: 'timestamp' },
    ],
  },
  customers: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'phone', type: 'text', default: "''" },
      { name: 'address', type: 'text', default: "''" },
      { name: 'email', type: 'text', nullable: true },
      { name: 'creditLimit', type: 'numeric', default: '0' },
      { name: 'balance', type: 'numeric', default: '0' },
      { name: 'loyaltyPoints', type: 'numeric', default: '0' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },
  suppliers: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'phone', type: 'text', default: "''" },
      { name: 'address', type: 'text', default: "''" },
      { name: 'email', type: 'text', nullable: true },
      { name: 'balance', type: 'numeric', default: '0' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },
  supplierInvoices: {
    columns: [
      id(),
      { name: 'supplierId', type: 'integer' },
      { name: 'invoiceNumber', type: 'text' },
      { name: 'total', type: 'numeric', default: '0' },
      { name: 'paid', type: 'numeric', default: '0' },
      { name: 'remaining', type: 'numeric', default: '0' },
      { name: 'items', type: 'jsonb', default: "'[]'" },
      { name: 'date', type: 'timestamp' },
      { name: 'notes', type: 'text', nullable: true },
    ],
  },
  users: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'username', type: 'text', unique: true },
      { name: 'password', type: 'text' },
      { name: 'role', type: 'text', default: "'cashier'" },
      { name: 'permissions', type: 'jsonb', default: "'[]'" },
      { name: 'isActive', type: 'boolean', default: 'true' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },
  shifts: {
    columns: [
      id(),
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'startTime', type: 'timestamp' },
      { name: 'endTime', type: 'timestamp', nullable: true },
      { name: 'startingCash', type: 'numeric', default: '0' },
      { name: 'expectedCash', type: 'numeric', default: '0' },
      { name: 'actualCash', type: 'numeric', nullable: true },
      { name: 'difference', type: 'numeric', nullable: true },
      { name: 'totalSales', type: 'numeric', default: '0' },
      { name: 'totalCashSales', type: 'numeric', default: '0' },
      { name: 'totalCreditSales', type: 'numeric', default: '0' },
      { name: 'totalReturns', type: 'numeric', default: '0' },
      { name: 'status', type: 'text', default: "'open'" },
      { name: 'notes', type: 'text', nullable: true },
    ],
  },
  sales: {
    columns: [
      id(),
      { name: 'invoiceNumber', type: 'text' },
      { name: 'customerId', type: 'integer', nullable: true },
      { name: 'customerName', type: 'text', nullable: true },
      { name: 'shiftId', type: 'integer' },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'items', type: 'jsonb', default: "'[]'" },
      { name: 'subtotal', type: 'numeric', default: '0' },
      { name: 'discount', type: 'numeric', default: '0' },
      { name: 'tax', type: 'numeric', default: '0' },
      { name: 'total', type: 'numeric', default: '0' },
      { name: 'paid', type: 'numeric', default: '0' },
      { name: 'remaining', type: 'numeric', default: '0' },
      { name: 'paymentType', type: 'text', default: "'cash'" },
      { name: 'status', type: 'text', default: "'completed'" },
      { name: 'date', type: 'timestamp' },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'couponCode', type: 'text', nullable: true },
      { name: 'couponDiscount', type: 'numeric', default: '0' },
      { name: 'voucherCode', type: 'text', nullable: true },
      { name: 'voucherAmount', type: 'numeric', default: '0' },
      { name: 'loyaltyPointsRedeemed', type: 'numeric', default: '0' },
      { name: 'loyaltyDiscount', type: 'numeric', default: '0' },
      { name: 'loyaltyPointsEarned', type: 'numeric', default: '0' },
      { name: 'hasDelivery', type: 'boolean', default: 'false', nullable: true },
      { name: 'deliveryId', type: 'integer', nullable: true },
      { name: 'deliveryFee', type: 'numeric', default: '0', nullable: true },
    ],
  },
  categories: {
    columns: [id(), { name: 'name', type: 'text', unique: true }, { name: 'createdAt', type: 'timestamp' }],
  },
  payments: {
    columns: [
      id(),
      { name: 'saleId', type: 'integer', nullable: true },
      { name: 'customerId', type: 'integer', nullable: true },
      { name: 'amount', type: 'numeric', default: '0' },
      { name: 'type', type: 'text', default: "'collection'" },
      { name: 'method', type: 'text', default: "'cash'" },
      { name: 'date', type: 'timestamp' },
      { name: 'notes', type: 'text', nullable: true },
    ],
  },
  settings: {
    columns: [
      { name: 'id', type: 'fixedId' },
      { name: 'storeName', type: 'text', default: "'نظام الكاشير'" },
      { name: 'storeLogo', type: 'text', default: "''" },
      { name: 'storeAddress', type: 'text', default: "''" },
      { name: 'storePhone', type: 'text', default: "''" },
      { name: 'taxNumber', type: 'text', default: "''" },
      { name: 'taxRate', type: 'numeric', default: '0.15' },
      { name: 'currencyCode', type: 'text', default: "'SAR'" },
      { name: 'receiptFooter', type: 'text', default: "'شكراً لتسوقكم معنا'" },
      { name: 'showAddressOnReceipt', type: 'boolean', default: 'true' },
      { name: 'showPhoneOnReceipt', type: 'boolean', default: 'true' },
      { name: 'showTaxNumberOnReceipt', type: 'boolean', default: 'true' },
      { name: 'paperWidth', type: 'text', default: "'80mm'" },
      { name: 'displayWelcomeMessage', type: 'text', default: "'مرحباً بكم'" },
      { name: 'displayIdleImage', type: 'text', default: "''" },
      { name: 'displayBgColor', type: 'text', default: "'#0f172a'" },
      { name: 'displayAccentColor', type: 'text', default: "'#10b981'" },
      { name: 'loyaltyPointValue', type: 'numeric', default: '0.1' },
      { name: 'whatsappCountryCode', type: 'text', default: "'966'" },
      { name: 'enableScaleBarcodes', type: 'boolean', default: 'false' },
      { name: 'scaleBarcodePrefix', type: 'text', default: "'2'" },
      { name: 'printAccentColor', type: 'text', default: "'#10b981'" },
      { name: 'printFontFamily', type: 'text', default: "'Tahoma, Arial, sans-serif'" },
    ],
  },
  offers: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'targetType', type: 'text', default: "'category'" },
      { name: 'productIds', type: 'jsonb', default: "'[]'" },
      { name: 'category', type: 'text', default: "''" },
      { name: 'discountType', type: 'text', default: "'percentage'" },
      { name: 'discountValue', type: 'numeric', default: '0' },
      { name: 'startDate', type: 'timestamp' },
      { name: 'endDate', type: 'timestamp' },
      { name: 'isActive', type: 'boolean', default: 'true' },
      { name: 'createdAt', type: 'timestamp' },
      // حقول العروض المجمعة (Bundle)
      { name: 'bundleProducts', type: 'jsonb', nullable: true },
      { name: 'bundlePrice', type: 'numeric', nullable: true },
    ],
  },
  coupons: {
    columns: [
      id(),
      { name: 'code', type: 'text', unique: true },
      { name: 'discountType', type: 'text', default: "'percentage'" },
      { name: 'discountValue', type: 'numeric', default: '0' },
      { name: 'minPurchase', type: 'numeric', default: '0' },
      { name: 'expiryDate', type: 'timestamp' },
      { name: 'maxUses', type: 'integer', default: '1' },
      { name: 'usedCount', type: 'integer', default: '0' },
      { name: 'isActive', type: 'boolean', default: 'true' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },
  vouchers: {
    columns: [
      id(),
      { name: 'code', type: 'text', unique: true },
      { name: 'initialAmount', type: 'numeric', default: '0' },
      { name: 'balance', type: 'numeric', default: '0' },
      { name: 'isActive', type: 'boolean', default: 'true' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },
  campaigns: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'message', type: 'text' },
      { name: 'recipients', type: 'jsonb', default: "'[]'" },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },
  customerGroups: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'customerIds', type: 'jsonb', default: "'[]'" },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },
  whatsappLogs: {
    columns: [
      id(),
      { name: 'date', type: 'timestamp' },
      { name: 'phone', type: 'text' },
      { name: 'customerName', type: 'text', nullable: true },
      { name: 'message', type: 'text' },
      { name: 'success', type: 'boolean', default: 'true' },
      { name: 'method', type: 'text', default: "'wa.me'" },
      { name: 'context', type: 'text', default: "'quick'" },
      { name: 'error', type: 'text', nullable: true },
    ],
  },
  returns: {
    columns: [
      id(),
      { name: 'returnNumber', type: 'text' },
      { name: 'originalSaleId', type: 'integer' },
      { name: 'originalInvoiceNumber', type: 'text' },
      { name: 'customerId', type: 'integer', nullable: true },
      { name: 'customerName', type: 'text', nullable: true },
      { name: 'items', type: 'jsonb', default: "'[]'" },
      { name: 'refundAmount', type: 'numeric', default: '0' },
      { name: 'refundMethod', type: 'text', default: "'cash'" },
      { name: 'voucherCode', type: 'text', nullable: true },
      { name: 'reason', type: 'text', nullable: true },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'shiftId', type: 'integer', nullable: true },
      { name: 'date', type: 'timestamp' },
    ],
  },

  // ===== تعليق الفاتورة =====
  parkedSales: {
    columns: [
      id(),
      { name: 'label', type: 'text', nullable: true },
      { name: 'cartItems', type: 'jsonb', default: "'[]'" },
      { name: 'customerId', type: 'integer', nullable: true },
      { name: 'customerName', type: 'text', nullable: true },
      { name: 'couponCode', type: 'text', nullable: true },
      { name: 'couponDiscount', type: 'numeric', default: '0' },
      { name: 'voucherCode', type: 'text', nullable: true },
      { name: 'voucherAmount', type: 'numeric', default: '0' },
      { name: 'loyaltyPointsRedeemed', type: 'integer', default: '0' },
      { name: 'paymentType', type: 'text', default: "'cash'" },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },

  // ===== التوصيل =====
  deliveries: {
    columns: [
      id(),
      { name: 'saleId', type: 'integer', nullable: true },
      { name: 'invoiceNumber', type: 'text', nullable: true },
      { name: 'recipientName', type: 'text' },
      { name: 'recipientPhone', type: 'text', default: "''" },
      { name: 'address', type: 'text' },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'deliveryFee', type: 'numeric', default: '0' },
      { name: 'status', type: 'text', default: "'pending'" },
      { name: 'createdAt', type: 'timestamp' },
      { name: 'deliveredAt', type: 'timestamp', nullable: true },
    ],
  },

  // ===== عروض الجملة (تسعيرة متدرجة) =====
  priceTiers: {
    columns: [
      id(),
      { name: 'productId', type: 'integer' },
      { name: 'minQty', type: 'numeric' },
      { name: 'price', type: 'numeric' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },
};

export const TABLE_NAMES = Object.keys(SCHEMA);

// أعمدة لا تُعاد أبدًا للمتصفح (مثل كلمة المرور المُشفّرة)
export const SENSITIVE_COLUMNS: Record<string, string[]> = {
  users: ['password'],
};

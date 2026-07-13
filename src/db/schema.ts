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
      { name: 'walletBalance', type: 'numeric', default: '0' },
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
      { name: 'lastLoginAt', type: 'timestamp', nullable: true },
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
      { name: 'totalCardSales', type: 'numeric', default: '0' },
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
      { name: 'warehouseId', type: 'integer', nullable: true },
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
      { name: 'favicon', type: 'text', default: "''" },
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
      { name: 'whatsappApiEnabled', type: 'boolean', default: 'false' },
      { name: 'whatsappApiToken', type: 'text', default: "''" },
      { name: 'whatsappPhoneNumberId', type: 'text', default: "''" },
      { name: 'enableScaleBarcodes', type: 'boolean', default: 'false' },
      { name: 'scaleBarcodePrefix', type: 'text', default: "'2'" },
      { name: 'printAccentColor', type: 'text', default: "'#10b981'" },
      { name: 'printFontFamily', type: 'text', default: "'Tahoma, Arial, sans-serif'" },
      { name: 'sidebarBg', type: 'text', default: "'#0f172a'" },
      { name: 'themeId', type: 'text', default: "'emerald'" },
      // تخصيص حقول الفاتورة
      { name: 'receiptShowLogo', type: 'boolean', default: 'true' },
      { name: 'receiptShowCustomer', type: 'boolean', default: 'true' },
      { name: 'receiptShowBarcode', type: 'boolean', default: 'true' },
      { name: 'receiptShowPaymentMethod', type: 'boolean', default: 'true' },
      { name: 'receiptShowTax', type: 'boolean', default: 'true' },
      { name: 'receiptShowDiscounts', type: 'boolean', default: 'true' },
      { name: 'receiptShowRemaining', type: 'boolean', default: 'true' },
      // تخصيص ملخص الوردية
      { name: 'shiftShowLogo', type: 'boolean', default: 'true' },
      { name: 'shiftShowSalesList', type: 'boolean', default: 'true' },
      { name: 'shiftShowCashDetails', type: 'boolean', default: 'true' },
      // تخصيص إيصال المرتجع
      { name: 'returnShowBarcode', type: 'boolean', default: 'true' },
      { name: 'returnShowOriginalInvoice', type: 'boolean', default: 'true' },
      { name: 'returnShowReason', type: 'boolean', default: 'true' },
      // تخصيص تقرير المبيعات
      { name: 'reportShowProfit', type: 'boolean', default: 'true' },
      { name: 'reportShowTopProducts', type: 'boolean', default: 'true' },
      // بطاقات الكروت
      { name: 'offerCardShowLogo', type: 'boolean', default: 'true' },
      { name: 'offerCardShowTarget', type: 'boolean', default: 'true' },
      { name: 'offerCardShowDates', type: 'boolean', default: 'true' },
      { name: 'offerCardShowStatus', type: 'boolean', default: 'true' },
      { name: 'couponCardShowLogo', type: 'boolean', default: 'true' },
      { name: 'couponCardShowBarcode', type: 'boolean', default: 'true' },
      { name: 'couponCardShowExpiry', type: 'boolean', default: 'true' },
      { name: 'couponCardShowMinPurchase', type: 'boolean', default: 'true' },
      { name: 'couponCardShowUsageCount', type: 'boolean', default: 'true' },
      { name: 'voucherCardShowLogo', type: 'boolean', default: 'true' },
      { name: 'voucherCardShowBarcode', type: 'boolean', default: 'true' },
      { name: 'voucherCardShowBalance', type: 'boolean', default: 'true' },
      { name: 'voucherCardShowStatus', type: 'boolean', default: 'true' },
      { name: 'loyaltyCardShowLogo', type: 'boolean', default: 'true' },
      { name: 'loyaltyCardShowBarcode', type: 'boolean', default: 'true' },
      { name: 'loyaltyCardShowBalance', type: 'boolean', default: 'true' },
      { name: 'loyaltyCardShowPhone', type: 'boolean', default: 'true' },
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

  employees: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'userId', type: 'integer', nullable: true },
      { name: 'phone', type: 'text', default: "''" },
      { name: 'email', type: 'text', nullable: true },
      { name: 'position', type: 'text', default: "''" },
      { name: 'department', type: 'text', default: "''" },
      { name: 'salary', type: 'numeric', default: '0' },
      { name: 'hireDate', type: 'timestamp' },
      { name: 'isActive', type: 'boolean', default: 'true' },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },

  orders: {
    columns: [
      id(),
      { name: 'orderNumber', type: 'text' },
      { name: 'customerId', type: 'integer', nullable: true },
      { name: 'customerName', type: 'text', nullable: true },
      { name: 'customerPhone', type: 'text', nullable: true },
      { name: 'items', type: 'jsonb', default: "'[]'" },
      { name: 'subtotal', type: 'numeric', default: '0' },
      { name: 'tax', type: 'numeric', default: '0' },
      { name: 'total', type: 'numeric', default: '0' },
      { name: 'status', type: 'text', default: "'pending'" },
      { name: 'orderType', type: 'text', default: "'takeaway'" },
      { name: 'deliveryAddress', type: 'text', nullable: true },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'date', type: 'timestamp' },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
    ],
  },

  loyaltyTiers: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'minPoints', type: 'integer', default: '0' },
      { name: 'maxPoints', type: 'integer', default: '0' },
      { name: 'discountPercent', type: 'numeric', default: '0' },
      { name: 'color', type: 'text', default: "'#10b981'" },
      { name: 'benefits', type: 'text', default: "''" },
      { name: 'isActive', type: 'boolean', default: 'true' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },

  walletTransactions: {
    columns: [
      id(),
      { name: 'customerId', type: 'integer' },
      { name: 'customerName', type: 'text' },
      { name: 'type', type: 'text', default: "'topup'" },
      { name: 'amount', type: 'numeric', default: '0' },
      { name: 'balanceBefore', type: 'numeric', default: '0' },
      { name: 'balanceAfter', type: 'numeric', default: '0' },
      { name: 'note', type: 'text', nullable: true },
      { name: 'saleId', type: 'integer', nullable: true },
      { name: 'date', type: 'timestamp' },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
    ],
  },

  financialVouchers: {
    columns: [
      id(),
      { name: 'voucherNumber', type: 'text' },
      { name: 'type', type: 'text', default: "'receipt'" },
      { name: 'date', type: 'timestamp' },
      { name: 'amount', type: 'numeric', default: '0' },
      { name: 'partyName', type: 'text', default: "''" },
      { name: 'partyType', type: 'text', default: "'other'" },
      { name: 'partyId', type: 'integer', nullable: true },
      { name: 'description', type: 'text', default: "''" },
      { name: 'paymentMethod', type: 'text', default: "'cash'" },
      { name: 'checkNumber', type: 'text', nullable: true },
      { name: 'bankName', type: 'text', nullable: true },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },

  salaryPayments: {
    columns: [
      id(),
      { name: 'voucherNumber', type: 'text' },
      { name: 'employeeId', type: 'integer' },
      { name: 'employeeName', type: 'text' },
      { name: 'employeePosition', type: 'text', default: "''" },
      { name: 'month', type: 'integer' },
      { name: 'year', type: 'integer' },
      { name: 'basicSalary', type: 'numeric', default: '0' },
      { name: 'allowances', type: 'numeric', default: '0' },
      { name: 'deductions', type: 'numeric', default: '0' },
      { name: 'netSalary', type: 'numeric', default: '0' },
      { name: 'status', type: 'text', default: "'pending'" },
      { name: 'paidAt', type: 'timestamp', nullable: true },
      { name: 'paymentMethod', type: 'text', default: "'cash'" },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },

  expenseCategories: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'icon', type: 'text', default: "'💰'" },
      { name: 'budgetMonthly', type: 'numeric', nullable: true },
      { name: 'isActive', type: 'boolean', default: 'true' },
    ],
  },

  expenses: {
    columns: [
      id(),
      { name: 'date', type: 'timestamp' },
      { name: 'categoryId', type: 'integer' },
      { name: 'categoryName', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'amount', type: 'numeric', default: '0' },
      { name: 'paymentMethod', type: 'text', default: "'cash'" },
      { name: 'checkNumber', type: 'text', nullable: true },
      { name: 'bankName', type: 'text', nullable: true },
      { name: 'receiptNumber', type: 'text', nullable: true },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },

  // ===== المستودعات =====
  warehouses: {
    columns: [
      id(),
      { name: 'name', type: 'text' },
      { name: 'address', type: 'text', nullable: true },
      { name: 'isActive', type: 'boolean', default: 'true' },
      { name: 'createdAt', type: 'timestamp' },
    ],
  },
  productWarehouseStock: {
    columns: [
      id(),
      { name: 'productId', type: 'integer' },
      { name: 'warehouseId', type: 'integer' },
      { name: 'stock', type: 'numeric', default: '0' },
      { name: 'minStock', type: 'numeric', default: '0' },
      { name: 'updatedAt', type: 'timestamp' },
    ],
  },
  stockMovements: {
    columns: [
      id(),
      { name: 'productId', type: 'integer' },
      { name: 'productName', type: 'text' },
      { name: 'warehouseId', type: 'integer', nullable: true },
      { name: 'type', type: 'text' },
      { name: 'quantityDelta', type: 'numeric', default: '0' },
      { name: 'stockBefore', type: 'numeric', default: '0' },
      { name: 'stockAfter', type: 'numeric', default: '0' },
      { name: 'refType', type: 'text', nullable: true },
      { name: 'refId', type: 'integer', nullable: true },
      { name: 'reason', type: 'text', nullable: true },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'date', type: 'timestamp' },
    ],
  },

  // ===== مرتجع الشراء =====
  purchaseReturns: {
    columns: [
      id(),
      { name: 'purchaseReturnNumber', type: 'text' },
      { name: 'originalInvoiceId', type: 'integer' },
      { name: 'originalInvoiceNumber', type: 'text' },
      { name: 'supplierId', type: 'integer' },
      { name: 'supplierName', type: 'text' },
      { name: 'items', type: 'jsonb', default: "'[]'" },
      { name: 'refundAmount', type: 'numeric', default: '0' },
      { name: 'reason', type: 'text', nullable: true },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'date', type: 'timestamp' },
    ],
  },

  // ===== سلف الموظفين =====
  employeeAdvances: {
    columns: [
      id(),
      { name: 'employeeId', type: 'integer' },
      { name: 'employeeName', type: 'text' },
      { name: 'amount', type: 'numeric', default: '0' },
      { name: 'remainingBalance', type: 'numeric', default: '0' },
      { name: 'reason', type: 'text', nullable: true },
      { name: 'status', type: 'text', default: "'active'" },
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'date', type: 'timestamp' },
    ],
  },

  // ===== سجل التدقيق =====
  auditLogs: {
    columns: [
      id(),
      { name: 'userId', type: 'integer' },
      { name: 'userName', type: 'text' },
      { name: 'action', type: 'text' },
      { name: 'tableName', type: 'text', nullable: true },
      { name: 'recordId', type: 'integer', nullable: true },
      { name: 'details', type: 'jsonb', nullable: true },
      { name: 'date', type: 'timestamp' },
    ],
  },
};

export const TABLE_NAMES = Object.keys(SCHEMA);

// أعمدة لا تُعاد أبدًا للمتصفح (مثل كلمة المرور المُشفّرة)
export const SENSITIVE_COLUMNS: Record<string, string[]> = {
  users: ['password'],
};

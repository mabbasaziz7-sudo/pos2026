/**
 * IndexedDB local cache (Dexie) — mirrors the server schema.
 * Used as read-cache + write-queue when offline.
 * SSR-safe: only instantiated on the client.
 */
import Dexie, { type Table } from 'dexie';

export interface SyncOp {
  id?: number;
  table: string;
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  url: string;
  body?: string;
  localTempId?: number; // temp local id for offline-created records
  createdAt: number;
  retries: number;
}

class PosOfflineDB extends Dexie {
  syncOps!: Table<SyncOp, number>;

  constructor() {
    super('pos_offline_v2');
    this.version(1).stores({
      syncOps:           '++id, table, createdAt',
      products:          'id, barcode, plu, name',
      customers:         'id, phone, name',
      suppliers:         'id, name',
      supplierInvoices:  'id',
      users:             'id',
      shifts:            'id, userId, status',
      sales:             'id, invoiceNumber, shiftId, date',
      categories:        'id',
      payments:          'id',
      settings:          'id',
      offers:            'id',
      coupons:           'id',
      vouchers:          'id',
      campaigns:         'id',
      returns:           'id',
      parkedSales:       'id',
      deliveries:        'id',
      priceTiers:        'id',
      employees:         'id',
      orders:            'id',
      loyaltyTiers:      'id',
      customerGroups:    'id',
      whatsappLogs:      'id',
      walletTransactions:'id',
      financialVouchers: 'id',
      salaryPayments:    'id',
      expenseCategories: 'id',
      expenses:          'id',
    });
    // نسخة 2: إضافة جداول المستودعات، حركة المخزون، مرتجع الشراء، سلف الموظفين، سجل التدقيق
    this.version(2).stores({
      warehouses:            'id',
      productWarehouseStock: 'id, productId, warehouseId',
      stockMovements:        'id, productId, date',
      purchaseReturns:       'id',
      employeeAdvances:      'id, employeeId',
      auditLogs:             'id, userId, date',
    });
  }
}

let _db: PosOfflineDB | null = null;

export function getOfflineDb(): PosOfflineDB | null {
  if (typeof window === 'undefined') return null;
  if (!_db) {
    try { _db = new PosOfflineDB(); }
    catch { return null; }
  }
  return _db;
}

export const CACHEABLE_TABLES = new Set([
  'products','customers','suppliers','supplierInvoices','users','shifts','sales',
  'categories','payments','settings','offers','coupons','vouchers','campaigns',
  'returns','parkedSales','deliveries','priceTiers','employees','orders',
  'loyaltyTiers','customerGroups','whatsappLogs','walletTransactions',
  'financialVouchers','salaryPayments','expenseCategories','expenses',
  'warehouses','productWarehouseStock','stockMovements','purchaseReturns',
  'employeeAdvances','auditLogs',
]);

'use client';

import { useState, useEffect } from 'react';
import {
  db,
  type PurchaseReturn,
  type PurchaseReturnItem,
  type SupplierInvoice,
  generatePurchaseReturnNumber,
  recordStockMovement,
} from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { openPrintWindow } from '@/lib/print';
import { RotateCcw, Plus, X, Save, Search, Eye, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PurchaseReturns() {
  const { currentUser, settings } = useAppStore();
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);

  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [originalInvoice, setOriginalInvoice] = useState<SupplierInvoice | null>(null);
  const [originalSupplierName, setOriginalSupplierName] = useState('');
  const [alreadyReturnedQty, setAlreadyReturnedQty] = useState<Record<number, number>>({});
  const [returnQty, setReturnQty] = useState<Record<number, string>>({});
  const [reason, setReason] = useState('');
  const [lastCreatedReturn, setLastCreatedReturn] = useState<PurchaseReturn | null>(null);

  useEffect(() => { loadReturns(); }, []);

  const loadReturns = async () => {
    setReturns(await db.purchaseReturns.orderBy('id').reverse().toArray());
  };

  const filteredReturns = returns.filter(
    (r) =>
      r.purchaseReturnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.originalInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = () => {
    setInvoiceSearch('');
    setOriginalInvoice(null);
    setAlreadyReturnedQty({});
    setReturnQty({});
    setReason('');
    setLastCreatedReturn(null);
    setShowModal(true);
  };

  const searchInvoice = async () => {
    const code = invoiceSearch.trim();
    if (!code) return;
    const invoice = await db.supplierInvoices.where('invoiceNumber').equals(code).first();
    if (!invoice) {
      toast.error('لم يتم العثور على فاتورة شراء بهذا الرقم');
      return;
    }
    const priorReturns = await db.purchaseReturns.where('originalInvoiceId').equals(invoice.id!).toArray();
    const returnedMap: Record<number, number> = {};
    priorReturns.forEach((r) => {
      r.items.forEach((item) => {
        returnedMap[item.productId] = (returnedMap[item.productId] || 0) + item.quantity;
      });
    });
    const supplier = await db.suppliers.get(invoice.supplierId);
    setOriginalSupplierName(supplier?.name || '');
    setOriginalInvoice(invoice);
    setAlreadyReturnedQty(returnedMap);
    setReturnQty({});
  };

  const maxReturnable = (productId: number, originalQty: number) =>
    Math.max(originalQty - (alreadyReturnedQty[productId] || 0), 0);

  const refundAmount = originalInvoice
    ? originalInvoice.items.reduce((sum, item) => {
        const qty = Math.min(parseInt(returnQty[item.productId]) || 0, maxReturnable(item.productId, item.quantity));
        return sum + item.price * qty;
      }, 0)
    : 0;

  const submitReturn = async () => {
    if (!originalInvoice || !currentUser) return;
    const items: PurchaseReturnItem[] = [];
    for (const item of originalInvoice.items) {
      const qty = Math.min(parseInt(returnQty[item.productId]) || 0, maxReturnable(item.productId, item.quantity));
      if (qty > 0) {
        items.push({ productId: item.productId, productName: item.productName, quantity: qty, price: item.price, total: item.price * qty });
      }
    }
    if (items.length === 0) {
      toast.error('يرجى تحديد كمية لإرجاعها على الأقل');
      return;
    }

    try {
      const supplier = await db.suppliers.get(originalInvoice.supplierId);

      const newReturn: PurchaseReturn = {
        purchaseReturnNumber: generatePurchaseReturnNumber(),
        originalInvoiceId: originalInvoice.id!,
        originalInvoiceNumber: originalInvoice.invoiceNumber,
        supplierId: originalInvoice.supplierId,
        supplierName: supplier?.name || '',
        items,
        refundAmount,
        reason: reason.trim() || undefined,
        userId: currentUser.id!,
        userName: currentUser.name,
        date: new Date(),
      };
      const id = await db.purchaseReturns.add(newReturn);
      newReturn.id = id;

      // إنقاص المخزون (عكس الشراء) وتسجيل حركة مخزون
      for (const item of items) {
        const product = await db.products.get(item.productId);
        if (product) {
          await recordStockMovement({
            productId: item.productId,
            productName: item.productName,
            stockBefore: product.stock,
            quantityDelta: -item.quantity,
            type: 'purchase_return',
            userId: currentUser.id!,
            userName: currentUser.name,
            refType: 'purchaseReturn',
            refId: id,
          });
        }
      }

      // إنقاص رصيد المورد (نستحق منه المبلغ المرتجع)
      if (supplier) {
        await db.suppliers.update(supplier.id!, { balance: supplier.balance - refundAmount });
      }

      toast.success('تم تسجيل مرتجع الشراء بنجاح');
      loadReturns();
      setLastCreatedReturn(newReturn);
    } catch {
      toast.error('حدث خطأ أثناء تسجيل مرتجع الشراء');
    }
  };

  const printReturn = (r: PurchaseReturn) => {
    const rows = r.items
      .map((item) => `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.total)}</td></tr>`)
      .join('');
    const body = `
      <p><strong>رقم مرتجع الشراء:</strong> ${r.purchaseReturnNumber}</p>
      <p><strong>الفاتورة الأصلية:</strong> ${r.originalInvoiceNumber}</p>
      <p><strong>المورد:</strong> ${r.supplierName}</p>
      <p><strong>التاريخ:</strong> ${formatDate(r.date)}</p>
      ${r.reason ? `<p><strong>السبب:</strong> ${r.reason}</p>` : ''}
      <table>
        <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="receipt-row stats-row">
        <div><p class="label">إجمالي المرتجع</p><p class="value">${formatCurrency(r.refundAmount)}</p></div>
      </div>
    `;
    openPrintWindow(`مرتجع شراء - ${r.purchaseReturnNumber}`, body, '500px', settings);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث برقم المرتجع أو الفاتورة..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="rtl"
          />
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          مرتجع شراء جديد
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">رقم المرتجع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الفاتورة الأصلية</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المورد</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المبلغ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">التاريخ</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">عرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{r.purchaseReturnNumber}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">{r.originalInvoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.supplierName}</td>
                  <td className="px-4 py-3 text-sm font-medium text-rose-600">{formatCurrency(r.refundAmount)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelectedReturn(r)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => printReturn(r)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredReturns.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد مرتجعات شراء</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">مرتجع شراء جديد</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {lastCreatedReturn ? (
              <div className="text-center space-y-4">
                <RotateCcw className="w-12 h-12 text-amber-500 mx-auto" />
                <p className="text-slate-600">تم تسجيل مرتجع شراء بقيمة {formatCurrency(lastCreatedReturn.refundAmount)} وخصمها من رصيد المورد.</p>
                <div className="flex gap-2">
                  <button onClick={() => lastCreatedReturn && printReturn(lastCreatedReturn)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> طباعة
                  </button>
                  <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg">تم</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">رقم فاتورة الشراء الأصلية</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchInvoice()}
                      placeholder="رقم الفاتورة..."
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      dir="ltr"
                    />
                    <button onClick={searchInvoice} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg"><Search className="w-4 h-4" /></button>
                  </div>
                </div>

                {originalInvoice && (
                  <>
                    <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
                      <p><strong>المورد:</strong> {originalSupplierName}</p>
                      <p><strong>الإجمالي:</strong> {formatCurrency(originalInvoice.total)}</p>
                    </div>
                    <div className="space-y-2">
                      {originalInvoice.items.map((item) => {
                        const max = maxReturnable(item.productId, item.quantity);
                        return (
                          <div key={item.productId} className="flex items-center justify-between gap-2 p-2 border border-slate-100 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-700">{item.productName}</p>
                              <p className="text-xs text-slate-400">الكمية الأصلية: {item.quantity} — المتاح للإرجاع: {max}</p>
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={max}
                              value={returnQty[item.productId] || ''}
                              onChange={(e) => setReturnQty({ ...returnQty, [item.productId]: e.target.value })}
                              disabled={max === 0}
                              className="w-20 text-center px-2 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">سبب الإرجاع</label>
                      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" />
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-amber-700">إجمالي المرتجع</span>
                      <span className="font-bold text-amber-700">{formatCurrency(refundAmount)}</span>
                    </div>
                    <button onClick={submitReturn} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" /> تأكيد مرتجع الشراء
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedReturn(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{selectedReturn.purchaseReturnNumber}</h3>
              <button onClick={() => setSelectedReturn(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>المورد:</strong> {selectedReturn.supplierName}</p>
              <p><strong>الفاتورة الأصلية:</strong> {selectedReturn.originalInvoiceNumber}</p>
              <p><strong>التاريخ:</strong> {formatDate(selectedReturn.date)}</p>
              {selectedReturn.reason && <p><strong>السبب:</strong> {selectedReturn.reason}</p>}
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg mt-2">
                {selectedReturn.items.map((item, i) => (
                  <div key={i} className="flex justify-between px-3 py-2">
                    <span>{item.productName} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2 font-bold text-rose-600">
                <span>الإجمالي</span>
                <span>{formatCurrency(selectedReturn.refundAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

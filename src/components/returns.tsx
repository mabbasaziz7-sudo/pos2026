'use client';

import { useState, useEffect } from 'react';
import {
  db,
  type Return,
  type ReturnItem,
  type Sale,
  generateReturnNumber,
  generateVoucherCode,
} from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { openPrintWindow } from '@/lib/print';
import { RotateCcw, Plus, X, Save, Search, Eye, Gift, Banknote, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';

export default function Returns() {
  const { currentUser, currentShift, setCurrentShift, settings, pendingReturnInvoice, setPendingReturnInvoice } = useAppStore();
  const [returns, setReturns] = useState<Return[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);

  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [originalSale, setOriginalSale] = useState<Sale | null>(null);
  const [alreadyReturnedQty, setAlreadyReturnedQty] = useState<Record<number, number>>({});
  const [returnQty, setReturnQty] = useState<Record<number, string>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit'>('cash');
  const [createdVoucherCode, setCreatedVoucherCode] = useState<string | null>(null);
  const [lastCreatedReturn, setLastCreatedReturn] = useState<Return | null>(null);

  useEffect(() => {
    loadReturns();
  }, []);

  useEffect(() => {
    if (pendingReturnInvoice) {
      openModal(pendingReturnInvoice);
      setPendingReturnInvoice(null);
    }
  }, [pendingReturnInvoice]);

  const loadReturns = async () => {
    setReturns(await db.returns.orderBy('id').reverse().toArray());
  };

  const filteredReturns = returns.filter(
    (r) =>
      r.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.originalInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = (invoiceNumber?: string) => {
    setInvoiceSearch(invoiceNumber || '');
    setOriginalSale(null);
    setAlreadyReturnedQty({});
    setReturnQty({});
    setReason('');
    setRefundMethod('cash');
    setCreatedVoucherCode(null);
    setLastCreatedReturn(null);
    setShowModal(true);
    if (invoiceNumber) searchInvoice(invoiceNumber);
  };

  const searchInvoice = async (codeOverride?: string) => {
    const code = (codeOverride ?? invoiceSearch).trim();
    if (!code) return;
    const sale = await db.sales.where('invoiceNumber').equals(code).first();
    if (!sale) {
      toast.error('لم يتم العثور على فاتورة بهذا الرقم');
      return;
    }
    const priorReturns = await db.returns.where('originalSaleId').equals(sale.id!).toArray();
    const returnedMap: Record<number, number> = {};
    priorReturns.forEach((r) => {
      r.items.forEach((item) => {
        returnedMap[item.productId] = (returnedMap[item.productId] || 0) + item.quantity;
      });
    });
    setOriginalSale(sale);
    setAlreadyReturnedQty(returnedMap);
    setReturnQty({});
  };

  const maxReturnable = (productId: number, originalQty: number) =>
    Math.max(originalQty - (alreadyReturnedQty[productId] || 0), 0);

  const refundAmount = originalSale
    ? originalSale.items.reduce((sum, item) => {
        const qty = Math.min(parseInt(returnQty[item.productId]) || 0, maxReturnable(item.productId, item.quantity));
        const unitPrice = item.price * (1 - item.discount / 100);
        return sum + unitPrice * qty;
      }, 0)
    : 0;

  const submitReturn = async () => {
    if (!originalSale || !currentUser) return;
    const items: ReturnItem[] = [];
    for (const item of originalSale.items) {
      const qty = Math.min(parseInt(returnQty[item.productId]) || 0, maxReturnable(item.productId, item.quantity));
      if (qty > 0) {
        const unitPrice = item.price * (1 - item.discount / 100);
        items.push({
          productId: item.productId,
          productName: item.productName,
          quantity: qty,
          price: unitPrice,
          total: unitPrice * qty,
        });
      }
    }
    if (items.length === 0) {
      toast.error('يرجى تحديد كمية لإرجاعها على الأقل');
      return;
    }

    let voucherCode: string | undefined;

    try {
      // Restock returned items
      for (const item of items) {
        const product = await db.products.get(item.productId);
        if (product) {
          await db.products.update(item.productId, { stock: product.stock + item.quantity });
        }
      }

      if (refundMethod === 'credit') {
        voucherCode = generateVoucherCode();
        await db.vouchers.add({
          code: voucherCode,
          initialAmount: refundAmount,
          balance: refundAmount,
          isActive: true,
          createdAt: new Date(),
        });
      } else if (currentShift) {
        await db.shifts.update(currentShift.id!, {
          expectedCash: currentShift.expectedCash - refundAmount,
        });
        const updatedShift = await db.shifts.get(currentShift.id!);
        if (updatedShift) setCurrentShift(updatedShift);
      }

      const newReturn: Return = {
        returnNumber: generateReturnNumber(),
        originalSaleId: originalSale.id!,
        originalInvoiceNumber: originalSale.invoiceNumber,
        customerId: originalSale.customerId,
        customerName: originalSale.customerName,
        items,
        refundAmount,
        refundMethod,
        voucherCode,
        reason: reason.trim() || undefined,
        userId: currentUser.id!,
        userName: currentUser.name,
        shiftId: currentShift?.id,
        date: new Date(),
      };
      const id = await db.returns.add(newReturn);
      newReturn.id = id;

      toast.success('تم تسجيل المرتجع بنجاح');
      loadReturns();
      setLastCreatedReturn(newReturn);
      if (voucherCode) setCreatedVoucherCode(voucherCode);
    } catch {
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
    }
  };

  const printReturn = (r: Return) => {
    const logo = settings?.storeLogo
      ? `<img class="receipt-logo" src="${settings.storeLogo}" alt="" />`
      : '';
    const rows = r.items
      .map(
        (item) => `
          <tr>
            <td>${item.productName}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(item.total)}</td>
          </tr>
        `
      )
      .join('');

    const barcodeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(barcodeSvg, r.returnNumber, {
      format: 'CODE128',
      width: 1.5,
      height: 50,
      displayValue: true,
      fontSize: 12,
    });

    const body = `
      <div class="receipt-center">
        ${logo}
        <h2>${settings?.storeName || 'نظام الكاشير'}</h2>
        <h3>فاتورة مرتجع</h3>
      </div>
      <p><strong>رقم المرتجع:</strong> ${r.returnNumber}</p>
      <p><strong>الفاتورة الأصلية:</strong> ${r.originalInvoiceNumber}</p>
      <p><strong>العميل:</strong> ${r.customerName || 'نقدي'}</p>
      <p><strong>التاريخ:</strong> ${formatDate(r.date)}</p>
      <p><strong>الكاشير:</strong> ${r.userName}</p>
      ${r.reason ? `<p><strong>السبب:</strong> ${r.reason}</p>` : ''}
      <table>
        <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="receipt-row stats-row">
        <div><p class="label">طريقة الاسترداد</p><p class="value">${r.refundMethod === 'cash' ? 'نقدي' : `رصيد (${r.voucherCode})`}</p></div>
        <div><p class="label">مبلغ الاسترداد</p><p class="value">${formatCurrency(r.refundAmount)}</p></div>
      </div>
      <div class="receipt-center" style="margin-top:16px;">${barcodeSvg.outerHTML}</div>
    `;
    openPrintWindow(`فاتورة مرتجع - ${r.returnNumber}`, body);
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
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          مرتجع جديد
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">رقم المرتجع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الفاتورة الأصلية</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المبلغ</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">طريقة الاسترداد</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">التاريخ</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">عرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{r.returnNumber}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">{r.originalInvoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.customerName || 'نقدي'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-rose-600">{formatCurrency(r.refundAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        r.refundMethod === 'cash' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {r.refundMethod === 'cash' ? 'نقدي' : `رصيد (${r.voucherCode})`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedReturn(r)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => printReturn(r)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
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
            <p>لا توجد مرتجعات</p>
          </div>
        )}
      </div>

      {/* New Return Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">مرتجع جديد</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {lastCreatedReturn ? (
              <div className="text-center space-y-4">
                {createdVoucherCode ? (
                  <>
                    <Gift className="w-12 h-12 text-blue-500 mx-auto" />
                    <p className="text-slate-600">تم إنشاء رصيد بقيمة {formatCurrency(lastCreatedReturn.refundAmount)} بالكود:</p>
                    <p className="text-2xl font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      {createdVoucherCode}
                    </p>
                    <p className="text-xs text-slate-500">
                      يمكن استخدام هذا الكود كـ&quot;قسيمة هدايا&quot; عند الدفع في عملية بيع جديدة، أو عرض الباركود/QR الخاص به من تبويب القسائم.
                    </p>
                  </>
                ) : (
                  <>
                    <Banknote className="w-12 h-12 text-amber-500 mx-auto" />
                    <p className="text-slate-600">
                      تم رد مبلغ {formatCurrency(lastCreatedReturn.refundAmount)} نقدًا وخصمه من نقدية الوردية الحالية.
                    </p>
                  </>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => lastCreatedReturn && printReturn(lastCreatedReturn)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg"
                  >
                    تم
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">رقم الفاتورة الأصلية</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchInvoice()}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      placeholder="INV-..."
                      dir="ltr"
                    />
                    <button onClick={() => searchInvoice()} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm rounded-lg">
                      بحث
                    </button>
                  </div>
                </div>

                {originalSale && (
                  <>
                    <p className="text-sm text-slate-500">
                      العميل: {originalSale.customerName || 'نقدي'} — تاريخ الفاتورة: {formatDate(originalSale.date)}
                    </p>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-right">المنتج</th>
                            <th className="px-3 py-2 text-center">المتاح للإرجاع</th>
                            <th className="px-3 py-2 text-center">الكمية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {originalSale.items.map((item) => {
                            const available = maxReturnable(item.productId, item.quantity);
                            return (
                              <tr key={item.productId}>
                                <td className="px-3 py-2">{item.productName}</td>
                                <td className="px-3 py-2 text-center text-slate-500">{available}</td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="number"
                                    value={returnQty[item.productId] || ''}
                                    onChange={(e) =>
                                      setReturnQty({ ...returnQty, [item.productId]: e.target.value })
                                    }
                                    className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                                    min="0"
                                    max={available}
                                    disabled={available === 0}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">سبب الإرجاع</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        rows={2}
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">طريقة الاسترداد</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setRefundMethod('cash')}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            refundMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Banknote className="w-4 h-4" />
                          رد نقدي
                        </button>
                        <button
                          onClick={() => setRefundMethod('credit')}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            refundMethod === 'credit' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Gift className="w-4 h-4" />
                          رصيد لشراء جديد
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg flex justify-between font-bold">
                      <span>مبلغ الاسترداد</span>
                      <span className="text-rose-600">{formatCurrency(refundAmount)}</span>
                    </div>

                    <button
                      onClick={submitReturn}
                      disabled={refundAmount <= 0}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      تأكيد المرتجع
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Return Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{selectedReturn.returnNumber}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printReturn(selectedReturn)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>
                <button onClick={() => setSelectedReturn(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-3">
              الفاتورة الأصلية: {selectedReturn.originalInvoiceNumber} — {formatDate(selectedReturn.date)}
            </p>
            {selectedReturn.reason && <p className="text-sm text-slate-500 mb-3">السبب: {selectedReturn.reason}</p>}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right">المنتج</th>
                  <th className="px-3 py-2 text-center">الكمية</th>
                  <th className="px-3 py-2 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedReturn.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                    <td className="px-3 py-2 text-left font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="mt-3 p-3 bg-slate-50 rounded-lg flex justify-between font-bold">
              <span>مبلغ الاسترداد ({selectedReturn.refundMethod === 'cash' ? 'نقدي' : `رصيد ${selectedReturn.voucherCode}`})</span>
              <span className="text-rose-600">{formatCurrency(selectedReturn.refundAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

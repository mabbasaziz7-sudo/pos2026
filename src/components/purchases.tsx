'use client';

import { useState, useEffect } from 'react';
import { db, type SupplierInvoice, type Supplier } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { ClipboardList, Search, Eye, X, ArrowLeft, DollarSign, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Purchases() {
  const { setActiveTab } = useAppStore();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Record<number, Supplier>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<SupplierInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [inv, supps] = await Promise.all([
      db.supplierInvoices.orderBy('date').reverse().toArray(),
      db.suppliers.toArray(),
    ]);
    setInvoices(inv);
    setSuppliers(Object.fromEntries(supps.map((s) => [s.id!, s])));
  };

  const supplierName = (supplierId: number) => suppliers[supplierId]?.name || 'غير معروف';

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplierName(inv.supplierId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPurchases = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalRemaining = filteredInvoices.reduce((sum, inv) => sum + Number(inv.remaining), 0);

  const goToSuppliers = () => {
    setActiveTab('suppliers');
    toast.success('اختر المورد من القائمة لإضافة فاتورة مشتريات جديدة');
  };

  const openPayment = (inv: SupplierInvoice) => {
    setPayingInvoice(inv);
    setPaymentAmount(String(Number(inv.remaining).toFixed(2)));
  };

  const confirmPayment = async () => {
    if (!payingInvoice) return;
    const amount = parseFloat(paymentAmount);
    const remaining = Number(payingInvoice.remaining);
    const paid = Number(payingInvoice.paid);
    if (!amount || amount <= 0) { toast.error('يرجى إدخال مبلغ صحيح'); return; }
    if (amount > remaining) { toast.error('المبلغ أكبر من المتبقي'); return; }
    setPaying(true);
    try {
      const newPaid = paid + amount;
      const newRemaining = remaining - amount;
      await db.supplierInvoices.update(payingInvoice.id!, { paid: newPaid, remaining: newRemaining });
      const supplier = suppliers[payingInvoice.supplierId];
      if (supplier) {
        await db.suppliers.update(supplier.id!, { balance: Math.max(0, Number(supplier.balance) - amount) });
      }
      toast.success(`تم تسجيل دفعة ${formatCurrency(amount)}`);
      setPayingInvoice(null);
      setPaymentAmount('');
      loadData();
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">إجمالي المشتريات</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(totalPurchases)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">إجمالي المتبقي للموردين</p>
            <p className="text-xl font-bold text-rose-600">{formatCurrency(totalRemaining)}</p>
          </div>
        </div>
      </div>

      {/* Search + New */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في المشتريات..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="rtl"
          />
        </div>
        <button
          onClick={goToSuppliers}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          فاتورة مشتريات جديدة
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الفاتورة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المورد</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الإجمالي</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المدفوع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المتبقي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => {
                const remaining = Number(inv.remaining);
                const isFullyPaid = remaining <= 0;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-slate-700">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{supplierName(inv.supplierId)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{formatCurrency(Number(inv.total))}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600">{formatCurrency(Number(inv.paid))}</td>
                    <td className="px-4 py-3 text-sm">
                      {isFullyPaid ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle className="w-4 h-4" /> مسدّد
                        </span>
                      ) : (
                        <span className="text-rose-600 font-medium">{formatCurrency(remaining)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          title="التفاصيل"
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isFullyPaid && (
                          <button
                            onClick={() => openPayment(inv)}
                            title="سداد"
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                          >
                            <DollarSign className="w-3 h-3" />
                            سداد
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد فواتير مشتريات</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">سداد فاتورة</h3>
              <button onClick={() => setPayingInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">الفاتورة</span>
                <span className="font-medium font-mono">{payingInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">المورد</span>
                <span className="font-medium">{supplierName(payingInvoice.supplierId)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">الإجمالي</span>
                <span className="font-medium text-blue-600">{formatCurrency(Number(payingInvoice.total))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">المدفوع سابقًا</span>
                <span className="font-medium text-emerald-600">{formatCurrency(Number(payingInvoice.paid))}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
                <span>المتبقي</span>
                <span className="text-rose-600">{formatCurrency(Number(payingInvoice.remaining))}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">مبلغ الدفعة</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(payingInvoice.remaining)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentAmount(String(Number(payingInvoice.remaining).toFixed(2)))}
                  className="flex-1 py-2 text-sm border border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  سداد كامل المبلغ
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={confirmPayment}
                  disabled={paying}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors"
                >
                  {paying ? 'جاري التسجيل...' : 'تأكيد السداد'}
                </button>
                <button
                  onClick={() => setPayingInvoice(null)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                فاتورة {selectedInvoice.invoiceNumber} — {supplierName(selectedInvoice.supplierId)}
              </h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                  <p className="text-xs text-blue-500 mb-1">الإجمالي</p>
                  <p className="font-bold text-blue-700 text-lg">{formatCurrency(Number(selectedInvoice.total))}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                  <p className="text-xs text-emerald-500 mb-1">المدفوع</p>
                  <p className="font-bold text-emerald-700 text-lg">{formatCurrency(Number(selectedInvoice.paid))}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                  <p className="text-xs text-rose-500 mb-1">المتبقي</p>
                  <p className="font-bold text-rose-700 text-lg">{formatCurrency(Number(selectedInvoice.remaining))}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-right">المنتج</th>
                    <th className="px-3 py-2 text-center">الكمية</th>
                    <th className="px-3 py-2 text-center">سعر الوحدة</th>
                    <th className="px-3 py-2 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-center">{formatCurrency(Number(item.price))}</td>
                      <td className="px-3 py-2 text-left font-medium">{formatCurrency(Number(item.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedInvoice.notes && (
                <p className="text-sm text-slate-500 mt-3">ملاحظات: {selectedInvoice.notes}</p>
              )}
              {Number(selectedInvoice.remaining) > 0 && (
                <button
                  onClick={() => { setSelectedInvoice(null); openPayment(selectedInvoice); }}
                  className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  <DollarSign className="w-4 h-4" /> سداد دفعة
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

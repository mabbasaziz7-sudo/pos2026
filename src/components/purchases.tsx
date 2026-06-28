'use client';

import { useState, useEffect } from 'react';
import { db, type SupplierInvoice, type Supplier } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { ClipboardList, Search, Eye, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Purchases() {
  const { setActiveTab } = useAppStore();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Record<number, Supplier>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);

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

  const totalPurchases = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalRemaining = filteredInvoices.reduce((sum, inv) => sum + inv.remaining, 0);

  const goToSuppliers = () => {
    setActiveTab('suppliers');
    toast.success('اختر المورد من القائمة لإضافة فاتورة مشتريات جديدة');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث برقم الفاتورة أو المورد..."
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">عدد الفواتير</p>
          <p className="text-2xl font-bold text-slate-800">{filteredInvoices.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي المشتريات</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPurchases)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي المتبقي للموردين</p>
          <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalRemaining)}</p>
        </div>
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
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{supplierName(inv.supplierId)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600">{formatCurrency(inv.paid)}</td>
                  <td className="px-4 py-3 text-sm text-rose-600">{formatCurrency(inv.remaining)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
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

      {/* Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                فاتورة {selectedInvoice.invoiceNumber} - {supplierName(selectedInvoice.supplierId)}
              </h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">الإجمالي</p>
                  <p className="font-bold text-blue-600">{formatCurrency(selectedInvoice.total)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">المدفوع</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(selectedInvoice.paid)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">المتبقي</p>
                  <p className="font-bold text-rose-600">{formatCurrency(selectedInvoice.remaining)}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-right">المنتج</th>
                    <th className="px-3 py-2 text-center">الكمية</th>
                    <th className="px-3 py-2 text-center">السعر</th>
                    <th className="px-3 py-2 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-center">{formatCurrency(item.price)}</td>
                      <td className="px-3 py-2 text-left font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedInvoice.notes && (
                <p className="text-sm text-slate-500 mt-3">ملاحظات: {selectedInvoice.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

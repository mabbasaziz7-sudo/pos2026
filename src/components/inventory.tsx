'use client';

import { useState, useEffect } from 'react';
import { db, type Product } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatNumber, formatDate } from '@/lib/store';
import { openPrintWindow } from '@/lib/print';
import {
  Warehouse,
  AlertTriangle,
  PackageCheck,
  PackageX,
  TrendingUp,
  Search,
  Plus,
  Minus,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Inventory() {
  const { settings } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [adjustModal, setAdjustModal] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const all = await db.products.toArray();
    setProducts(all);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
    if (!matchesSearch) return false;
    if (filter === 'low') return p.stock <= p.minStock && p.stock > 0;
    if (filter === 'out') return p.stock === 0;
    return true;
  });

  const printInventoryCount = () => {
    const logo = settings?.storeLogo
      ? `<img class="receipt-logo" src="${settings.storeLogo}" alt="" />`
      : '';
    const rows = filteredProducts
      .map(
        (p) => `
          <tr>
            <td>${p.name}</td>
            <td>${p.barcode}</td>
            <td>${p.category}</td>
            <td>${p.unit}</td>
            <td>${p.stock}</td>
            <td></td>
            <td></td>
          </tr>
        `
      )
      .join('');
    const totalStockValue = filteredProducts.reduce((sum, p) => sum + p.stock * p.cost, 0);

    const body = `
      <div class="receipt-center">
        ${logo}
        <h2>${settings?.storeName || 'نظام الكاشير'}</h2>
        <h3>جرد المنتجات</h3>
      </div>
      <p><strong>تاريخ الجرد:</strong> ${formatDate(new Date())}</p>
      <div class="stats-row">
        <div><p class="label">عدد المنتجات</p><p class="value">${filteredProducts.length}</p></div>
        <div><p class="label">قيمة المخزون (تكلفة)</p><p class="value">${formatCurrency(totalStockValue)}</p></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>المنتج</th><th>الباركود</th><th>الفئة</th><th>الوحدة</th>
            <th>المخزون الحالي</th><th>العدد الفعلي</th><th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7">لا توجد منتجات</td></tr>'}</tbody>
      </table>
    `;
    openPrintWindow('جرد المنتجات', body, '700px');
  };

  const adjustStock = async () => {
    if (!adjustModal || !adjustQty) return;
    const newStock = adjustModal.stock + parseInt(adjustQty);
    if (newStock < 0) {
      toast.error('المخزون لا يمكن أن يكون سالباً');
      return;
    }
    await db.products.update(adjustModal.id!, {
      stock: newStock,
      updatedAt: new Date(),
    });
    toast.success('تم تعديل المخزون');
    setAdjustModal(null);
    setAdjustQty('');
    setAdjustReason('');
    loadProducts();
  };

  const totalValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);
  const totalRetail = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Warehouse className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-slate-500">إجمالي المخزون</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(products.reduce((sum, p) => sum + p.stock, 0))}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-slate-500">قيمة التكلفة</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-slate-500">منخفض المخزون</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <PackageX className="w-5 h-5 text-rose-500" />
            <p className="text-sm text-slate-500">نفذ المخزون</p>
          </div>
          <p className="text-2xl font-bold text-rose-600">{outOfStockCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { id: 'all' as const, label: 'الكل', icon: PackageCheck },
            { id: 'low' as const, label: 'منخفض', icon: AlertTriangle },
            { id: 'out' as const, label: 'نفذ', icon: PackageX },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <f.icon className="w-4 h-4" />
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="rtl"
          />
        </div>
        <button
          onClick={printInventoryCount}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors shadow-sm whitespace-nowrap"
        >
          <Printer className="w-4 h-4" />
          طباعة الجرد
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المنتج</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الباركود</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المخزون</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الحد الأدنى</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">التكلفة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">القيمة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">تعديل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-sm text-slate-800">{product.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{product.barcode}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${product.stock <= product.minStock ? 'text-amber-600' : 'text-slate-700'}`}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{product.minStock}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(product.cost)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-700">{formatCurrency(product.stock * product.cost)}</td>
                  <td className="px-4 py-3 text-center">
                    {product.stock === 0 ? (
                      <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-full">نفذ</span>
                    ) : product.stock <= product.minStock ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">منخفض</span>
                    ) : (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">متوفر</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setAdjustModal(product)}
                      className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Warehouse className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد منتجات</p>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">تعديل المخزون</h3>
            <p className="text-sm text-slate-500 mb-4">{adjustModal.name}</p>
            <p className="text-sm mb-4">
              المخزون الحالي: <span className="font-bold">{adjustModal.stock}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الكمية (موجبة للإضافة، سالبة للخصم)</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: 10 أو -5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">السبب</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="سبب التعديل..."
                  dir="rtl"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={adjustStock}
                  disabled={!adjustQty}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-lg"
                >
                  تأكيد
                </button>
                <button
                  onClick={() => { setAdjustModal(null); setAdjustQty(''); }}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

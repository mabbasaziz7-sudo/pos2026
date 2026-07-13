'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, type Warehouse, type Product, type ProductWarehouseStock } from '@/lib/local-db';
import { useAppStore } from '@/lib/store';
import { Warehouse as WarehouseIcon, Plus, Edit2, Trash2, X, Save, Search, Check, XCircle, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Warehouses() {
  const { settings, currentUser } = useAppStore();
  const accent = settings?.printAccentColor || '#10b981';
  const [subTab, setSubTab] = useState<'list' | 'stock' | 'transfer'>('list');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pws, setPws] = useState<ProductWarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState({ name: '', address: '', isActive: true });

  const [stockWarehouseId, setStockWarehouseId] = useState<number | null>(null);
  const [stockSearch, setStockSearch] = useState('');

  const [transferFrom, setTransferFrom] = useState<number | null>(null);
  const [transferTo, setTransferTo] = useState<number | null>(null);
  const [transferProductId, setTransferProductId] = useState<number | null>(null);
  const [transferQty, setTransferQty] = useState('');
  const [transferSearch, setTransferSearch] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      let whs = await db.warehouses.toArray();
      const prods = await db.products.toArray();
      // أول تشغيل: أنشئ مستودعًا رئيسيًا وانسخ إليه إجمالي مخزون كل منتج
      if (whs.length === 0) {
        const mainId = await db.warehouses.add({ name: 'المستودع الرئيسي', isActive: true, createdAt: new Date() });
        whs = await db.warehouses.toArray();
        for (const p of prods) {
          await db.productWarehouseStock.add({
            productId: p.id!, warehouseId: mainId, stock: p.stock, minStock: p.minStock, updatedAt: new Date(),
          });
        }
      }
      setWarehouses(whs);
      setProducts(prods);
      setPws(await db.productWarehouseStock.toArray());
      if (whs.length > 0 && stockWarehouseId === null) setStockWarehouseId(whs[0].id!);
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    setWarehouses(await db.warehouses.toArray());
    setProducts(await db.products.toArray());
    setPws(await db.productWarehouseStock.toArray());
  };

  // ===== CRUD المستودعات =====
  const openModal = (w?: Warehouse) => {
    if (w) { setEditing(w); setForm({ name: w.name, address: w.address || '', isActive: w.isActive }); }
    else { setEditing(null); setForm({ name: '', address: '', isActive: true }); }
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('أدخل اسم المستودع'); return; }
    if (editing) {
      await db.warehouses.update(editing.id!, { name: form.name.trim(), address: form.address.trim() || undefined, isActive: form.isActive });
      toast.success('تم تحديث المستودع');
    } else {
      const newId = await db.warehouses.add({ name: form.name.trim(), address: form.address.trim() || undefined, isActive: form.isActive, createdAt: new Date() });
      // مستودع جديد: أنشئ صفوف مخزون صفرية لكل منتج ليظهر في شاشة التوزيع
      for (const p of products) {
        await db.productWarehouseStock.add({ productId: p.id!, warehouseId: newId, stock: 0, minStock: p.minStock, updatedAt: new Date() });
      }
      toast.success('تم إضافة المستودع');
    }
    setShowModal(false);
    reload();
  };

  const deleteWarehouse = async (id: number) => {
    if (!confirm('حذف هذا المستودع؟ سيتم حذف كل بيانات توزيع المخزون الخاصة به.')) return;
    const rows = await db.productWarehouseStock.where('warehouseId').equals(id).toArray();
    for (const r of rows) await db.productWarehouseStock.delete(r.id!);
    await db.warehouses.delete(id);
    toast.success('تم الحذف');
    reload();
  };

  const filteredWarehouses = warehouses.filter(w => w.name.includes(search));

  // ===== توزيع المخزون =====
  const stockRows = useMemo(() => {
    if (!stockWarehouseId) return [];
    return products
      .filter(p => p.name.includes(stockSearch) || p.barcode.includes(stockSearch))
      .map(p => {
        const row = pws.find(r => r.productId === p.id && r.warehouseId === stockWarehouseId);
        return { product: p, row };
      });
  }, [products, pws, stockWarehouseId, stockSearch]);

  const setWarehouseStock = async (productId: number, minStock: number, newStock: number, existing?: ProductWarehouseStock) => {
    if (!stockWarehouseId || newStock < 0) return;
    if (existing) {
      await db.productWarehouseStock.update(existing.id!, { stock: newStock, updatedAt: new Date() });
    } else {
      await db.productWarehouseStock.add({ productId, warehouseId: stockWarehouseId, stock: newStock, minStock, updatedAt: new Date() });
    }
    reload();
  };

  // ===== تحويل بين المستودعات =====
  const transferProducts = products.filter(p => p.name.includes(transferSearch) || p.barcode.includes(transferSearch));
  const sourceStock = (() => {
    if (!transferFrom || !transferProductId) return 0;
    return pws.find(r => r.warehouseId === transferFrom && r.productId === transferProductId)?.stock ?? 0;
  })();

  const submitTransfer = async () => {
    if (!currentUser) return;
    if (!transferFrom || !transferTo || !transferProductId) { toast.error('أكمل بيانات التحويل'); return; }
    if (transferFrom === transferTo) { toast.error('لا يمكن التحويل لنفس المستودع'); return; }
    const qty = parseFloat(transferQty);
    if (!qty || qty <= 0) { toast.error('أدخل كمية صحيحة'); return; }
    if (qty > sourceStock) { toast.error('الكمية المطلوبة أكبر من المتوفر بالمستودع المصدر'); return; }

    const product = products.find(p => p.id === transferProductId);
    if (!product) return;

    const sourceRow = pws.find(r => r.warehouseId === transferFrom && r.productId === transferProductId);
    const destRow = pws.find(r => r.warehouseId === transferTo && r.productId === transferProductId);

    const sourceBefore = sourceRow?.stock ?? 0;
    const destBefore = destRow?.stock ?? 0;

    if (sourceRow) await db.productWarehouseStock.update(sourceRow.id!, { stock: sourceBefore - qty, updatedAt: new Date() });
    else await db.productWarehouseStock.add({ productId: transferProductId, warehouseId: transferFrom, stock: -qty, minStock: product.minStock, updatedAt: new Date() });

    if (destRow) await db.productWarehouseStock.update(destRow.id!, { stock: destBefore + qty, updatedAt: new Date() });
    else await db.productWarehouseStock.add({ productId: transferProductId, warehouseId: transferTo, stock: qty, minStock: product.minStock, updatedAt: new Date() });

    await db.stockMovements.add({
      productId: transferProductId, productName: product.name, warehouseId: transferFrom,
      type: 'transfer_out', quantityDelta: -qty, stockBefore: sourceBefore, stockAfter: sourceBefore - qty,
      refType: 'warehouse_transfer', userId: currentUser.id!, userName: currentUser.name, date: new Date(),
    });
    await db.stockMovements.add({
      productId: transferProductId, productName: product.name, warehouseId: transferTo,
      type: 'transfer_in', quantityDelta: qty, stockBefore: destBefore, stockAfter: destBefore + qty,
      refType: 'warehouse_transfer', userId: currentUser.id!, userName: currentUser.name, date: new Date(),
    });

    toast.success('تم التحويل بنجاح');
    setTransferQty(''); setTransferProductId(null);
    reload();
  };

  if (loading) return <div className="text-center py-16 text-slate-400">جارٍ التحميل...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
        {([
          { id: 'list' as const, label: 'المستودعات' },
          { id: 'stock' as const, label: 'توزيع المخزون' },
          { id: 'transfer' as const, label: 'تحويل بين المستودعات' },
        ]).map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${subTab === t.id ? 'text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            style={subTab === t.id ? { background: accent } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'list' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full pr-9 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" dir="rtl" />
            </div>
            <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm" style={{ background: accent }}>
              <Plus className="w-4 h-4" /> إضافة مستودع
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-right">المستودع</th>
                    <th className="px-4 py-3 text-right">العنوان</th>
                    <th className="px-4 py-3 text-center">الحالة</th>
                    <th className="px-4 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWarehouses.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{w.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{w.address || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${w.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {w.isActive ? <><Check className="w-3 h-3" />نشط</> : <><XCircle className="w-3 h-3" />غير نشط</>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openModal(w)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteWarehouse(w.id!)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredWarehouses.length === 0 && (
              <div className="text-center py-16 text-slate-400"><WarehouseIcon className="w-12 h-12 mx-auto mb-2 opacity-25" /><p>لا توجد مستودعات</p></div>
            )}
          </div>
        </div>
      )}

      {subTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <select value={stockWarehouseId ?? ''} onChange={e => setStockWarehouseId(Number(e.target.value))}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm" dir="rtl">
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <div className="relative flex-1 min-w-48">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={stockSearch} onChange={e => setStockSearch(e.target.value)} placeholder="بحث عن منتج..." className="w-full pr-9 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" dir="rtl" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right">المنتج</th>
                    <th className="px-4 py-3 text-center">مخزون هذا المستودع</th>
                    <th className="px-4 py-3 text-center">الإجمالي (كل المستودعات)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockRows.map(({ product, row }) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-800">{product.name}</td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" defaultValue={row?.stock ?? 0} min={0}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v !== (row?.stock ?? 0)) setWarehouseStock(product.id!, product.minStock, v, row);
                          }}
                          className="w-24 text-center px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-slate-600">{product.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stockRows.length === 0 && (
              <div className="text-center py-16 text-slate-400"><WarehouseIcon className="w-12 h-12 mx-auto mb-2 opacity-25" /><p>لا توجد منتجات</p></div>
            )}
          </div>
          <p className="text-xs text-slate-400">
            تعديل الكمية هنا يوزّع المخزون بين المستودعات فقط ولا يغيّر الإجمالي الظاهر في شاشة المنتجات — لتغيير الإجمالي استخدم شاشة المخزون.
          </p>
        </div>
      )}

      {subTab === 'transfer' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">من مستودع</label>
              <select value={transferFrom ?? ''} onChange={e => setTransferFrom(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" dir="rtl">
                <option value="">اختر...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">إلى مستودع</label>
              <select value={transferTo ?? ''} onChange={e => setTransferTo(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" dir="rtl">
                <option value="">اختر...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">المنتج</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={transferSearch} onChange={e => setTransferSearch(e.target.value)} placeholder="ابحث عن منتج..." className="w-full pr-9 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm" dir="rtl" />
            </div>
            {transferSearch && (
              <div className="mt-1 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                {transferProducts.slice(0, 20).map(p => (
                  <button key={p.id} onClick={() => { setTransferProductId(p.id!); setTransferSearch(p.name); }}
                    className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-50 ${transferProductId === p.id ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {transferProductId && transferFrom && (
            <p className="text-xs text-slate-500">المتوفر بالمستودع المصدر: <span className="font-bold text-slate-700">{sourceStock}</span></p>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">الكمية</label>
            <input type="number" value={transferQty} onChange={e => setTransferQty(e.target.value)} min={0} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
          </div>

          <button onClick={submitTransfer} className="w-full py-2.5 text-white font-medium rounded-lg flex items-center justify-center gap-2" style={{ background: accent }}>
            <ArrowLeftRight className="w-4 h-4" /> تنفيذ التحويل
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800">{editing ? 'تعديل مستودع' : 'مستودع جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-xs text-slate-500 mb-1">اسم المستودع *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              <div><label className="block text-xs text-slate-500 mb-1">العنوان</label><input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} onClick={() => setForm({ ...form, isActive: !form.isActive })}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.isActive ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-slate-600">نشط</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={save} className="flex-1 py-2.5 text-white font-medium rounded-lg flex items-center justify-center gap-2" style={{ background: accent }}><Save className="w-4 h-4" />حفظ</button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { db, type Order, type Customer, type Product, generateInvoiceNumber } from '@/lib/local-db';
import { formatCurrency, formatDate, useAppStore } from '@/lib/store';
import { ClipboardCheck, Plus, Search, Clock, CheckCircle, XCircle, Truck, ChefHat, Package, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CFG = {
  pending:   { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700',   icon: Clock },
  confirmed: { label: 'مؤكد',         color: 'bg-blue-100 text-blue-700',     icon: CheckCircle },
  preparing: { label: 'قيد التحضير',  color: 'bg-purple-100 text-purple-700', icon: ChefHat },
  ready:     { label: 'جاهز',         color: 'bg-teal-100 text-teal-700',     icon: Package },
  delivered: { label: 'تم التسليم',   color: 'bg-emerald-100 text-emerald-700', icon: Truck },
  cancelled: { label: 'ملغي',         color: 'bg-rose-100 text-rose-700',     icon: XCircle },
} as const;

const PIPELINE: Order['status'][] = ['pending','confirmed','preparing','ready','delivered'];

export default function Orders() {
  const { currentUser, settings } = useAppStore();
  const accent = settings?.printAccentColor || '#10b981';
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ customerId: '', customerName: '', customerPhone: '', orderType: 'takeaway' as Order['orderType'], deliveryAddress: '', notes: '', items: [] as {productId:number;productName:string;quantity:number;price:number;total:number}[] });
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const [o, c, p] = await Promise.all([db.orders.orderBy('date').reverse().toArray(), db.customers.toArray(), db.products.toArray()]);
    setOrders(o); setCustomers(c); setProducts(p);
  };

  const addItem = (productId: number) => {
    const p = products.find(x => x.id === productId); if (!p) return;
    const existing = form.items.find(i => i.productId === productId);
    if (existing) { setForm({...form, items: form.items.map(i => i.productId === productId ? {...i, quantity: i.quantity + 1, total: (i.quantity+1)*i.price} : i)}); }
    else { setForm({...form, items: [...form.items, {productId: p.id!, productName: p.name, quantity: 1, price: Number(p.price), total: Number(p.price)}]}); }
  };

  const taxRate = Number(settings?.taxRate ?? 0.15);
  const subtotal = form.items.reduce((s,i) => s + i.total, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const saveOrder = async () => {
    if (form.items.length === 0) { toast.error('أضف منتجًا واحدًا على الأقل'); return; }
    const cust = customers.find(c => c.id === parseInt(form.customerId));
    await db.orders.add({
      orderNumber: generateInvoiceNumber().replace('INV', 'ORD'),
      customerId: cust?.id, customerName: form.customerName || cust?.name, customerPhone: form.customerPhone || cust?.phone,
      items: form.items, subtotal, tax, total, status: 'pending', orderType: form.orderType,
      deliveryAddress: form.deliveryAddress || undefined, notes: form.notes || undefined,
      date: new Date(), userId: currentUser!.id!, userName: currentUser!.name,
    });
    toast.success('تم إنشاء الطلب'); setShowNew(false);
    setForm({ customerId: '', customerName: '', customerPhone: '', orderType: 'takeaway', deliveryAddress: '', notes: '', items: [] });
    loadData();
  };

  const advance = async (order: Order) => {
    const next = PIPELINE[PIPELINE.indexOf(order.status) + 1];
    if (!next) return;
    await db.orders.update(order.id!, { status: next });
    toast.success(`الطلب أصبح "${STATUS_CFG[next].label}"`);
    setSelected(null); loadData();
  };

  const cancel = async (order: Order) => {
    if (!confirm('إلغاء هذا الطلب؟')) return;
    await db.orders.update(order.id!, { status: 'cancelled' });
    setSelected(null); loadData();
  };

  const filtered = orders.filter(o => (filter === 'all' || o.status === filter) && (!search || (o.orderNumber+o.customerName).includes(search)));
  const counts = Object.keys(STATUS_CFG).reduce((acc, k) => ({...acc, [k]: orders.filter(o => o.status === k).length}), {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {(['all', ...Object.keys(STATUS_CFG)] as const).map(k => (
          <button key={k} onClick={() => setFilter(k as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === k ? 'text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            style={filter === k ? { background: accent } : {}}>
            {k === 'all' ? `الكل (${orders.length})` : `${STATUS_CFG[k as keyof typeof STATUS_CFG].label} (${counts[k]||0})`}
          </button>
        ))}
        <div className="relative mr-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="pr-9 pl-4 py-1.5 border border-slate-200 rounded-lg text-sm w-40" dir="rtl" />
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-white text-sm rounded-lg" style={{ background: accent }}>
          <Plus className="w-4 h-4" /> طلب جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(o => {
          const cfg = STATUS_CFG[o.status];
          return (
            <div key={o.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setSelected(o)}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-slate-500">{o.orderNumber}</span>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}><cfg.icon className="w-3 h-3" />{cfg.label}</span>
              </div>
              <p className="font-semibold text-slate-800">{o.customerName || 'زبون مباشر'}</p>
              <p className="text-xs text-slate-500 mt-0.5">{o.items.length} منتج — {o.orderType === 'delivery' ? 'توصيل' : o.orderType === 'dine-in' ? 'داخل المحل' : 'استلام'}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-sm font-bold" style={{ color: accent }}>{formatCurrency(Number(o.total))}</span>
                <span className="text-xs text-slate-400">{formatDate(o.date)}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="col-span-3 text-center py-16 text-slate-400"><ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-25" /><p>لا توجد طلبات</p></div>}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">طلب {selected.orderNumber}</h3>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-1 text-sm">
              <p><strong>العميل:</strong> {selected.customerName || 'زبون مباشر'}</p>
              <p><strong>النوع:</strong> {selected.orderType === 'delivery' ? 'توصيل' : selected.orderType === 'dine-in' ? 'داخل المحل' : 'استلام'}</p>
              {selected.deliveryAddress && <p><strong>العنوان:</strong> {selected.deliveryAddress}</p>}
            </div>
            <table className="w-full text-sm mb-4">
              <thead><tr className="text-xs text-slate-500 border-b"><th className="py-1 text-right">المنتج</th><th className="py-1 text-center">كمية</th><th className="py-1 text-left">إجمالي</th></tr></thead>
              <tbody>{selected.items.map((item, i) => <tr key={i} className="border-b border-slate-50"><td className="py-1.5">{item.productName}</td><td className="py-1.5 text-center">{item.quantity}</td><td className="py-1.5 text-left">{formatCurrency(Number(item.total))}</td></tr>)}</tbody>
            </table>
            <div className="flex gap-2">
              {PIPELINE.indexOf(selected.status) < PIPELINE.length - 1 && (
                <button onClick={() => advance(selected)} className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium" style={{ background: accent }}>
                  → {STATUS_CFG[PIPELINE[PIPELINE.indexOf(selected.status)+1]].label}
                </button>
              )}
              {selected.status !== 'cancelled' && selected.status !== 'delivered' && (
                <button onClick={() => cancel(selected)} className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm">إلغاء</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold">طلب جديد</h3><button onClick={() => setShowNew(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-500 mb-1">اسم العميل</label><input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs text-slate-500 mb-1">الهاتف</label><input value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-xs text-slate-500 mb-1">نوع الطلب</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['takeaway','استلام'],['dine-in','داخل المحل'],['delivery','توصيل']] as const).map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm({...form, orderType: v})}
                      className={`py-2 rounded-lg border text-xs font-medium transition-colors ${form.orderType === v ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      style={form.orderType === v ? { background: accent } : {}}>{l}</button>
                  ))}
                </div>
              </div>
              {form.orderType === 'delivery' && <div><label className="block text-xs text-slate-500 mb-1">عنوان التوصيل</label><input value={form.deliveryAddress} onChange={e => setForm({...form, deliveryAddress: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>}
              <div><label className="block text-xs text-slate-500 mb-2">المنتجات</label>
                <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {products.map(p => <button key={p.id} type="button" onClick={() => addItem(p.id!)} className="text-right text-xs p-2 rounded hover:bg-emerald-50 hover:text-emerald-700 transition-colors">{p.name}</button>)}
                </div>
                {form.items.length > 0 && <div className="mt-2 space-y-1">{form.items.map((item,i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-1.5">
                    <span>{item.productName}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setForm({...form, items: form.items.map((x,j)=>j===i&&x.quantity>1?{...x,quantity:x.quantity-1,total:(x.quantity-1)*x.price}:x).filter(x=>x.quantity>0)})} className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center">-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => setForm({...form, items: form.items.map((x,j)=>j===i?{...x,quantity:x.quantity+1,total:(x.quantity+1)*x.price}:x)})} className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center">+</button>
                      <span className="font-medium text-emerald-700">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}</div>}
                {form.items.length > 0 && <p className="text-xs text-right mt-2 font-bold" style={{ color: accent }}>الإجمالي: {formatCurrency(total)}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveOrder} className="flex-1 py-2.5 text-white rounded-xl font-medium flex items-center justify-center gap-2" style={{ background: accent }}><Save className="w-4 h-4" />حفظ الطلب</button>
                <button onClick={() => setShowNew(false)} className="px-4 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

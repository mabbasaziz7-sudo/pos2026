'use client';

import { useState, useEffect } from 'react';
import { db, type Delivery } from '@/lib/local-db';
import { formatCurrency, formatDate, useAppStore } from '@/lib/store';
import { Truck, Search, CheckCircle, Clock, XCircle, Navigation, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:   { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700',   icon: Clock,       next: 'on_way'    },
  on_way:    { label: 'في الطريق',    color: 'bg-blue-100 text-blue-700',     icon: Navigation,  next: 'delivered' },
  delivered: { label: 'تم التسليم',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, next: null        },
  cancelled: { label: 'ملغي',         color: 'bg-rose-100 text-rose-700',     icon: XCircle,     next: null        },
} as const;

export default function Deliveries() {
  const { settings } = useAppStore();
  const accent = settings?.printAccentColor || '#10b981';
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'on_way' | 'delivered' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Delivery | null>(null);

  useEffect(() => { loadDeliveries(); }, []);

  const loadDeliveries = async () => {
    const all = await db.deliveries.orderBy('createdAt').reverse().toArray();
    setDeliveries(all);
  };

  const updateStatus = async (id: number, status: Delivery['status']) => {
    await db.deliveries.update(id, {
      status,
      ...(status === 'delivered' ? { deliveredAt: new Date() } : {}),
    });
    toast.success(`تم تحديث الحالة إلى "${STATUS_CONFIG[status].label}"`);
    setSelected(null);
    loadDeliveries();
  };

  const filtered = deliveries.filter(d => {
    const matchStatus = filter === 'all' || d.status === filter;
    const matchSearch = !search || d.recipientName.includes(search) || d.address.includes(search) || (d.invoiceNumber?.includes(search) ?? false);
    return matchStatus && matchSearch;
  });

  const counts = {
    pending: deliveries.filter(d => d.status === 'pending').length,
    on_way: deliveries.filter(d => d.status === 'on_way').length,
    delivered: deliveries.filter(d => d.status === 'delivered').length,
    cancelled: deliveries.filter(d => d.status === 'cancelled').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(key as typeof filter)}
            className={`p-4 rounded-xl border-2 text-right transition-all ${filter === key ? 'border-current shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            style={filter === key ? { borderColor: accent, background: `${accent}10` } : {}}>
            <div className="flex items-center justify-between mb-1">
              <cfg.icon className="w-5 h-5" style={{ color: accent }} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{counts[key as keyof typeof counts]}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو العنوان أو رقم الفاتورة..."
            className="w-full pr-9 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" dir="rtl" />
        </div>
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          style={filter === 'all' ? { background: accent } : {}}>
          الكل ({deliveries.length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3 text-right">المستلم</th>
                <th className="px-4 py-3 text-right">العنوان</th>
                <th className="px-4 py-3 text-right">الفاتورة</th>
                <th className="px-4 py-3 text-right">رسوم التوصيل</th>
                <th className="px-4 py-3 text-right">التاريخ</th>
                <th className="px-4 py-3 text-center">الحالة</th>
                <th className="px-4 py-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d, i) => {
                const cfg = STATUS_CONFIG[d.status];
                return (
                  <tr key={d.id} className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{d.recipientName}</p>
                      <p className="text-xs text-slate-400">{d.recipientPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{d.address}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{d.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(Number(d.deliveryFee))}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <cfg.icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setSelected(d)} className="text-xs px-3 py-1.5 rounded-lg text-white transition-colors"
                        style={{ background: accent }}>
                        تحديث
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Truck className="w-12 h-12 mx-auto mb-2 opacity-25" />
            <p>لا توجد طلبيات توصيل</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Truck className="w-5 h-5" style={{ color: accent }} /> تحديث حالة التوصيل</h3>
            <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-1.5 text-sm">
              <p><strong>المستلم:</strong> {selected.recipientName}</p>
              <p><strong>الهاتف:</strong> {selected.recipientPhone}</p>
              <p><strong>العنوان:</strong> {selected.address}</p>
              {selected.notes && <p><strong>ملاحظات:</strong> {selected.notes}</p>}
            </div>
            <p className="text-sm font-medium text-slate-600 mb-3">الحالة الجديدة:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(Object.entries(STATUS_CONFIG) as [Delivery['status'], typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => updateStatus(selected.id!, key)}
                  disabled={selected.status === key}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${selected.status === key ? 'border-slate-300 bg-slate-50' : 'hover:border-current'} ${cfg.color}`}
                  style={selected.status !== key ? { borderColor: 'transparent' } : {}}>
                  <cfg.icon className="w-4 h-4" />{cfg.label}
                </button>
              ))}
            </div>
            <button onClick={() => setSelected(null)} className="w-full py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}

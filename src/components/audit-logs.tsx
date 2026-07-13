'use client';

import { useState, useEffect } from 'react';
import { db, type AuditLog, type StockMovement } from '@/lib/local-db';
import { formatDate, useAppStore } from '@/lib/store';
import { Shield, Search, ClipboardList } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  login: 'تسجيل دخول',
  create_user: 'إنشاء مستخدم',
  update_user: 'تعديل مستخدم',
  delete_user: 'حذف مستخدم',
  activate_user: 'تفعيل مستخدم',
  deactivate_user: 'تعطيل مستخدم',
  create_voucher_receipt: 'سند قبض جديد',
  create_voucher_payment: 'سند صرف جديد',
  create_voucher_collection: 'سند تحصيل جديد',
  pay_salary: 'صرف راتب',
};

const STOCK_MOVEMENT_LABELS: Record<StockMovement['type'], string> = {
  sale: 'بيع',
  return: 'مرتجع بيع',
  purchase: 'شراء',
  purchase_return: 'مرتجع شراء',
  adjustment: 'تسوية يدوية',
  transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر',
};

export default function AuditLogs() {
  const { settings } = useAppStore();
  const accent = settings?.printAccentColor || '#10b981';
  const [tab, setTab] = useState<'actions' | 'stock'>('actions');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLogs(await db.auditLogs.orderBy('date').reverse().toArray());
    setMovements(await db.stockMovements.orderBy('date').reverse().toArray());
  };

  const filteredLogs = logs.filter(l =>
    l.userName.includes(search) || (ACTION_LABELS[l.action] || l.action).includes(search)
  );
  const filteredMovements = movements.filter(m => m.productName.includes(search) || m.userName.includes(search));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-xl"><Shield className="w-6 h-6 text-indigo-600" /></div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">سجل التدقيق</h2>
          <p className="text-sm text-slate-500">سجل العمليات الحساسة وحركة المخزون لكل مستخدم</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('actions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'actions' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          style={tab === 'actions' ? { color: accent } : {}}>
          <Shield className="w-4 h-4" /> سجل العمليات
        </button>
        <button onClick={() => setTab('stock')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'stock' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          style={tab === 'stock' ? { color: accent } : {}}>
          <ClipboardList className="w-4 h-4" /> حركة المخزون
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full pr-9 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" dir="rtl" />
      </div>

      {tab === 'actions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[65vh]">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-right">المستخدم</th>
                  <th className="px-4 py-3 text-right">العملية</th>
                  <th className="px-4 py-3 text-right">التفاصيل</th>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{l.userName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{ACTION_LABELS[l.action] || l.action}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{l.details ? JSON.stringify(l.details) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(l.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLogs.length === 0 && (
            <div className="text-center py-16 text-slate-400"><Shield className="w-12 h-12 mx-auto mb-2 opacity-25" /><p>لا توجد سجلات</p></div>
          )}
        </div>
      )}

      {tab === 'stock' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[65vh]">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-right">المنتج</th>
                  <th className="px-4 py-3 text-right">النوع</th>
                  <th className="px-4 py-3 text-center">الفرق</th>
                  <th className="px-4 py-3 text-center">قبل → بعد</th>
                  <th className="px-4 py-3 text-right">السبب</th>
                  <th className="px-4 py-3 text-right">المستخدم</th>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-800">{m.productName}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{STOCK_MOVEMENT_LABELS[m.type]}</span>
                    </td>
                    <td className={`px-4 py-3 text-center text-sm font-bold ${m.quantityDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.quantityDelta >= 0 ? '+' : ''}{m.quantityDelta}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">{m.stockBefore} → {m.stockAfter}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{m.reason || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.userName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(m.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredMovements.length === 0 && (
            <div className="text-center py-16 text-slate-400"><ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-25" /><p>لا توجد حركات مخزون</p></div>
          )}
        </div>
      )}
    </div>
  );
}

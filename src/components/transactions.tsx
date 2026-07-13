'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/local-db';
import { formatCurrency, formatDate, useAppStore } from '@/lib/store';
import { ArrowDownLeft, ArrowUpRight, DollarSign, TrendingUp, TrendingDown, Download } from 'lucide-react';

interface Transaction { id: string; date: Date; description: string; amount: number; type: 'in' | 'out'; category: string; ref: string; }

export default function Transactions() {
  const { settings } = useAppStore();
  const accent = settings?.printAccentColor || '#10b981';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTransactions(); }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const [sales, payments, supplierInvoices] = await Promise.all([
        db.sales.where('status').equals('completed').toArray(),
        db.payments.toArray(),
        db.supplierInvoices.toArray(),
      ]);

      const txns: Transaction[] = [];

      // مبيعات (دخل)
      for (const sale of sales) {
        const cashAmount = (sale.paymentType === 'cash' || sale.paymentType === 'card') ? Number(sale.total) : sale.paymentType === 'mixed' ? Number(sale.paid) : 0;
        if (cashAmount > 0) {
          txns.push({ id: `sale-${sale.id}`, date: new Date(sale.date), description: `فاتورة مبيعات ${sale.invoiceNumber}`, amount: cashAmount, type: 'in', category: 'مبيعات', ref: sale.invoiceNumber });
        }
      }

      // تحصيلات من عملاء (دخل)
      for (const p of payments.filter(p => p.type === 'collection')) {
        txns.push({ id: `coll-${p.id}`, date: new Date(p.date), description: 'تحصيل من عميل', amount: Number(p.amount), type: 'in', category: 'تحصيل', ref: String(p.id) });
      }

      // مدفوعات لموردين (مصروف)
      for (const p of payments.filter(p => p.type === 'payment')) {
        txns.push({ id: `pay-${p.id}`, date: new Date(p.date), description: 'دفعة لمورد', amount: Number(p.amount), type: 'out', category: 'مشتريات', ref: String(p.id) });
      }

      // فواتير مشتريات (التزام)
      for (const inv of supplierInvoices) {
        if (Number(inv.paid) > 0) {
          txns.push({ id: `sinv-${inv.id}`, date: new Date(inv.date), description: `دفع لفاتورة مشتريات ${inv.invoiceNumber}`, amount: Number(inv.paid), type: 'out', category: 'مشتريات', ref: inv.invoiceNumber });
        }
      }

      txns.sort((a, b) => b.date.getTime() - a.date.getTime());
      setTransactions(txns);
    } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
  const totalIn  = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const balance  = totalIn - totalOut;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-emerald-500" /><span className="text-xs text-slate-500">إجمالي المداخيل</span></div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIn)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-5 h-5 text-rose-500" /><span className="text-xs text-slate-500">إجمالي المصروفات</span></div>
          <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalOut)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="w-5 h-5" style={{ color: accent }} /><span className="text-xs text-slate-500">صافي الرصيد</span></div>
          <p className="text-2xl font-bold" style={{ color: balance >= 0 ? accent : '#ef4444' }}>{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all','in','out'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            style={filter === f ? { background: accent } : {}}>
            {f === 'all' ? 'الكل' : f === 'in' ? 'المداخيل' : 'المصروفات'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3 text-right">التاريخ</th>
                <th className="px-4 py-3 text-right">البيان</th>
                <th className="px-4 py-3 text-right">التصنيف</th>
                <th className="px-4 py-3 text-center">النوع</th>
                <th className="px-4 py-3 text-right">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">جاري التحميل...</td></tr>
              ) : filtered.slice(0, 200).map(t => (
                <tr key={t.id} className={`hover:bg-slate-50 transition-colors`}>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{t.description}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.category}</span></td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'in' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      {t.type === 'in' ? 'دخل' : 'خروج'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-16 text-slate-400"><Download className="w-12 h-12 mx-auto mb-2 opacity-25" /><p>لا توجد معاملات</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

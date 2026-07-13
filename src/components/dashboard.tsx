'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/local-db';
import { useAppStore, formatCurrency } from '@/lib/store';
import {
  ShoppingCart, DollarSign, Users, TrendingUp, BarChart3,
  Receipt, Package, Warehouse, RotateCcw, Truck, BarChart2,
  Gift, Clock, ChevronLeft, ArrowUpRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface DayData { day: string; total: number; }

function WeekChartTooltip({ active, payload, accent }: { active?: boolean; payload?: { payload: DayData }[]; accent: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="text-slate-500 mb-0.5">{d.day}</p>
      <p className="font-bold" style={{ color: accent }}>{formatCurrency(d.total)}</p>
    </div>
  );
}

export default function Dashboard() {
  const { currentUser, currentShift, settings, setActiveTab } = useAppStore();
  const accent = settings?.sidebarBg || '#064e3b';
  const accentLight = settings?.printAccentColor || '#10b981';

  const [todaySales, setTodaySales] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [recentSales, setRecentSales] = useState<{ invoiceNumber: string; total: number; customerName?: string; date: Date }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const now = new Date();
      const todayStr = now.toDateString();

      const [allSales, customers] = await Promise.all([
        db.sales.where('status').equals('completed').toArray(),
        db.customers.toArray(),
      ]);

      // اليوم
      const today = allSales.filter(s => new Date(s.date).toDateString() === todayStr);
      setTodaySales(today.reduce((s, x) => s + Number(x.total), 0));
      setTodayCount(today.length);
      setCustomerCount(customers.length);

      // المبيعات الأسبوعية (آخر 7 أيام)
      const days: DayData[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dStr = d.toDateString();
        const dayLabel = d.toLocaleDateString('ar-SA', { weekday: 'short' });
        const total = allSales.filter(s => new Date(s.date).toDateString() === dStr).reduce((s, x) => s + Number(x.total), 0);
        days.push({ day: dayLabel, total });
      }
      setWeekData(days);

      // آخر 6 فواتير
      const recent = allSales.slice(-6).reverse().map(s => ({
        invoiceNumber: s.invoiceNumber,
        total: Number(s.total),
        customerName: s.customerName,
        date: new Date(s.date),
      }));
      setRecentSales(recent);
    } finally {
      setLoading(false);
    }
  };

  const dayOfWeek = new Date().toLocaleDateString('ar-SA', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const quickActions = [
    { label: 'نقطة البيع', icon: ShoppingCart, tab: 'pos', bg: accentLight },
    { label: 'فاتورة جديدة', icon: Receipt, tab: 'sales', bg: '#3b82f6' },
    { label: 'المنتجات', icon: Package, tab: 'products', bg: '#8b5cf6' },
    { label: 'العملاء', icon: Users, tab: 'customers', bg: '#06b6d4' },
    { label: 'المشتريات', icon: Truck, tab: 'purchases', bg: '#f59e0b' },
    { label: 'الورديات', icon: Clock, tab: 'shifts', bg: '#ec4899' },
    { label: 'التقارير', icon: BarChart3, tab: 'reports', bg: '#f97316' },
    { label: 'المرتجعات', icon: RotateCcw, tab: 'returns', bg: '#ef4444' },
    { label: 'المخزون', icon: Warehouse, tab: 'inventory', bg: '#84cc16' },
    { label: 'العروض', icon: Gift, tab: 'promotions', bg: '#d946ef' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30 animate-pulse" />
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentLight} 100%)` }}>
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-10" style={{ background: '#fff', transform: 'translate(-30%, -50%)' }} />
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: '#fff', transform: 'translate(20%, 40%)' }} />
        <div className="relative">
          <p className="text-white/70 text-sm mb-1">{dayOfWeek} — {dateStr}</p>
          <h2 className="text-2xl font-bold mb-1">أهلاً بك، {currentUser?.name} 👋</h2>
          <p className="text-white/80 text-sm">{settings?.storeName || 'نظام الكاشير'}</p>
          {currentShift && (
            <span className="mt-2 inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
              <Clock className="w-3 h-3" /> وردية #{currentShift.id} مفتوحة
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'مبيعات اليوم', value: formatCurrency(todaySales), icon: DollarSign, color: accentLight, bg: `${accentLight}15` },
          { label: 'عدد الفواتير', value: String(todayCount), icon: Receipt, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'العملاء', value: String(customerCount), icon: Users, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'الوردية', value: currentShift ? 'نشطة' : 'مغلقة', icon: Clock, color: currentShift ? '#059669' : '#9ca3af', bg: currentShift ? '#d1fae5' : '#f9fafb' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: kpi.bg }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-800">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: accentLight }} />
              اتجاه المبيعات الأسبوعي
            </h3>
            <button onClick={() => setActiveTab('reports')} className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-600">
              تفاصيل <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {weekData.every(d => d.total === 0) ? (
            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">لا توجد مبيعات في الأسبوع الحالي</div>
          ) : (
            <div className="h-44" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="24%">
                  <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="3 3" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#898781' }} />
                  <Tooltip cursor={{ fill: `${accentLight}0d` }} content={<WeekChartTooltip accent={accentLight} />} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {weekData.map((d, i) => (
                      <Cell key={i} fill={i === weekData.length - 1 ? accentLight : `${accentLight}55`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400" /> آخر الفواتير
            </h3>
            <button onClick={() => setActiveTab('sales')} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              الكل <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {recentSales.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">لا توجد فواتير</div>
          ) : (
            <div className="space-y-2.5">
              {recentSales.map((s) => (
                <div key={s.invoiceNumber} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-mono text-slate-700">{s.invoiceNumber}</p>
                    <p className="text-xs text-slate-400">{s.customerName || 'نقدي'}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: accentLight }}>{formatCurrency(s.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-slate-400" /> إجراءات سريعة
        </h3>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {quickActions.map((action) => (
            <button key={action.tab} onClick={() => setActiveTab(action.tab)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:scale-105 transition-all group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: action.bg }}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-slate-600 font-medium text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

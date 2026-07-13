'use client';

import { useState, useEffect } from 'react';
import { db, type Sale, type Product, type Shift, type Warehouse, PAYMENT_TYPE_LABELS, PAYMENT_TYPE_BADGE_CLASSES } from '@/lib/local-db';
import { formatCurrency, formatDate, formatNumber, useAppStore } from '@/lib/store';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Calendar,
  Download,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { googleFontLink } from '@/lib/print';
import { exportElementToPDF } from '@/lib/pdf-export';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, LabelList, Cell,
} from 'recharts';

// لوحة ألوان تصنيفية آمنة لضعف رؤية الألوان (CVD) — ترتيب ثابت لا يتغيّر بتغيّر الفلاتر
const CATEGORICAL_PALETTE = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7'];

export default function Reports() {
  const { settings } = useAppStore();
  const accent = settings?.printAccentColor || '#1a3a6b';
  const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [s, p, sh, wh] = await Promise.all([
      db.sales.where('status').equals('completed').toArray(),
      db.products.toArray(),
      db.shifts.toArray(),
      db.warehouses.toArray(),
    ]);
    setSales(s);
    setProducts(p);
    setShifts(sh);
    setWarehouses(wh);
  };

  const getFilteredSales = () => {
    const now = new Date();
    return sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      if (dateRange === 'today') {
        return saleDate.toDateString() === now.toDateString();
      }
      if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return saleDate >= weekAgo;
      }
      if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return saleDate >= monthAgo;
      }
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        return saleDate >= start && saleDate <= end;
      }
      return true;
    });
  };

  const filteredSales = getFilteredSales();
  // Number() مهم لأن قاعدة بيانات PostgreSQL تُعيد أعمدة NUMERIC كنصوص أحيانًا
  const totalSales = filteredSales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalCash = filteredSales.filter((s) => s.paymentType === 'cash').reduce((sum, s) => sum + Number(s.total), 0);
  const totalCard = filteredSales.filter((s) => s.paymentType === 'card').reduce((sum, s) => sum + Number(s.total), 0);
  const totalCredit = filteredSales.filter((s) => s.paymentType === 'credit').reduce((sum, s) => sum + Number(s.total), 0);
  const totalMixed = filteredSales.filter((s) => s.paymentType === 'mixed').reduce((sum, s) => sum + Number(s.total), 0);
  const totalWallet = filteredSales.filter((s) => s.paymentType === 'wallet').reduce((sum, s) => sum + Number(s.total), 0);
  const totalRemaining = filteredSales.reduce((sum, s) => sum + Number(s.remaining), 0);
  const totalProfit = filteredSales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => itemSum + (Number(item.price) - Number(item.cost)) * Number(item.quantity), 0);
  }, 0);

  // Top products
  const productSales: Record<number, { name: string; quantity: number; revenue: number }> = {};
  filteredSales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productSales[item.productId].quantity += Number(item.quantity);
      productSales[item.productId].revenue += Number(item.total);
    });
  });
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const maxRevenue = topProducts[0]?.revenue || 1;

  // أداء الموظفين (حسب الكاشير المسجّل على كل فاتورة)
  const employeeSales: Record<number, { name: string; invoices: number; total: number; profit: number }> = {};
  filteredSales.forEach((sale) => {
    if (!employeeSales[sale.userId]) employeeSales[sale.userId] = { name: sale.userName, invoices: 0, total: 0, profit: 0 };
    employeeSales[sale.userId].invoices += 1;
    employeeSales[sale.userId].total += Number(sale.total);
    employeeSales[sale.userId].profit += sale.items.reduce((s, i) => s + (Number(i.price) - Number(i.cost)) * Number(i.quantity), 0);
  });
  const employeePerf = Object.values(employeeSales).sort((a, b) => b.total - a.total);

  // المبيعات حسب المستودع
  const warehouseSales: Record<number, { name: string; invoices: number; total: number }> = {};
  filteredSales.forEach((sale) => {
    const whId = sale.warehouseId;
    if (whId == null) return;
    if (!warehouseSales[whId]) {
      const wh = warehouses.find((w) => w.id === whId);
      warehouseSales[whId] = { name: wh?.name || `مستودع #${whId}`, invoices: 0, total: 0 };
    }
    warehouseSales[whId].invoices += 1;
    warehouseSales[whId].total += Number(sale.total);
  });
  const warehousePerf = Object.values(warehouseSales).sort((a, b) => b.total - a.total);

  // اتجاه المبيعات والربح خلال الفترة المختارة (لكل يوم)
  const dailyMap: Record<string, { date: string; sortKey: number; total: number; profit: number }> = {};
  filteredSales.forEach((sale) => {
    const d = new Date(sale.date);
    const sortKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const key = d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    if (!dailyMap[key]) dailyMap[key] = { date: key, sortKey, total: 0, profit: 0 };
    dailyMap[key].total += Number(sale.total);
    dailyMap[key].profit += sale.items.reduce((s, i) => s + (Number(i.price) - Number(i.cost)) * Number(i.quantity), 0);
  });
  const dailyTrend = Object.values(dailyMap).sort((a, b) => a.sortKey - b.sortKey);

  // توزيع المبيعات حسب طريقة الدفع (لمخطط التوزيع)
  const paymentDistribution = [
    { type: PAYMENT_TYPE_LABELS.cash, val: totalCash },
    { type: PAYMENT_TYPE_LABELS.card, val: totalCard },
    { type: PAYMENT_TYPE_LABELS.credit, val: totalCredit },
    { type: PAYMENT_TYPE_LABELS.mixed, val: totalMixed },
    { type: PAYMENT_TYPE_LABELS.wallet, val: totalWallet },
  ].filter((d) => d.val > 0);

  const exportCSV = () => {
    const headers = ['الفاتورة', 'التاريخ', 'العميل', 'المبلغ', 'المدفوع', 'المتبقي', 'نوع الدفع', 'الكاشير'];
    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      new Date(s.date).toLocaleString('ar-SA'),
      s.customerName || 'نقدي',
      s.total,
      s.paid,
      s.remaining,
      PAYMENT_TYPE_LABELS[s.paymentType],
      s.userName,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportExcel = async () => {
    const toastId = toast.loading('جارٍ إنشاء ملف Excel...');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();

      const salesSheet = workbook.addWorksheet('المبيعات');
      salesSheet.views = [{ rightToLeft: true }];
      salesSheet.columns = [
        { header: 'الفاتورة', key: 'invoiceNumber', width: 18 },
        { header: 'التاريخ', key: 'date', width: 20 },
        { header: 'العميل', key: 'customerName', width: 20 },
        { header: 'المبلغ', key: 'total', width: 14 },
        { header: 'المدفوع', key: 'paid', width: 14 },
        { header: 'المتبقي', key: 'remaining', width: 14 },
        { header: 'نوع الدفع', key: 'paymentType', width: 14 },
        { header: 'الكاشير', key: 'userName', width: 16 },
      ];
      salesSheet.getRow(1).font = { bold: true };
      filteredSales.forEach((s) => {
        salesSheet.addRow({
          invoiceNumber: s.invoiceNumber,
          date: new Date(s.date).toLocaleString('ar-SA'),
          customerName: s.customerName || 'نقدي',
          total: Number(s.total),
          paid: Number(s.paid),
          remaining: Number(s.remaining),
          paymentType: PAYMENT_TYPE_LABELS[s.paymentType],
          userName: s.userName,
        });
      });

      const productsSheet = workbook.addWorksheet('أكثر المنتجات مبيعًا');
      productsSheet.views = [{ rightToLeft: true }];
      productsSheet.columns = [
        { header: 'المنتج', key: 'name', width: 24 },
        { header: 'الكمية المباعة', key: 'quantity', width: 16 },
        { header: 'الإيرادات', key: 'revenue', width: 16 },
      ];
      productsSheet.getRow(1).font = { bold: true };
      topProducts.forEach((p) => productsSheet.addRow(p));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      toast.success('تم تصدير ملف Excel', { id: toastId });
    } catch {
      toast.error('فشل تصدير Excel', { id: toastId });
    }
  };

  const rangeLabel = () => {
    if (dateRange === 'today') return 'اليوم';
    if (dateRange === 'week') return 'آخر 7 أيام';
    if (dateRange === 'month') return 'آخر 30 يومًا';
    if (startDate && endDate) return `${startDate} إلى ${endDate}`;
    return 'كل الفترات';
  };

  const showProfit = settings?.reportShowProfit !== false;
  const showTopProducts = settings?.reportShowTopProducts !== false;

  const buildReportBody = () => {
    const storeName = settings?.storeName || 'نظام الكاشير';
    const logo = settings?.storeLogo ? `<img src="${settings.storeLogo}" style="height:48px; object-fit:contain; display:block; margin-bottom:4px;">` : '';
    const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const groupedByType = { cash: [] as Sale[], card: [] as Sale[], credit: [] as Sale[], mixed: [] as Sale[], wallet: [] as Sale[] };
    filteredSales.forEach((s) => {
      groupedByType[s.paymentType].push(s);
    });

    const renderGroup = (label: string, group: Sale[], subtotal: number) => {
      if (group.length === 0) return '';
      const rows = group.map((s, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f5f8fa'}">
          <td style="padding:5px 8px; font-size:11px; font-family:monospace;">${s.invoiceNumber}</td>
          <td style="padding:5px 8px; font-size:11px;">${new Date(s.date).toLocaleDateString('ar-SA')}</td>
          <td style="padding:5px 8px; font-size:11px;">${s.customerName || 'نقدي'}</td>
          <td style="padding:5px 8px; font-size:11px; text-align:left;">${Number(s.total).toFixed(3)}</td>
          <td style="padding:5px 8px; font-size:11px; text-align:left;">${Number(s.paid).toFixed(3)}</td>
          <td style="padding:5px 8px; font-size:11px; text-align:left; color:${Number(s.remaining) > 0 ? '#c0392b' : '#27ae60'};">${Number(s.remaining).toFixed(3)}</td>
          <td style="padding:5px 8px; font-size:11px;">${s.userName}</td>
        </tr>`).join('');
      return `
        <tr><td colspan="7" style="background:${accent}22; padding:5px 8px; font-weight:bold; font-size:12px; border-top:1px solid ${accent}; border-bottom:1px solid ${accent};">${label}</td></tr>
        ${rows}
        <tr style="background:#eaf0fb; font-weight:bold;">
          <td colspan="3" style="padding:5px 8px; font-size:11px; text-align:right;">مجموع ${label}</td>
          <td colspan="4" style="padding:5px 8px; font-size:11px; text-align:left; color:${accent};">${subtotal.toFixed(3)}</td>
        </tr>`;
    };

    const topProductRows = topProducts.map((p, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f5f8fa'}">
        <td style="padding:4px 8px; font-size:11px;">${i + 1}</td>
        <td style="padding:4px 8px; font-size:11px;">${p.name}</td>
        <td style="padding:4px 8px; font-size:11px; text-align:left;">${p.quantity.toFixed(2)}</td>
        <td style="padding:4px 8px; font-size:11px; text-align:left;">${p.revenue.toFixed(3)}</td>
      </tr>`).join('');

    const body = `
      <div style="font-family:${font}; padding:24px; color:#1a1a2e; direction:rtl;">

        <!-- رأس التقرير: نمط Crystal Report -->
        <table style="width:100%; margin-bottom:0; border-bottom:3px solid ${accent};">
          <tr>
            <td style="vertical-align:middle; padding-bottom:8px;">${logo}<div style="font-size:18px; font-weight:bold; color:${accent};">${storeName}</div></td>
            <td style="vertical-align:middle; text-align:left; padding-bottom:8px;">
              <div style="font-size:20px; font-weight:bold; color:${accent}; border-bottom:1px solid ${accent}; padding-bottom:4px; margin-bottom:4px;">تقرير المبيعات</div>
              <div style="font-size:11px; color:#555;">الفترة: ${rangeLabel()}</div>
              <div style="font-size:10px; color:#888;">تاريخ الطباعة: ${today}</div>
            </td>
          </tr>
        </table>

        <!-- ملخص إحصائي -->
        <table style="width:100%; border-collapse:collapse; margin-top:12px; margin-bottom:16px;">
          <tr style="background:${accent}; color:white;">
            <td style="padding:6px 10px; font-size:11px; font-weight:bold; text-align:center;">عدد الفواتير</td>
            <td style="padding:6px 10px; font-size:11px; font-weight:bold; text-align:center;">إجمالي المبيعات</td>
            ${showProfit ? `<td style="padding:6px 10px; font-size:11px; font-weight:bold; text-align:center;">الربح التقديري</td>` : ''}
            <td style="padding:6px 10px; font-size:11px; font-weight:bold; text-align:center;">غير محصّل</td>
          </tr>
          <tr style="background:#eaf0fb;">
            <td style="padding:8px 10px; font-size:14px; font-weight:bold; text-align:center;">${filteredSales.length}</td>
            <td style="padding:8px 10px; font-size:14px; font-weight:bold; text-align:center; color:${accent};">${totalSales.toFixed(3)}</td>
            ${showProfit ? `<td style="padding:8px 10px; font-size:14px; font-weight:bold; text-align:center; color:#27ae60;">${totalProfit.toFixed(3)}</td>` : ''}
            <td style="padding:8px 10px; font-size:14px; font-weight:bold; text-align:center; color:#c0392b;">${totalRemaining.toFixed(3)}</td>
          </tr>
        </table>

        <!-- تفاصيل المبيعات -->
        <div style="font-size:13px; font-weight:bold; color:${accent}; border-bottom:2px solid ${accent}; padding-bottom:3px; margin-bottom:0;">
          تفاصيل المبيعات
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
          <thead>
            <tr style="background:${accent}; color:white;">
              <th style="padding:6px 8px; font-size:11px; text-align:right;">رقم الفاتورة</th>
              <th style="padding:6px 8px; font-size:11px; text-align:right;">التاريخ</th>
              <th style="padding:6px 8px; font-size:11px; text-align:right;">العميل</th>
              <th style="padding:6px 8px; font-size:11px; text-align:left;">المبلغ</th>
              <th style="padding:6px 8px; font-size:11px; text-align:left;">المدفوع</th>
              <th style="padding:6px 8px; font-size:11px; text-align:left;">المتبقي</th>
              <th style="padding:6px 8px; font-size:11px; text-align:right;">الكاشير</th>
            </tr>
          </thead>
          <tbody>
            ${renderGroup('نقدي ✓', groupedByType.cash, totalCash)}
            ${renderGroup('بطاقة', groupedByType.card, totalCard)}
            ${renderGroup('آجل (دين)', groupedByType.credit, totalCredit)}
            ${renderGroup('مختلط', groupedByType.mixed, totalMixed)}
            ${renderGroup('محفظة', groupedByType.wallet, totalWallet)}
          </tbody>
          <tfoot>
            <tr style="border-top:3px double ${accent}; background:#f0f4ff;">
              <td colspan="3" style="padding:7px 8px; font-size:12px; font-weight:bold; text-align:right;">الإجمالي الكلي</td>
              <td style="padding:7px 8px; font-size:13px; font-weight:bold; color:${accent};">${totalSales.toFixed(3)}</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>

        <!-- أكثر المنتجات مبيعًا -->
        ${showTopProducts && topProducts.length > 0 ? `
        <div style="font-size:13px; font-weight:bold; color:${accent}; border-bottom:2px solid ${accent}; padding-bottom:3px; margin-bottom:0;">
          أكثر المنتجات مبيعًا
        </div>
        <table style="width:60%; border-collapse:collapse; margin-bottom:20px;">
          <thead>
            <tr style="background:${accent}; color:white;">
              <th style="padding:5px 8px; font-size:11px; text-align:right;">#</th>
              <th style="padding:5px 8px; font-size:11px; text-align:right;">المنتج</th>
              <th style="padding:5px 8px; font-size:11px; text-align:left;">الكمية</th>
              <th style="padding:5px 8px; font-size:11px; text-align:left;">الإيرادات</th>
            </tr>
          </thead>
          <tbody>${topProductRows}</tbody>
        </table>` : ''}

        <!-- تذييل -->
        <div style="border-top:1px solid #ccc; margin-top:16px; padding-top:8px; display:flex; justify-content:space-between; font-size:10px; color:#888;">
          <span>${storeName} — تقرير المبيعات</span>
          <span>طُبع في: ${today}</span>
        </div>
      </div>`;

    return body;
  };

  const printReport = () => {
    const body = buildReportBody();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl"><head><title>تقرير المبيعات</title>${googleFontLink(font)}
      <style>
        body { margin:0; } table { border-collapse:collapse; }
        @media print { @page { size:A4; margin:10mm; } }
      </style>
      </head><body>${body}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const exportPDF = async () => {
    const body = buildReportBody();
    const toastId = toast.loading('جارٍ إنشاء ملف PDF...');
    try {
      await exportElementToPDF(body, `sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('تم تصدير التقرير PDF', { id: toastId });
    } catch {
      toast.error('فشل تصدير PDF', { id: toastId });
    }
  };

  /* === Crystal Reports Style Screen Layout === */
  const renderSalesGroup = (label: string, group: Sale[], subtotal: number, badgeClass: string) => {
    if (group.length === 0) return null;
    return (
      <tbody key={label}>
        {/* Group header */}
        <tr style={{ backgroundColor: `${accent}18` }}>
          <td colSpan={7} className="px-4 py-2 text-sm font-bold border-y"
            style={{ borderColor: `${accent}40`, color: accent }}>
            {label} — {group.length} فاتورة
          </td>
        </tr>
        {group.map((sale, i) => (
          <tr key={sale.id} className={`hover:bg-blue-50/50 border-b border-slate-100 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
            <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{sale.invoiceNumber}</td>
            <td className="px-4 py-2.5 text-xs text-slate-500">{formatDate(sale.date)}</td>
            <td className="px-4 py-2.5 text-xs text-slate-700">{sale.customerName || <span className="italic text-slate-400">نقدي</span>}</td>
            <td className="px-4 py-2.5 text-xs font-bold text-left" style={{ color: accent }}>{formatCurrency(Number(sale.total))}</td>
            <td className="px-4 py-2.5 text-xs text-left text-slate-600">{formatCurrency(Number(sale.paid))}</td>
            <td className="px-4 py-2.5 text-xs text-left">
              {Number(sale.remaining) > 0 ? <span className="text-rose-600 font-medium">{formatCurrency(Number(sale.remaining))}</span> : <span className="text-slate-300">—</span>}
            </td>
            <td className="px-4 py-2.5 text-xs text-slate-500">{sale.userName}</td>
          </tr>
        ))}
        {/* Group subtotal */}
        <tr className="border-t-2 border-b-2" style={{ borderColor: accent, background: `${accent}08` }}>
          <td colSpan={3} className="px-4 py-2 text-xs font-bold text-right" style={{ color: accent }}>
            مجموع {label}
          </td>
          <td className="px-4 py-2 text-sm font-bold text-left" style={{ color: accent }}>
            {formatCurrency(subtotal)}
          </td>
          <td colSpan={3} className="px-4 py-2 text-xs text-slate-400">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>{label}</span>
          </td>
        </tr>
      </tbody>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {([
              { id: 'today' as const, label: 'اليوم' },
              { id: 'week' as const, label: 'الأسبوع' },
              { id: 'month' as const, label: 'الشهر' },
              { id: 'all' as const, label: 'الكل' },
            ] as const).map((range) => (
              <button key={range.id} onClick={() => setDateRange(range.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${dateRange === range.id ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                style={dateRange === range.id ? { backgroundColor: accent } : {}}>
                {range.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setDateRange('all'); }}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
            <span className="text-slate-400 text-xs">إلى</span>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setDateRange('all'); }}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 mr-auto">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm rounded-lg transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={printReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white text-sm rounded-lg transition-colors"
              style={{ backgroundColor: accent }}>
              <Printer className="w-4 h-4" /> طباعة التقرير
            </button>
          </div>
        </div>
      </div>

      {/* ===== Crystal Reports Screen Layout ===== */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: `${accent}40` }}>

        {/* Report Header Band */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2" style={{ background: accent, borderColor: accent }}>
          <div className="flex items-center gap-3">
            {settings?.storeLogo && <img src={settings.storeLogo} className="h-10 object-contain rounded" alt="" />}
            <div>
              <div className="text-white font-bold text-base">{settings?.storeName || 'نظام الكاشير'}</div>
              <div className="text-white/70 text-xs">{new Date().toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' })}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-xl">تقرير المبيعات</div>
            <div className="text-white/80 text-sm">الفترة: {rangeLabel()}</div>
          </div>
        </div>

        {/* Summary Band (مثل ملخص Crystal Reports) */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b" style={{ borderColor: `${accent}30`, background: `${accent}06` }}>
          {[
            { label: 'عدد الفواتير', value: formatNumber(filteredSales.length), icon: ShoppingCart, color: '#4f46e5' },
            { label: 'إجمالي المبيعات', value: formatCurrency(totalSales), icon: DollarSign, color: accent },
            ...(showProfit ? [{ label: 'الربح التقديري', value: formatCurrency(totalProfit), icon: TrendingUp, color: '#059669' }] : []),
            { label: 'غير محصّل', value: formatCurrency(totalRemaining), icon: TrendingDown, color: '#dc2626' },
          ].map((s, i) => (
            <div key={s.label} className={`flex items-center gap-3 px-5 py-4 ${i < 3 ? 'border-l' : ''}`}
              style={{ borderColor: `${accent}20` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}15` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="font-bold text-base text-slate-800">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* توزيع المبيعات حسب طريقة الدفع */}
        {paymentDistribution.length > 0 && (
          <div className="border-b px-5 py-3" style={{ borderColor: `${accent}20`, background: `${accent}04` }}>
            <div dir="ltr" style={{ width: '100%', height: Math.max(paymentDistribution.length * 34, 60) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentDistribution} layout="vertical" margin={{ top: 4, right: 50, left: 0, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="#e1e0d9" strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="type" width={70} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#52514e' }} orientation="right" />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                  <Bar dataKey="val" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {paymentDistribution.map((_, i) => (
                      <Cell key={i} fill={CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length]} />
                    ))}
                    <LabelList dataKey="val" position="right" formatter={(v: unknown) => formatCurrency(Number(v))} style={{ fontSize: 11, fill: '#52514e' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detail Band — Sales Table (Crystal Reports grouped style) */}
        <div className="overflow-x-auto">
          {filteredSales.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="font-medium">لا توجد مبيعات في هذه الفترة</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              {/* Column headers */}
              <thead>
                <tr style={{ background: `${accent}15` }}>
                  {['رقم الفاتورة','التاريخ','العميل','المبلغ','المدفوع','المتبقي','الكاشير'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold border-b-2 ${i >= 3 && i <= 5 ? 'text-left' : 'text-right'}`}
                      style={{ borderColor: accent, color: accent }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              {renderSalesGroup(PAYMENT_TYPE_LABELS.cash, filteredSales.filter(s => s.paymentType === 'cash'), totalCash, PAYMENT_TYPE_BADGE_CLASSES.cash)}
              {renderSalesGroup(PAYMENT_TYPE_LABELS.card, filteredSales.filter(s => s.paymentType === 'card'), totalCard, PAYMENT_TYPE_BADGE_CLASSES.card)}
              {renderSalesGroup(PAYMENT_TYPE_LABELS.credit, filteredSales.filter(s => s.paymentType === 'credit'), totalCredit, PAYMENT_TYPE_BADGE_CLASSES.credit)}
              {renderSalesGroup(PAYMENT_TYPE_LABELS.mixed, filteredSales.filter(s => s.paymentType === 'mixed'), totalMixed, PAYMENT_TYPE_BADGE_CLASSES.mixed)}
              {renderSalesGroup(PAYMENT_TYPE_LABELS.wallet, filteredSales.filter(s => s.paymentType === 'wallet'), totalWallet, PAYMENT_TYPE_BADGE_CLASSES.wallet)}
              {/* Grand Total Footer */}
              <tfoot>
                <tr style={{ borderTop: `3px double ${accent}`, background: `${accent}12` }}>
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-right" style={{ color: accent }}>
                    الإجمالي الكلي — {filteredSales.length} فاتورة
                  </td>
                  <td className="px-4 py-3 text-base font-bold text-left" style={{ color: accent }}>
                    {formatCurrency(totalSales)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* أكثر المنتجات مبيعًا */}
        {showTopProducts && topProducts.length > 0 && (
          <div className="border-t" style={{ borderColor: `${accent}30` }}>
            <div className="px-5 py-2.5 text-xs font-bold border-b flex items-center gap-2"
              style={{ borderColor: `${accent}20`, background: `${accent}08`, color: accent }}>
              <Package className="w-3.5 h-3.5" /> أكثر المنتجات مبيعًا
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: `${accent}10` }}>
                    {['#','المنتج','الكمية المباعة','الإيرادات','نسبة المبيعات'].map((h) => (
                      <th key={h} className="px-4 py-2 text-right font-bold" style={{ color: accent }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, idx) => (
                    <tr key={idx} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <td className="px-4 py-2 font-bold" style={{ color: accent }}>{idx + 1}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">{p.name}</td>
                      <td className="px-4 py-2 text-slate-600">{p.quantity.toFixed(2)}</td>
                      <td className="px-4 py-2 font-bold" style={{ color: accent }}>{formatCurrency(p.revenue)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.round((p.revenue / maxRevenue) * 100)}%`, backgroundColor: accent }} />
                          </div>
                          <span className="text-slate-400 w-8">{Math.round((p.revenue / (totalSales || 1)) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* اتجاه المبيعات والربح خلال الفترة */}
        {dailyTrend.length > 1 && (
          <div className="border-t" style={{ borderColor: `${accent}30` }}>
            <div className="px-5 py-2.5 text-xs font-bold border-b flex items-center gap-2"
              style={{ borderColor: `${accent}20`, background: `${accent}08`, color: accent }}>
              اتجاه المبيعات والربح
            </div>
            <div className="px-3 py-3" style={{ height: 220 }} dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="3 3" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#898781' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#898781' }} width={70}
                    tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" name="المبيعات" stroke={CATEGORICAL_PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="profit" name="الربح" stroke={CATEGORICAL_PALETTE[1]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* أداء الموظفين */}
        {employeePerf.length > 0 && (
          <div className="border-t" style={{ borderColor: `${accent}30` }}>
            <div className="px-5 py-2.5 text-xs font-bold border-b flex items-center gap-2"
              style={{ borderColor: `${accent}20`, background: `${accent}08`, color: accent }}>
              أداء الموظفين
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: `${accent}10` }}>
                    {['الموظف', 'عدد الفواتير', 'إجمالي المبيعات', 'الربح التقديري'].map((h) => (
                      <th key={h} className="px-4 py-2 text-right font-bold" style={{ color: accent }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeePerf.map((e, idx) => (
                    <tr key={idx} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <td className="px-4 py-2 font-medium text-slate-700">{e.name}</td>
                      <td className="px-4 py-2 text-slate-600">{formatNumber(e.invoices)}</td>
                      <td className="px-4 py-2 font-bold" style={{ color: accent }}>{formatCurrency(e.total)}</td>
                      <td className="px-4 py-2 text-emerald-600">{formatCurrency(e.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* المبيعات حسب المستودع */}
        {warehousePerf.length > 0 && (
          <div className="border-t" style={{ borderColor: `${accent}30` }}>
            <div className="px-5 py-2.5 text-xs font-bold border-b flex items-center gap-2"
              style={{ borderColor: `${accent}20`, background: `${accent}08`, color: accent }}>
              المبيعات حسب المستودع
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: `${accent}10` }}>
                    {['المستودع', 'عدد الفواتير', 'إجمالي المبيعات'].map((h) => (
                      <th key={h} className="px-4 py-2 text-right font-bold" style={{ color: accent }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {warehousePerf.map((w, idx) => (
                    <tr key={idx} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <td className="px-4 py-2 font-medium text-slate-700">{w.name}</td>
                      <td className="px-4 py-2 text-slate-600">{formatNumber(w.invoices)}</td>
                      <td className="px-4 py-2 font-bold" style={{ color: accent }}>{formatCurrency(w.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

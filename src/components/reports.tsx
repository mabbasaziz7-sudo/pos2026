'use client';

import { useState, useEffect, useRef } from 'react';
import { db, type Sale, type Product, type Shift } from '@/lib/local-db';
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
  FileText,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import toast from 'react-hot-toast';

export default function Reports() {
  const { settings } = useAppStore();
  const accent = settings?.printAccentColor || '#10b981';
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [s, p, sh] = await Promise.all([
      db.sales.where('status').equals('completed').toArray(),
      db.products.toArray(),
      db.shifts.toArray(),
    ]);
    setSales(s);
    setProducts(p);
    setShifts(sh);
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
  const totalCredit = filteredSales.filter((s) => s.paymentType === 'credit').reduce((sum, s) => sum + Number(s.total), 0);
  const totalMixed = filteredSales.filter((s) => s.paymentType === 'mixed').reduce((sum, s) => sum + Number(s.total), 0);
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

  const exportCSV = () => {
    const headers = ['الفاتورة', 'التاريخ', 'العميل', 'المبلغ', 'المدفوع', 'المتبقي', 'نوع الدفع', 'الكاشير'];
    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      new Date(s.date).toLocaleString('ar-SA'),
      s.customerName || 'نقدي',
      s.total,
      s.paid,
      s.remaining,
      s.paymentType === 'cash' ? 'نقدي' : s.paymentType === 'credit' ? 'آجل' : 'مختلط',
      s.userName,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);
    // يسمح للمتصفح برسم حالة "جاري الإنشاء..." قبل أن يبدأ html2canvas عمله المتزامن الثقيل
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`تقرير-المبيعات-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch {
      toast.error('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const rangePct = (val: number) => totalSales ? Math.round((val / totalSales) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          {/* Quick Range Buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {([
              { id: 'today' as const, label: 'اليوم' },
              { id: 'week' as const, label: 'الأسبوع' },
              { id: 'month' as const, label: 'الشهر' },
              { id: 'all' as const, label: 'الكل' },
            ] as const).map((range) => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range.id
                    ? 'text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={dateRange === range.id ? { backgroundColor: accent } : {}}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Custom Date */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setDateRange('all'); }}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
            <span className="text-slate-400 text-xs">إلى</span>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setDateRange('all'); }}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 mr-auto">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={exportPDF} disabled={exportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm rounded-lg transition-colors">
              <FileText className="w-4 h-4" />
              {exportingPdf ? 'جاري...' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Content (captured for PDF) */}
      <div ref={reportRef} className="space-y-4">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'عدد الفواتير', value: formatNumber(filteredSales.length), icon: ShoppingCart, color: '#6366f1', bg: '#eef2ff' },
            { label: 'إجمالي المبيعات', value: formatCurrency(totalSales), icon: DollarSign, color: accent, bg: `${accent}18` },
            { label: 'الربح التقديري', value: formatCurrency(totalProfit), icon: TrendingUp, color: '#059669', bg: '#d1fae5' },
            { label: 'متبقي غير محصّل', value: formatCurrency(totalRemaining), icon: TrendingDown, color: '#dc2626', bg: '#fee2e2' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4" style={{ borderTop: `3px solid ${card.color}` }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">{card.label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bg }}>
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-800">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Payment breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" /> توزيع الدفع
            </h3>
            <div className="space-y-4">
              {[
                { label: 'نقدي', val: totalCash, color: accent },
                { label: 'آجل', val: totalCredit, color: '#f59e0b' },
                { label: 'مختلط', val: totalMixed, color: '#3b82f6' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold" style={{ color: item.color }}>{formatCurrency(item.val)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${rangePct(item.val)}%`, backgroundColor: item.color }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{rangePct(item.val)}% من الإجمالي</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" /> أكثر المنتجات مبيعًا
            </h3>
            <div className="space-y-3 max-h-56 overflow-y-auto">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: `${accent}20`, color: accent }}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 truncate">{product.name}</span>
                      <span className="font-bold flex-shrink-0 mr-2" style={{ color: accent }}>{formatCurrency(product.revenue)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full"
                        style={{ width: `${Math.round((product.revenue / maxRevenue) * 100)}%`, backgroundColor: accent }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{product.quantity} وحدة</p>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && <p className="text-center py-6 text-slate-400 text-sm">لا توجد بيانات</p>}
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-slate-400" /> سجل المبيعات
              <span className="text-sm font-normal text-slate-400">({filteredSales.length} فاتورة)</span>
            </h3>
          </div>
          {filteredSales.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="font-medium">لا توجد مبيعات في هذه الفترة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-medium">
                    <th className="px-4 py-3 text-right">رقم الفاتورة</th>
                    <th className="px-4 py-3 text-right">التاريخ</th>
                    <th className="px-4 py-3 text-right">العميل</th>
                    <th className="px-4 py-3 text-right">المبلغ</th>
                    <th className="px-4 py-3 text-right">المدفوع</th>
                    <th className="px-4 py-3 text-right">المتبقي</th>
                    <th className="px-4 py-3 text-center">النوع</th>
                    <th className="px-4 py-3 text-right">الكاشير</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale, i) => (
                    <tr key={sale.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                      <td className="px-4 py-3 font-mono text-slate-700 text-xs">{sale.invoiceNumber}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(sale.date)}</td>
                      <td className="px-4 py-3 text-slate-700">{sale.customerName || <span className="text-slate-400 italic">نقدي</span>}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: accent }}>{formatCurrency(Number(sale.total))}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(Number(sale.paid))}</td>
                      <td className="px-4 py-3">
                        {Number(sale.remaining) > 0
                          ? <span className="text-rose-600 font-medium">{formatCurrency(Number(sale.remaining))}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.paymentType === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                          sale.paymentType === 'credit' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {sale.paymentType === 'cash' ? 'نقدي' : sale.paymentType === 'credit' ? 'آجل' : 'مختلط'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{sale.userName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

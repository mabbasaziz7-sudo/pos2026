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
  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalCash = filteredSales.filter((s) => s.paymentType === 'cash').reduce((sum, s) => sum + s.total, 0);
  const totalCredit = filteredSales.filter((s) => s.paymentType === 'credit').reduce((sum, s) => sum + s.total, 0);
  const totalProfit = filteredSales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => itemSum + (item.price - item.cost) * item.quantity, 0);
  }, 0);

  // Top products
  const productSales: Record<number, { name: string; quantity: number; revenue: number }> = {};
  filteredSales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].revenue += item.total;
    });
  });
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

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

  return (
    <div className="space-y-4">
      {/* Date Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'today' as const, label: 'اليوم' },
            { id: 'week' as const, label: 'آخر أسبوع' },
            { id: 'month' as const, label: 'آخر شهر' },
            { id: 'all' as const, label: 'الكل' },
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range.id
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setDateRange('all'); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setDateRange('all'); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={exportingPdf}
            className="flex items-center gap-1 px-3 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white text-sm rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            {exportingPdf ? 'جاري الإنشاء...' : 'طباعة PDF'}
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-4 bg-slate-50 p-1">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-slate-500">عدد الفواتير</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">{filteredSales.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: accent }} />
            <p className="text-sm text-slate-500">إجمالي المبيعات</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: accent }}>{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" style={{ color: accent }} />
            <p className="text-sm text-slate-500">الربح التقديري</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: accent }}>{formatCurrency(totalProfit)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-slate-500">مبيعات آجلة</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalCredit)}</p>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 mb-4">توزيع المبيعات</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">نقدي</span>
                <span className="font-medium">{formatCurrency(totalCash)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full transition-all"
                  style={{ width: `${totalSales ? (totalCash / totalSales) * 100 : 0}%`, backgroundColor: accent }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">آجل</span>
                <span className="font-medium">{formatCurrency(totalCredit)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${totalSales ? (totalCredit / totalSales) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 mb-4">أكثر المنتجات مبيعاً</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${accent}22`, color: accent }}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.quantity} قطعة</p>
                </div>
                <span className="text-sm font-medium" style={{ color: accent }}>{formatCurrency(product.revenue)}</span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-center py-4 text-slate-400 text-sm">لا توجد بيانات</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">سجل المبيعات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الفاتورة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المبلغ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المدفوع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المتبقي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">النوع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الكاشير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{sale.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(sale.date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{sale.customerName || 'نقدي'}</td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: accent }}>{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: accent }}>{formatCurrency(sale.paid)}</td>
                  <td className="px-4 py-3 text-sm text-rose-600">{formatCurrency(sale.remaining)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      sale.paymentType === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                      sale.paymentType === 'credit' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {sale.paymentType === 'cash' ? 'نقدي' : sale.paymentType === 'credit' ? 'آجل' : 'مختلط'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{sale.userName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد مبيعات في الفترة المحددة</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

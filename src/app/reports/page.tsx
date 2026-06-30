"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { fetchApi, formatCurrency, formatDate, cleanStylesForHtml2Canvas } from "@/lib/api";

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchApi("/api/dashboard").then(setDashboard);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchApi("/api/orders"),
      fetchApi("/api/invoices"),
      fetchApi(`/api/expenses?startDate=${startDate}&endDate=${endDate}`),
    ]).then(([o, i, e]) => { setOrders(o); setInvoices(i); setExpenses(e); });
  }, [startDate, endDate]);

  // Filter invoices by date range
  const filteredSales = invoices.filter(i => i.type === "sale" && i.invoiceDate >= startDate && i.invoiceDate <= endDate);
  const filteredPurchases = invoices.filter(i => i.type === "purchase" && i.invoiceDate >= startDate && i.invoiceDate <= endDate);

  const totalSales = filteredSales.reduce((s, i) => s + parseFloat(i.total || 0), 0);
  const totalSalesPaid = filteredSales.reduce((s, i) => s + parseFloat(i.paid || 0), 0);
  const totalPurchases = filteredPurchases.reduce((s, i) => s + parseFloat(i.total || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  // Order metrics
  const filteredOrders = orders.filter(o => o.orderDate >= startDate && o.orderDate <= endDate);
  const totalRevenue = filteredOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const totalCost = filteredOrders.reduce((s, o) => s + parseFloat(o.cost || 0), 0);
  const totalProfit = filteredOrders.reduce((s, o) => s + parseFloat(o.profit || 0), 0);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0;

  // Top customers
  const customerSales: Record<string, number> = {};
  filteredSales.forEach(i => {
    const name = i.customerName || "غير معروف";
    customerSales[name] = (customerSales[name] || 0) + parseFloat(i.total || 0);
  });
  const topCustomers = Object.entries(customerSales).sort(([, a], [, b]) => b - a).slice(0, 5);

  const downloadPDF = async () => {
    const element = document.getElementById("report-print-area");
    if (!element) return;

    // Temporarily show print-only elements
    const printOnly = element.querySelectorAll(".print-only");
    printOnly.forEach(el => el.classList.remove("hidden"));

    // Temporarily clean styles for html2canvas
    const restoreStyles = await cleanStylesForHtml2Canvas();

    try {
      const html2pdf = (await import("html2pdf.js" as any)).default;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `financial-report-${startDate}-to-${endDate}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };
      await html2pdf().from(element).set(opt).save();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تحميل ملف PDF");
    } finally {
      restoreStyles();
      printOnly.forEach(el => el.classList.add("hidden"));
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="التقارير الشاملة"
          description="تقارير مالية وإدارية تفصيلية"
          actions={
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md no-print">
                🖨️ طباعة
              </button>
              <button onClick={downloadPDF} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md no-print">
                💾 تحميل PDF
              </button>
            </div>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex items-center gap-3 flex-wrap no-print">
          <label className="text-sm font-semibold">من:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
          <label className="text-sm font-semibold">إلى:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
        </div>

        {/* Printable Area Wrapper */}
        <div id="report-print-area" className="space-y-6">
          {/* Printable Header - hidden on screen, visible on print and PDF */}
          <div className="print-only hidden print:block border-b-2 border-orange-500 pb-5 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-slate-100 shadow-sm" />
                <div>
                  <h1 className="text-3xl font-black text-orange-600">سمارت أوفيس</h1>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">نظام إدارة وتجهيز المطابع</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">الرقم الضريبي: ٣١٠٢٤٨٥٧٦١٠٠٠٠٣</p>
                </div>
              </div>
              <div className="text-left text-xs text-slate-500 space-y-1">
                <h2 className="text-lg font-bold text-slate-800">تقرير مالي تفصيلي شامل</h2>
                <p>الفترة من: <strong>{formatDate(startDate)}</strong> إلى: <strong>{formatDate(endDate)}</strong></p>
                <p>تاريخ إصدار التقرير: <strong>{formatDate(new Date())}</strong></p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">الملخص المالي</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ReportCard title="إجمالي المبيعات" value={formatCurrency(totalSales)} subtitle={`${filteredSales.length} فاتورة`} color="from-blue-500 to-blue-600" />
              <ReportCard title="إجمالي المشتريات" value={formatCurrency(totalPurchases)} subtitle={`${filteredPurchases.length} فاتورة`} color="from-purple-500 to-purple-600" />
              <ReportCard title="إجمالي المصروفات" value={formatCurrency(totalExpenses)} color="from-red-500 to-red-600" />
              <ReportCard
                title="صافي الربح"
                value={formatCurrency(totalSales - totalPurchases - totalExpenses)}
                color="from-green-500 to-green-600"
                highlight
              />
            </div>
          </div>

          {/* Profit Analysis */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">تحليل الأرباح</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ReportCard title="إيرادات الطلبات" value={formatCurrency(totalRevenue)} color="from-blue-400 to-blue-500" />
              <ReportCard title="تكلفة الطلبات" value={formatCurrency(totalCost)} color="from-orange-400 to-orange-500" />
              <ReportCard title="الربح الإجمالي" value={formatCurrency(totalProfit)} color="from-green-400 to-green-500" />
              <ReportCard title="هامش الربح %" value={`${profitMargin}%`} color="from-indigo-400 to-indigo-500" />
            </div>
          </div>

          {/* Top Customers */}
          {topCustomers.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">أفضل العملاء</h2>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="space-y-2">
                  {topCustomers.map(([name, amount], idx) => {
                    const max = topCustomers[0][1] as number;
                    const pct = max > 0 ? (amount / max * 100).toFixed(1) : 0;
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-semibold">{name}</span>
                            <span className="text-sm font-bold text-orange-600">{formatCurrency(amount)}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sales vs Purchases Comparison */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">المبيعات والمشتريات</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold">المبيعات</span>
                    <span className="text-sm font-bold text-blue-600">{formatCurrency(totalSales)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4">
                    <div className="bg-blue-500 h-4 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold">المشتريات</span>
                    <span className="text-sm font-bold text-purple-600">{formatCurrency(totalPurchases)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4">
                    <div
                      className="bg-purple-500 h-4 rounded-full"
                      style={{ width: `${totalSales > 0 ? (totalPurchases / totalSales * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold">المصروفات</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4">
                    <div
                      className="bg-red-500 h-4 rounded-full"
                      style={{ width: `${totalSales > 0 ? (totalExpenses / totalSales * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {dashboard && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">نشاط النظام</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">مبيعات اليوم</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(dashboard.todaySales?.total || 0)}</p>
                  <p className="text-xs text-slate-400 mt-1">{dashboard.todaySales?.count || 0} فاتورة</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">الأقساط المستحقة</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(dashboard.installments?.total || 0)}</p>
                  <p className="text-xs text-slate-400 mt-1">{dashboard.installments?.count || 0} قسط</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">إجمالي عدد الطلبات</p>
                  <p className="text-2xl font-bold text-slate-900">{filteredOrders.length}</p>
                  <p className="text-xs text-slate-400 mt-1">في الفترة المحددة</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ReportCard({ title, value, subtitle, color, highlight }: any) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "ring-2 ring-orange-400 " : ""}bg-gradient-to-br ${color} text-white shadow-lg`}>
      <p className="text-xs opacity-90">{title}</p>
      <p className="text-xl md:text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
    </div>
  );
}


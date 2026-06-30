"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchApi, formatCurrency, orderStatusLabels, orderStatusColors } from "@/lib/api";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">لوحة التحكم</h1>
          <p className="text-slate-500 mt-1">نظرة عامة على أداء النظام</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">جاري التحميل...</div>
        ) : !data ? (
          <div className="text-center py-20 text-red-500">حدث خطأ في تحميل البيانات</div>
        ) : (
          <>
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="مبيعات اليوم"
                value={formatCurrency(data.todaySales?.total || 0)}
                subtitle={`${data.todaySales?.count || 0} فاتورة`}
                color="bg-gradient-to-br from-blue-500 to-blue-600"
                icon="💵"
              />
              <StatCard
                title="مبيعات الشهر"
                value={formatCurrency(data.monthSales?.total || 0)}
                subtitle={`${data.monthSales?.count || 0} فاتورة`}
                color="bg-gradient-to-br from-green-500 to-green-600"
                icon="📈"
              />
              <StatCard
                title="مصروفات الشهر"
                value={formatCurrency(data.monthExpenses?.total || 0)}
                subtitle="إجمالي المصروفات"
                color="bg-gradient-to-br from-red-500 to-red-600"
                icon="💸"
              />
              <StatCard
                title="صافي الربح"
                value={formatCurrency(
                  parseFloat(data.monthSales?.total || 0) - parseFloat(data.monthExpenses?.total || 0) - parseFloat(data.monthPurchases?.total || 0)
                )}
                subtitle="تقديري"
                color="bg-gradient-to-br from-orange-500 to-orange-600"
                icon="💎"
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <MiniStat title="العملاء" value={data.counts?.customers || 0} icon="👥" />
              <MiniStat title="الموظفين" value={data.counts?.employees || 0} icon="👨‍💼" />
              <MiniStat title="الطلبات" value={data.counts?.orders || 0} icon="📋" />
              <MiniStat title="المنتجات" value={data.counts?.products || 0} icon="📦" />
              <MiniStat
                title="أقساط مستحقة"
                value={formatCurrency(data.installments?.total || 0)}
                icon="💳"
                highlight
              />
            </div>

            {/* Orders Status & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-4">حالة الطلبات</h3>
                <div className="space-y-2">
                  {data.ordersCount?.map((row: any) => (
                    <div
                      key={row.status}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          orderStatusColors[row.status] || "bg-slate-100"
                        }`}
                      >
                        {orderStatusLabels[row.status] || row.status}
                      </span>
                      <span className="font-bold text-slate-900">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-4">تنبيهات المخزون</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <span className="text-sm text-slate-700">منتجات تحت الحد الأدنى</span>
                    <span className="text-2xl font-bold text-yellow-700">
                      {data.lowStock?.products?.products_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <span className="text-sm text-slate-700">مواد خام تحت الحد الأدنى</span>
                    <span className="text-2xl font-bold text-orange-700">
                      {data.lowStock?.raw_materials?.raw_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-4">أحدث الطلبات</h3>
              {data.recentOrders?.length === 0 ? (
                <p className="text-center text-slate-500 py-8">لا توجد طلبات بعد</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">رقم الطلب</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">العميل</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">المبلغ</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders?.map((order: any) => (
                        <tr key={order.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-sm font-mono">{order.order_number}</td>
                          <td className="px-4 py-3 text-sm">{order.customer_name}</td>
                          <td className="px-4 py-3 text-sm font-bold">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                orderStatusColors[order.status]
                              }`}
                            >
                              {orderStatusLabels[order.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle, color, icon }: any) {
  return (
    <div className={`${color} rounded-xl shadow-lg p-5 text-white`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
        </div>
        <span className="text-3xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

function MiniStat({ title, value, icon, highlight }: any) {
  return (
    <div
      className={`rounded-xl p-4 ${
        highlight ? "bg-orange-50 border border-orange-200" : "bg-white border border-slate-200"
      } shadow-sm`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className={`text-lg font-bold ${highlight ? "text-orange-700" : "text-slate-900"}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

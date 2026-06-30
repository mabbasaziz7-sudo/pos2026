"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate } from "@/lib/api";

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    invoiceId: "", customerId: "", amount: "", count: "3", startDate: new Date().toISOString().split("T")[0],
  });

  const load = () => {
    setLoading(true);
    fetchApi(`/api/installments${filter === "all" ? "" : `?paid=${filter === "paid"}`}`)
      .then(setInstallments)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const openAdd = () => {
    Promise.all([fetchApi("/api/invoices?type=sale"), fetchApi("/api/customers")]).then(([inv, cus]) => {
      setInvoices(inv.filter((i: any) => parseFloat(i.remaining) > 0));
      setCustomers(cus);
      setForm({ invoiceId: "", customerId: "", amount: "", count: "3", startDate: new Date().toISOString().split("T")[0] });
      setModalOpen(true);
    });
  };

  const generate = async () => {
    if (!form.invoiceId || !form.amount || !form.count) { alert("أدخل البيانات"); return; }
    const inv = invoices.find(i => i.id === parseInt(form.invoiceId));
    if (!inv) { alert("الفاتورة غير موجودة"); return; }
    const count = parseInt(form.count);
    const eachAmount = parseFloat(form.amount) / count;
    const startDate = new Date(form.startDate);

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      await fetchApi("/api/installments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: parseInt(form.invoiceId),
          customerId: inv.customerId,
          installmentNumber: i + 1,
          amount: eachAmount.toFixed(2),
          dueDate: dueDate.toISOString().split("T")[0],
        }),
      });
    }
    setModalOpen(false);
    load();
  };

  const markPaid = async (id: number) => {
    if (!confirm("تأكيد تحصيل القسط؟")) return;
    await fetchApi(`/api/installments/${id}`, { method: "PUT", body: JSON.stringify({ paid: true }) });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("حذف القسط؟")) return;
    await fetchApi(`/api/installments/${id}`, { method: "DELETE" });
    load();
  };

  const totalUnpaid = installments.filter(i => !i.paid).reduce((s, i) => s + parseFloat(i.amount), 0);
  const totalPaid = installments.filter(i => i.paid).reduce((s, i) => s + parseFloat(i.amount), 0);
  const overdue = installments.filter(i => !i.paid && new Date(i.dueDate) < new Date()).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="نظام الأقساط"
          description="إدارة أقساط العملاء وجدول التحصيل"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + جدولة أقساط
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">إجمالي غير محصل</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">إجمالي محصل</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">أقساط متأخرة</p>
            <p className="text-2xl font-bold text-orange-600">{overdue}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex gap-2">
          <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded text-sm ${filter === "all" ? "bg-orange-500 text-white" : "bg-slate-100"}`}>الكل</button>
          <button onClick={() => setFilter("unpaid")} className={`px-3 py-1 rounded text-sm ${filter === "unpaid" ? "bg-orange-500 text-white" : "bg-slate-100"}`}>غير مدفوعة</button>
          <button onClick={() => setFilter("paid")} className={`px-3 py-1 rounded text-sm ${filter === "paid" ? "bg-orange-500 text-white" : "bg-slate-100"}`}>مدفوعة</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : installments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">💳</div>
              <p>لا توجد أقساط</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الفاتورة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">العميل</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">رقم القسط</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المبلغ</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الاستحقاق</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((i) => {
                    const isOverdue = !i.paid && new Date(i.dueDate) < new Date();
                    return (
                      <tr key={i.id} className={`border-b border-slate-100 hover:bg-slate-50 ${isOverdue ? "bg-red-50/30" : ""}`}>
                        <td className="px-4 py-3 text-sm font-mono">{i.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{i.customerName}</td>
                        <td className="px-4 py-3 text-sm">#{i.installmentNumber}</td>
                        <td className="px-4 py-3 text-sm font-bold">{formatCurrency(i.amount)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(i.dueDate)}</td>
                        <td className="px-4 py-3 text-sm">
                          {i.paid ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">مدفوع</span>
                          ) : isOverdue ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">متأخر</span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">مستحق</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm space-x-1">
                          {!i.paid && <button onClick={() => markPaid(i.id)} className="text-green-600 hover:bg-green-50 px-2 py-1 rounded">تحصيل</button>}
                          <button onClick={() => remove(i.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded">حذف</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="جدولة أقساط جديدة">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">الفاتورة *</label>
              <select value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="">-- اختر --</option>
                {invoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNumber} - {i.customerName} - متبقي: {formatCurrency(i.remaining)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">المبلغ الإجمالي *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">عدد الأقساط *</label>
              <input type="number" min="2" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">تاريخ القسط الأول</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            {form.amount && form.count && (
              <div className="bg-blue-50 p-3 rounded text-sm">
                <p>قيمة القسط الشهري: <strong className="text-blue-700">{(parseFloat(form.amount) / parseInt(form.count)).toFixed(2)}</strong></p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6 justify-end">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">إلغاء</button>
            <button onClick={generate} className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold">إنشاء الأقساط</button>
          </div>
        </Modal>
      </main>
    </div>
  );
}

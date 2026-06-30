"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate } from "@/lib/api";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    customerId: "", quoteDate: new Date().toISOString().split("T")[0],
    validUntil: "", tax: "0", discount: "0", notes: "", status: "pending",
  });
  const [items, setItems] = useState<{ description: string; quantity: string; unitPrice: string; total: string }[]>([
    { description: "", quantity: "1", unitPrice: "0", total: "0" },
  ]);

  const load = () => {
    setLoading(true);
    Promise.all([fetchApi("/api/quotations"), fetchApi("/api/customers")])
      .then(([q, c]) => { setQuotations(q); setCustomers(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const calcItem = (item: { quantity: string; unitPrice: string }) =>
    ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2);

  const calcTotals = () => {
    const subtotal = items.reduce((s, i) => s + parseFloat(calcItem(i)), 0);
    const tax = parseFloat(form.tax) || 0;
    const discount = parseFloat(form.discount) || 0;
    return { subtotal: subtotal.toFixed(2), total: (subtotal + tax - discount).toFixed(2) };
  };

  const openAdd = () => {
    setForm({ customerId: "", quoteDate: new Date().toISOString().split("T")[0], validUntil: "", tax: "0", discount: "0", notes: "", status: "pending" });
    setItems([{ description: "", quantity: "1", unitPrice: "0", total: "0" }]);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.customerId) { alert("اختر العميل"); return; }
    try {
      const totals = calcTotals();
      await fetchApi("/api/quotations", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          customerId: parseInt(form.customerId),
          ...totals,
          items: items.filter(i => i.description).map(i => ({ ...i, total: calcItem(i) })),
        }),
      });
      setModalOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const totals = calcTotals();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="عروض الأسعار"
          description="إنشاء وإدارة عروض الأسعار للعملاء"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + عرض سعر جديد
            </button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : quotations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">💼</div>
              <p>لا توجد عروض أسعار</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">رقم العرض</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">العميل</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">صالح حتى</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المبلغ</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-mono font-bold">{q.quoteNumber}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{q.customerName}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(q.quoteDate)}</td>
                      <td className="px-4 py-3 text-sm">{q.validUntil ? formatDate(q.validUntil) : "-"}</td>
                      <td className="px-4 py-3 text-sm font-bold">{formatCurrency(q.total)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          q.status === "accepted" ? "bg-green-100 text-green-700" :
                          q.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {q.status === "accepted" ? "مقبول" : q.status === "rejected" ? "مرفوض" : "معلق"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="عرض سعر جديد" size="xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1">العميل *</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="">-- اختر --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">التاريخ</label>
              <input type="date" value={form.quoteDate} onChange={(e) => setForm({ ...form, quoteDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">صالح حتى</label>
              <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">ضريبة</label>
              <input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">خصم</label>
              <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">الحالة</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="pending">معلق</option>
                <option value="accepted">مقبول</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold mb-1">ملاحظات</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">البنود</h3>
              <button onClick={() => setItems([...items, { description: "", quantity: "1", unitPrice: "0", total: "0" }])} className="text-xs bg-orange-500 text-white px-3 py-1 rounded">+ بند</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="px-2 py-1 text-right">الوصف</th>
                  <th className="px-2 py-1 text-right w-20">الكمية</th>
                  <th className="px-2 py-1 text-right w-24">السعر</th>
                  <th className="px-2 py-1 text-right w-20">الإجمالي</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1"><input value={item.description} onChange={(e) => { const newI = [...items]; newI[idx].description = e.target.value; setItems(newI); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                    <td className="py-1"><input type="number" value={item.quantity} onChange={(e) => { const newI = [...items]; newI[idx].quantity = e.target.value; setItems(newI); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                    <td className="py-1"><input type="number" value={item.unitPrice} onChange={(e) => { const newI = [...items]; newI[idx].unitPrice = e.target.value; setItems(newI); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                    <td className="py-1 font-bold text-center">{formatCurrency(calcItem(item))}</td>
                    <td className="py-1 text-center"><button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded text-center">
              <p className="text-xs">المجموع</p>
              <p className="font-bold">{formatCurrency(totals.subtotal)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded text-center">
              <p className="text-xs">الإجمالي</p>
              <p className="font-bold text-green-700">{formatCurrency(totals.total)}</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">إلغاء</button>
            <button onClick={save} className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold">حفظ</button>
          </div>
        </Modal>
      </main>
    </div>
  );
}

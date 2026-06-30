"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate, paymentMethodLabels } from "@/lib/api";

const CATEGORIES = ["إيجار", "كهرباء", "ماء", "إنترنت", "هاتف", "مواصلات", "صيانة", "رواتب", "تسويق", "متنوعة"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [category, setCategory] = useState("");
  const [form, setForm] = useState({
    category: "متنوعة", description: "", amount: "0",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash", notes: "",
  });

  const load = () => {
    setLoading(true);
    fetchApi(`/api/expenses${category ? `?category=${category}` : ""}`)
      .then(setExpenses)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [category]);

  const openAdd = () => {
    setEditing(null);
    setForm({ category: "متنوعة", description: "", amount: "0", expenseDate: new Date().toISOString().split("T")[0], paymentMethod: "cash", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (e: any) => {
    setEditing(e);
    setForm({
      category: e.category, description: e.description, amount: e.amount,
      expenseDate: e.expenseDate, paymentMethod: e.paymentMethod, notes: e.notes || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.description || !form.amount) { alert("أدخل البيانات"); return; }
    try {
      if (editing) {
        await fetchApi(`/api/expenses/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await fetchApi(`/api/expenses`, { method: "POST", body: JSON.stringify(form) });
      }
      setModalOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm("حذف؟")) return;
    await fetchApi(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  };

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + parseFloat(e.amount || 0);
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="إدارة المصروفات"
          description="تتبع مصاريف المطبعة"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + مصروف جديد
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">إجمالي المصروفات</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(total)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 md:col-span-2">
            <p className="text-xs text-slate-500 mb-2">حسب الفئة</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byCategory).map(([cat, amt]) => (
                <span key={cat} className="text-xs bg-slate-100 px-2 py-1 rounded">
                  {cat}: <strong>{formatCurrency(amt)}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
            <option value="">جميع الفئات</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">💸</div>
              <p>لا توجد مصروفات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الفئة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الوصف</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المبلغ</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الدفع</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">{formatDate(e.expenseDate)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">{e.category}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{e.description}</td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{paymentMethodLabels[e.paymentMethod] || e.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm space-x-1">
                        <button onClick={() => openEdit(e)} className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded">تعديل</button>
                        <button onClick={() => remove(e.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل مصروف" : "مصروف جديد"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">الفئة *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">المبلغ *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">الوصف *</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">التاريخ</label>
              <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">طريقة الدفع</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">ملاحظات</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-6 justify-end">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">إلغاء</button>
            <button onClick={save} className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold">حفظ</button>
          </div>
        </Modal>
      </main>
    </div>
  );
}

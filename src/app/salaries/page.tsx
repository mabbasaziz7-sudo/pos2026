"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate } from "@/lib/api";

export default function SalariesPage() {
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [modalOpen, setModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    userId: "", month: new Date().toISOString().slice(0, 7),
    baseSalary: "0", bonuses: "0", deductions: "0", notes: "",
  });

  const load = () => {
    setLoading(true);
    Promise.all([fetchApi(`/api/salaries?month=${month}`), fetchApi("/api/users")])
      .then(([s, u]) => { setSalaries(s); setUsers(u); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month]);

  const openAdd = () => {
    setForm({ userId: "", month, baseSalary: "0", bonuses: "0", deductions: "0", notes: "" });
    setModalOpen(true);
  };

  const onUserChange = (userId: string) => {
    const user = users.find(u => u.id === parseInt(userId));
    setForm({ ...form, userId, baseSalary: user?.salary || "0" });
  };

  const save = async () => {
    if (!form.userId) { alert("اختر الموظف"); return; }
    await fetchApi("/api/salaries", {
      method: "POST",
      body: JSON.stringify({ ...form, userId: parseInt(form.userId) }),
    });
    setModalOpen(false);
    load();
  };

  const markPaid = async (id: number) => {
    if (!confirm("تأكيد دفع الراتب؟")) return;
    await fetchApi(`/api/salaries`, { method: "POST", body: JSON.stringify({}) });
    // We don't have an update endpoint - we can extend later
    load();
  };

  const total = salaries.reduce((s, sal) => s + parseFloat(sal.total || 0), 0);
  const paid = salaries.filter(s => s.paid).reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
  const unpaid = total - paid;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="إدارة الرواتب"
          description="صرف رواتب الموظفين"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + إضافة راتب
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">إجمالي الشهر</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(total)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">مدفوع</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paid)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">مستحق</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(unpaid)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <label className="text-sm font-semibold mr-2">الشهر:</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg outline-none" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : salaries.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">💰</div>
              <p>لا توجد رواتب لهذا الشهر</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الموظف</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المنصب</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الأساسي</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">البدلات</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الخصومات</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الصافي</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold">{s.userName}</td>
                      <td className="px-4 py-3 text-sm">{s.position || "-"}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(s.baseSalary)}</td>
                      <td className="px-4 py-3 text-sm text-green-600">+{formatCurrency(s.bonuses)}</td>
                      <td className="px-4 py-3 text-sm text-red-600">-{formatCurrency(s.deductions)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-600">{formatCurrency(s.total)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${s.paid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {s.paid ? "مدفوع" : "معلق"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة راتب">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">الموظف *</label>
              <select value={form.userId} onChange={(e) => onUserChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="">-- اختر --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} - {u.position}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">الشهر</label>
              <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1">الأساسي</label>
                <input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">البدلات</label>
                <input type="number" value={form.bonuses} onChange={(e) => setForm({ ...form, bonuses: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">الخصومات</label>
                <input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded text-center">
              <p className="text-xs">الصافي</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(
                  (parseFloat(form.baseSalary) || 0) + (parseFloat(form.bonuses) || 0) - (parseFloat(form.deductions) || 0)
                )}
              </p>
            </div>
            <div>
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

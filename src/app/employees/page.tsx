"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate, roleLabels } from "@/lib/api";

export default function EmployeesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "123456", role: "worker",
    position: "", department: "", salary: "0", hireDate: "", notes: "", status: true,
  });

  const load = () => {
    setLoading(true);
    fetchApi(`/api/users?search=${encodeURIComponent(search)}`)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", password: "123456", role: "worker", position: "", department: "", salary: "0", hireDate: "", notes: "", status: true });
    setModalOpen(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setForm({
      name: u.name, email: u.email || "", phone: u.phone || "", password: u.password || "123456",
      role: u.role, position: u.position || "", department: u.department || "",
      salary: u.salary || "0", hireDate: u.hireDate || "", notes: u.notes || "", status: u.status,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { alert("الاسم مطلوب"); return; }
    try {
      if (editing) {
        await fetchApi(`/api/users/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await fetchApi(`/api/users`, { method: "POST", body: JSON.stringify(form) });
      }
      setModalOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await fetchApi(`/api/users/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="إدارة الموظفين"
          description="قاعدة بيانات الموظفين والصلاحيات"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + موظف جديد
            </button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <input
            type="text" placeholder="ابحث بالاسم أو الإيميل..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">👨‍💼</div>
              <p>لا يوجد موظفين</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الاسم</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المنصب</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">القسم</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الصلاحية</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الراتب</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold">{u.name}</td>
                      <td className="px-4 py-3 text-sm">{u.position || "-"}</td>
                      <td className="px-4 py-3 text-sm">{u.department || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(u.salary)}</td>
                      <td className="px-4 py-3 text-sm">
                        {u.status ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">نشط</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">معطل</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm space-x-1">
                        <button onClick={() => openEdit(u)} className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded">تعديل</button>
                        <button onClick={() => remove(u.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل موظف" : "موظف جديد"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="الاسم *" v={form.name} on={(v: string) => setForm({ ...form, name: v })} />
            <F label="رقم الهوية" v={form.position} on={(v: string) => setForm({ ...form, position: v })} />
            <F label="البريد" type="email" v={form.email} on={(v: string) => setForm({ ...form, email: v })} />
            <F label="الهاتف" v={form.phone} on={(v: string) => setForm({ ...form, phone: v })} />
            <F label="القسم" v={form.department} on={(v: string) => setForm({ ...form, department: v })} />
            <F label="تاريخ التعيين" type="date" v={form.hireDate} on={(v: string) => setForm({ ...form, hireDate: v })} />
            <F label="الراتب" type="number" v={form.salary} on={(v: string) => setForm({ ...form, salary: v })} />
            <F label="كلمة المرور" v={form.password} on={(v: string) => setForm({ ...form, password: v })} />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الصلاحية</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} className="w-4 h-4" />
              <label className="text-sm">نشط</label>
            </div>
            <div className="md:col-span-2"><F label="ملاحظات" textarea v={form.notes} on={(v: string) => setForm({ ...form, notes: v })} /></div>
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

function F({ label, v, on, type = "text", textarea }: any) {
  const handle = (val: string) => on(val);
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      {textarea ? (
        <textarea value={v} onChange={(e) => handle(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
      ) : (
        <input type={type} value={v} onChange={(e) => handle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
      )}
    </div>
  );
}

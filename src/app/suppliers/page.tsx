"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency } from "@/lib/api";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    contactPerson: "",
    taxNumber: "",
    openingBalance: "0",
    notes: "",
  });

  const load = () => {
    setLoading(true);
    fetchApi(`/api/suppliers?search=${encodeURIComponent(search)}`)
      .then(setSuppliers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", address: "", contactPerson: "", taxNumber: "", openingBalance: "0", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      contactPerson: s.contactPerson || "",
      taxNumber: s.taxNumber || "",
      openingBalance: s.openingBalance || "0",
      notes: s.notes || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      alert("الاسم مطلوب");
      return;
    }
    try {
      if (editing) {
        await fetchApi(`/api/suppliers/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await fetchApi(`/api/suppliers`, { method: "POST", body: JSON.stringify(form) });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await fetchApi(`/api/suppliers/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="إدارة الموردين"
          description="قاعدة بيانات الموردين ومشترياتك"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + مورد جديد
            </button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <input
            type="text"
            placeholder="ابحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : suppliers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">🚚</div>
              <p>لا يوجد موردين بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الاسم</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">جهة الاتصال</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الهاتف</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الرقم الضريبي</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الرصيد</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold">{s.name}</td>
                      <td className="px-4 py-3 text-sm">{s.contactPerson || "-"}</td>
                      <td className="px-4 py-3 text-sm">{s.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm font-mono">{s.taxNumber || "-"}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(s.openingBalance)}</td>
                      <td className="px-4 py-3 text-sm space-x-1">
                        <button onClick={() => openEdit(s)} className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded">تعديل</button>
                        <button onClick={() => remove(s.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل مورد" : "مورد جديد"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="الاسم *" v={form.name} on={(v: string) => setForm({ ...form, name: v })} />
            <F label="جهة الاتصال" v={form.contactPerson} on={(v: string) => setForm({ ...form, contactPerson: v })} />
            <F label="الهاتف" v={form.phone} on={(v: string) => setForm({ ...form, phone: v })} />
            <F label="البريد" v={form.email} on={(v: string) => setForm({ ...form, email: v })} />
            <F label="الرقم الضريبي" v={form.taxNumber} on={(v: string) => setForm({ ...form, taxNumber: v })} />
            <F label="رصيد افتتاحي" type="number" v={form.openingBalance} on={(v: string) => setForm({ ...form, openingBalance: v })} />
            <div className="md:col-span-2"><F label="العنوان" v={form.address} on={(v: string) => setForm({ ...form, address: v })} /></div>
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

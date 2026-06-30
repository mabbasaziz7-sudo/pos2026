"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency } from "@/lib/api";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "",
    unit: "piece",
    cost: "0",
    price: "0",
    quantity: "0",
    minQuantity: "0",
    description: "",
  });

  const load = () => {
    setLoading(true);
    const url = `/api/products?search=${encodeURIComponent(search)}${lowOnly ? "&lowStock=1" : ""}`;
    fetchApi(url)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, lowOnly]);

  const openAdd = () => {
    setEditing(null);
    setForm({ code: `P${Date.now().toString().slice(-6)}`, name: "", category: "", unit: "piece", cost: "0", price: "0", quantity: "0", minQuantity: "0", description: "" });
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      code: p.code, name: p.name, category: p.category || "", unit: p.unit,
      cost: p.cost, price: p.price, quantity: p.quantity, minQuantity: p.minQuantity,
      description: p.description || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      alert("الاسم والكود مطلوبان");
      return;
    }
    try {
      if (editing) {
        await fetchApi(`/api/products/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await fetchApi(`/api/products`, { method: "POST", body: JSON.stringify(form) });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await fetchApi(`/api/products/${id}`, { method: "DELETE" });
    load();
  };

  const totalValue = products.reduce((sum, p) => sum + parseFloat(p.cost as string) * parseFloat(p.quantity as string), 0);
  const lowStockCount = products.filter(p => parseFloat(p.quantity) <= parseFloat(p.minQuantity)).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="إدارة المنتجات"
          description="المنتجات النهائية الجاهزة للبيع"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + منتج جديد
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">عدد المنتجات</p>
            <p className="text-2xl font-bold text-slate-900">{products.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">قيمة المخزون</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">منتجات منخفضة</p>
            <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="ابحث بالاسم أو الكود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">عرض منخفض المخزون فقط</span>
          </label>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">📦</div>
              <p>لا توجد منتجات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الكود</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الاسم</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الفئة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الكمية</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التكلفة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">السعر</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const low = parseFloat(p.quantity) <= parseFloat(p.minQuantity);
                    return (
                      <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 ${low ? "bg-red-50/30" : ""}`}>
                        <td className="px-4 py-3 text-sm font-mono">{p.code}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{p.name}</td>
                        <td className="px-4 py-3 text-sm">{p.category || "-"}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`font-bold ${low ? "text-red-600" : "text-slate-900"}`}>
                            {p.quantity} {p.unit}
                          </span>
                          {low && <span className="text-xs text-red-500 block">⚠️ منخفض</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">{formatCurrency(p.cost)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600">{formatCurrency(p.price)}</td>
                        <td className="px-4 py-3 text-sm space-x-1">
                          <button onClick={() => openEdit(p)} className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded">تعديل</button>
                          <button onClick={() => remove(p.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded">حذف</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل منتج" : "منتج جديد"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="الكود *" v={form.code} on={(v: string) => setForm({ ...form, code: v })} />
            <F label="الاسم *" v={form.name} on={(v: string) => setForm({ ...form, name: v })} />
            <F label="الفئة" v={form.category} on={(v: string) => setForm({ ...form, category: v })} />
            <F label="الوحدة" v={form.unit} on={(v: string) => setForm({ ...form, unit: v })} />
            <F label="التكلفة" type="number" v={form.cost} on={(v: string) => setForm({ ...form, cost: v })} />
            <F label="سعر البيع" type="number" v={form.price} on={(v: string) => setForm({ ...form, price: v })} />
            <F label="الكمية الحالية" type="number" v={form.quantity} on={(v: string) => setForm({ ...form, quantity: v })} />
            <F label="الحد الأدنى" type="number" v={form.minQuantity} on={(v: string) => setForm({ ...form, minQuantity: v })} />
            <div className="md:col-span-2"><F label="الوصف" textarea v={form.description} on={(v: string) => setForm({ ...form, description: v })} /></div>
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

"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate, shipmentStatusLabels } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  shipped: "bg-blue-100 text-blue-800",
  in_transit: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  returned: "bg-red-100 text-red-800",
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    orderId: "", customerId: "", carrier: "", trackingNumber: "",
    shippingDate: new Date().toISOString().split("T")[0],
    estimatedArrival: "", shippingCost: "0", status: "pending",
    address: "", notes: "",
  });

  const load = () => {
    setLoading(true);
    Promise.all([fetchApi("/api/shipments"), fetchApi("/api/orders"), fetchApi("/api/customers")])
      .then(([s, o, c]) => { setShipments(s); setOrders(o); setCustomers(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ orderId: "", customerId: "", carrier: "", trackingNumber: "", shippingDate: new Date().toISOString().split("T")[0], estimatedArrival: "", shippingCost: "0", status: "pending", address: "", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      orderId: s.orderId ? String(s.orderId) : "",
      customerId: String(s.customerId),
      carrier: s.carrier || "",
      trackingNumber: s.trackingNumber || "",
      shippingDate: s.shippingDate || "",
      estimatedArrival: s.estimatedArrival || "",
      shippingCost: s.shippingCost,
      status: s.status,
      address: s.address || "",
      notes: s.notes || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.customerId) { alert("اختر العميل"); return; }
    try {
      const payload = {
        ...form,
        orderId: form.orderId ? parseInt(form.orderId) : null,
        customerId: parseInt(form.customerId),
      };
      if (editing) {
        await fetchApi(`/api/shipments/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchApi(`/api/shipments`, { method: "POST", body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm("حذف؟")) return;
    await fetchApi(`/api/shipments/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="إدارة الشحن"
          description="شحنات وتوصيل الطلبات"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + شحنة جديدة
            </button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : shipments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">🚛</div>
              <p>لا توجد شحنات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">رقم الشحنة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الطلب</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">العميل</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">شركة الشحن</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التتبع</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">تاريخ الشحن</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التكلفة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-mono font-bold">{s.shipmentNumber}</td>
                      <td className="px-4 py-3 text-sm">{s.orderNumber || "-"}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{s.customerName}</td>
                      <td className="px-4 py-3 text-sm">{s.carrier || "-"}</td>
                      <td className="px-4 py-3 text-sm font-mono">{s.trackingNumber || "-"}</td>
                      <td className="px-4 py-3 text-sm">{s.shippingDate ? formatDate(s.shippingDate) : "-"}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(s.shippingCost)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[s.status]}`}>
                          {shipmentStatusLabels[s.status]}
                        </span>
                      </td>
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

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل شحنة" : "شحنة جديدة"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">الطلب</label>
              <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="">-- بدون --</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} - {o.customerName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">العميل *</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="">-- اختر --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">شركة الشحن</label>
              <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">رقم التتبع</label>
              <input value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">تاريخ الشحن</label>
              <input type="date" value={form.shippingDate} onChange={(e) => setForm({ ...form, shippingDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">تاريخ الوصول المتوقع</label>
              <input type="date" value={form.estimatedArrival} onChange={(e) => setForm({ ...form, estimatedArrival: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">تكلفة الشحن</label>
              <input type="number" value={form.shippingCost} onChange={(e) => setForm({ ...form, shippingCost: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">الحالة</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                {Object.entries(shipmentStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">عنوان التوصيل</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
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

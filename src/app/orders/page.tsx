"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate, orderStatusLabels, orderStatusColors } from "@/lib/api";

interface OrderItem {
  description: string;
  quantity: string;
  unitPrice: string;
  cost: string;
  total: string;
  notes: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    customerId: "", orderDate: new Date().toISOString().split("T")[0],
    deliveryDate: "", status: "new", tax: "0", discount: "0",
    description: "", notes: "",
  });
  const [items, setItems] = useState<OrderItem[]>([{ description: "", quantity: "1", unitPrice: "0", cost: "0", total: "0", notes: "" }]);

  const load = () => {
    setLoading(true);
    const url = `/api/orders${statusFilter ? `?status=${statusFilter}` : ""}`;
    Promise.all([fetchApi(url), fetchApi("/api/customers")])
      .then(([o, c]) => { setOrders(o); setCustomers(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ customerId: "", orderDate: new Date().toISOString().split("T")[0], deliveryDate: "", status: "new", tax: "0", discount: "0", description: "", notes: "" });
    setItems([{ description: "", quantity: "1", unitPrice: "0", cost: "0", total: "0", notes: "" }]);
    setModalOpen(true);
  };

  const openEdit = async (o: any) => {
    const data = await fetchApi(`/api/orders/${o.id}`);
    setEditing(data.order);
    setForm({
      customerId: String(data.order.customerId),
      orderDate: data.order.orderDate,
      deliveryDate: data.order.deliveryDate || "",
      status: data.order.status,
      tax: data.order.tax, discount: data.order.discount,
      description: data.order.description || "", notes: data.order.notes || "",
    });
    setItems(data.items.length > 0 ? data.items.map((i: any) => ({
      description: i.description, quantity: i.quantity, unitPrice: i.unitPrice,
      cost: i.cost, total: i.total, notes: i.notes || "",
    })) : [{ description: "", quantity: "1", unitPrice: "0", cost: "0", total: "0", notes: "" }]);
    setModalOpen(true);
  };

  const calcItem = (item: OrderItem) => {
    const q = parseFloat(item.quantity) || 0;
    const p = parseFloat(item.unitPrice) || 0;
    return (q * p).toFixed(2);
  };

  const calcTotals = () => {
    const subtotal = items.reduce((s, i) => s + parseFloat(calcItem(i)), 0);
    const tax = parseFloat(form.tax) || 0;
    const discount = parseFloat(form.discount) || 0;
    const total = subtotal + tax - discount;
    const cost = items.reduce((s, i) => s + (parseFloat(i.cost) || 0) * (parseFloat(i.quantity) || 0), 0);
    const profit = total - cost;
    return { subtotal: subtotal.toFixed(2), total: total.toFixed(2), cost: cost.toFixed(2), profit: profit.toFixed(2) };
  };

  const save = async () => {
    if (!form.customerId) { alert("اختر العميل"); return; }
    if (items.length === 0 || !items[0].description) { alert("أضف بند واحد على الأقل"); return; }
    const totals = calcTotals();
    try {
      const payload = {
        ...form,
        customerId: parseInt(form.customerId),
        ...totals,
        paid: "0", remaining: totals.total,
        items: items.filter(i => i.description).map(i => ({ ...i, total: calcItem(i) })),
      };
      if (editing) {
        await fetchApi(`/api/orders/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchApi(`/api/orders`, { method: "POST", body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await fetchApi(`/api/orders/${id}`, { method: "DELETE" });
    load();
  };

  const changeStatus = async (id: number, status: string) => {
    await fetchApi(`/api/orders/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
  };

  const totals = calcTotals();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="إدارة الطلبات"
          description="من استلام الطلب حتى التسليم"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + طلب جديد
            </button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1 rounded text-sm ${!statusFilter ? "bg-orange-500 text-white" : "bg-slate-100"}`}
          >
            الكل
          </button>
          {Object.entries(orderStatusLabels).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={`px-3 py-1 rounded text-sm ${statusFilter === k ? "bg-orange-500 text-white" : "bg-slate-100 hover:bg-slate-200"}`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">📋</div>
              <p>لا توجد طلبات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">رقم الطلب</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">العميل</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التسليم</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المبلغ</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التكلفة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الربح</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-mono font-bold">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{o.customerName}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(o.orderDate)}</td>
                      <td className="px-4 py-3 text-sm">{o.deliveryDate ? formatDate(o.deliveryDate) : "-"}</td>
                      <td className="px-4 py-3 text-sm font-bold">{formatCurrency(o.total)}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(o.cost)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600">{formatCurrency(o.profit)}</td>
                      <td className="px-4 py-3 text-sm">
                        <select
                          value={o.status}
                          onChange={(e) => changeStatus(o.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border-0 outline-none font-semibold ${orderStatusColors[o.status]}`}
                        >
                          {Object.entries(orderStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm space-x-1">
                        <button onClick={() => setViewing(o)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">عرض</button>
                        <button onClick={() => openEdit(o)} className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded">تعديل</button>
                        <button onClick={() => remove(o.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل طلب" : "طلب جديد"} size="xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">العميل *</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="">-- اختر --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الطلب</label>
              <input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ التسليم</label>
              <input type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                {Object.entries(orderStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ضريبة</label>
              <input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">خصم</label>
              <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">وصف الطلب</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">بنود الطلب</h3>
              <button
                onClick={() => setItems([...items, { description: "", quantity: "1", unitPrice: "0", cost: "0", total: "0", notes: "" }])}
                className="text-xs bg-orange-500 text-white px-3 py-1 rounded"
              >
                + بند
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="px-2 py-1 text-right">الوصف</th>
                    <th className="px-2 py-1 text-right w-20">الكمية</th>
                    <th className="px-2 py-1 text-right w-24">السعر</th>
                    <th className="px-2 py-1 text-right w-20">التكلفة</th>
                    <th className="px-2 py-1 text-right w-20">الإجمالي</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1"><input value={item.description} onChange={(e) => { const newItems = [...items]; newItems[idx].description = e.target.value; setItems(newItems); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                      <td className="py-1"><input type="number" value={item.quantity} onChange={(e) => { const newItems = [...items]; newItems[idx].quantity = e.target.value; setItems(newItems); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                      <td className="py-1"><input type="number" value={item.unitPrice} onChange={(e) => { const newItems = [...items]; newItems[idx].unitPrice = e.target.value; setItems(newItems); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                      <td className="py-1"><input type="number" value={item.cost} onChange={(e) => { const newItems = [...items]; newItems[idx].cost = e.target.value; setItems(newItems); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                      <td className="py-1 font-bold text-center">{formatCurrency(calcItem(item))}</td>
                      <td className="py-1 text-center">
                        <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-xs text-slate-600">المجموع</p>
              <p className="font-bold text-blue-700">{formatCurrency(totals.subtotal)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <p className="text-xs text-slate-600">الإجمالي</p>
              <p className="font-bold text-green-700">{formatCurrency(totals.total)}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <p className="text-xs text-slate-600">التكلفة</p>
              <p className="font-bold text-red-700">{formatCurrency(totals.cost)}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <p className="text-xs text-slate-600">الربح</p>
              <p className="font-bold text-orange-700">{formatCurrency(totals.profit)}</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">إلغاء</button>
            <button onClick={save} className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold">حفظ الطلب</button>
          </div>
        </Modal>

        {viewing && <OrderView order={viewing} onClose={() => setViewing(null)} />}
      </main>
    </div>
  );
}

function OrderView({ order, onClose }: any) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetchApi(`/api/orders/${order.id}`).then(setData); }, [order.id]);

  return (
    <Modal open={true} onClose={onClose} title={`تفاصيل الطلب: ${order.orderNumber}`} size="lg">
      {!data ? <div className="text-center py-8">جاري التحميل...</div> : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div><span className="text-slate-500">العميل:</span> <strong>{data.customer?.name}</strong></div>
            <div><span className="text-slate-500">التاريخ:</span> <strong>{formatDate(data.order.orderDate)}</strong></div>
            <div><span className="text-slate-500">التسليم:</span> <strong>{data.order.deliveryDate ? formatDate(data.order.deliveryDate) : "-"}</strong></div>
            <div><span className="text-slate-500">الحالة:</span> <strong>{orderStatusLabels[data.order.status]}</strong></div>
            {data.order.description && <div className="col-span-2"><span className="text-slate-500">الوصف:</span> {data.order.description}</div>}
          </div>

          <h3 className="font-bold mb-2">البنود</h3>
          <table className="w-full text-sm mb-4">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-1 text-right">الوصف</th>
                <th className="px-2 py-1 text-right">الكمية</th>
                <th className="px-2 py-1 text-right">السعر</th>
                <th className="px-2 py-1 text-right">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i: any, idx: number) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-2 py-2">{i.description}</td>
                  <td className="px-2 py-2">{i.quantity}</td>
                  <td className="px-2 py-2">{formatCurrency(i.unitPrice)}</td>
                  <td className="px-2 py-2 font-bold">{formatCurrency(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 p-3 rounded">
              <p className="text-xs text-slate-500">الإجمالي</p>
              <p className="text-lg font-bold">{formatCurrency(data.order.total)}</p>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <p className="text-xs text-slate-500">التكلفة</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(data.order.cost)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-slate-500">الربح</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(data.order.profit)}</p>
            </div>
          </div>

          {data.workOrders?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">أوامر الشغل المرتبطة</h3>
              <div className="space-y-1">
                {data.workOrders.map((wo: any) => (
                  <div key={wo.id} className="bg-slate-50 p-2 rounded text-sm">
                    <span className="font-mono">{wo.workOrderNumber}</span> - {wo.title}
                    <span className="text-xs text-slate-500 mr-2">({wo.status})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

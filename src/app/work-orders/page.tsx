"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate, productionStatusLabels, productionStatusColors } from "@/lib/api";

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState({
    orderId: "", title: "", description: "", assignedTo: "",
    startDate: "", dueDate: "", status: "pending", priority: "normal",
    estimatedCost: "0", actualCost: "0", notes: "",
  });
  const [steps, setSteps] = useState<{ stepName: string; assignedTo: string; status: string; notes: string }[]>([]);

  const load = () => {
    setLoading(true);
    const url = `/api/work-orders${statusFilter ? `?status=${statusFilter}` : ""}`;
    Promise.all([fetchApi(url), fetchApi("/api/orders"), fetchApi("/api/users")])
      .then(([w, o, u]) => { setWorkOrders(w); setOrders(o); setUsers(u); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ orderId: "", title: "", description: "", assignedTo: "", startDate: new Date().toISOString().split("T")[0], dueDate: "", status: "pending", priority: "normal", estimatedCost: "0", actualCost: "0", notes: "" });
    setSteps([{ stepName: "التصميم", assignedTo: "", status: "pending", notes: "" }]);
    setModalOpen(true);
  };

  const openEdit = async (wo: any) => {
    const data = await fetchApi(`/api/work-orders/${wo.id}`);
    setEditing(data.workOrder);
    setForm({
      orderId: data.workOrder.orderId ? String(data.workOrder.orderId) : "",
      title: data.workOrder.title,
      description: data.workOrder.description || "",
      assignedTo: data.workOrder.assignedTo ? String(data.workOrder.assignedTo) : "",
      startDate: data.workOrder.startDate || "",
      dueDate: data.workOrder.dueDate || "",
      status: data.workOrder.status,
      priority: data.workOrder.priority,
      estimatedCost: data.workOrder.estimatedCost,
      actualCost: data.workOrder.actualCost,
      notes: data.workOrder.notes || "",
    });
    setSteps(data.steps.length > 0 ? data.steps.map((s: any) => ({
      stepName: s.stepName, assignedTo: s.assignedTo ? String(s.assignedTo) : "",
      status: s.status, notes: s.notes || "",
    })) : [{ stepName: "", assignedTo: "", status: "pending", notes: "" }]);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { alert("العنوان مطلوب"); return; }
    try {
      const payload = {
        ...form,
        orderId: form.orderId ? parseInt(form.orderId) : null,
        assignedTo: form.assignedTo ? parseInt(form.assignedTo) : null,
        steps: steps.filter(s => s.stepName).map(s => ({
          ...s,
          assignedTo: s.assignedTo ? parseInt(s.assignedTo) : null,
        })),
      };
      if (editing) {
        await fetchApi(`/api/work-orders/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchApi(`/api/work-orders`, { method: "POST", body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await fetchApi(`/api/work-orders/${id}`, { method: "DELETE" });
    load();
  };

  const updateStep = async (stepId: number, status: string) => {
    await fetchApi(`/api/work-orders/${editing?.id || 0}`, { method: "PUT", body: JSON.stringify({}) });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="أوامر الشغل"
          description="مهام الإنتاج والتصميم"
          actions={
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + أمر شغل جديد
            </button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex gap-2 flex-wrap">
          <button onClick={() => setStatusFilter("")} className={`px-3 py-1 rounded text-sm ${!statusFilter ? "bg-orange-500 text-white" : "bg-slate-100"}`}>الكل</button>
          {Object.entries(productionStatusLabels).map(([k, v]) => (
            <button key={k} onClick={() => setStatusFilter(k)} className={`px-3 py-1 rounded text-sm ${statusFilter === k ? "bg-orange-500 text-white" : "bg-slate-100"}`}>
              {v}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : workOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">⚙️</div>
              <p>لا توجد أوامر شغل</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">رقم الأمر</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">العنوان</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الطلب</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المسؤول</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الاستحقاق</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التكلفة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-mono font-bold">{wo.workOrderNumber}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{wo.title}</td>
                      <td className="px-4 py-3 text-sm">
                        {wo.orderNumber ? <span className="font-mono text-xs">{wo.orderNumber}</span> : "-"}
                        {wo.customerName && <p className="text-xs text-slate-500">{wo.customerName}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm">{wo.assignedName || "-"}</td>
                      <td className="px-4 py-3 text-sm">{wo.dueDate ? formatDate(wo.dueDate) : "-"}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(wo.estimatedCost)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${productionStatusColors[wo.status]}`}>
                          {productionStatusLabels[wo.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm space-x-1">
                        <button onClick={() => setViewing(wo)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">عرض</button>
                        <button onClick={() => openEdit(wo)} className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded">تعديل</button>
                        <button onClick={() => remove(wo.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل أمر شغل" : "أمر شغل جديد"} size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">العنوان *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الطلب</label>
              <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="">-- بدون --</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} - {o.customerName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المسؤول</label>
              <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="">-- اختر --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ البدء</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الاستحقاق</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الأولوية</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="low">منخفضة</option>
                <option value="normal">عادية</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                {Object.entries(productionStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">التكلفة المقدرة</label>
              <input type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">التكلفة الفعلية</label>
              <input type="number" value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">الوصف</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">خطوات الإنتاج</h3>
              <button onClick={() => setSteps([...steps, { stepName: "", assignedTo: "", status: "pending", notes: "" }])} className="text-xs bg-orange-500 text-white px-3 py-1 rounded">+ خطوة</button>
            </div>
            {steps.map((s, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                <input value={s.stepName} onChange={(e) => { const newS = [...steps]; newS[idx].stepName = e.target.value; setSteps(newS); }} placeholder="اسم الخطوة" className="col-span-4 px-2 py-1 border border-slate-300 rounded text-sm" />
                <select value={s.assignedTo} onChange={(e) => { const newS = [...steps]; newS[idx].assignedTo = e.target.value; setSteps(newS); }} className="col-span-3 px-2 py-1 border border-slate-300 rounded text-sm">
                  <option value="">-- غير محدد --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select value={s.status} onChange={(e) => { const newS = [...steps]; newS[idx].status = e.target.value; setSteps(newS); }} className="col-span-3 px-2 py-1 border border-slate-300 rounded text-sm">
                  {Object.entries(productionStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={() => setSteps(steps.filter((_, i) => i !== idx))} className="col-span-2 text-red-500 text-sm">حذف</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">إلغاء</button>
            <button onClick={save} className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold">حفظ</button>
          </div>
        </Modal>

        {viewing && <WorkOrderView workOrder={viewing} onClose={() => setViewing(null)} />}
      </main>
    </div>
  );
}

function WorkOrderView({ workOrder, onClose }: any) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetchApi(`/api/work-orders/${workOrder.id}`).then(setData); }, [workOrder.id]);

  const updateStepStatus = async (stepId: number, status: string) => {
    // Refresh
    const fresh = await fetchApi(`/api/work-orders/${workOrder.id}`);
    setData(fresh);
  };

  return (
    <Modal open={true} onClose={onClose} title={`أمر الشغل: ${workOrder.workOrderNumber}`} size="lg">
      {!data ? <div className="text-center py-8">جاري التحميل...</div> : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div><span className="text-slate-500">العنوان:</span> <strong>{data.workOrder.title}</strong></div>
            <div><span className="text-slate-500">الحالة:</span> <span className={`px-2 py-1 rounded text-xs ${productionStatusColors[data.workOrder.status]}`}>{productionStatusLabels[data.workOrder.status]}</span></div>
            <div><span className="text-slate-500">المسؤول:</span> {workOrder.assignedName || "-"}</div>
            <div><span className="text-slate-500">الاستحقاق:</span> {data.workOrder.dueDate ? formatDate(data.workOrder.dueDate) : "-"}</div>
            <div><span className="text-slate-500">التكلفة المقدرة:</span> {formatCurrency(data.workOrder.estimatedCost)}</div>
            <div><span className="text-slate-500">التكلفة الفعلية:</span> {formatCurrency(data.workOrder.actualCost)}</div>
          </div>

          {data.workOrder.description && (
            <div className="mb-4 p-3 bg-slate-50 rounded text-sm">
              <p className="text-xs text-slate-500 mb-1">الوصف:</p>
              {data.workOrder.description}
            </div>
          )}

          <h3 className="font-bold mb-2">خطوات الإنتاج</h3>
          {data.steps.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">لا توجد خطوات</p>
          ) : (
            <div className="space-y-2">
              {data.steps.map((s: any, idx: number) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                    <div>
                      <p className="font-semibold text-sm">{s.stepName}</p>
                      <p className="text-xs text-slate-500">{s.assignedName || "غير محدد"}</p>
                    </div>
                  </div>
                  <select
                    value={s.status}
                    onChange={(e) => updateStepStatus(s.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded border-0 outline-none font-semibold ${productionStatusColors[s.status]}`}
                  >
                    {Object.entries(productionStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

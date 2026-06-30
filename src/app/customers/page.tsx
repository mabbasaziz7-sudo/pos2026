"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate, cleanStylesForHtml2Canvas } from "@/lib/api";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    taxNumber: "",
    openingBalance: "0",
    notes: "",
  });

  const load = () => {
    setLoading(true);
    fetchApi(`/api/customers?search=${encodeURIComponent(search)}`)
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", address: "", city: "", taxNumber: "", openingBalance: "0", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      city: c.city || "",
      taxNumber: c.taxNumber || "",
      openingBalance: c.openingBalance || "0",
      notes: c.notes || "",
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
        await fetchApi(`/api/customers/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await fetchApi(`/api/customers`, { method: "POST", body: JSON.stringify(form) });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await fetchApi(`/api/customers/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="إدارة العملاء"
          description="قاعدة بيانات العملاء وكشوف الحسابات"
          actions={
            <button
              onClick={openAdd}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md"
            >
              + عميل جديد
            </button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <input
            type="text"
            placeholder="ابحث بالاسم، الهاتف، أو الإيميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">👥</div>
              <p>لا يوجد عملاء. أضف عميلك الأول.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الاسم</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الهاتف</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المدينة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الرقم الضريبي</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">رصيد افتتاحي</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-sm">{c.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm">{c.city || "-"}</td>
                      <td className="px-4 py-3 text-sm font-mono">{c.taxNumber || "-"}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(c.openingBalance)}</td>
                      <td className="px-4 py-3 text-sm space-x-1">
                        <button
                          onClick={() => setViewing(c)}
                          className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                        >
                          كشف
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          className="text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل عميل" : "عميل جديد"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الاسم *" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
            <Field label="الهاتف" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} />
            <Field label="البريد الإلكتروني" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} />
            <Field label="المدينة" value={form.city} onChange={(v: string) => setForm({ ...form, city: v })} />
            <Field label="الرقم الضريبي" value={form.taxNumber} onChange={(v: string) => setForm({ ...form, taxNumber: v })} />
            <Field label="رصيد افتتاحي" type="number" value={form.openingBalance} onChange={(v: string) => setForm({ ...form, openingBalance: v })} />
            <div className="md:col-span-2">
              <Field label="العنوان" value={form.address} onChange={(v: string) => setForm({ ...form, address: v })} />
            </div>
            <div className="md:col-span-2">
              <Field label="ملاحظات" textarea value={form.notes} onChange={(v: string) => setForm({ ...form, notes: v })} />
            </div>
          </div>
          <div className="flex gap-2 mt-6 justify-end">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">إلغاء</button>
            <button onClick={save} className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600">حفظ</button>
          </div>
        </Modal>

        {viewing && <CustomerStatement customer={viewing} onClose={() => setViewing(null)} />}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea }: any) {
  const handle = (v: string) => onChange(v);
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => handle(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => handle(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
        />
      )}
    </div>
  );
}

function CustomerStatement({ customer, onClose }: any) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchApi(`/api/customers/${customer.id}`).then(setData);
  }, [customer.id]);

  const downloadPDF = async () => {
    const element = document.getElementById("statement-print-area");
    if (!element) return;

    // Temporarily clean styles for html2canvas
    const restoreStyles = await cleanStylesForHtml2Canvas();

    try {
      const html2pdf = (await import("html2pdf.js" as any)).default;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `statement-${customer.name}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };
      await html2pdf().from(element).set(opt).save();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تحميل ملف PDF");
    } finally {
      restoreStyles();
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={`كشف حساب: ${customer.name}`} size="xl">
      {!data ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : (
        <div className="p-2 md:p-4 text-slate-800">
          <div id="statement-print-area" className="bg-white p-2">
            {/* Branded Letterhead */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-orange-500 pb-5 mb-6 gap-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-slate-100 shadow-sm" />
                <div>
                  <h1 className="text-3xl font-black text-orange-600">سمارت أوفيس</h1>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">نظام إدارة وتجهيز المطابع</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">الرقم الضريبي: ٣١٠٢٤٨٥٧٦١٠٠٠٠٣</p>
                </div>
              </div>
              <div className="md:text-left text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-800">تقرير: كشف حساب عميل تفصيلي</p>
                <p>تاريخ إصدار التقرير: {formatDate(new Date())}</p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold text-slate-700">
                  العميل: {customer.name}
                </div>
              </div>
            </div>

            {/* Customer Metadata & Balances */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl">
                <p className="text-xs text-slate-500">اسم العميل</p>
                <p className="text-base font-bold text-slate-900 mt-1">{customer.name}</p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{customer.phone || "بدون هاتف"}</p>
              </div>
              <div className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl">
                <p className="text-xs text-slate-500">إجمالي الفواتير الصادرة</p>
                <p className="text-base font-bold text-blue-700 mt-1">{data.invoices.length} فاتورة</p>
                <p className="text-xs text-slate-400 mt-1">الرصيد الافتتاحي: {formatCurrency(customer.openingBalance)}</p>
              </div>
              <div className="border border-slate-200 bg-orange-50 p-4 rounded-xl">
                <p className="text-xs text-orange-800 font-semibold">الرصيد الحالي المتبقي مستحق الدفع</p>
                <p className="text-2xl font-black text-orange-600 mt-1 font-mono">{formatCurrency(data.balance)}</p>
                <p className="text-xs text-orange-700/80 mt-1 font-semibold">تاريخ الاستحقاق: فوراً</p>
              </div>
            </div>

            {/* Invoices List Section */}
            <div className="mb-6">
              <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">سجل فواتير المبيعات</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-right text-slate-700">رقم الفاتورة</th>
                      <th className="px-3 py-2 text-right text-slate-700">تاريخ الإصدار</th>
                      <th className="px-3 py-2 text-right text-slate-700 w-24">النوع</th>
                      <th className="px-3 py-2 text-left text-slate-700">الإجمالي النهائي</th>
                      <th className="px-3 py-2 text-left text-slate-700 text-green-700">المدفوع</th>
                      <th className="px-3 py-2 text-left text-slate-700 text-red-700">المتبقي مستحق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-slate-400">لا توجد فواتير مسجلة لهذا العميل.</td></tr>
                    ) : (
                      data.invoices.map((inv: any) => (
                        <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="px-3 py-2.5">{formatDate(inv.invoiceDate)}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              inv.type === "sale" ? "bg-blue-100 text-blue-700" :
                              inv.type === "purchase" ? "bg-purple-100 text-purple-700" :
                              "bg-gray-100 text-slate-700"
                            }`}>
                              {inv.type === "sale" ? "بيع" : "شراء"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-left font-mono font-semibold">{formatCurrency(inv.total)}</td>
                          <td className="px-3 py-2.5 text-left font-mono text-green-700 font-semibold">{formatCurrency(inv.paid)}</td>
                          <td className="px-3 py-2.5 text-left font-mono text-red-700 font-bold">{formatCurrency(inv.remaining)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments List Section */}
            <div className="mb-8">
              <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">سجل عمليات السداد والمدفوعات المستلمة</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-right text-slate-700">تاريخ السداد</th>
                      <th className="px-3 py-2 text-right text-slate-700">وسيلة الدفع</th>
                      <th className="px-3 py-2 text-right text-slate-700">رقم المرجع / الإيصال</th>
                      <th className="px-3 py-2 text-right text-slate-700">ملاحظات</th>
                      <th className="px-3 py-2 text-left text-slate-700 text-green-700">المبلغ المستلم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-slate-400">لا توجد مدفوعات مسجلة حالياً.</td></tr>
                    ) : (
                      data.payments.map((p: any) => (
                        <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-mono">{formatDate(p.paymentDate)}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-700">{p.paymentMethod}</td>
                          <td className="px-3 py-2.5 font-mono">{p.reference || "-"}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{p.notes || "-"}</td>
                          <td className="px-3 py-2.5 text-left font-mono text-green-700 font-bold">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Professional Signatures */}
            <div className="mt-12 grid grid-cols-2 gap-12 text-center text-xs pt-8 border-t border-slate-200">
              <div>
                <p className="font-bold text-slate-700">إدارة المطبعة والاعتماد</p>
                <div className="mt-12 border-b border-dashed border-slate-350 w-2/3 mx-auto"></div>
                <p className="text-slate-400 mt-2">الختم والتوقيع الرسمي</p>
              </div>
              <div>
                <p className="font-bold text-slate-700">المصادقة وتوقيع العميل</p>
                <div className="mt-12 border-b border-dashed border-slate-350 w-2/3 mx-auto"></div>
                <p className="text-slate-400 mt-2">توقيع ومصادقة صاحب الحساب</p>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end mt-8 no-print gap-2">
            <button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-md transition">
              💾 تحميل PDF
            </button>
            <button onClick={() => window.print()} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-md transition">
              🖨️ طباعة كشف الحساب
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

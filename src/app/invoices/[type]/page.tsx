"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatCurrency, formatDate, paymentMethodLabels, cleanStylesForHtml2Canvas } from "@/lib/api";

interface InvoiceItem {
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

export default function InvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const type = (params.type as string) || "sale"; // sale or purchase

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState({
    customerId: "", supplierId: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "", tax: "0", discount: "0",
    paymentMethod: "cash", notes: "", status: "pending",
  });
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: "1", unitPrice: "0", total: "0" }]);
  const [paymentForm, setPaymentForm] = useState({ amount: "0", paymentMethod: "cash", reference: "", notes: "" });

  const isPurchase = type === "purchase";
  const apiType = isPurchase ? "purchase" : "sale";

  const load = () => {
    setLoading(true);
    Promise.all([fetchApi(`/api/invoices?type=${apiType}`), fetchApi("/api/customers"), fetchApi("/api/suppliers")])
      .then(([inv, cus, sup]) => { setInvoices(inv); setCustomers(cus); setSuppliers(sup); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [type]);

  const calcItem = (item: InvoiceItem) => ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2);
  const calcTotals = () => {
    const subtotal = items.reduce((s, i) => s + parseFloat(calcItem(i)), 0);
    const tax = parseFloat(form.tax) || 0;
    const discount = parseFloat(form.discount) || 0;
    return { subtotal: subtotal.toFixed(2), total: (subtotal + tax - discount).toFixed(2) };
  };

  const openAdd = () => {
    setForm({ customerId: "", supplierId: "", invoiceDate: new Date().toISOString().split("T")[0], dueDate: "", tax: "0", discount: "0", paymentMethod: "cash", notes: "", status: "pending" });
    setItems([{ description: "", quantity: "1", unitPrice: "0", total: "0" }]);
    setModalOpen(true);
  };

  const save = async () => {
    if (items.length === 0 || !items[0].description) { alert("أضف بند واحد على الأقل"); return; }
    if (!isPurchase && !form.customerId) { alert("اختر العميل"); return; }
    if (isPurchase && !form.supplierId) { alert("اختر المورد"); return; }
    try {
      const totals = calcTotals();
      const payload = {
        ...form,
        type: apiType,
        customerId: form.customerId ? parseInt(form.customerId) : null,
        supplierId: form.supplierId ? parseInt(form.supplierId) : null,
        ...totals,
        paid: form.paymentMethod === "cash" ? totals.total : "0",
        remaining: form.paymentMethod === "cash" ? "0" : totals.total,
        status: form.paymentMethod === "cash" ? "paid" : "pending",
        items: items.filter(i => i.description).map(i => ({ ...i, total: calcItem(i) })),
      };
      await fetchApi(`/api/invoices`, { method: "POST", body: JSON.stringify(payload) });
      setModalOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await fetchApi(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  };

  const recordPayment = async () => {
    if (!paymentModal || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      alert("أدخل المبلغ");
      return;
    }
    try {
      await fetchApi("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: paymentModal.id,
          customerId: paymentModal.customerId,
          supplierId: paymentModal.supplierId,
          amount: paymentForm.amount,
          paymentDate: new Date().toISOString().split("T")[0],
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference,
          notes: paymentForm.notes,
        }),
      });
      setPaymentModal(null);
      setPaymentForm({ amount: "0", paymentMethod: "cash", reference: "", notes: "" });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const totals = calcTotals();
  const totalAmount = invoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + parseFloat(i.paid || 0), 0);
  const totalRemaining = invoices.reduce((s, i) => s + parseFloat(i.remaining || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title={isPurchase ? "فواتير المشتريات" : "فواتير المبيعات"}
          description={isPurchase ? "فواتير الشراء من الموردين" : "فواتير البيع للعملاء"}
          actions={
            <>
              <button onClick={() => router.push(isPurchase ? "/invoices/sales" : "/invoices/purchases")} className="bg-slate-200 px-4 py-2 rounded-lg text-sm">
                {isPurchase ? "عرض المبيعات" : "عرض المشتريات"}
              </button>
              <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
                + {isPurchase ? "فاتورة شراء" : "فاتورة بيع"}
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">إجمالي {isPurchase ? "المشتريات" : "المبيعات"}</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">المدفوع</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">المتبقي</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRemaining)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">{isPurchase ? "🛒" : "🧾"}</div>
              <p>لا توجد فواتير</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">رقم الفاتورة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">{isPurchase ? "المورد" : "العميل"}</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الإجمالي</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المدفوع</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المتبقي</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-mono font-bold">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{isPurchase ? inv.supplierName : inv.customerName}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-3 text-sm font-bold">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(inv.paid)}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(inv.remaining)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          inv.status === "paid" ? "bg-green-100 text-green-700" :
                          inv.status === "partial" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {inv.status === "paid" ? "مدفوعة" : inv.status === "partial" ? "جزئي" : "معلقة"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm space-x-1">
                        <button onClick={() => setViewing(inv)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">عرض</button>
                        {!isPurchase && parseFloat(inv.remaining) > 0 && (
                          <button onClick={() => { setPaymentModal(inv); setPaymentForm({ ...paymentForm, amount: inv.remaining }); }} className="text-green-600 hover:bg-green-50 px-2 py-1 rounded">دفع</button>
                        )}
                        <button onClick={() => remove(inv.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isPurchase ? "فاتورة شراء جديدة" : "فاتورة بيع جديدة"} size="xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{isPurchase ? "المورد *" : "العميل *"}</label>
              <select
                value={isPurchase ? form.supplierId : form.customerId}
                onChange={(e) => setForm({ ...form, [isPurchase ? "supplierId" : "customerId"]: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm"
              >
                <option value="">-- اختر --</option>
                {(isPurchase ? suppliers : customers).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">التاريخ</label>
              <input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الاستحقاق</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">طريقة الدفع</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات</label>
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

        {viewing && <InvoiceView invoice={viewing} onClose={() => setViewing(null)} />}

        {paymentModal && (
          <Modal open={true} onClose={() => setPaymentModal(null)} title="تسجيل دفعة">
            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded text-sm">
                <p>الفاتورة: <strong>{paymentModal.invoiceNumber}</strong></p>
                <p>المتبقي: <strong className="text-red-600">{formatCurrency(paymentModal.remaining)}</strong></p>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">المبلغ *</label>
                <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">طريقة الدفع</label>
                <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none">
                  {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">مرجع</label>
                <input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">ملاحظات</label>
                <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setPaymentModal(null)} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">إلغاء</button>
              <button onClick={recordPayment} className="px-6 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold">تسجيل الدفعة</button>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

function InvoiceView({ invoice, onClose }: any) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetchApi(`/api/invoices/${invoice.id}`).then(setData); }, [invoice.id]);

  const isSale = invoice.type === "sale";

  const downloadPDF = async () => {
    const element = document.getElementById("invoice-print-area");
    if (!element) return;
    
    // Temporarily clean styles for html2canvas
    const restoreStyles = await cleanStylesForHtml2Canvas();

    try {
      const html2pdf = (await import("html2pdf.js" as any)).default;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `invoice-${data.invoice.invoiceNumber}.pdf`,
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
    <Modal open={true} onClose={onClose} title={`فاتورة ${invoice.invoiceNumber}`} size="lg">
      {!data ? <div className="text-center py-8">جاري التحميل...</div> : (
        <div className="p-2 md:p-4 text-slate-800">
          <div id="invoice-print-area" className="bg-white p-2">
            {/* Branded Letterhead Header */}
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
                <p className="font-semibold text-slate-800">المقر الرئيسي: طريق الملك فهد، الرياض</p>
                <p>هاتف: ٠٥٠١٢٣٤٥٦٧ | بريد: info@smartprint.com</p>
                <div className="mt-2 inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded font-bold text-xs">
                  {isSale ? "فاتورة مبيعات ضريبية مبسطة" : "فاتورة مشتريات ضريبية"}
                </div>
              </div>
            </div>

            {/* Invoice Summary Row & Status Badge */}
            <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div>
                <p className="text-xs text-slate-500">رقم الوثيقة</p>
                <p className="text-lg font-bold font-mono text-slate-900">{data.invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">حالة الدفع</p>
                {data.invoice.status === "paid" ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                    مدفوعة بالكامل
                  </span>
                ) : data.invoice.status === "partial" ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                    مدفوعة جزئياً
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                    معلقة (غير مدفوعة)
                  </span>
                )}
              </div>
            </div>

            {/* Customer / Supplier Info Card & Invoice Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
              <div className="border border-slate-200 p-4 rounded-xl">
                <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                  {isSale ? "بيانات العميل" : "بيانات المورد"}
                </h3>
                <div className="space-y-2">
                  <div className="flex"><span className="text-slate-500 w-24 shrink-0">الاسم:</span> <strong className="text-slate-900">{isSale ? data.customer?.name : data.supplier?.name}</strong></div>
                  <div className="flex"><span className="text-slate-500 w-24 shrink-0">الهاتف:</span> <span className="font-mono">{isSale ? data.customer?.phone || "-" : data.supplier?.phone || "-"}</span></div>
                  {isSale && data.customer?.taxNumber && (
                    <div className="flex"><span className="text-slate-500 w-24 shrink-0">الرقم الضريبي:</span> <span className="font-mono">{data.customer.taxNumber}</span></div>
                  )}
                  <div className="flex"><span className="text-slate-500 w-24 shrink-0">العنوان:</span> <span>{isSale ? data.customer?.address || "-" : data.supplier?.address || "-"}</span></div>
                </div>
              </div>

              <div className="border border-slate-200 p-4 rounded-xl">
                <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">تفاصيل الفاتورة</h3>
                <div className="space-y-2">
                  <div className="flex"><span className="text-slate-500 w-24 shrink-0">تاريخ الإصدار:</span> <strong>{formatDate(data.invoice.invoiceDate)}</strong></div>
                  <div className="flex"><span className="text-slate-500 w-24 shrink-0">تاريخ الاستحقاق:</span> <span>{data.invoice.dueDate ? formatDate(data.invoice.dueDate) : "-"}</span></div>
                  <div className="flex"><span className="text-slate-500 w-24 shrink-0">طريقة الدفع:</span> <span className="font-semibold text-orange-700">{paymentMethodLabels[data.invoice.paymentMethod] || data.invoice.paymentMethod}</span></div>
                </div>
              </div>
            </div>

            {/* Invoice Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-right w-12 text-slate-700">#</th>
                    <th className="px-4 py-2.5 text-right text-slate-700">الوصف والبيان</th>
                    <th className="px-4 py-2.5 text-center w-24 text-slate-700">الكمية</th>
                    <th className="px-4 py-2.5 text-left w-32 text-slate-700">سعر الوحدة</th>
                    <th className="px-4 py-2.5 text-left w-36 text-slate-700">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any, idx: number) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-500 font-mono text-center">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.description}</td>
                      <td className="px-4 py-3 text-center font-mono">{parseFloat(item.quantity)}</td>
                      <td className="px-4 py-3 text-left font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Totals Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-8">
              <div className="text-xs text-slate-500 p-4 border border-slate-150 rounded-xl bg-slate-50/30">
                <p className="font-bold text-slate-700 mb-2">شروط وأحكام:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>البضاعة المباعة لا ترد ولا تستبدل بعد مرور ٣ أيام من الاستلام.</li>
                  <li>يرجى مراجعة المواصفات والكميات قبل مغادرة مركز التسليم.</li>
                  <li>المطبعة غير مسؤولة عن الملفات بعد مرور ٣٠ يوماً على تسليم الطلب.</li>
                </ul>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-sm bg-slate-50/50">
                <div className="flex justify-between text-slate-600"><span>المجموع الفرعي (غير شامل الضريبة):</span> <span className="font-mono font-semibold">{formatCurrency(data.invoice.subtotal)}</span></div>
                {parseFloat(data.invoice.tax) > 0 && (
                  <div className="flex justify-between text-slate-600"><span>الضريبة المضافة:</span> <span className="font-mono">{formatCurrency(data.invoice.tax)}</span></div>
                )}
                {parseFloat(data.invoice.discount) > 0 && (
                  <div className="flex justify-between text-red-600"><span>الخصم الممنوح:</span> <span className="font-mono">- {formatCurrency(data.invoice.discount)}</span></div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 text-slate-900">
                  <span>الإجمالي النهائي (شامل الضريبة):</span>
                  <span className="font-mono text-orange-600 text-lg">{formatCurrency(data.invoice.total)}</span>
                </div>
                <div className="flex justify-between text-green-700 font-semibold border-t border-slate-100 pt-2">
                  <span>المبلغ المدفوع:</span>
                  <span className="font-mono">{formatCurrency(data.invoice.paid)}</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold">
                  <span>المبلغ المتبقي:</span>
                  <span className="font-mono">{formatCurrency(data.invoice.remaining)}</span>
                </div>
              </div>
            </div>

            {/* Notes area */}
            {data.invoice.notes && (
              <div className="mb-8 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                <p className="text-xs font-bold text-slate-500 mb-1">ملاحظات العميل / الطلب:</p>
                <p className="text-slate-700">{data.invoice.notes}</p>
              </div>
            )}

            {/* Professional Signatures Blocks */}
            <div className="mt-12 grid grid-cols-3 gap-8 text-center text-xs pt-8 border-t border-slate-200">
              <div>
                <p className="font-bold text-slate-700">المحاسب المختص</p>
                <div className="mt-10 border-b border-dashed border-slate-350 w-3/4 mx-auto"></div>
                <p className="text-slate-400 mt-2">الاسم والتوقيع</p>
              </div>
              <div>
                <p className="font-bold text-slate-700">الاعتماد والختم</p>
                <div className="mt-10 border-b border-dashed border-slate-350 w-3/4 mx-auto"></div>
                <p className="text-slate-400 mt-2">المدير المسؤول</p>
              </div>
              <div>
                <p className="font-bold text-slate-700">توقيع المستلم (العميل)</p>
                <div className="mt-10 border-b border-dashed border-slate-350 w-3/4 mx-auto"></div>
                <p className="text-slate-400 mt-2">الاسم والتوقيع</p>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end mt-8 no-print gap-2">
            <button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-md transition">
              💾 تحميل PDF
            </button>
            <button onClick={() => window.print()} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-md transition">
              🖨️ طباعة الفاتورة
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

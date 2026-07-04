'use client';

import { useState, useEffect, useCallback } from 'react';
import { db, type FinancialVoucher, type SalaryPayment, type Employee, type Customer, type Supplier } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { printFinancialVoucher, printSalarySlip } from '@/lib/print-financials';
import {
  FileText, Plus, X, Printer, Search, Check, Wallet, TrendingUp, TrendingDown,
  Users2, ChevronDown, ChevronUp, RefreshCw, DollarSign, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── helpers ─── */
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function voucherPrefix(type: FinancialVoucher['type']) {
  return type === 'receipt' ? 'QBD' : type === 'payment' ? 'SRF' : 'TSL';
}
function genVoucherNum(type: FinancialVoucher['type']) {
  const y = new Date().getFullYear();
  const n = String(Date.now()).slice(-4);
  return `${voucherPrefix(type)}-${y}-${n}`;
}
function genSalaryNum(month: number, year: number) {
  return `SAL-${year}-${String(month).padStart(2,'0')}-${String(Date.now()).slice(-3)}`;
}

const TYPE_LABELS: Record<string, string> = {
  receipt: 'سند قبض', payment: 'سند صرف', collection: 'سند تحصيل',
};
const TYPE_COLORS: Record<string, string> = {
  receipt: 'text-emerald-600 bg-emerald-50', payment: 'text-rose-600 bg-rose-50', collection: 'text-blue-600 bg-blue-50',
};
const PARTY_LABELS: Record<string, string> = {
  customer: 'عميل', supplier: 'مورد', employee: 'موظف', other: 'أخرى',
};
const METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي', transfer: 'تحويل بنكي', check: 'شيك',
};

/* ═══════════════════════════════════════════════════════════════════
   SUB-TAB 1 — سندات القبض والصرف
═══════════════════════════════════════════════════════════════════ */
function VouchersPanel() {
  const { settings, currentUser } = useAppStore();
  const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | FinancialVoucher['type']>('all');
  const [showModal, setShowModal] = useState(false);

  const emptyForm = {
    voucherNumber: '', type: 'receipt' as FinancialVoucher['type'],
    date: new Date().toISOString().split('T')[0],
    amount: '', partyName: '', partyType: 'customer' as FinancialVoucher['partyType'],
    partyId: '', description: '', paymentMethod: 'cash' as FinancialVoucher['paymentMethod'],
    checkNumber: '', bankName: '', notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const [vs, cs, ss, es] = await Promise.all([
      db.financialVouchers.orderBy('createdAt').reverse().toArray(),
      db.customers.toArray(),
      db.suppliers.toArray(),
      db.employees.toArray(),
    ]);
    setVouchers(vs);
    setCustomers(cs);
    setSuppliers(ss);
    setEmployees(es);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = () => {
    setForm({ ...emptyForm, voucherNumber: genVoucherNum('receipt') });
    setShowModal(true);
  };

  const f = (k: string, v: string) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'type') next.voucherNumber = genVoucherNum(v as FinancialVoucher['type']);
      if (k === 'partyType') { next.partyId = ''; next.partyName = ''; }
      return next;
    });
  };

  const partyOptions = () => {
    if (form.partyType === 'customer') return customers.map(c => ({ id: c.id!, name: c.name }));
    if (form.partyType === 'supplier') return suppliers.map(s => ({ id: s.id!, name: s.name }));
    if (form.partyType === 'employee') return employees.map(e => ({ id: e.id!, name: e.name }));
    return [];
  };

  const save = async () => {
    if (!form.partyName.trim()) { toast.error('أدخل اسم الطرف'); return; }
    if (!form.description.trim()) { toast.error('أدخل البيان'); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('أدخل المبلغ'); return; }

    await db.financialVouchers.add({
      voucherNumber: form.voucherNumber,
      type: form.type,
      date: new Date(form.date),
      amount,
      partyName: form.partyName,
      partyType: form.partyType,
      partyId: form.partyId ? parseInt(form.partyId) : undefined,
      description: form.description,
      paymentMethod: form.paymentMethod,
      checkNumber: form.checkNumber || undefined,
      bankName: form.bankName || undefined,
      notes: form.notes || undefined,
      userId: currentUser?.id ?? 0,
      userName: currentUser?.username ?? '',
      createdAt: new Date(),
    });
    toast.success('تم حفظ السند');
    setShowModal(false);
    load();
  };

  const filtered = vouchers.filter(v =>
    (filterType === 'all' || v.type === filterType) &&
    (v.partyName.includes(search) || v.voucherNumber.includes(search) || v.description.includes(search))
  );

  const totalReceipt = vouchers.filter(v => v.type === 'receipt' || v.type === 'collection').reduce((s, v) => s + v.amount, 0);
  const totalPayment = vouchers.filter(v => v.type === 'payment').reduce((s, v) => s + v.amount, 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 mb-1">إجمالي القبض والتحصيل</p>
          <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalReceipt)}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-xs text-rose-600 mb-1">إجمالي الصرف</p>
          <p className="text-xl font-bold text-rose-700">{formatCurrency(totalPayment)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 mb-1">الصافي</p>
          <p className={`text-xl font-bold ${totalReceipt - totalPayment >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
            {formatCurrency(totalReceipt - totalPayment)}
          </p>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['all','receipt','payment','collection'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterType === t ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 hover:bg-slate-50'}`}>
              {t === 'all' ? 'الكل' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
              className="pr-8 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <button onClick={openModal} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> سند جديد
          </button>
        </div>
      </div>

      {/* table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['رقم السند','النوع','التاريخ','الطرف','البيان','المبلغ','الدفع','إجراءات'].map(h => (
                <th key={h} className="px-4 py-3 text-right font-medium text-slate-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.voucherNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[v.type]}`}>{TYPE_LABELS[v.type]}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(v.date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{v.partyName}</div>
                    <div className="text-xs text-slate-400">{PARTY_LABELS[v.partyType]}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{v.description}</td>
                  <td className={`px-4 py-3 font-bold ${v.type === 'payment' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(v.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{METHOD_LABELS[v.paymentMethod]}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => printFinancialVoucher(v, settings)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="طباعة">
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">لا توجد سندات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">إضافة سند مالي</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              {/* type */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">نوع السند</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['receipt','payment','collection'] as const).map(t => (
                    <button key={t} onClick={() => f('type', t)}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${form.type === t ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              {/* number + date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">رقم السند</label>
                  <input value={form.voucherNumber} onChange={e => f('voucherNumber', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">التاريخ</label>
                  <input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              {/* party type */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">نوع الطرف</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['customer','supplier','employee','other'] as const).map(pt => (
                    <button key={pt} onClick={() => f('partyType', pt)}
                      className={`py-2 rounded-lg border text-xs font-medium transition-colors ${form.partyType === pt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                      {PARTY_LABELS[pt]}
                    </button>
                  ))}
                </div>
              </div>
              {/* party select or input */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">اسم الطرف *</label>
                {form.partyType !== 'other' ? (
                  <select value={form.partyId} onChange={e => {
                    const opts = partyOptions();
                    const chosen = opts.find(o => o.id === parseInt(e.target.value));
                    setForm(prev => ({ ...prev, partyId: e.target.value, partyName: chosen?.name ?? '' }));
                  }} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">-- اختر --</option>
                    {partyOptions().map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                ) : (
                  <input value={form.partyName} onChange={e => f('partyName', e.target.value)} placeholder="أدخل الاسم"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                )}
              </div>
              {/* description + amount */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">البيان *</label>
                <input value={form.description} onChange={e => f('description', e.target.value)} placeholder="وصف العملية"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">المبلغ *</label>
                <input type="number" value={form.amount} onChange={e => f('amount', e.target.value)} min="0" step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-bold" />
              </div>
              {/* payment method */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">طريقة الدفع</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash','transfer','check'] as const).map(m => (
                    <button key={m} onClick={() => f('paymentMethod', m)}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${form.paymentMethod === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                      {METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
              {form.paymentMethod === 'check' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">رقم الشيك</label>
                    <input value={form.checkNumber} onChange={e => f('checkNumber', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">البنك</label>
                    <input value={form.bankName} onChange={e => f('bankName', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
              )}
              {/* notes */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={save} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> حفظ السند
                </button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-TAB 2 — نظام الرواتب
═══════════════════════════════════════════════════════════════════ */
function PayrollPanel() {
  const { settings, currentUser } = useAppStore();
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const emptyForm = {
    employeeId: '', month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    allowances: '0', deductions: '0',
    paymentMethod: 'cash' as 'cash' | 'transfer', notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const selectedEmp = employees.find(e => e.id === parseInt(form.employeeId));

  const load = useCallback(async () => {
    const [ps, es] = await Promise.all([
      db.salaryPayments.orderBy('createdAt').reverse().toArray(),
      db.employees.filter(e => e.isActive).toArray(),
    ]);
    setPayments(ps);
    setEmployees(es);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = payments.filter(p => p.month === filterMonth && p.year === filterYear);

  const totalNet = filtered.reduce((s, p) => s + p.netSalary, 0);
  const paidCount = filtered.filter(p => p.status === 'paid').length;

  const openModal = () => { setForm(emptyForm); setShowModal(true); };

  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const basicSalary = selectedEmp?.salary ?? 0;
  const allowances = parseFloat(form.allowances) || 0;
  const deductions = parseFloat(form.deductions) || 0;
  const net = basicSalary + allowances - deductions;

  const save = async () => {
    if (!form.employeeId) { toast.error('اختر موظفاً'); return; }
    const month = parseInt(form.month);
    const year = parseInt(form.year);
    const exists = payments.find(p => p.employeeId === parseInt(form.employeeId) && p.month === month && p.year === year);
    if (exists) { toast.error('يوجد راتب مسجّل لهذا الموظف في هذا الشهر'); return; }
    const emp = selectedEmp!;

    await db.salaryPayments.add({
      voucherNumber: genSalaryNum(month, year),
      employeeId: emp.id!,
      employeeName: emp.name,
      employeePosition: emp.position,
      month,
      year,
      basicSalary: emp.salary,
      allowances,
      deductions,
      netSalary: net,
      status: 'pending',
      paymentMethod: form.paymentMethod,
      notes: form.notes || undefined,
      userId: currentUser?.id ?? 0,
      userName: currentUser?.username ?? '',
      createdAt: new Date(),
    });
    toast.success('تم إضافة الراتب');
    setShowModal(false);
    load();
  };

  const generateAll = async () => {
    const month = filterMonth;
    const year = filterYear;
    let added = 0;
    for (const emp of employees) {
      const exists = payments.find(p => p.employeeId === emp.id! && p.month === month && p.year === year);
      if (!exists) {
        await db.salaryPayments.add({
          voucherNumber: genSalaryNum(month, year),
          employeeId: emp.id!, employeeName: emp.name, employeePosition: emp.position,
          month, year, basicSalary: emp.salary, allowances: 0, deductions: 0, netSalary: emp.salary,
          status: 'pending', paymentMethod: 'cash',
          userId: currentUser?.id ?? 0, userName: currentUser?.username ?? '',
          createdAt: new Date(),
        });
        added++;
      }
    }
    toast.success(`تم إضافة ${added} راتب`);
    load();
  };

  const markPaid = async (p: SalaryPayment) => {
    await db.salaryPayments.update(p.id!, { status: 'paid', paidAt: new Date() });
    toast.success('تم تسجيل صرف الراتب');
    load();
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-4">
      {/* filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {MONTHS_AR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={generateAll}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" /> توليد للكل
          </button>
          <button onClick={openModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> إضافة راتب
          </button>
        </div>
      </div>

      {/* summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">إجمالي الرواتب</p>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(totalNet)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 mb-1">مصروف</p>
          <p className="text-xl font-bold text-emerald-700">{paidCount} موظف</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600 mb-1">معلّق</p>
          <p className="text-xl font-bold text-amber-700">{filtered.length - paidCount} موظف</p>
        </div>
      </div>

      {/* list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
            <Users2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد رواتب لهذا الشهر</p>
            <p className="text-xs mt-1">استخدم "توليد للكل" لإضافة رواتب جميع الموظفين دفعة واحدة</p>
          </div>
        )}
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${p.status === 'paid' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  <DollarSign className={`w-5 h-5 ${p.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{p.employeeName}</p>
                  <p className="text-xs text-slate-500">{p.employeePosition}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-800">{formatCurrency(p.netSalary)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {p.status === 'paid' ? '✓ مصروف' : '⏳ معلّق'}
                </span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {p.status === 'pending' && (
                  <button onClick={() => markPaid(p)}
                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="تسجيل كمصروف">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => printSalarySlip(p, settings)}
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="طباعة">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id!)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                  {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {expandedId === p.id && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><span className="text-slate-500">الأساسي:</span> <span className="font-medium">{formatCurrency(p.basicSalary)}</span></div>
                <div><span className="text-slate-500">البدلات:</span> <span className="font-medium text-emerald-600">+{formatCurrency(p.allowances)}</span></div>
                <div><span className="text-slate-500">الخصومات:</span> <span className="font-medium text-rose-600">-{formatCurrency(p.deductions)}</span></div>
                <div><span className="text-slate-500">الطريقة:</span> <span className="font-medium">{p.paymentMethod === 'cash' ? 'نقدي' : 'تحويل'}</span></div>
                {p.notes && <div className="col-span-full text-slate-500">ملاحظات: {p.notes}</div>}
                {p.paidAt && <div className="col-span-full text-slate-500">تاريخ الصرف: {formatDate(p.paidAt)}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add salary modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">إضافة راتب</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الموظف *</label>
                <select value={form.employeeId} onChange={e => f('employeeId', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.position}</option>)}
                </select>
              </div>
              {selectedEmp && (
                <div className="p-3 bg-emerald-50 rounded-lg text-sm">
                  الراتب الأساسي: <span className="font-bold text-emerald-700">{formatCurrency(selectedEmp.salary)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">الشهر</label>
                  <select value={form.month} onChange={e => f('month', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {MONTHS_AR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">السنة</label>
                  <select value={form.year} onChange={e => f('year', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">البدلات والإضافات</label>
                  <input type="number" value={form.allowances} onChange={e => f('allowances', e.target.value)} min="0" step="0.01"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">الخصومات</label>
                  <input type="number" value={form.deductions} onChange={e => f('deductions', e.target.value)} min="0" step="0.01"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              {selectedEmp && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between">
                  <span className="text-sm text-blue-700">صافي الراتب:</span>
                  <span className="font-bold text-blue-800 text-lg">{formatCurrency(net)}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">طريقة الصرف</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['cash','transfer'] as const).map(m => (
                    <button key={m} onClick={() => f('paymentMethod', m)}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${form.paymentMethod === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                      {m === 'cash' ? '💵 نقدي' : '🏦 تحويل'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={save} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> حفظ
                </button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'vouchers', label: 'السندات المالية', icon: FileText },
  { id: 'payroll',  label: 'الرواتب',         icon: Users2 },
] as const;

export default function Financials() {
  const [activeTab, setActiveTab] = useState<'vouchers' | 'payroll'>('vouchers');

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-xl">
          <Wallet className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">السندات والرواتب</h2>
          <p className="text-sm text-slate-500">سندات القبض والصرف والتحصيل وكشوف الرواتب</p>
        </div>
      </div>

      {/* sub-tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'vouchers' && <VouchersPanel />}
      {activeTab === 'payroll'  && <PayrollPanel />}
    </div>
  );
}

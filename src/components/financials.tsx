'use client';

import { useState, useEffect, useCallback } from 'react';
import { db, type FinancialVoucher, type SalaryPayment, type Employee, type Customer, type Supplier, type Expense, type ExpenseCategory, type EmployeeAdvance, logAudit } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { printFinancialVoucher, printSalarySlip } from '@/lib/print-financials';
import {
  FileText, Plus, X, Printer, Search, Check, Wallet, TrendingUp, TrendingDown,
  Users2, ChevronDown, ChevronUp, RefreshCw, DollarSign, Calendar,
  ShoppingBag, Trash2, Edit3, PieChart,
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

    const voucherId = await db.financialVouchers.add({
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
    if (currentUser) await logAudit(currentUser.id!, currentUser.name, `create_voucher_${form.type}`, 'financialVouchers', voucherId, { amount, partyName: form.partyName });
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
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ employeeId: '', amount: '', reason: '' });
  const [repayAmount, setRepayAmount] = useState<Record<number, string>>({});

  const emptyForm = {
    employeeId: '', month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    allowances: '0', deductions: '0',
    paymentMethod: 'cash' as 'cash' | 'transfer', notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const selectedEmp = employees.find(e => e.id === parseInt(form.employeeId));

  const outstandingAdvance = (employeeId: number) =>
    advances.filter(a => a.employeeId === employeeId && a.status === 'active').reduce((s, a) => s + a.remainingBalance, 0);

  const load = useCallback(async () => {
    const [ps, es, adv] = await Promise.all([
      db.salaryPayments.orderBy('createdAt').reverse().toArray(),
      db.employees.filter(e => e.isActive).toArray(),
      db.employeeAdvances.orderBy('date').reverse().toArray(),
    ]);
    setPayments(ps);
    setEmployees(es);
    setAdvances(adv);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = payments.filter(p => p.month === filterMonth && p.year === filterYear);

  const totalNet = filtered.reduce((s, p) => s + p.netSalary, 0);
  const paidCount = filtered.filter(p => p.status === 'paid').length;

  const openModal = () => { setForm(emptyForm); setShowModal(true); };

  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const selectEmployee = (employeeId: string) => {
    const outstanding = outstandingAdvance(parseInt(employeeId));
    setForm(prev => ({ ...prev, employeeId, deductions: outstanding > 0 ? String(outstanding) : prev.deductions }));
  };

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
        const deduction = outstandingAdvance(emp.id!);
        await db.salaryPayments.add({
          voucherNumber: genSalaryNum(month, year),
          employeeId: emp.id!, employeeName: emp.name, employeePosition: emp.position,
          month, year, basicSalary: emp.salary, allowances: 0, deductions: deduction, netSalary: emp.salary - deduction,
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
    if (currentUser) await logAudit(currentUser.id!, currentUser.name, 'pay_salary', 'salaryPayments', p.id, { employeeName: p.employeeName, netSalary: p.netSalary });
    toast.success('تم تسجيل صرف الراتب');
    load();
  };

  const addAdvance = async () => {
    if (!advanceForm.employeeId || !currentUser) { toast.error('اختر موظفاً'); return; }
    const amount = parseFloat(advanceForm.amount);
    if (!amount || amount <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return; }
    const emp = employees.find(e => e.id === parseInt(advanceForm.employeeId));
    if (!emp) return;
    await db.employeeAdvances.add({
      employeeId: emp.id!, employeeName: emp.name, amount, remainingBalance: amount,
      reason: advanceForm.reason.trim() || undefined, status: 'active',
      userId: currentUser.id!, userName: currentUser.name, date: new Date(),
    });
    toast.success('تم تسجيل السلفة');
    setShowAdvanceModal(false);
    setAdvanceForm({ employeeId: '', amount: '', reason: '' });
    load();
  };

  const repayAdvance = async (adv: EmployeeAdvance) => {
    const amount = parseFloat(repayAmount[adv.id!] || '');
    if (!amount || amount <= 0 || amount > adv.remainingBalance) { toast.error('أدخل مبلغ سداد صحيح'); return; }
    const remaining = adv.remainingBalance - amount;
    await db.employeeAdvances.update(adv.id!, { remainingBalance: remaining, status: remaining <= 0 ? 'settled' : 'active' });
    toast.success('تم تسجيل السداد');
    setRepayAmount(prev => ({ ...prev, [adv.id!]: '' }));
    load();
  };

  const activeAdvances = advances.filter(a => a.status === 'active');

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

      {/* سلف الموظفين */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">سلف الموظفين</h3>
          <button onClick={() => setShowAdvanceModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium">
            <Plus className="w-3.5 h-3.5" /> سلفة جديدة
          </button>
        </div>
        {activeAdvances.length === 0 ? (
          <p className="text-xs text-slate-400">لا توجد سلف قائمة</p>
        ) : (
          <div className="space-y-2">
            {activeAdvances.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-sm flex-wrap">
                <div>
                  <p className="font-medium text-slate-700">{a.employeeName}</p>
                  <p className="text-xs text-slate-500">المتبقي: <span className="font-bold text-amber-700">{formatCurrency(a.remainingBalance)}</span> من {formatCurrency(a.amount)}{a.reason ? ` — ${a.reason}` : ''}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" placeholder="سداد" value={repayAmount[a.id!] || ''}
                    onChange={e => setRepayAmount(prev => ({ ...prev, [a.id!]: e.target.value }))}
                    className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                  <button onClick={() => repayAdvance(a)} className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs">تسجيل سداد</button>
                </div>
              </div>
            ))}
          </div>
        )}
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
                <select value={form.employeeId} onChange={e => selectEmployee(e.target.value)}
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
              {selectedEmp && outstandingAdvance(selectedEmp.id!) > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  لهذا الموظف سلفة قائمة بقيمة {formatCurrency(outstandingAdvance(selectedEmp.id!))} — تم اقتراحها كخصم تلقائي (قابلة للتعديل).
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

      {/* New advance modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">سلفة جديدة</h3>
              <button onClick={() => setShowAdvanceModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الموظف *</label>
                <select value={advanceForm.employeeId} onChange={e => setAdvanceForm(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.position}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">المبلغ *</label>
                <input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm(prev => ({ ...prev, amount: e.target.value }))} min="0" step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">سبب السلفة</label>
                <textarea value={advanceForm.reason} onChange={e => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={addAdvance} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> حفظ
                </button>
                <button onClick={() => setShowAdvanceModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-TAB 3 — المصروفات
═══════════════════════════════════════════════════════════════════ */
const DEFAULT_CATEGORIES = [
  { name: 'إيجار المحل', icon: '🏢' },
  { name: 'كهرباء', icon: '⚡' },
  { name: 'ماء', icon: '💧' },
  { name: 'غاز', icon: '🔥' },
  { name: 'رواتب موظفين', icon: '👥' },
  { name: 'مشتريات ومواد', icon: '📦' },
  { name: 'صيانة وإصلاح', icon: '🔧' },
  { name: 'تسويق وإعلان', icon: '📢' },
  { name: 'مواصلات ووقود', icon: '🚗' },
  { name: 'اتصالات وإنترنت', icon: '📡' },
  { name: 'تأمين', icon: '🛡️' },
  { name: 'نظافة', icon: '🧹' },
  { name: 'ضرائب ورسوم', icon: '📋' },
  { name: 'مصاريف إدارية', icon: '🗂️' },
  { name: 'أخرى', icon: '💰' },
];

function ExpensesPanel() {
  const { currentUser } = useAppStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterCatId, setFilterCatId] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [view, setView] = useState<'list' | 'categories'>('list');

  const emptyForm: {
    date: string; categoryId: string; description: string;
    amount: string; paymentMethod: Expense['paymentMethod'];
    checkNumber: string; bankName: string; receiptNumber: string; notes: string;
  } = {
    date: new Date().toISOString().split('T')[0],
    categoryId: '', description: '', amount: '',
    paymentMethod: 'cash', checkNumber: '', bankName: '', receiptNumber: '', notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const emptyCatForm = { name: '', icon: '💰', budgetMonthly: '' };
  const [catForm, setCatForm] = useState(emptyCatForm);

  const load = useCallback(async () => {
    const [exs, cats] = await Promise.all([
      db.expenses.orderBy('date').reverse().toArray(),
      db.expenseCategories.filter(c => c.isActive).toArray(),
    ]);
    // auto-seed on first use
    if (cats.length === 0) {
      for (const c of DEFAULT_CATEGORIES) {
        await db.expenseCategories.add({ ...c, isActive: true });
      }
      const seeded = await db.expenseCategories.filter(c => c.isActive).toArray();
      setCategories(seeded);
    } else {
      setCategories(cats);
    }
    setExpenses(exs);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seedCategories = async () => {
    for (const c of DEFAULT_CATEGORIES) {
      await db.expenseCategories.add({ ...c, isActive: true });
    }
    toast.success('تم إضافة الفئات الافتراضية');
    load();
  };

  /* ─── expense CRUD ─── */
  const openAdd = () => {
    setEditingExpense(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ? String(categories[0].id) : '' });
    setShowModal(true);
  };
  const openEdit = (e: Expense) => {
    setEditingExpense(e);
    setForm({
      date: new Date(e.date).toISOString().split('T')[0],
      categoryId: String(e.categoryId),
      description: e.description,
      amount: String(e.amount),
      paymentMethod: e.paymentMethod,
      checkNumber: e.checkNumber || '',
      bankName: e.bankName || '',
      receiptNumber: e.receiptNumber || '',
      notes: e.notes || '',
    });
    setShowModal(true);
  };
  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const saveExpense = async () => {
    if (!form.categoryId) { toast.error('اختر الفئة'); return; }
    if (!form.description.trim()) { toast.error('أدخل الوصف'); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('أدخل المبلغ'); return; }
    const cat = categories.find(c => c.id === parseInt(form.categoryId));
    const record: Omit<Expense, 'id'> = {
      date: new Date(form.date),
      categoryId: parseInt(form.categoryId),
      categoryName: cat?.name ?? '',
      description: form.description,
      amount,
      paymentMethod: form.paymentMethod,
      checkNumber: form.checkNumber || undefined,
      bankName: form.bankName || undefined,
      receiptNumber: form.receiptNumber || undefined,
      notes: form.notes || undefined,
      userId: currentUser?.id ?? 0,
      userName: currentUser?.username ?? '',
      createdAt: new Date(),
    };
    if (editingExpense?.id) {
      await db.expenses.update(editingExpense.id, record);
      toast.success('تم التعديل');
    } else {
      await db.expenses.add(record);
      toast.success('تم الحفظ');
    }
    setShowModal(false);
    load();
  };

  const deleteExpense = async (e: Expense) => {
    if (!confirm(`حذف "${e.description}"؟`)) return;
    await db.expenses.delete(e.id!);
    toast.success('تم الحذف');
    load();
  };

  /* ─── category CRUD ─── */
  const openAddCat = () => { setEditingCat(null); setCatForm(emptyCatForm); setShowCatModal(true); };
  const openEditCat = (c: ExpenseCategory) => {
    setEditingCat(c);
    setCatForm({ name: c.name, icon: c.icon, budgetMonthly: c.budgetMonthly ? String(c.budgetMonthly) : '' });
    setShowCatModal(true);
  };
  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error('أدخل اسم الفئة'); return; }
    const record = { name: catForm.name, icon: catForm.icon || '💰', budgetMonthly: catForm.budgetMonthly ? parseFloat(catForm.budgetMonthly) : undefined, isActive: true };
    if (editingCat?.id) { await db.expenseCategories.update(editingCat.id, record); }
    else { await db.expenseCategories.add(record); }
    toast.success('تم الحفظ');
    setShowCatModal(false);
    load();
  };
  const deleteCat = async (c: ExpenseCategory) => {
    if (!confirm(`حذف فئة "${c.name}"؟`)) return;
    await db.expenseCategories.update(c.id!, { isActive: false });
    toast.success('تم الحذف');
    load();
  };

  /* ─── derived stats ─── */
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
  });
  const totalMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalYear  = expenses.filter(e => new Date(e.date).getFullYear() === filterYear).reduce((s, e) => s + e.amount, 0);

  const catTotals = categories.map(c => ({
    ...c,
    total: monthExpenses.filter(e => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const filtered = monthExpenses.filter(e =>
    (filterCatId === 'all' || e.categoryId === filterCatId) &&
    (e.description.includes(search) || e.categoryName.includes(search))
  );

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-4">
      {/* view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>
            <ShoppingBag className="w-4 h-4" /> المصروفات
          </button>
          <button onClick={() => setView('categories')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'categories' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>
            <PieChart className="w-4 h-4" /> الفئات
          </button>
        </div>
        {view === 'list' && (
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> إضافة مصروف
          </button>
        )}
        {view === 'categories' && (
          <button onClick={openAddCat}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> فئة جديدة
          </button>
        )}
      </div>

      {/* ───── LIST VIEW ───── */}
      {view === 'list' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <p className="text-xs text-rose-600 mb-1">مصروفات الشهر</p>
              <p className="text-xl font-bold text-rose-700">{formatCurrency(totalMonth)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-xs text-orange-600 mb-1">مصروفات السنة</p>
              <p className="text-xl font-bold text-orange-700">{formatCurrency(totalYear)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">عدد العمليات</p>
              <p className="text-xl font-bold text-slate-700">{monthExpenses.length}</p>
            </div>
          </div>

          {/* breakdown by category */}
          {catTotals.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-600 mb-3">توزيع المصروفات حسب الفئة</p>
              <div className="space-y-2">
                {catTotals.map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-lg">{c.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700">{c.name}</span>
                        <span className="font-medium text-rose-600">{formatCurrency(c.total)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full"
                          style={{ width: `${Math.min(100, (c.total / totalMonth) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 w-10 text-left">
                      {Math.round((c.total / totalMonth) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              {MONTHS_AR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterCatId} onChange={e => setFilterCatId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              <option value="all">كل الفئات</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
                className="pr-8 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
          </div>

          {/* list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{['التاريخ','الفئة','الوصف','المبلغ','الدفع','إجراءات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right font-medium text-slate-600">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{formatDate(e.date)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{categories.find(c => c.id === e.categoryId)?.icon ?? '💰'}</span>
                          <span className="text-slate-700">{e.categoryName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">{e.description}</td>
                      <td className="px-4 py-3 font-bold text-rose-600">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3 text-slate-500">{METHOD_LABELS[e.paymentMethod]}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(e)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteExpense(e)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">لا توجد مصروفات لهذا الشهر</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ───── CATEGORIES VIEW ───── */}
      {view === 'categories' && (
        <div className="space-y-3">
          {categories.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
              <p className="text-slate-400 mb-3">لا توجد فئات بعد</p>
              <button onClick={seedCategories}
                className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm hover:bg-rose-100">
                إضافة الفئات الافتراضية
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map(c => {
              const catTotal = expenses.filter(e => {
                const d = new Date(e.date);
                return e.categoryId === c.id && d.getMonth() + 1 === new Date().getMonth() + 1 && d.getFullYear() === new Date().getFullYear();
              }).reduce((s, e) => s + e.amount, 0);
              const budget = c.budgetMonthly ?? 0;
              const pct = budget > 0 ? Math.min(100, (catTotal / budget) * 100) : 0;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{c.icon}</span>
                      <span className="font-medium text-slate-800">{c.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditCat(c)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCat(c)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-rose-600">{formatCurrency(catTotal)}</p>
                  {budget > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-slate-400 mt-1 mb-1.5">
                        <span>الميزانية: {formatCurrency(budget)}</span>
                        <span className={pct >= 90 ? 'text-rose-500 font-medium' : ''}>{Math.round(pct)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───── ADD/EDIT EXPENSE MODAL ───── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">{editingExpense ? 'تعديل مصروف' : 'إضافة مصروف'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">التاريخ</label>
                  <input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">الفئة *</label>
                  <select value={form.categoryId} onChange={e => f('categoryId', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500">
                    <option value="">-- اختر --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الوصف / البيان *</label>
                <input value={form.description} onChange={e => f('description', e.target.value)} placeholder="ما هذا المصروف؟"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">المبلغ *</label>
                <input type="number" value={form.amount} onChange={e => f('amount', e.target.value)} min="0" step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-lg font-bold" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">طريقة الدفع</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash','transfer','check'] as const).map(m => (
                    <button key={m} onClick={() => f('paymentMethod', m)}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${form.paymentMethod === m ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 hover:bg-slate-50'}`}>
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
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">البنك</label>
                    <input value={form.bankName} onChange={e => f('bankName', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">رقم الإيصال / الفاتورة</label>
                <input value={form.receiptNumber} onChange={e => f('receiptNumber', e.target.value)} placeholder="اختياري"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveExpense}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> حفظ
                </button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── ADD/EDIT CATEGORY MODAL ───── */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">{editingCat ? 'تعديل فئة' : 'فئة جديدة'}</h3>
              <button onClick={() => setShowCatModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الاسم *</label>
                <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الأيقونة (إيموجي)</label>
                <input value={catForm.icon} onChange={e => setCatForm(p => ({ ...p, icon: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-2xl text-center" maxLength={4} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الميزانية الشهرية (اختياري)</label>
                <input type="number" value={catForm.budgetMonthly} onChange={e => setCatForm(p => ({ ...p, budgetMonthly: e.target.value }))} min="0" step="0.01"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveCat}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> حفظ
                </button>
                <button onClick={() => setShowCatModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">إلغاء</button>
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
  { id: 'vouchers',  label: 'السندات المالية', icon: FileText },
  { id: 'payroll',   label: 'الرواتب',         icon: Users2 },
  { id: 'expenses',  label: 'المصروفات',       icon: ShoppingBag },
] as const;

export default function Financials() {
  const [activeTab, setActiveTab] = useState<'vouchers' | 'payroll' | 'expenses'>('vouchers');

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-xl">
          <Wallet className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">السندات والرواتب والمصروفات</h2>
          <p className="text-sm text-slate-500">سندات القبض والصرف والتحصيل وكشوف الرواتب وتتبع المصروفات</p>
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
      {activeTab === 'expenses' && <ExpensesPanel />}
    </div>
  );
}

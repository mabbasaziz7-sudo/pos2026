'use client';

import { useState, useEffect } from 'react';
import { db, type Employee } from '@/lib/local-db';
import { formatCurrency, formatDate, useAppStore } from '@/lib/store';
import { Users2, Plus, Edit2, Trash2, X, Save, Search, Check, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['المبيعات', 'الإدارة', 'المستودع', 'التوصيل', 'المحاسبة', 'خدمة العملاء', 'أخرى'];
const POSITIONS = ['كاشير', 'مدير فرع', 'محاسب', 'سائق توصيل', 'مشرف مستودع', 'موظف مبيعات', 'مدير', 'أخرى'];

export default function Employees() {
  const { settings } = useAppStore();
  const accent = settings?.printAccentColor || '#10b981';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', position: 'كاشير', department: 'المبيعات', salary: '', hireDate: '', isActive: true, notes: '' });

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => setEmployees(await db.employees.toArray());

  const openModal = (emp?: Employee) => {
    if (emp) {
      setEditing(emp);
      setForm({ name: emp.name, phone: emp.phone, email: emp.email || '', position: emp.position, department: emp.department, salary: String(emp.salary), hireDate: new Date(emp.hireDate).toISOString().split('T')[0], isActive: emp.isActive, notes: emp.notes || '' });
    } else {
      setEditing(null);
      setForm({ name: '', phone: '', email: '', position: 'كاشير', department: 'المبيعات', salary: '', hireDate: new Date().toISOString().split('T')[0], isActive: true, notes: '' });
    }
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('أدخل اسم الموظف'); return; }
    const data: Omit<Employee, 'id'> = {
      name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined,
      position: form.position, department: form.department, salary: parseFloat(form.salary) || 0,
      hireDate: new Date(form.hireDate || Date.now()), isActive: form.isActive, notes: form.notes.trim() || undefined, createdAt: editing?.createdAt || new Date(),
    };
    if (editing) { await db.employees.update(editing.id!, data); toast.success('تم تحديث الموظف'); }
    else { await db.employees.add(data); toast.success('تم إضافة الموظف'); }
    setShowModal(false); loadEmployees();
  };

  const deleteEmp = async (id: number) => {
    if (!confirm('حذف هذا الموظف؟')) return;
    await db.employees.delete(id); toast.success('تم الحذف'); loadEmployees();
  };

  const filtered = employees.filter(e => e.name.includes(search) || e.position.includes(search) || e.department.includes(search));
  const totalSalary = employees.filter(e => e.isActive).reduce((s, e) => s + Number(e.salary), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500">إجمالي الموظفين</p>
          <p className="text-2xl font-bold text-slate-800">{employees.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500">الموظفون النشطون</p>
          <p className="text-2xl font-bold" style={{ color: accent }}>{employees.filter(e => e.isActive).length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500">إجمالي الرواتب الشهرية</p>
          <p className="text-xl font-bold text-purple-600">{formatCurrency(totalSalary)}</p>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full pr-9 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" dir="rtl" />
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm" style={{ background: accent }}>
          <Plus className="w-4 h-4" /> إضافة موظف
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3 text-right">الموظف</th>
                <th className="px-4 py-3 text-right">المنصب</th>
                <th className="px-4 py-3 text-right">القسم</th>
                <th className="px-4 py-3 text-right">الراتب</th>
                <th className="px-4 py-3 text-right">تاريخ التعيين</th>
                <th className="px-4 py-3 text-center">الحالة</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">{e.name}</p>
                    <p className="text-xs text-slate-400">{e.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{e.position}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{e.department}</td>
                  <td className="px-4 py-3 text-sm font-medium text-purple-700">{formatCurrency(Number(e.salary))}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(e.hireDate)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${e.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {e.isActive ? <><Check className="w-3 h-3" />نشط</> : <><XCircle className="w-3 h-3" />غير نشط</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openModal(e)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteEmp(e.id!)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400"><Users2 className="w-12 h-12 mx-auto mb-2 opacity-25" /><p>لا يوجد موظفون</p></div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800">{editing ? 'تعديل موظف' : 'موظف جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-slate-500 mb-1">الاسم *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-xs text-slate-500 mb-1">الهاتف</label><input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-slate-500 mb-1">المنصب</label><select value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" dir="rtl">{POSITIONS.map(p => <option key={p}>{p}</option>)}</select></div>
                <div><label className="block text-xs text-slate-500 mb-1">القسم</label><select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" dir="rtl">{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-slate-500 mb-1">الراتب الشهري</label><input type="number" step="0.001" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-xs text-slate-500 mb-1">تاريخ التعيين</label><input type="date" value={form.hireDate} onChange={e => setForm({...form, hireDate: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div><label className="block text-xs text-slate-500 mb-1">ملاحظات</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} onClick={() => setForm({...form, isActive: !form.isActive})}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.isActive ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-slate-600">نشط</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={save} className="flex-1 py-2.5 text-white font-medium rounded-lg flex items-center justify-center gap-2" style={{ background: accent }}><Save className="w-4 h-4" />حفظ</button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

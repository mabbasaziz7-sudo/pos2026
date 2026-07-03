'use client';

import { useState, useEffect } from 'react';
import { db, type LoyaltyTier, type Customer } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatNumber } from '@/lib/store';
import { Star, Plus, Edit2, Trash2, X, Save, Award, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_TIERS = [
  { name: 'برونزي', minPoints: 0, maxPoints: 999, discountPercent: 0, color: '#cd7f32', benefits: 'الدخول لبرنامج الولاء وكسب النقاط' },
  { name: 'فضي', minPoints: 1000, maxPoints: 4999, discountPercent: 3, color: '#c0c0c0', benefits: 'خصم 3% على كل مشترياتك' },
  { name: 'ذهبي', minPoints: 5000, maxPoints: 9999, discountPercent: 5, color: '#ffd700', benefits: 'خصم 5% + أولوية الخدمة' },
  { name: 'بلاتيني', minPoints: 10000, maxPoints: 99999999, discountPercent: 10, color: '#e5e4e2', benefits: 'خصم 10% + هدايا حصرية + خدمة VIP' },
];

export default function LoyaltyPrograms() {
  const { settings } = useAppStore();
  const accent = settings?.printAccentColor || '#10b981';
  const pointValue = settings?.loyaltyPointValue ?? 0.1;
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LoyaltyTier | null>(null);
  const [form, setForm] = useState({ name: '', minPoints: '', maxPoints: '', discountPercent: '', color: '#10b981', benefits: '', isActive: true });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const [t, c] = await Promise.all([db.loyaltyTiers.orderBy('minPoints').toArray(), db.customers.toArray()]);
    setTiers(t); setCustomers(c);
  };

  const openModal = (tier?: LoyaltyTier) => {
    if (tier) { setEditing(tier); setForm({ name: tier.name, minPoints: String(tier.minPoints), maxPoints: String(tier.maxPoints), discountPercent: String(tier.discountPercent), color: tier.color, benefits: tier.benefits, isActive: tier.isActive }); }
    else { setEditing(null); setForm({ name: '', minPoints: '', maxPoints: '', discountPercent: '0', color: accent, benefits: '', isActive: true }); }
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('أدخل اسم المستوى'); return; }
    const data: Omit<LoyaltyTier,'id'> = { name: form.name.trim(), minPoints: parseInt(form.minPoints)||0, maxPoints: parseInt(form.maxPoints)||0, discountPercent: parseFloat(form.discountPercent)||0, color: form.color, benefits: form.benefits, isActive: form.isActive, createdAt: editing?.createdAt || new Date() };
    if (editing) { await db.loyaltyTiers.update(editing.id!, data); toast.success('تم التحديث'); }
    else { await db.loyaltyTiers.add(data); toast.success('تم إضافة المستوى'); }
    setShowModal(false); loadData();
  };

  const deleteTier = async (id: number) => {
    if (!confirm('حذف هذا المستوى؟')) return;
    await db.loyaltyTiers.delete(id); loadData();
  };

  const seedPresets = async () => {
    if (!confirm('سيتم مسح المستويات الحالية واستبدالها بالمستويات الافتراضية. متأكد؟')) return;
    const existing = await db.loyaltyTiers.toArray();
    for (const t of existing) await db.loyaltyTiers.delete(t.id!);
    for (const p of PRESET_TIERS) await db.loyaltyTiers.add({ ...p, isActive: true, createdAt: new Date() });
    toast.success('تم إضافة المستويات الافتراضية'); loadData();
  };

  const getCustomerTier = (points: number) => tiers.find(t => points >= t.minPoints && points <= t.maxPoints);
  const tierCounts = tiers.map(t => ({ ...t, count: customers.filter(c => c.loyaltyPoints >= t.minPoints && c.loyaltyPoints <= t.maxPoints).length }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Star className="w-5 h-5" style={{ color: accent }} />برنامج الولاء والمكافآت</h2>
          <p className="text-sm text-slate-500 mt-0.5">قيمة النقطة الواحدة: <strong>{formatCurrency(pointValue)}</strong> — يمكن تعديلها من الإعدادات</p>
        </div>
        <div className="flex gap-2">
          {tiers.length === 0 && <button onClick={seedPresets} className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700">إضافة المستويات الافتراضية</button>}
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg" style={{ background: accent }}><Plus className="w-4 h-4" /> مستوى جديد</button>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tierCounts.map(tier => (
          <div key={tier.id} className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm" style={{ borderColor: tier.color }}>
            <div className="p-4 text-white relative overflow-hidden" style={{ background: tier.color }}>
              <div className="absolute top-0 left-0 w-20 h-20 rounded-full opacity-10 -translate-x-4 -translate-y-4" style={{ background: '#fff' }} />
              <Award className="w-7 h-7 mb-2" />
              <h3 className="text-lg font-bold">{tier.name}</h3>
              <p className="text-xs opacity-80">{tier.minPoints.toLocaleString()} – {tier.maxPoints >= 99999999 ? '∞' : tier.maxPoints.toLocaleString()} نقطة</p>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-slate-700"><Users className="w-4 h-4" /><span className="text-sm font-semibold">{tier.count} عميل</span></div>
                {tier.discountPercent > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${tier.color}20`, color: tier.color }}>خصم {tier.discountPercent}%</span>}
              </div>
              <p className="text-xs text-slate-500 mb-4">{tier.benefits}</p>
              <div className="flex gap-1">
                <button onClick={() => openModal(tier)} className="flex-1 py-1.5 text-xs rounded-lg text-center" style={{ background: `${tier.color}15`, color: tier.color }}><Edit2 className="w-3 h-3 inline ml-1" />تعديل</button>
                <button onClick={() => deleteTier(tier.id!)} className="px-3 py-1.5 text-xs rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
        {tiers.length === 0 && (
          <div className="col-span-4 text-center py-16 text-slate-400">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="font-medium">لا توجد مستويات ولاء بعد</p>
            <p className="text-sm mt-1">اضغط "إضافة المستويات الافتراضية" للبدء</p>
          </div>
        )}
      </div>

      {/* Customer Distribution */}
      {customers.length > 0 && tiers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" />توزيع العملاء على المستويات</h3>
          <div className="space-y-3">
            {tierCounts.map(tier => (
              <div key={tier.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: tier.color }} />
                    <strong>{tier.name}</strong>
                  </span>
                  <span className="text-slate-500">{tier.count} عميل ({customers.length ? Math.round((tier.count/customers.length)*100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${customers.length ? (tier.count/customers.length)*100 : 0}%`, background: tier.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800">{editing ? 'تعديل مستوى' : 'مستوى جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-slate-500 mb-1">اسم المستوى</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs text-slate-500 mb-1">اللون</label><input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs text-slate-500 mb-1">النقاط من</label><input type="number" value={form.minPoints} onChange={e => setForm({...form, minPoints: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs text-slate-500 mb-1">النقاط إلى</label><input type="number" value={form.maxPoints} onChange={e => setForm({...form, maxPoints: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs text-slate-500 mb-1">خصم %</label><input type="number" step="0.5" value={form.discountPercent} onChange={e => setForm({...form, discountPercent: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-xs text-slate-500 mb-1">المزايا</label><textarea value={form.benefits} onChange={e => setForm({...form, benefits: e.target.value})} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none" /></div>
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

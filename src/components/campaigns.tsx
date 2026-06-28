'use client';

import { useState, useEffect } from 'react';
import {
  db,
  type Campaign,
  type CampaignRecipient,
  type Customer,
  type CustomerGroup,
  type WhatsAppLog,
} from '@/lib/local-db';
import { useAppStore, formatDate } from '@/lib/store';
import { sendWhatsAppText } from '@/lib/whatsapp-gateway';
import {
  MessageCircle,
  Plus,
  X,
  Save,
  Send,
  Check,
  Clock,
  Users,
  Zap,
  BarChart3,
  Edit2,
  Trash2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

type SubTab = 'campaigns' | 'quick' | 'groups' | 'stats';

export default function Campaigns() {
  const [subTab, setSubTab] = useState<SubTab>('campaigns');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { id: 'campaigns', label: 'الحملات', icon: MessageCircle },
            { id: 'quick', label: 'إرسال سريع', icon: Zap },
            { id: 'groups', label: 'المجموعات', icon: Users },
            { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              subTab === tab.id ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'campaigns' && <CampaignsPanel />}
      {subTab === 'quick' && <QuickSendPanel />}
      {subTab === 'groups' && <GroupsPanel />}
      {subTab === 'stats' && <StatsPanel />}
    </div>
  );
}

function CampaignsPanel() {
  const { settings } = useAppStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [audienceMode, setAudienceMode] = useState<'all' | 'selected' | 'group'>('all');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [c, cu, g] = await Promise.all([
      db.campaigns.orderBy('id').reverse().toArray(),
      db.customers.toArray(),
      db.customerGroups.toArray(),
    ]);
    setCampaigns(c);
    setCustomers(cu);
    setGroups(g);
  };

  const customersWithPhone = customers.filter((c) => c.phone.trim());

  const openModal = () => {
    setName('');
    setMessage('');
    setAudienceMode('all');
    setSelectedCustomerIds([]);
    setSelectedGroupId(groups[0]?.id ?? null);
    setShowModal(true);
  };

  const toggleCustomer = (id: number) => {
    setSelectedCustomerIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const saveCampaign = async () => {
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الحملة');
      return;
    }
    if (!message.trim()) {
      toast.error('يرجى إدخال نص الرسالة');
      return;
    }

    let audience: Customer[];
    if (audienceMode === 'all') {
      audience = customersWithPhone;
    } else if (audienceMode === 'group') {
      const group = groups.find((g) => g.id === selectedGroupId);
      audience = customersWithPhone.filter((c) => group?.customerIds.includes(c.id!));
    } else {
      audience = customersWithPhone.filter((c) => selectedCustomerIds.includes(c.id!));
    }

    if (audience.length === 0) {
      toast.error('لا يوجد عملاء بأرقام هاتف ضمن الجمهور المحدد');
      return;
    }

    const recipients: CampaignRecipient[] = audience.map((c) => ({
      customerId: c.id!,
      customerName: c.name,
      phone: c.phone,
      status: 'pending',
    }));

    await db.campaigns.add({
      name: name.trim(),
      message: message.trim(),
      recipients,
      createdAt: new Date(),
    });
    toast.success('تم إنشاء الحملة');
    setShowModal(false);
    loadData();
  };

  const markSent = async (campaign: Campaign, customerId: number) => {
    const updatedRecipients = campaign.recipients.map((r) =>
      r.customerId === customerId ? { ...r, status: 'sent' as const, sentAt: new Date() } : r
    );
    await db.campaigns.update(campaign.id!, { recipients: updatedRecipients });
    const updatedCampaign = { ...campaign, recipients: updatedRecipients };
    setActiveCampaign(updatedCampaign);
    setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? updatedCampaign : c)));
    return updatedCampaign;
  };

  const sendToRecipient = async (campaign: Campaign, recipient: CampaignRecipient) => {
    const personalized = campaign.message.replace(/{name}/g, recipient.customerName);
    await sendWhatsAppText(recipient.phone, personalized, settings, 'campaign', recipient.customerName);
    await markSent(campaign, recipient.customerId);
  };

  const sendToAll = async (campaign: Campaign) => {
    const pending = campaign.recipients.filter((r) => r.status === 'pending');
    if (pending.length === 0) return;
    toast(`سيتم فتح ${pending.length} نافذة واتساب — قد يحظر المتصفح بعضها، في هذه الحالة كرر الضغط أو أرسل فرديًا`, { duration: 5000 });
    let current = campaign;
    for (const recipient of pending) {
      const personalized = current.message.replace(/{name}/g, recipient.customerName);
      await sendWhatsAppText(recipient.phone, personalized, settings, 'campaign', recipient.customerName);
      current = await markSent(current, recipient.customerId);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          حملة جديدة
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الحملة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الجمهور</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الإرسال</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((campaign) => {
                const sentCount = campaign.recipients.filter((r) => r.status === 'sent').length;
                return (
                  <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{campaign.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{campaign.recipients.length} عميل</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-emerald-600 font-medium">{sentCount}</span>
                      <span className="text-slate-400"> / {campaign.recipients.length}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(campaign.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setActiveCampaign(campaign)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg transition-colors mx-auto"
                      >
                        <Users className="w-3 h-3" />
                        متابعة
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {campaigns.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد حملات</p>
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">حملة جديدة</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">اسم الحملة *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">نص الرسالة *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={4}
                  placeholder="مثال: مرحباً {name}، لدينا عرض خاص بانتظارك..."
                  dir="rtl"
                />
                <p className="text-xs text-slate-500 mt-1">استخدم {'{name}'} داخل النص لإدراج اسم العميل تلقائيًا.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">الجمهور</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    onClick={() => setAudienceMode('all')}
                    className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                      audienceMode === 'all' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    الكل ({customersWithPhone.length})
                  </button>
                  <button
                    onClick={() => setAudienceMode('group')}
                    className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                      audienceMode === 'group' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    مجموعة
                  </button>
                  <button
                    onClick={() => setAudienceMode('selected')}
                    className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                      audienceMode === 'selected' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    تحديد عملاء
                  </button>
                </div>

                {audienceMode === 'group' && (
                  <select
                    value={selectedGroupId ?? ''}
                    onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    dir="rtl"
                  >
                    {groups.length === 0 && <option value="">لا توجد مجموعات — أنشئها من تبويب المجموعات</option>}
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.customerIds.length} عميل)
                      </option>
                    ))}
                  </select>
                )}

                {audienceMode === 'selected' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                    {customersWithPhone.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => toggleCustomer(c.id!)}
                        className={`p-2 text-right text-sm rounded-lg border transition-colors ${
                          selectedCustomerIds.includes(c.id!) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-medium truncate">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.phone}</p>
                      </button>
                    ))}
                    {customersWithPhone.length === 0 && (
                      <p className="col-span-2 text-center text-sm text-slate-400 py-4">لا يوجد عملاء بأرقام هاتف</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveCampaign}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {activeCampaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-800">{activeCampaign.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => sendToAll(activeCampaign)}
                  disabled={activeCampaign.recipients.every((r) => r.status === 'sent')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs rounded-lg transition-colors"
                >
                  <Send className="w-3 h-3" />
                  إرسال للكل
                </button>
                <button onClick={() => setActiveCampaign(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
              يُسجَّل الإرسال عند الضغط على "إرسال" وفتح واتساب بالرسالة جاهزة — وليس تأكيد تسليم فعلي من واتساب.
            </p>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-right">العميل</th>
                    <th className="px-3 py-2 text-right">الهاتف</th>
                    <th className="px-3 py-2 text-center">الحالة</th>
                    <th className="px-3 py-2 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeCampaign.recipients.map((r) => (
                    <tr key={r.customerId} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{r.customerName}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{r.phone}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            r.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {r.status === 'sent' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {r.status === 'sent' ? 'تم الإرسال' : 'قيد الانتظار'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => sendToRecipient(activeCampaign, r)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg transition-colors mx-auto"
                        >
                          <Send className="w-3 h-3" />
                          إرسال
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuickSendPanel() {
  const { settings } = useAppStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mode, setMode] = useState<'customer' | 'phone'>('customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [manualPhone, setManualPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    db.customers.toArray().then((all) => {
      setCustomers(all);
      setSelectedCustomerId(all.find((c) => c.phone.trim())?.id ?? null);
    });
  }, []);

  const customersWithPhone = customers.filter((c) => c.phone.trim());
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const send = async () => {
    const phone = mode === 'customer' ? selectedCustomer?.phone : manualPhone.trim();
    if (!phone) {
      toast.error('يرجى تحديد عميل أو إدخال رقم هاتف');
      return;
    }
    if (!message.trim()) {
      toast.error('يرجى كتابة نص الرسالة');
      return;
    }
    const customerName = mode === 'customer' ? selectedCustomer?.name : undefined;
    setSending(true);
    await sendWhatsAppText(phone, message.trim(), settings, 'quick', customerName);
    setSending(false);
    setMessage('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">المستلم</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => setMode('customer')}
            className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
              mode === 'customer' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            عميل من القائمة
          </button>
          <button
            onClick={() => setMode('phone')}
            className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
              mode === 'phone' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            رقم هاتف مباشر
          </button>
        </div>

        {mode === 'customer' ? (
          <select
            value={selectedCustomerId ?? ''}
            onChange={(e) => setSelectedCustomerId(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="rtl"
          >
            {customersWithPhone.length === 0 && <option value="">لا يوجد عملاء بأرقام هاتف</option>}
            {customersWithPhone.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            placeholder="مثال: 0501234567"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            dir="ltr"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">نص الرسالة</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          rows={5}
          dir="rtl"
        />
      </div>

      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
        سيتم فتح واتساب بالرسالة جاهزة لإرسالها يدويًا.
      </p>

      <button
        onClick={send}
        disabled={sending}
        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-lg flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        {sending ? 'جاري الإرسال...' : 'إرسال'}
      </button>
    </div>
  );
}

function GroupsPanel() {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [name, setName] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [g, c] = await Promise.all([db.customerGroups.toArray(), db.customers.toArray()]);
    setGroups(g);
    setCustomers(c);
  };

  const openModal = (group?: CustomerGroup) => {
    if (group) {
      setEditingGroup(group);
      setName(group.name);
      setSelectedCustomerIds(group.customerIds);
    } else {
      setEditingGroup(null);
      setName('');
      setSelectedCustomerIds([]);
    }
    setShowModal(true);
  };

  const toggleCustomer = (id: number) => {
    setSelectedCustomerIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const saveGroup = async () => {
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم المجموعة');
      return;
    }
    if (selectedCustomerIds.length === 0) {
      toast.error('يرجى اختيار عميل واحد على الأقل');
      return;
    }
    if (editingGroup) {
      await db.customerGroups.update(editingGroup.id!, { name: name.trim(), customerIds: selectedCustomerIds });
      toast.success('تم تحديث المجموعة');
    } else {
      await db.customerGroups.add({ name: name.trim(), customerIds: selectedCustomerIds, createdAt: new Date() });
      toast.success('تم إنشاء المجموعة');
    }
    setShowModal(false);
    loadData();
  };

  const deleteGroup = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;
    await db.customerGroups.delete(id);
    toast.success('تم حذف المجموعة');
    loadData();
  };

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          مجموعة جديدة
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المجموعة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">عدد الأعضاء</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{group.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{group.customerIds.length} عميل</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openModal(group)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteGroup(group.id!)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {groups.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد مجموعات</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{editingGroup ? 'تعديل مجموعة' : 'مجموعة جديدة'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">اسم المجموعة *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">الأعضاء</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleCustomer(c.id!)}
                      className={`p-2 text-right text-sm rounded-lg border transition-colors ${
                        selectedCustomerIds.includes(c.id!) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.phone}</p>
                    </button>
                  ))}
                  {customers.length === 0 && (
                    <p className="col-span-2 text-center text-sm text-slate-400 py-4">لا يوجد عملاء</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveGroup}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatsPanel() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);

  useEffect(() => {
    db.whatsappLogs.orderBy('date').reverse().toArray().then(setLogs);
  }, []);

  const today = new Date().toDateString();
  const totalSent = logs.filter((l) => l.success).length;
  const totalFailed = logs.filter((l) => !l.success).length;
  const todayCount = logs.filter((l) => new Date(l.date).toDateString() === today).length;

  const contextLabel = (context: WhatsAppLog['context']) =>
    context === 'campaign' ? 'حملة' : context === 'invoice' ? 'فاتورة' : 'إرسال سريع';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي الرسائل</p>
          <p className="text-2xl font-bold text-slate-800">{logs.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">الناجحة</p>
          <p className="text-2xl font-bold text-emerald-600">{totalSent}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">الفاشلة</p>
          <p className="text-2xl font-bold text-rose-600">{totalFailed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">اليوم</p>
          <p className="text-2xl font-bold text-blue-600">{todayCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">سجل الإرسال الأخير</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المستلم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الهاتف</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">السياق</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.slice(0, 100).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(log.date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{log.customerName || 'غير معروف'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">{log.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{contextLabel(log.context)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        log.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                      title={log.error}
                    >
                      {log.success ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {log.success ? 'نجح' : 'فشل'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد عمليات إرسال بعد</p>
          </div>
        )}
      </div>
    </div>
  );
}

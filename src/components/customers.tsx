'use client';

import { useState, useEffect } from 'react';
import { db, type Customer, type Sale, type Payment } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { openPrintWindow } from '@/lib/print';
import { printLoyaltyCard } from '@/lib/print-cards';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  Save,
  Search,
  CreditCard,
  DollarSign,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Customers() {
  const { settings } = useAppStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    creditLimit: '',
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const all = await db.customers.toArray();
    setCustomers(all);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const saveCustomer = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('يرجى ملء الاسم ورقم الهاتف');
      return;
    }
    const data = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      email: formData.email.trim(),
      creditLimit: parseFloat(formData.creditLimit) || 0,
      balance: editingCustomer?.balance || 0,
      loyaltyPoints: editingCustomer?.loyaltyPoints || 0,
      createdAt: editingCustomer?.createdAt || new Date(),
    };
    if (editingCustomer) {
      await db.customers.update(editingCustomer.id!, data);
      toast.success('تم تحديث العميل');
    } else {
      await db.customers.add(data as Customer);
      toast.success('تم إضافة العميل');
    }
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '', email: '', creditLimit: '' });
    loadCustomers();
  };

  const deleteCustomer = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    await db.customers.delete(id);
    toast.success('تم حذف العميل');
    loadCustomers();
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email || '',
        creditLimit: customer.creditLimit.toString(),
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', address: '', email: '', creditLimit: '' });
    }
    setShowModal(true);
  };

  const viewDetails = async (customer: Customer) => {
    const [sales, payments] = await Promise.all([
      db.sales.where('customerId').equals(customer.id!).toArray(),
      db.payments.where('customerId').equals(customer.id!).toArray(),
    ]);
    setCustomerSales(sales);
    setCustomerPayments(payments);
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const printStatement = () => {
    if (!selectedCustomer) return;
    const logo = settings?.storeLogo
      ? `<img class="receipt-logo" src="${settings.storeLogo}" alt="" />`
      : '';
    const salesRows = customerSales
      .map(
        (sale) => `
          <tr>
            <td>${sale.invoiceNumber}</td>
            <td>${formatDate(sale.date)}</td>
            <td>${formatCurrency(sale.total)}</td>
            <td>${formatCurrency(sale.paid)}</td>
            <td>${formatCurrency(sale.remaining)}</td>
          </tr>
        `
      )
      .join('');
    const paymentsRows = customerPayments
      .map(
        (p) => `
          <tr>
            <td>${formatDate(p.date)}</td>
            <td>${formatCurrency(p.amount)}</td>
            <td>${p.method === 'cash' ? 'نقدي' : 'تحويل'}</td>
            <td>${p.notes || '-'}</td>
          </tr>
        `
      )
      .join('');

    const body = `
      <div class="receipt-center">
        ${logo}
        <h2>${settings?.storeName || 'نظام الكاشير'}</h2>
        <h3>كشف حساب عميل</h3>
      </div>
      <p><strong>العميل:</strong> ${selectedCustomer.name} — ${selectedCustomer.phone}</p>
      <p><strong>تاريخ الكشف:</strong> ${formatDate(new Date())}</p>
      <div class="stats-row">
        <div><p class="label">حد الائتمان</p><p class="value">${formatCurrency(selectedCustomer.creditLimit)}</p></div>
        <div><p class="label">الرصيد الحالي</p><p class="value">${formatCurrency(selectedCustomer.balance)}</p></div>
        <div><p class="label">نقاط الولاء</p><p class="value">${selectedCustomer.loyaltyPoints ?? 0}</p></div>
      </div>
      <p class="section-title">فواتير البيع</p>
      <table>
        <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
        <tbody>${salesRows || '<tr><td colspan="5">لا توجد فواتير</td></tr>'}</tbody>
      </table>
      <p class="section-title">سجل التحصيلات</p>
      <table>
        <thead><tr><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th>ملاحظات</th></tr></thead>
        <tbody>${paymentsRows || '<tr><td colspan="4">لا توجد تحصيلات</td></tr>'}</tbody>
      </table>
    `;
    openPrintWindow(`كشف حساب - ${selectedCustomer.name}`, body);
  };

  const addPayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast.error('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    await db.payments.add({
      customerId: selectedCustomer.id,
      amount,
      type: 'collection',
      method: paymentMethod,
      date: new Date(),
      notes: paymentNotes,
      saleId: 0,
    });

    await db.customers.update(selectedCustomer.id!, {
      balance: Math.max(0, selectedCustomer.balance - amount),
    });

    toast.success('تم تسجيل التحصيل');
    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentNotes('');
    loadCustomers();
    viewDetails({ ...selectedCustomer, balance: Math.max(0, selectedCustomer.balance - amount) });
  };

  const totalBalance = customers.reduce((sum, c) => sum + c.balance, 0);
  const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في العملاء..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="rtl"
          />
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          عميل جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي العملاء</p>
          <p className="text-2xl font-bold text-slate-800">{customers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي الذمم</p>
          <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">حد الائتمان</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalCreditLimit)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">عملاء آجلون</p>
          <p className="text-2xl font-bold text-amber-600">{customers.filter((c) => c.balance > 0).length}</p>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الهاتف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العنوان</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الرصيد</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">حد الائتمان</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">نقاط الولاء</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-sm text-slate-800">{customer.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{customer.phone}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{customer.address}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${customer.balance > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                      {formatCurrency(customer.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(customer.creditLimit)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-purple-600">{customer.loyaltyPoints ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => printLoyaltyCard(customer, settings)}
                        className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                        title="طباعة بطاقة ولاء"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => viewDetails(customer)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="كشف حساب"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal(customer)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCustomer(customer.id!)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا يوجد عملاء</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{editingCustomer ? 'تعديل عميل' : 'عميل جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الهاتف *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">العنوان</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">حد الائتمان</label>
                <input
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveCustomer}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">كشف حساب - {selectedCustomer.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={printStatement}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>
                <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">الهاتف:</span> <span className="font-medium">{selectedCustomer.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">العنوان:</span> <span className="font-medium">{selectedCustomer.address}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">حد الائتمان:</span> <span className="font-medium">{formatCurrency(selectedCustomer.creditLimit)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">الرصيد:</span>{' '}
                    <span className={`font-bold ${selectedCustomer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(selectedCustomer.balance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">نقاط الولاء:</span>{' '}
                    <span className="font-bold text-purple-600">{selectedCustomer.loyaltyPoints ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-700">فواتير البيع</h4>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors"
                >
                  <DollarSign className="w-3 h-3" />
                  تسجيل تحصيل
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-right">الفاتورة</th>
                      <th className="px-3 py-2 text-right">التاريخ</th>
                      <th className="px-3 py-2 text-right">المبلغ</th>
                      <th className="px-3 py-2 text-right">المدفوع</th>
                      <th className="px-3 py-2 text-right">المتبقي</th>
                      <th className="px-3 py-2 text-right">النوع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono">{sale.invoiceNumber}</td>
                        <td className="px-3 py-2">{formatDate(sale.date)}</td>
                        <td className="px-3 py-2 font-medium">{formatCurrency(sale.total)}</td>
                        <td className="px-3 py-2 text-emerald-600">{formatCurrency(sale.paid)}</td>
                        <td className="px-3 py-2 text-rose-600">{formatCurrency(sale.remaining)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${sale.paymentType === 'cash' ? 'bg-emerald-100 text-emerald-700' : sale.paymentType === 'credit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {sale.paymentType === 'cash' ? 'نقدي' : sale.paymentType === 'credit' ? 'آجل' : 'مختلط'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {customerSales.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-sm">لا توجد فواتير</p>
              )}

              {customerPayments.length > 0 && (
                <>
                  <h4 className="font-semibold text-slate-700 mt-4">سجل التحصيلات</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-right">التاريخ</th>
                          <th className="px-3 py-2 text-right">المبلغ</th>
                          <th className="px-3 py-2 text-right">الطريقة</th>
                          <th className="px-3 py-2 text-right">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2">{formatDate(payment.date)}</td>
                            <td className="px-3 py-2 font-medium text-emerald-600">{formatCurrency(payment.amount)}</td>
                            <td className="px-3 py-2">{payment.method === 'cash' ? 'نقدي' : 'تحويل'}</td>
                            <td className="px-3 py-2 text-slate-500">{payment.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">تسجيل تحصيل</h3>
            <p className="text-sm text-slate-500 mb-4">{selectedCustomer.name}</p>
            <p className="text-sm mb-4">
              الرصيد الحالي: <span className="font-bold text-rose-600">{formatCurrency(selectedCustomer.balance)}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">المبلغ</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                  step="0.01"
                  max={selectedCustomer.balance}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                      paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    نقدي
                  </button>
                  <button
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                      paymentMethod === 'transfer' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    تحويل
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                  dir="rtl"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addPayment}
                  disabled={!paymentAmount}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  تأكيد
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

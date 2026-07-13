'use client';

import { useState, useEffect } from 'react';
import { db, type Supplier, type SupplierInvoice, type Product, recordStockMovement } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { openPrintWindow } from '@/lib/print';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Eye,
  X,
  Save,
  Search,
  Package,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Suppliers() {
  const { settings, currentUser } = useAppStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', address: '', email: '' });
  const [invoiceItems, setInvoiceItems] = useState<{ productId: number; productName: string; quantity: number; price: number; total: number }[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoicePaid, setInvoicePaid] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [supps, prods] = await Promise.all([db.suppliers.toArray(), db.products.toArray()]);
    setSuppliers(supps);
    setProducts(prods);
  };

  const filteredSuppliers = suppliers.filter(
    (s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery)
  );

  const saveSupplier = async () => {
    if (!supplierForm.name.trim() || !supplierForm.phone.trim()) {
      toast.error('يرجى ملء الاسم ورقم الهاتف');
      return;
    }
    const data = {
      name: supplierForm.name.trim(),
      phone: supplierForm.phone.trim(),
      address: supplierForm.address.trim(),
      email: supplierForm.email.trim(),
      balance: editingSupplier?.balance || 0,
      createdAt: editingSupplier?.createdAt || new Date(),
    };
    if (editingSupplier) {
      await db.suppliers.update(editingSupplier.id!, data);
      toast.success('تم تحديث المورد');
    } else {
      await db.suppliers.add(data as Supplier);
      toast.success('تم إضافة المورد');
    }
    setShowSupplierModal(false);
    setEditingSupplier(null);
    setSupplierForm({ name: '', phone: '', address: '', email: '' });
    loadData();
  };

  const deleteSupplier = async (id: number) => {
    if (!confirm('هل أنت متكد من حذف هذا المورد؟')) return;
    await db.suppliers.delete(id);
    toast.success('تم حذف المورد');
    loadData();
  };

  const openSupplierModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({ name: supplier.name, phone: supplier.phone, address: supplier.address, email: supplier.email || '' });
    } else {
      setEditingSupplier(null);
      setSupplierForm({ name: '', phone: '', address: '', email: '' });
    }
    setShowSupplierModal(true);
  };

  const openInvoiceModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setInvoiceItems([]);
    setInvoiceNumber(`SUP-${Date.now().toString().slice(-6)}`);
    setInvoicePaid('');
    setInvoiceNotes('');
    setShowInvoiceModal(true);
  };

  const addInvoiceItem = (product: Product) => {
    const existing = invoiceItems.find((i) => i.productId === product.id);
    if (existing) {
      setInvoiceItems(invoiceItems.map((i) =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i
      ));
    } else {
      setInvoiceItems([...invoiceItems, { productId: product.id!, productName: product.name, quantity: 1, price: product.cost, total: product.cost }]);
    }
  };

  const updateItemQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setInvoiceItems(invoiceItems.filter((i) => i.productId !== productId));
      return;
    }
    setInvoiceItems(invoiceItems.map((i) =>
      i.productId === productId ? { ...i, quantity: qty, total: qty * i.price } : i
    ));
  };

  const updateItemPrice = (productId: number, price: number) => {
    setInvoiceItems(invoiceItems.map((i) =>
      i.productId === productId ? { ...i, price, total: i.quantity * price } : i
    ));
  };

  const invoiceTotal = invoiceItems.reduce((sum, i) => sum + i.total, 0);
  const invoiceRemaining = invoiceTotal - (parseFloat(invoicePaid) || 0);

  const saveInvoice = async () => {
    if (!selectedSupplier || invoiceItems.length === 0 || !currentUser) return;
    const invoice: SupplierInvoice = {
      supplierId: selectedSupplier.id!,
      invoiceNumber: invoiceNumber,
      total: invoiceTotal,
      paid: parseFloat(invoicePaid) || 0,
      remaining: invoiceRemaining,
      items: invoiceItems,
      date: new Date(),
      notes: invoiceNotes,
    };

    const invoiceId = await db.supplierInvoices.add(invoice);

    // Update supplier balance
    await db.suppliers.update(selectedSupplier.id!, {
      balance: selectedSupplier.balance + invoiceRemaining,
    });

    // Update product stock
    for (const item of invoiceItems) {
      const product = await db.products.get(item.productId);
      if (product) {
        await recordStockMovement({
          productId: item.productId,
          productName: product.name,
          stockBefore: product.stock,
          quantityDelta: item.quantity,
          type: 'purchase',
          userId: currentUser.id!,
          userName: currentUser.name,
          refType: 'supplierInvoice',
          refId: invoiceId,
        });
        await db.products.update(item.productId, { cost: item.price, updatedAt: new Date() });
      }
    }

    toast.success('تم حفظ فاتورة المورد');
    setShowInvoiceModal(false);
    loadData();
  };

  const viewSupplierDetails = async (supplier: Supplier) => {
    const invoices = await db.supplierInvoices.where('supplierId').equals(supplier.id!).toArray();
    setSupplierInvoices(invoices);
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  const printSupplierStatement = () => {
    if (!selectedSupplier) return;
    const logo = settings?.storeLogo
      ? `<img class="receipt-logo" src="${settings.storeLogo}" alt="" />`
      : '';
    const rows = supplierInvoices
      .map(
        (inv) => `
          <tr>
            <td>${inv.invoiceNumber}</td>
            <td>${formatDate(inv.date)}</td>
            <td>${formatCurrency(inv.total)}</td>
            <td>${formatCurrency(inv.paid)}</td>
            <td>${formatCurrency(inv.remaining)}</td>
          </tr>
        `
      )
      .join('');

    const body = `
      <div class="receipt-center">
        ${logo}
        <h2>${settings?.storeName || 'نظام الكاشير'}</h2>
        <h3>كشف حساب مورد</h3>
      </div>
      <p><strong>المورد:</strong> ${selectedSupplier.name} — ${selectedSupplier.phone}</p>
      <p><strong>تاريخ الكشف:</strong> ${formatDate(new Date())}</p>
      <div class="stats-row">
        <div><p class="label">الرصيد الحالي</p><p class="value">${formatCurrency(selectedSupplier.balance)}</p></div>
        <div><p class="label">عدد الفواتير</p><p class="value">${supplierInvoices.length}</p></div>
      </div>
      <p class="section-title">فواتير المشتريات</p>
      <table>
        <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">لا توجد فواتير</td></tr>'}</tbody>
      </table>
    `;
    openPrintWindow(`كشف حساب - ${selectedSupplier.name}`, body);
  };

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
            placeholder="البحث في الموردين..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="rtl"
          />
        </div>
        <button
          onClick={() => openSupplierModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          مورد جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي الموردين</p>
          <p className="text-2xl font-bold text-slate-800">{suppliers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي الذمم</p>
          <p className="text-2xl font-bold text-rose-600">{formatCurrency(suppliers.reduce((sum, s) => sum + s.balance, 0))}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">عدد الفواتير</p>
          <p className="text-2xl font-bold text-blue-600">{supplierInvoices.length}</p>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المورد</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الهاتف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العنوان</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الرصيد</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-sm text-slate-800">{supplier.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{supplier.phone}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{supplier.address}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${supplier.balance > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                      {formatCurrency(supplier.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => viewSupplierDetails(supplier)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="كشف حساب"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openInvoiceModal(supplier)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="فاتورة جديدة"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openSupplierModal(supplier)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSupplier(supplier.id!)}
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
        {filteredSuppliers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Truck className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا يوجد موردين</p>
          </div>
        )}
      </div>

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{editingSupplier ? 'تعديل مورد' : 'مورد جديد'}</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الهاتف *</label>
                <input
                  type="text"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">العنوان</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveSupplier}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
                <button
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">فاتورة مشتريات - {selectedSupplier.name}</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">رقم الفاتورة</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">المبلغ المدفوع</label>
                  <input
                    type="number"
                    value={invoicePaid}
                    onChange={(e) => setInvoicePaid(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Products Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">اختيار المنتجات</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addInvoiceItem(product)}
                      className="p-2 text-right text-sm border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                    >
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(product.cost)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Invoice Items */}
              {invoiceItems.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-right">المنتج</th>
                        <th className="px-3 py-2 text-center">الكمية</th>
                        <th className="px-3 py-2 text-center">السعر</th>
                        <th className="px-3 py-2 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceItems.map((item) => (
                        <tr key={item.productId}>
                          <td className="px-3 py-2">{item.productName}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQty(item.productId, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-slate-200 rounded text-center"
                              min="1"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-3 py-2 text-left font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">الإجمالي</span>
                  <span className="font-medium">{formatCurrency(invoiceTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">المدفوع</span>
                  <span className="font-medium">{formatCurrency(parseFloat(invoicePaid) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
                  <span>المتبقي</span>
                  <span className={invoiceRemaining > 0 ? 'text-rose-600' : 'text-emerald-600'}>{formatCurrency(invoiceRemaining)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={saveInvoice}
                disabled={invoiceItems.length === 0}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-lg flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                حفظ الفاتورة
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">كشف حساب - {selectedSupplier.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={printSupplierStatement}
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
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">الهاتف:</span> <span className="font-medium">{selectedSupplier.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">العنوان:</span> <span className="font-medium">{selectedSupplier.address}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">الرصيد:</span>{' '}
                    <span className={`font-bold ${selectedSupplier.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(selectedSupplier.balance)}
                    </span>
                  </div>
                </div>
              </div>

              <h4 className="font-semibold text-slate-700 mb-2">فواتير المشتريات</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-right">الفاتورة</th>
                      <th className="px-3 py-2 text-right">التاريخ</th>
                      <th className="px-3 py-2 text-right">الإجمالي</th>
                      <th className="px-3 py-2 text-right">المدفوع</th>
                      <th className="px-3 py-2 text-right">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplierInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2">{formatDate(inv.date)}</td>
                        <td className="px-3 py-2 font-medium">{formatCurrency(inv.total)}</td>
                        <td className="px-3 py-2 text-emerald-600">{formatCurrency(inv.paid)}</td>
                        <td className="px-3 py-2 text-rose-600">{formatCurrency(inv.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {supplierInvoices.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-sm">لا توجد فواتير</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

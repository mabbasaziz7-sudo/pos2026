'use client';

import { useState, useEffect, useRef } from 'react';
import { db, type Sale, PAYMENT_TYPE_LABELS, PAYMENT_TYPE_BADGE_CLASSES } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { sendInvoiceWhatsApp } from '@/lib/whatsapp-gateway';
import { Receipt, Search, Eye, Printer, X, RotateCcw, MessageCircle } from 'lucide-react';
import { googleFontLink } from '@/lib/print';
import JsBarcode from 'jsbarcode';
import toast from 'react-hot-toast';

export default function Sales() {
  const { settings, setActiveTab, setPendingReturnInvoice } = useAppStore();

  const startReturn = (invoiceNumber: string) => {
    setPendingReturnInvoice(invoiceNumber);
    setActiveTab('returns');
  };

  const sendInvoiceToCustomer = async (sale: Sale) => {
    if (!sale.customerId) {
      toast.error('لا يوجد عميل مرتبط بهذه الفاتورة');
      return;
    }
    const customer = await db.customers.get(sale.customerId);
    if (!customer?.phone) {
      toast.error('لا يوجد رقم هاتف لهذا العميل');
      return;
    }
    await sendInvoiceWhatsApp(sale, customer.phone, settings);
  };
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'credit' | 'mixed'>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const all = await db.sales.orderBy('date').reverse().toArray();
    setSales(all);
  };

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.customerName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPayment = paymentFilter === 'all' || s.paymentType === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);

  useEffect(() => {
    if (printSale && barcodeRef.current) {
      JsBarcode(barcodeRef.current, printSale.invoiceNumber, {
        format: 'CODE128',
        width: 1.5,
        height: 45,
        displayValue: true,
        fontSize: 12,
      });
    }
  }, [printSale]);

  const printInvoice = () => {
    if (!printRef.current || !printSale) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const maxWidth = settings?.paperWidth === '58mm' ? '220px' : '300px';
    const accent = settings?.printAccentColor || '#10b981';
    const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة ${printSale.invoiceNumber}</title>
          ${googleFontLink(font)}
          <style>
            :root { --accent: ${accent}; }
            body { font-family: ${font}; padding: 20px; max-width: ${maxWidth}; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed var(--accent); padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; padding: 3px 0; }
            .total { border-top: 2px solid var(--accent); margin-top: 10px; padding-top: 10px; font-weight: bold; color: var(--accent); }
            .barcode { text-align: center; margin-top: 15px; }
            .receipt-logo { display: block; height: 56px; max-width: 100%; margin: 0 auto 8px; object-fit: contain; }
            .receipt-items-table { border-collapse: collapse; text-align: center; width: 100%; }
            .receipt-items-table th, .receipt-items-table td { text-align: center; padding: 4px 2px; border-bottom: 1px dashed #ccc; }
            .receipt-items-table thead tr { background: color-mix(in srgb, var(--accent) 15%, white); }
            .receipt-center { text-align: center; }
            .receipt-totals { text-align: center; }
            .receipt-row { display: flex; justify-content: center; gap: 8px; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث برقم الفاتورة أو العميل..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="rtl"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all' as const, label: 'الكل' },
            { id: 'cash' as const, label: 'نقدي' },
            { id: 'credit' as const, label: 'آجل' },
            { id: 'mixed' as const, label: 'مختلط' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setPaymentFilter(f.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                paymentFilter === f.id
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">عدد الفواتير</p>
          <p className="text-2xl font-bold text-slate-800">{filteredSales.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي المبيعات</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي المتبقي</p>
          <p className="text-2xl font-bold text-rose-600">
            {formatCurrency(filteredSales.reduce((sum, s) => sum + s.remaining, 0))}
          </p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الفاتورة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المبلغ</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">النوع</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{sale.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(sale.date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{sale.customerName || 'نقدي'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-emerald-600">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${PAYMENT_TYPE_BADGE_CLASSES[sale.paymentType]}`}>
                      {PAYMENT_TYPE_LABELS[sale.paymentType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      sale.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      sale.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {sale.status === 'completed' ? 'مكتملة' : sale.status === 'cancelled' ? 'ملغاة' : 'معلقة'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPrintSale(sale)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="إعادة طباعة"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startReturn(sale.invoiceNumber)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="مرتجع / استبدال"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => sendInvoiceToCustomer(sale)}
                        className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                        title="إرسال الفاتورة عبر واتساب"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد فواتير مبيعات</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">فاتورة {selectedSale.invoiceNumber}</h3>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">الإجمالي</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(selectedSale.total)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">المدفوع</p>
                  <p className="font-bold text-slate-800">{formatCurrency(selectedSale.paid)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">المتبقي</p>
                  <p className="font-bold text-rose-600">{formatCurrency(selectedSale.remaining)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">الكاشير</p>
                  <p className="font-bold text-slate-800">{selectedSale.userName}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-right">المنتج</th>
                    <th className="px-3 py-2 text-center">الكمية</th>
                    <th className="px-3 py-2 text-center">السعر</th>
                    <th className="px-3 py-2 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-center">{formatCurrency(item.price)}</td>
                      <td className="px-3 py-2 text-left font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedSale.notes && (
                <p className="text-sm text-slate-500 mt-3">ملاحظات: {selectedSale.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {printSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">طباعة الفاتورة</h3>
              <button onClick={() => setPrintSale(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={printRef} className="p-4 border border-slate-200 rounded-lg text-sm" dir="rtl">
              <div className="receipt-center text-center border-b-2 border-dashed border-slate-300 pb-3 mb-3">
                {settings?.storeLogo && (
                  <img
                    src={settings.storeLogo}
                    alt={settings.storeName}
                    className="receipt-logo h-14 mx-auto mb-2 object-contain"
                  />
                )}
                <h2 className="font-bold text-lg">{settings?.storeName || 'نظام الكاشير'}</h2>
                {settings?.showAddressOnReceipt && settings?.storeAddress && (
                  <p className="text-slate-500 text-xs mt-1">{settings.storeAddress}</p>
                )}
                {settings?.showPhoneOnReceipt && settings?.storePhone && (
                  <p className="text-slate-500 text-xs">{settings.storePhone}</p>
                )}
                {settings?.showTaxNumberOnReceipt && settings?.taxNumber && (
                  <p className="text-slate-500 text-xs">الرقم الضريبي: {settings.taxNumber}</p>
                )}
                <p className="text-slate-500 text-xs mt-1">فاتورة ضريبية مبسطة</p>
                <p className="text-slate-500 text-xs">{new Date(printSale.date).toLocaleString('ar-SA')}</p>
              </div>

              <div className="receipt-center mb-3 text-center">
                <p className="text-xs text-slate-500">رقم الفاتورة: {printSale.invoiceNumber}</p>
                <p className="text-xs text-slate-500">الكاشير: {printSale.userName}</p>
                {printSale.customerName && (
                  <p className="text-xs text-slate-500">العميل: {printSale.customerName}</p>
                )}
              </div>

              <table className="receipt-items-table w-full text-xs border-b border-dashed border-slate-300 pb-2 mb-2">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-center">المنتج</th>
                    <th className="text-center">الكمية</th>
                    <th className="text-center">السعر</th>
                    <th className="text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {printSale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-center">{item.productName}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-center">{formatCurrency(item.price)}</td>
                      <td className="text-center">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-totals space-y-1 text-center">
                <div className="receipt-row flex justify-center gap-2">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(printSale.subtotal)}</span>
                </div>
                {printSale.couponDiscount > 0 && (
                  <div className="receipt-row flex justify-center gap-2">
                    <span>خصم كوبون ({printSale.couponCode})</span>
                    <span>-{formatCurrency(printSale.couponDiscount)}</span>
                  </div>
                )}
                <div className="receipt-row flex justify-center gap-2">
                  <span>الضريبة</span>
                  <span>{formatCurrency(printSale.tax)}</span>
                </div>
                <div className="receipt-row flex justify-center gap-2 font-bold border-t border-slate-300 pt-1 mt-1">
                  <span>الصافي</span>
                  <span>{formatCurrency(printSale.total)}</span>
                </div>
                {printSale.voucherAmount > 0 && (
                  <div className="receipt-row flex justify-center gap-2">
                    <span>قسيمة هدايا ({printSale.voucherCode})</span>
                    <span>-{formatCurrency(printSale.voucherAmount)}</span>
                  </div>
                )}
                {printSale.loyaltyDiscount > 0 && (
                  <div className="receipt-row flex justify-center gap-2">
                    <span>نقاط ولاء ({printSale.loyaltyPointsRedeemed} نقطة)</span>
                    <span>-{formatCurrency(printSale.loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="receipt-center text-xs text-slate-500 pt-1">
                  <p>طريقة الدفع</p>
                  <p>{PAYMENT_TYPE_LABELS[printSale.paymentType]}</p>
                </div>
              </div>

              <div className="barcode text-center mt-3">
                <svg ref={barcodeRef} />
              </div>

              <div className="receipt-center text-center mt-4 pt-3 border-t-2 border-dashed border-slate-300">
                <p className="text-xs text-slate-500">{settings?.receiptFooter || 'شكراً لتسوقكم معنا'}</p>
              </div>
            </div>

            <button
              onClick={printInvoice}
              className="w-full mt-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

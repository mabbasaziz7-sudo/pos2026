'use client';

import { useState, useEffect, useRef } from 'react';
import { db, type Voucher, generateVoucherCode } from '@/lib/local-db';
import { formatCurrency, useAppStore } from '@/lib/store';
import { printVoucherCard } from '@/lib/print-cards';
import { Gift, Plus, X, Save, Check, XCircle, RefreshCw, Trash2, QrCode, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export default function Vouchers() {
  const { settings } = useAppStore();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('100');
  const [codeView, setCodeView] = useState<Voucher | null>(null);
  const [printCount, setPrintCount] = useState('1');
  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadVouchers();
  }, []);

  useEffect(() => {
    if (codeView && barcodeSvgRef.current && qrCanvasRef.current) {
      JsBarcode(barcodeSvgRef.current, codeView.code, {
        format: 'CODE128',
        width: 1.5,
        height: 50,
        displayValue: true,
        fontSize: 12,
      });
      QRCode.toCanvas(qrCanvasRef.current, codeView.code, { width: 140, margin: 1 });
    }
  }, [codeView]);

  const printCode = async () => {
    if (!barcodeSvgRef.current || !codeView) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const count = Math.max(parseInt(printCount) || 1, 1);
    const qrSvg = await QRCode.toString(codeView.code, { type: 'svg', width: 140, margin: 1 });
    const label = `
      <div class="label">
        <h3>قسيمة هدايا - ${formatCurrency(codeView.balance)}</h3>
        <div>${qrSvg}</div>
        <div>${barcodeSvgRef.current.outerHTML}</div>
      </div>
    `;
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>قسيمة ${codeView.code}</title>
          <style>
            body { text-align: center; padding: 20px; font-family: Arial, sans-serif; }
            .sheet { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
            .label { border: 1px dashed #ccc; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="sheet">
            ${label.repeat(count)}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const loadVouchers = async () => {
    setVouchers(await db.vouchers.orderBy('id').reverse().toArray());
  };

  const openModal = () => {
    setCode(generateVoucherCode());
    setAmount('100');
    setShowModal(true);
  };

  const saveVoucher = async () => {
    if (!code.trim()) {
      toast.error('يرجى إدخال كود القسيمة');
      return;
    }
    const value = parseFloat(amount) || 0;
    if (value <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    try {
      await db.vouchers.add({
        code: code.trim().toUpperCase(),
        initialAmount: value,
        balance: value,
        isActive: true,
        createdAt: new Date(),
      });
      toast.success('تم إنشاء القسيمة');
      setShowModal(false);
      loadVouchers();
    } catch {
      toast.error('كود القسيمة مستخدم مسبقاً');
    }
  };

  const toggleActive = async (voucher: Voucher) => {
    await db.vouchers.update(voucher.id!, { isActive: !voucher.isActive });
    loadVouchers();
  };

  const deleteVoucher = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه القسيمة؟')) return;
    await db.vouchers.delete(id);
    toast.success('تم حذف القسيمة');
    loadVouchers();
  };

  const totalBalance = vouchers.reduce((sum, v) => sum + v.balance, 0);
  const totalIssued = vouchers.reduce((sum, v) => sum + v.initialAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          قسيمة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">عدد القسائم</p>
          <p className="text-2xl font-bold text-slate-800">{vouchers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي القيمة المصدرة</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalIssued)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">الرصيد المتبقي</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalBalance)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الكود</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">القيمة الأصلية</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الرصيد المتبقي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.map((voucher) => (
                <tr key={voucher.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-slate-800">{voucher.code}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(voucher.initialAmount)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-emerald-600">{formatCurrency(voucher.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(voucher)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        voucher.isActive && voucher.balance > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {voucher.isActive && voucher.balance > 0 ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {!voucher.isActive ? 'معطّلة' : voucher.balance > 0 ? 'فعّالة' : 'مستهلكة'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => printVoucherCard(voucher, settings)}
                        className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                        title="طباعة بطاقة القسيمة"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setCodeView(voucher); setPrintCount('1'); }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="عرض QR والباركود"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteVoucher(voucher.id!)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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
        {vouchers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Gift className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد قسائم</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">قسيمة جديدة</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الكود</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    onClick={() => setCode(generateVoucherCode())}
                    title="توليد كود جديد"
                    className="px-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">القيمة</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveVoucher}
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

      {codeView && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">قسيمة {codeView.code}</h3>
              <button onClick={() => setCodeView(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-3">الرصيد: {formatCurrency(codeView.balance)}</p>
            <canvas ref={qrCanvasRef} className="mx-auto" />
            <svg ref={barcodeSvgRef} className="mx-auto mt-4" />
            <div className="mt-4 text-right">
              <label className="block text-sm font-medium text-slate-600 mb-1">عدد النسخ</label>
              <input
                type="number"
                value={printCount}
                onChange={(e) => setPrintCount(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                min="1"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={printCode}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </button>
              <button onClick={() => setCodeView(null)} className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { db, type Shift, type Sale } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { printShiftSummary as printShiftSummaryReport } from '@/lib/print';
import {
  Clock, Lock, Unlock, Eye, EyeOff, TrendingUp, TrendingDown,
  X, Check, AlertCircle, Printer, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Shifts() {
  const { currentUser, currentShift, setCurrentShift, settings } = useAppStore();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingShift, setClosingShift] = useState<Shift | null>(null);
  const [actualCash, setActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [showExpected, setShowExpected] = useState(false);
  const [shiftSales, setShiftSales] = useState<Sale[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = async () => {
    const all = await db.shifts.orderBy('startTime').reverse().toArray();
    setShifts(all);
    setOpenShifts(all.filter((s) => s.status === 'open'));
  };

  const openCloseModal = (shift: Shift) => {
    setClosingShift(shift);
    setActualCash('');
    setCloseNotes('');
    setShowCloseModal(true);
  };

  const closeShift = async () => {
    if (!closingShift || !actualCash) return;
    const actual = parseFloat(actualCash);
    const difference = actual - closingShift.expectedCash;

    await db.shifts.update(closingShift.id!, {
      endTime: new Date(),
      actualCash: actual,
      difference,
      status: 'closed',
      notes: closeNotes,
    });

    // clear store if the closed shift is the current user's shift
    if (currentShift?.id === closingShift.id) setCurrentShift(null);

    setShowCloseModal(false);
    setClosingShift(null);
    setActualCash('');
    setCloseNotes('');
    loadShifts();
    toast.success('تم إغلاق الوردية بنجاح');
  };

  const viewShiftDetails = async (shift: Shift) => {
    const sales = await db.sales.filter((s) => s.shiftId === shift.id).toArray();
    setShiftSales(sales);
    setSelectedShift(shift);
  };

  const printShiftSummary = () => {
    if (!selectedShift) return;
    printShiftSummaryReport(selectedShift, shiftSales, settings);
  };

  const canCloseShift = (shift: Shift) =>
    currentUser && (currentUser.role === 'admin' || shift.userId === currentUser.id);

  const myShift = openShifts.find((s) => s.userId === currentUser?.id);

  return (
    <div className="space-y-4">

      {/* ── Active Shifts (all open) ── */}
      {openShifts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Users className="w-5 h-5 text-emerald-500" />
            <span>الورديات المفتوحة الآن ({openShifts.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {openShifts.map((shift) => {
              const isMe = shift.userId === currentUser?.id;
              return (
                <div key={shift.id}
                  className={`rounded-xl p-5 text-white shadow-lg ${isMe
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Unlock className="w-4 h-4" />
                        <span className="font-bold">{shift.userName}</span>
                        {isMe && (
                          <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">وردیتك</span>
                        )}
                      </div>
                      <p className="text-white/70 text-xs">بدأت: {formatDate(shift.startTime)}</p>
                    </div>
                    <span className="text-lg font-bold opacity-60">#{shift.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-white/10 rounded-lg p-2.5">
                      <p className="text-white/70 text-xs mb-0.5">إجمالي المبيعات</p>
                      <p className="font-bold text-sm">{formatCurrency(shift.totalSales)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2.5">
                      <p className="text-white/70 text-xs mb-0.5">نقدي</p>
                      <p className="font-bold text-sm">{formatCurrency(shift.totalCashSales)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2.5">
                      <p className="text-white/70 text-xs mb-0.5">آجل</p>
                      <p className="font-bold text-sm">{formatCurrency(shift.totalCreditSales)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2.5">
                      <p className="text-white/70 text-xs mb-0.5">النقد الافتتاحي</p>
                      <p className="font-bold text-sm">{formatCurrency(shift.startingCash)}</p>
                    </div>
                  </div>

                  {canCloseShift(shift) && (
                    <button onClick={() => openCloseModal(shift)}
                      className="w-full py-2 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
                      <Lock className="w-4 h-4" />
                      إغلاق الوردية
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openShifts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-amber-700 font-medium">لا توجد ورديات مفتوحة حالياً</p>
          <p className="text-amber-600 text-sm mt-1">كل كاشير يفتح وردیته من شاشة نقطة البيع</p>
        </div>
      )}

      {!myShift && openShifts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          لا توجد وردية مفتوحة لك — افتح وردية من نقطة البيع للبدء بالبيع.
        </div>
      )}

      {/* ── Shifts History ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">سجل الورديات</h3>
          <button onClick={() => setShowExpected(!showExpected)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            {showExpected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showExpected ? 'إخفاء النقد' : 'إظهار النقد'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#','الكاشير','بداية','نهاية','المبيعات','النقد المتوقع','النتيجة','الحالة','تفاصيل'].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map((shift) => (
                <tr key={shift.id} className={`hover:bg-slate-50 transition-colors ${shift.userId === currentUser?.id && shift.status === 'open' ? 'bg-emerald-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">#{shift.id}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {shift.userName}
                    {shift.userId === currentUser?.id && shift.status === 'open' && (
                      <span className="mr-1.5 text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">أنت</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(shift.startTime)}</td>
                  <td className="px-4 py-3 text-slate-500">{shift.endTime ? formatDate(shift.endTime) : '—'}</td>
                  <td className="px-4 py-3 font-medium text-emerald-600">{formatCurrency(shift.totalSales)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {shift.status === 'closed' && !showExpected ? '***' : formatCurrency(shift.expectedCash)}
                  </td>
                  <td className="px-4 py-3">
                    {shift.difference !== undefined && (
                      <span className={`flex items-center gap-1 font-medium ${shift.difference > 0 ? 'text-emerald-600' : shift.difference < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {shift.difference > 0
                          ? <><TrendingUp className="w-3 h-3" /> فائض {formatCurrency(shift.difference)}</>
                          : shift.difference < 0
                            ? <><TrendingDown className="w-3 h-3" /> عجز {formatCurrency(Math.abs(shift.difference))}</>
                            : 'متزن'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {shift.status === 'open'
                      ? <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">مفتوحة</span>
                      : <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">مغلقة</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => viewShiftDetails(shift)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shifts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد ورديات</p>
          </div>
        )}
      </div>

      {/* ── Close Shift Modal ── */}
      {showCloseModal && closingShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">إغلاق الوردية</h3>
            <p className="text-sm text-slate-500 mb-4">الكاشير: {closingShift.userName} — #{closingShift.id}</p>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">النقدية الافتتاحية</span>
                  <span className="font-medium">{formatCurrency(closingShift.startingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">إجمالي المبيعات النقدية</span>
                  <span className="font-medium">{formatCurrency(closingShift.totalCashSales)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200 pt-2">
                  <span>النقدية المتوقعة</span>
                  <span className="text-emerald-600">{formatCurrency(closingShift.expectedCash)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">النقدية الفعلية في الدرج</label>
                <input type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="أدخل المبلغ الفعلي" min="0" step="0.01" autoFocus />
              </div>

              {actualCash && (
                <div className={`p-3 rounded-lg text-center text-sm font-bold ${
                  parseFloat(actualCash) > closingShift.expectedCash ? 'bg-emerald-50 text-emerald-700'
                  : parseFloat(actualCash) < closingShift.expectedCash ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-50 text-slate-700'}`}>
                  {parseFloat(actualCash) > closingShift.expectedCash
                    ? <span className="flex items-center justify-center gap-1"><TrendingUp className="w-4 h-4" /> فائض: {formatCurrency(parseFloat(actualCash) - closingShift.expectedCash)}</span>
                    : parseFloat(actualCash) < closingShift.expectedCash
                      ? <span className="flex items-center justify-center gap-1"><TrendingDown className="w-4 h-4" /> عجز: {formatCurrency(closingShift.expectedCash - parseFloat(actualCash))}</span>
                      : 'الصندوق متزن'}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2} placeholder="ملاحظات الوردية..." />
              </div>

              <div className="flex gap-2">
                <button onClick={closeShift} disabled={!actualCash}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" /> تأكيد الإغلاق
                </button>
                <button onClick={() => { setShowCloseModal(false); setClosingShift(null); setActualCash(''); }}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Shift Details Modal ── */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">تفاصيل الوردية #{selectedShift.id}</h3>
                <p className="text-sm text-slate-500">{selectedShift.userName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={printShiftSummary}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm rounded-lg">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => setSelectedShift(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'النقدية الافتتاحية', value: formatCurrency(selectedShift.startingCash) },
                  { label: 'المبيعات', value: formatCurrency(selectedShift.totalSales), color: 'text-emerald-600' },
                  { label: 'النقدية الفعلية', value: selectedShift.actualCash ? formatCurrency(selectedShift.actualCash) : '—' },
                  { label: 'الفرق', value: selectedShift.difference !== undefined ? formatCurrency(selectedShift.difference) : '—', color: (selectedShift.difference || 0) > 0 ? 'text-emerald-600' : (selectedShift.difference || 0) < 0 ? 'text-rose-600' : '' },
                ].map(c => (
                  <div key={c.label} className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">{c.label}</p>
                    <p className={`font-bold text-slate-800 ${c.color || ''}`}>{c.value}</p>
                  </div>
                ))}
              </div>
              <h4 className="font-semibold text-slate-700 mb-2">فواتير البيع ({shiftSales.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['الفاتورة','العميل','المبلغ','الدفع','التاريخ'].map(h => (
                        <th key={h} className="px-3 py-2 text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shiftSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs">{sale.invoiceNumber}</td>
                        <td className="px-3 py-2">{sale.customerName || 'نقدي'}</td>
                        <td className="px-3 py-2 font-medium text-emerald-600">{formatCurrency(sale.total)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            sale.paymentType === 'cash' ? 'bg-emerald-100 text-emerald-700'
                            : sale.paymentType === 'credit' ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'}`}>
                            {sale.paymentType === 'cash' ? 'نقدي' : sale.paymentType === 'credit' ? 'آجل' : 'مختلط'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{formatDate(sale.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {shiftSales.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-sm">لا توجد فواتير في هذه الوردية</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

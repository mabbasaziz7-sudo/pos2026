'use client';

import { useState, useEffect } from 'react';
import { db, type Shift, type Sale } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatDate } from '@/lib/store';
import { printShiftSummary as printShiftSummaryReport } from '@/lib/print';
import {
  Clock,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  X,
  Check,
  AlertCircle,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Shifts() {
  const { currentUser, currentShift, setCurrentShift, settings } = useAppStore();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [showExpected, setShowExpected] = useState(false);
  const [shiftSales, setShiftSales] = useState<Sale[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    const all = await db.shifts.orderBy('startTime').reverse().toArray();
    setShifts(all);
  };

  const closeShift = async () => {
    if (!currentShift || !actualCash) return;
    const actual = parseFloat(actualCash);
    const difference = actual - currentShift.expectedCash;

    await db.shifts.update(currentShift.id!, {
      endTime: new Date(),
      actualCash: actual,
      difference: difference,
      status: 'closed',
      notes: closeNotes,
    });

    setCurrentShift(null);
    setShowCloseModal(false);
    setActualCash('');
    setCloseNotes('');
    loadShifts();
    toast.success('تم إغلاق الوردية بنجاح');
  };

  const viewShiftDetails = async (shift: Shift) => {
    const sales = await db.sales.where('shiftId').equals(shift.id!).toArray();
    setShiftSales(sales);
    setSelectedShift(shift);
  };

  const printShiftSummary = () => {
    if (!selectedShift) return;
    printShiftSummaryReport(selectedShift, shiftSales, settings);
  };

  const canClose = currentShift && currentUser && (currentUser.role === 'admin' || currentShift.userId === currentUser.id);

  return (
    <div className="space-y-4">
      {/* Current Shift Card */}
      {currentShift && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Unlock className="w-5 h-5" />
                <h3 className="font-bold text-lg">الوردية الحالية</h3>
              </div>
              <p className="text-emerald-100 text-sm">الكاشير: {currentShift.userName}</p>
              <p className="text-emerald-100 text-sm">بدأت: {formatDate(currentShift.startTime)}</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-sm">رقم الوردية</p>
              <p className="text-2xl font-bold">#{currentShift.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-emerald-100 text-xs">النقدية الافتتاحية</p>
              <p className="text-xl font-bold">{formatCurrency(currentShift.startingCash)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-emerald-100 text-xs">إجمالي المبيعات</p>
              <p className="text-xl font-bold">{formatCurrency(currentShift.totalSales)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-emerald-100 text-xs">مبيعات نقدية</p>
              <p className="text-xl font-bold">{formatCurrency(currentShift.totalCashSales)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-emerald-100 text-xs">مبيعات آجلة</p>
              <p className="text-xl font-bold">{formatCurrency(currentShift.totalCreditSales)}</p>
            </div>
          </div>

          {canClose && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="mt-4 w-full py-2.5 bg-white text-emerald-600 font-bold rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              إغلاق الوردية
            </button>
          )}
        </div>
      )}

      {!currentShift && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-amber-700 font-medium">لا توجد وردية مفتوحة حالياً</p>
          <p className="text-amber-600 text-sm mt-1">يمكنك فتح وردية جديدة من نقطة البيع</p>
        </div>
      )}

      {/* Shifts History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">سجل الورديات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">#</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الكاشير</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">بداية</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">نهاية</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المبيعات</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">النقد المتوقع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">النتيجة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">#{shift.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{shift.userName}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(shift.startTime)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {shift.endTime ? formatDate(shift.endTime) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-emerald-600">{formatCurrency(shift.totalSales)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {shift.status === 'closed' && !showExpected ? (
                      <span className="text-slate-400">***</span>
                    ) : (
                      formatCurrency(shift.expectedCash)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {shift.difference !== undefined && (
                      <span className={`text-sm font-medium flex items-center gap-1 ${shift.difference > 0 ? 'text-emerald-600' : shift.difference < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {shift.difference > 0 ? (
                          <><TrendingUp className="w-3 h-3" /> فائض {formatCurrency(shift.difference)}</>
                        ) : shift.difference < 0 ? (
                          <><TrendingDown className="w-3 h-3" /> عجز {formatCurrency(Math.abs(shift.difference))}</>
                        ) : (
                          'متزن'
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {shift.status === 'open' ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">مفتوحة</span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">مغلقة</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => viewShiftDetails(shift)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
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

      {/* Toggle Expected Cash */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowExpected(!showExpected)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
        >
          {showExpected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showExpected ? 'إخفاء النقد المتوقع' : 'إظهار النقد المتوقع'}
        </button>
      </div>

      {/* Close Shift Modal */}
      {showCloseModal && currentShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">إغلاق الوردية</h3>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">النقدية الافتتاحية</span>
                  <span className="font-medium">{formatCurrency(currentShift.startingCash)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">إجمالي المبيعات النقدية</span>
                  <span className="font-medium">{formatCurrency(currentShift.totalCashSales)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
                  <span>النقدية المتوقعة</span>
                  <span className="text-emerald-600">{formatCurrency(currentShift.expectedCash)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">النقدية الفعلية في الدرج</label>
                <input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="أدخل المبلغ الفعلي"
                  min="0"
                  step="0.01"
                />
              </div>

              {actualCash && (
                <div className={`p-3 rounded-lg text-center ${parseFloat(actualCash) > currentShift.expectedCash ? 'bg-emerald-50 text-emerald-700' : parseFloat(actualCash) < currentShift.expectedCash ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}`}>
                  {parseFloat(actualCash) > currentShift.expectedCash ? (
                    <p className="font-bold flex items-center justify-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      فائض: {formatCurrency(parseFloat(actualCash) - currentShift.expectedCash)}
                    </p>
                  ) : parseFloat(actualCash) < currentShift.expectedCash ? (
                    <p className="font-bold flex items-center justify-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      عجز: {formatCurrency(currentShift.expectedCash - parseFloat(actualCash))}
                    </p>
                  ) : (
                    <p className="font-bold">الصندوق متزن</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                  placeholder="ملاحظات الوردية..."
                  dir="rtl"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={closeShift}
                  disabled={!actualCash}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  تأكيد الإغلاق
                </button>
                <button
                  onClick={() => { setShowCloseModal(false); setActualCash(''); }}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Details Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">تفاصيل الوردية #{selectedShift.id}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={printShiftSummary}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>
                <button onClick={() => setSelectedShift(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">النقدية الافتتاحية</p>
                  <p className="font-bold text-slate-800">{formatCurrency(selectedShift.startingCash)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">المبيعات</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(selectedShift.totalSales)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">النقدية الفعلية</p>
                  <p className="font-bold text-slate-800">{selectedShift.actualCash ? formatCurrency(selectedShift.actualCash) : '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">الفرق</p>
                  <p className={`font-bold ${(selectedShift.difference || 0) > 0 ? 'text-emerald-600' : (selectedShift.difference || 0) < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {selectedShift.difference !== undefined ? formatCurrency(selectedShift.difference) : '-'}
                  </p>
                </div>
              </div>

              <h4 className="font-semibold text-slate-700 mb-2">فواتير البيع ({shiftSales.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-right">الفاتورة</th>
                      <th className="px-3 py-2 text-right">العميل</th>
                      <th className="px-3 py-2 text-right">المبلغ</th>
                      <th className="px-3 py-2 text-right">الدفع</th>
                      <th className="px-3 py-2 text-right">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shiftSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono">{sale.invoiceNumber}</td>
                        <td className="px-3 py-2">{sale.customerName || 'نقدي'}</td>
                        <td className="px-3 py-2 font-medium text-emerald-600">{formatCurrency(sale.total)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${sale.paymentType === 'cash' ? 'bg-emerald-100 text-emerald-700' : sale.paymentType === 'credit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
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

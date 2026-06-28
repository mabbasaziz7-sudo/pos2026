'use client';

import { useState } from 'react';
import { db } from '@/lib/local-db';
import {
  Download,
  Upload,
  Database,
  AlertTriangle,
  Check,
  FileJson,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Backup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = {
        products: await db.products.toArray(),
        customers: await db.customers.toArray(),
        suppliers: await db.suppliers.toArray(),
        supplierInvoices: await db.supplierInvoices.toArray(),
        users: await db.users.toArray(),
        shifts: await db.shifts.toArray(),
        sales: await db.sales.toArray(),
        categories: await db.categories.toArray(),
        payments: await db.payments.toArray(),
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cashier-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!confirm('سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟')) {
        setImporting(false);
        return;
      }

      // Clear all tables
      await db.products.clear();
      await db.customers.clear();
      await db.suppliers.clear();
      await db.supplierInvoices.clear();
      await db.users.clear();
      await db.shifts.clear();
      await db.sales.clear();
      await db.categories.clear();
      await db.payments.clear();

      // Import data
      if (data.products?.length) await db.products.bulkAdd(data.products);
      if (data.customers?.length) await db.customers.bulkAdd(data.customers);
      if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers);
      if (data.supplierInvoices?.length) await db.supplierInvoices.bulkAdd(data.supplierInvoices);
      if (data.users?.length) await db.users.bulkAdd(data.users);
      if (data.shifts?.length) await db.shifts.bulkAdd(data.shifts);
      if (data.sales?.length) await db.sales.bulkAdd(data.sales);
      if (data.categories?.length) await db.categories.bulkAdd(data.categories);
      if (data.payments?.length) await db.payments.bulkAdd(data.payments);

      toast.success('تم استعادة البيانات بنجاح');
      window.location.reload();
    } catch (error) {
      toast.error('حدث خطأ أثناء الاستيراد. تأكد من صحة الملف');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">نسخ احتياطي</h3>
              <p className="text-sm text-slate-500">تصدير جميع البيانات إلى ملف JSON</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg mb-4">
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <p>يتم تصدير: المنتجات، العملاء، الموردين، الفواتير، المستخدمين، الورديات، المبيعات، والتصنيفات</p>
            </div>
          </div>
          <button
            onClick={exportData}
            disabled={exporting}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <FileJson className="w-5 h-5" />
            {exporting ? 'جاري التصدير...' : 'تصدير البيانات'}
          </button>
        </div>

        {/* Import */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">استعادة البيانات</h3>
              <p className="text-sm text-slate-500">استيراد البيانات من ملف نسخ احتياطي</p>
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg mb-4">
            <div className="flex items-start gap-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>تحذير: سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة. تأكد من أخذ نسخة احتياطية أولاً.</p>
            </div>
          </div>
          <label className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Database className="w-5 h-5" />
            {importing ? 'جاري الاستيراد...' : 'اختيار ملف النسخ الاحتياطي'}
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4">معلومات النظام</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">نوع التخزين</p>
            <p className="font-medium text-slate-800">IndexedDB (متصفح)</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">الوضع</p>
            <p className="font-medium text-slate-800">بدون إنترنت (Offline)</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">الإصدار</p>
            <p className="font-medium text-slate-800">1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

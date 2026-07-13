'use client';

import { useState, useEffect } from 'react';
import { db, type Product, type Category, recordStockMovement } from '@/lib/local-db';
import { useAppStore, formatCurrency, formatNumber, formatDate } from '@/lib/store';
import { openPrintWindow } from '@/lib/print';
import {
  Warehouse,
  AlertTriangle,
  PackageCheck,
  PackageX,
  TrendingUp,
  Search,
  Plus,
  Printer,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Inventory() {
  const { settings, currentUser } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<'stock' | 'report' | 'count'>('stock');
  const [adjustModal, setAdjustModal] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // الجرد التفاعلي
  const [countValues, setCountValues] = useState<Record<number, string>>({});
  const [savingCount, setSavingCount] = useState(false);

  // بيانات تقرير الصنف/الفئة
  const [saleItems, setSaleItems] = useState<{productId:number;productName:string;quantity:number;price:number;cost:number;total:number;date:Date}[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (subTab === 'report') loadReportData();
  }, [subTab, selectedProductId, selectedCategory, dateFrom, dateTo]);

  const loadData = async () => {
    const [prods, cats] = await Promise.all([db.products.toArray(), db.categories.toArray()]);
    setProducts(prods);
    setCategories(cats);
  };

  const loadReportData = async () => {
    setLoadingReport(true);
    try {
      const allSales = await db.sales.where('status').equals('completed').toArray();
      const items: typeof saleItems = [];
      for (const sale of allSales) {
        const saleDate = new Date(sale.date);
        if (dateFrom && saleDate < new Date(dateFrom)) continue;
        if (dateTo) {
          const end = new Date(dateTo); end.setHours(23, 59, 59);
          if (saleDate > end) continue;
        }
        for (const item of sale.items) {
          const product = products.find(p => p.id === item.productId);
          if (selectedProductId && item.productId !== selectedProductId) continue;
          if (selectedCategory && product?.category !== selectedCategory) continue;
          items.push({
            productId: item.productId,
            productName: item.productName,
            quantity: Number(item.quantity),
            price: Number(item.price),
            cost: Number(item.cost),
            total: Number(item.total),
            date: saleDate,
          });
        }
      }
      setSaleItems(items);
    } finally {
      setLoadingReport(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
    const matchesCat = !selectedCategory || p.category === selectedCategory;
    if (!matchesSearch || !matchesCat) return false;
    if (filter === 'low') return p.stock <= p.minStock && p.stock > 0;
    if (filter === 'out') return p.stock === 0;
    return true;
  });

  const printInventoryCount = () => {
    const accent = settings?.printAccentColor || '#1a3a6b';
    const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
    const logo = settings?.storeLogo ? `<img src="${settings.storeLogo}" style="height:48px;object-fit:contain;display:block;margin:0 auto 8px;">` : '';
    const title = selectedCategory ? `جرد فئة: ${selectedCategory}` : 'جرد المنتجات';
    const totalValue = filteredProducts.reduce((s, p) => s + p.stock * p.cost, 0);
    const rows = filteredProducts.map((p, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f5f8fa'}">
        <td style="padding:6px 8px;font-size:11px;">${p.name}</td>
        <td style="padding:6px 8px;font-size:10px;font-family:monospace;">${p.barcode}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;">${p.unit}</td>
        <td style="padding:6px 8px;font-size:12px;font-weight:bold;text-align:center;color:${accent};">${p.stock}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:center;">${p.minStock}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:left;">${formatCurrency(p.cost)}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:left;font-weight:bold;">${formatCurrency(p.stock * p.cost)}</td>
        <td style="padding:6px 8px;width:80px;border-bottom:1px solid #ccc;"></td>
        <td style="padding:6px 8px;width:100px;border-bottom:1px solid #ccc;"></td>
      </tr>`).join('');

    const body = `
      <div style="font-family:${font};padding:24px;direction:rtl;">
        <div style="text-align:center;border-bottom:3px solid ${accent};padding-bottom:12px;margin-bottom:16px;">
          ${logo}
          <div style="font-size:20px;font-weight:bold;color:${accent};">${settings?.storeName || ''}</div>
          <div style="font-size:16px;font-weight:bold;margin-top:4px;">ورقة جرد المخزون</div>
          ${selectedCategory ? `<div style="font-size:13px;color:#555;margin-top:2px;">الفئة: ${selectedCategory}</div>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:12px;color:#555;">
          <span>تاريخ الجرد: <strong>${formatDate(new Date())}</strong></span>
          <span>عدد الأصناف: <strong style="color:${accent};">${filteredProducts.length}</strong></span>
          <span>قيمة المخزون: <strong style="color:${accent};">${formatCurrency(totalValue)}</strong></span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:${accent};color:#fff;">
              <th style="padding:7px 8px;font-size:11px;text-align:right;">المنتج</th>
              <th style="padding:7px 8px;font-size:11px;text-align:right;">الباركود</th>
              <th style="padding:7px 8px;font-size:11px;text-align:center;">الوحدة</th>
              <th style="padding:7px 8px;font-size:11px;text-align:center;">المخزون الحالي</th>
              <th style="padding:7px 8px;font-size:11px;text-align:center;">الحد الأدنى</th>
              <th style="padding:7px 8px;font-size:11px;text-align:left;">التكلفة</th>
              <th style="padding:7px 8px;font-size:11px;text-align:left;">القيمة الإجمالية</th>
              <th style="padding:7px 8px;font-size:11px;text-align:center;">العدد الفعلي</th>
              <th style="padding:7px 8px;font-size:11px;text-align:center;">ملاحظات</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="9" style="text-align:center;padding:20px;color:#888;">لا توجد منتجات</td></tr>`}</tbody>
          <tfoot>
            <tr style="border-top:3px double ${accent};background:${accent}0f;">
              <td colspan="6" style="padding:8px;font-size:12px;font-weight:bold;text-align:right;">الإجمالي</td>
              <td style="padding:8px;font-size:13px;font-weight:bold;color:${accent};text-align:left;">${formatCurrency(totalValue)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top:24px;display:flex;justify-content:space-between;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:10px;">
          <span>المسؤول: ___________________</span>
          <span>التوقيع: ___________________</span>
          <span>التاريخ: ___________________</span>
        </div>
      </div>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>
      <style>* { box-sizing:border-box; } @media print { @page { size:A4 landscape; margin:10mm; } }</style>
      </head><body>${body}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const printCategoryReport = () => {
    const accent = settings?.printAccentColor || '#1a3a6b';
    const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
    const logo = settings?.storeLogo ? `<img src="${settings.storeLogo}" style="height:44px;object-fit:contain;display:block;margin:0 auto 8px;">` : '';

    const grouped: Record<string, {qty:number;revenue:number;profit:number;count:number}> = {};
    for (const item of saleItems) {
      if (!grouped[item.productName]) grouped[item.productName] = {qty:0,revenue:0,profit:0,count:0};
      grouped[item.productName].qty += item.quantity;
      grouped[item.productName].revenue += item.total;
      grouped[item.productName].profit += (item.price - item.cost) * item.quantity;
      grouped[item.productName].count++;
    }
    const rows = Object.entries(grouped).sort((a,b) => b[1].revenue - a[1].revenue)
      .map(([name, d], i) => `
        <tr style="background:${i%2===0?'#fff':'#f5f8fa'}">
          <td style="padding:5px 8px;font-size:11px;">${name}</td>
          <td style="padding:5px 8px;font-size:11px;text-align:center;">${d.qty.toFixed(2)}</td>
          <td style="padding:5px 8px;font-size:11px;text-align:left;color:${accent};font-weight:bold;">${formatCurrency(d.revenue)}</td>
          <td style="padding:5px 8px;font-size:11px;text-align:left;color:#059669;">${formatCurrency(d.profit)}</td>
          <td style="padding:5px 8px;font-size:11px;text-align:center;">${d.count}</td>
        </tr>`).join('');

    const totalQty = saleItems.reduce((s,i)=>s+i.quantity,0);
    const totalRev = saleItems.reduce((s,i)=>s+i.total,0);
    const totalProfit = saleItems.reduce((s,i)=>s+(i.price-i.cost)*i.quantity,0);
    const filterTitle = selectedProductId ? products.find(p=>p.id===selectedProductId)?.name
      : selectedCategory ? `فئة: ${selectedCategory}` : 'جميع الأصناف';

    const body = `
      <div style="font-family:${font};padding:24px;direction:rtl;">
        <div style="text-align:center;border-bottom:3px solid ${accent};padding-bottom:10px;margin-bottom:14px;">
          ${logo}
          <div style="font-size:18px;font-weight:bold;color:${accent};">${settings?.storeName || ''}</div>
          <div style="font-size:15px;font-weight:bold;margin:4px 0;">تقرير حركة الأصناف</div>
          <div style="font-size:12px;color:#555;">${filterTitle}</div>
          ${dateFrom||dateTo ? `<div style="font-size:11px;color:#888;">الفترة: ${dateFrom||'البداية'} — ${dateTo||'اليوم'}</div>` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <tr style="background:${accent};color:#fff;">
            <th style="padding:6px 8px;font-size:11px;">المنتج</th>
            <th style="padding:6px 8px;font-size:11px;text-align:center;">الكمية المباعة</th>
            <th style="padding:6px 8px;font-size:11px;text-align:left;">الإيرادات</th>
            <th style="padding:6px 8px;font-size:11px;text-align:left;">الربح</th>
            <th style="padding:6px 8px;font-size:11px;text-align:center;">عدد الصفقات</th>
          </tr>
          ${rows||`<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">لا توجد بيانات</td></tr>`}
          <tr style="border-top:3px double ${accent};background:${accent}0f;font-weight:bold;">
            <td style="padding:7px 8px;font-size:12px;">الإجمالي</td>
            <td style="padding:7px 8px;text-align:center;color:${accent};">${totalQty.toFixed(2)}</td>
            <td style="padding:7px 8px;text-align:left;color:${accent};font-size:13px;">${formatCurrency(totalRev)}</td>
            <td style="padding:7px 8px;text-align:left;color:#059669;font-size:13px;">${formatCurrency(totalProfit)}</td>
            <td></td>
          </tr>
        </table>
        <div style="font-size:10px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:8px;">
          ${settings?.storeName} — طُبع في: ${formatDate(new Date())}
        </div>
      </div>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير الأصناف</title>
      <style>@media print{@page{size:A4;margin:10mm;}}</style></head><body>${body}</body></html>`);
    win.document.close();
    win.onload = () => win.print();
  };

  const adjustStock = async () => {
    if (!adjustModal || !adjustQty || !currentUser) return;
    const delta = parseInt(adjustQty);
    const newStock = adjustModal.stock + delta;
    if (newStock < 0) { toast.error('المخزون لا يمكن أن يكون سالباً'); return; }
    await recordStockMovement({
      productId: adjustModal.id!,
      productName: adjustModal.name,
      stockBefore: adjustModal.stock,
      quantityDelta: delta,
      type: 'adjustment',
      userId: currentUser.id!,
      userName: currentUser.name,
      reason: adjustReason.trim() || undefined,
    });
    toast.success('تم تعديل المخزون');
    setAdjustModal(null); setAdjustQty(''); setAdjustReason('');
    loadData();
  };

  // يحفظ فروقات الجرد التفاعلي: لكل صنف أُدخل له عدد فعلي مختلف عن مخزون النظام،
  // يُنشئ حركة تسوية تلقائية بالفرق (بدل تعديل يدوي لاحق لكل صنف على حدة)
  const saveCount = async () => {
    if (!currentUser) return;
    const changes = Object.entries(countValues)
      .map(([id, val]) => ({ product: products.find(p => p.id === Number(id)), actual: parseFloat(val) }))
      .filter((c): c is { product: Product; actual: number } => !!c.product && !isNaN(c.actual) && c.actual !== c.product.stock);

    if (changes.length === 0) { toast.error('لا توجد فروقات لحفظها'); return; }

    setSavingCount(true);
    try {
      for (const { product, actual } of changes) {
        await recordStockMovement({
          productId: product.id!,
          productName: product.name,
          stockBefore: product.stock,
          quantityDelta: actual - product.stock,
          type: 'adjustment',
          userId: currentUser.id!,
          userName: currentUser.name,
          reason: 'جرد دوري',
        });
      }
      toast.success(`تم حفظ ${changes.length} تسوية جرد`);
      setCountValues({});
      loadData();
    } finally {
      setSavingCount(false);
    }
  };

  // إحصائيات تقرير الصنف/الفئة
  const reportTotalQty = saleItems.reduce((s, i) => s + i.quantity, 0);
  const reportRevenue = saleItems.reduce((s, i) => s + i.total, 0);
  const reportProfit = saleItems.reduce((s, i) => s + (i.price - i.cost) * i.quantity, 0);
  const grouped: Record<string, {qty:number;revenue:number;profit:number}> = {};
  for (const item of saleItems) {
    if (!grouped[item.productName]) grouped[item.productName] = {qty:0,revenue:0,profit:0};
    grouped[item.productName].qty += item.quantity;
    grouped[item.productName].revenue += item.total;
    grouped[item.productName].profit += (item.price - item.cost) * item.quantity;
  }
  const topGrouped = Object.entries(grouped).sort((a,b) => b[1].revenue - a[1].revenue);

  const totalValue = products.reduce((s, p) => s + p.stock * p.cost, 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Warehouse, color: 'text-blue-500', bg: 'bg-blue-50', label: 'إجمالي المخزون', value: formatNumber(products.reduce((s,p)=>s+p.stock,0)) },
          { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'قيمة التكلفة', value: formatCurrency(totalValue) },
          { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'منخفض المخزون', value: String(lowStockCount) },
          { icon: PackageX, color: 'text-rose-500', bg: 'bg-rose-50', label: 'نفذ المخزون', value: String(outOfStockCount) },
        ].map(s => (
          <div key={s.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
            <p className="text-xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button onClick={() => setSubTab('stock')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab==='stock' ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <PackageCheck className="w-4 h-4" /> جرد المخزون
        </button>
        <button onClick={() => setSubTab('report')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab==='report' ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <BarChart3 className="w-4 h-4" /> تقرير الصنف/الفئة
        </button>
        <button onClick={() => setSubTab('count')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab==='count' ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <PackageCheck className="w-4 h-4" /> جرد تفاعلي
        </button>
      </div>

      {/* ===== الجرد التفاعلي: إدخال العدد الفعلي وحفظ الفروقات دفعة واحدة ===== */}
      {subTab === 'count' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <span className="font-medium text-slate-700 text-sm">أدخل العدد الفعلي لكل صنف بعد الجرد اليدوي، ثم احفظ الفروقات</span>
            <button onClick={saveCount} disabled={savingCount}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
              حفظ فروقات الجرد
            </button>
          </div>
          <div className="overflow-x-auto max-h-[65vh]">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-right">المنتج</th>
                  <th className="px-4 py-3 text-center">مخزون النظام</th>
                  <th className="px-4 py-3 text-center">العدد الفعلي</th>
                  <th className="px-4 py-3 text-center">الفرق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const val = countValues[p.id!];
                  const actual = val !== undefined ? parseFloat(val) : NaN;
                  const diff = !isNaN(actual) ? actual - p.stock : null;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{p.stock} {p.unit}</td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" value={val ?? ''} placeholder={String(p.stock)}
                          onChange={(e) => setCountValues({ ...countValues, [p.id!]: e.target.value })}
                          className="w-24 text-center px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold">
                        {diff === null ? <span className="text-slate-300">—</span>
                          : diff === 0 ? <span className="text-slate-400">0</span>
                          : diff > 0 ? <span className="text-emerald-600">+{diff}</span>
                          : <span className="text-rose-600">{diff}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== جرد المخزون ===== */}
      {subTab === 'stock' && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {([{id:'all' as const,label:'الكل',icon:PackageCheck},{id:'low' as const,label:'منخفض',icon:AlertTriangle},{id:'out' as const,label:'نفذ',icon:PackageX}] ).map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter===f.id ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <f.icon className="w-4 h-4" />{f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {/* فلتر الفئة */}
              <div className="relative">
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white" dir="rtl">
                  <option value="">جميع الفئات</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث..." className="pr-9 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44" dir="rtl" />
              </div>
              <button onClick={printInventoryCount}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm transition-colors shadow-sm whitespace-nowrap">
                <Printer className="w-4 h-4" />
                طباعة الجرد{selectedCategory ? ` (${selectedCategory})` : ''}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-medium text-slate-700 text-sm">{filteredProducts.length} منتج {selectedCategory ? `— فئة: ${selectedCategory}` : ''}</span>
              <span className="text-sm text-slate-500">القيمة الإجمالية: <strong className="text-slate-700">{formatCurrency(filteredProducts.reduce((s,p)=>s+p.stock*p.cost,0))}</strong></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-right">المنتج</th>
                    <th className="px-4 py-3 text-right">الفئة</th>
                    <th className="px-4 py-3 text-right">الباركود</th>
                    <th className="px-4 py-3 text-center">المخزون</th>
                    <th className="px-4 py-3 text-center">الحد الأدنى</th>
                    <th className="px-4 py-3 text-right">التكلفة</th>
                    <th className="px-4 py-3 text-right">القيمة</th>
                    <th className="px-4 py-3 text-center">الحالة</th>
                    <th className="px-4 py-3 text-center">تعديل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.category}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.barcode}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${p.stock === 0 ? 'text-rose-600' : p.stock <= p.minStock ? 'text-amber-600' : 'text-slate-800'}`}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-500">{p.minStock}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(p.cost)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">{formatCurrency(p.stock * p.cost)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${p.stock === 0 ? 'bg-rose-100 text-rose-700' : p.stock <= p.minStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {p.stock === 0 ? 'نفذ' : p.stock <= p.minStock ? 'منخفض' : 'متوفر'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setAdjustModal(p)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Warehouse className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>لا توجد منتجات</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== تقرير الصنف/الفئة ===== */}
      {subTab === 'report' && (
        <>
          {/* فلاتر التقرير */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">الفئة</label>
                <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedProductId(null); }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44" dir="rtl">
                  <option value="">جميع الفئات</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">صنف محدد</label>
                <select value={selectedProductId ?? ''} onChange={(e) => setSelectedProductId(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52" dir="rtl">
                  <option value="">جميع الأصناف</option>
                  {products.filter(p => !selectedCategory || p.category === selectedCategory)
                    .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">من تاريخ</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">إلى تاريخ</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <button onClick={printCategoryReport}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm transition-colors whitespace-nowrap">
                <Printer className="w-4 h-4" /> طباعة التقرير
              </button>
            </div>
          </div>

          {/* ملخص */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'الكمية المباعة', value: reportTotalQty.toFixed(2), color: 'text-blue-600' },
              { label: 'إجمالي الإيرادات', value: formatCurrency(reportRevenue), color: 'text-emerald-600' },
              { label: 'الربح التقديري', value: formatCurrency(reportProfit), color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* جدول الأصناف */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm">
                {selectedProductId ? products.find(p=>p.id===selectedProductId)?.name
                  : selectedCategory ? `فئة: ${selectedCategory}` : 'جميع الأصناف'} — {topGrouped.length} صنف
              </h3>
            </div>
            {loadingReport ? (
              <div className="text-center py-12 text-slate-400">جاري التحميل...</div>
            ) : topGrouped.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-25" /><p>لا توجد مبيعات في هذه الفترة للتصفية المحددة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-medium text-slate-500">
                      <th className="px-4 py-3 text-right">الصنف</th>
                      <th className="px-4 py-3 text-center">الكمية المباعة</th>
                      <th className="px-4 py-3 text-right">الإيرادات</th>
                      <th className="px-4 py-3 text-right">الربح</th>
                      <th className="px-4 py-3 text-center">نسبة الإيرادات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topGrouped.map(([name, d], i) => (
                      <tr key={name} className={`border-b border-slate-50 ${i%2===0?'':'bg-slate-50/40'}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">{name}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{d.qty.toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(d.revenue)}</td>
                        <td className="px-4 py-3 text-purple-600">{formatCurrency(d.profit)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.round((d.revenue/reportRevenue)*100)}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 w-8">{Math.round((d.revenue/reportRevenue)*100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                      <td className="px-4 py-3 text-slate-700">الإجمالي</td>
                      <td className="px-4 py-3 text-center text-blue-700">{reportTotalQty.toFixed(2)}</td>
                      <td className="px-4 py-3 text-emerald-700">{formatCurrency(reportRevenue)}</td>
                      <td className="px-4 py-3 text-purple-700">{formatCurrency(reportProfit)}</td>
                      <td className="px-4 py-3 text-center text-slate-400">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* نافذة تعديل المخزون */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">تعديل المخزون</h3>
            <p className="text-sm text-slate-500 mb-1">{adjustModal.name}</p>
            <p className="text-sm mb-4">المخزون الحالي: <span className="font-bold text-emerald-600">{adjustModal.stock} {adjustModal.unit}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الكمية (+ إضافة / − خصم)</label>
                <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: 10 أو -5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">السبب (اختياري)</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="سبب التعديل..." dir="rtl" />
              </div>
              <div className="flex gap-2">
                <button onClick={adjustStock} disabled={!adjustQty}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-lg">
                  تأكيد
                </button>
                <button onClick={() => { setAdjustModal(null); setAdjustQty(''); }}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
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

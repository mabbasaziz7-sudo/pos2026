'use client';

import { useState, useEffect, useRef } from 'react';
import {
  db,
  type Offer,
  type Coupon,
  type Product,
  type Category,
  generateCouponCode,
} from '@/lib/local-db';
import { formatCurrency, formatDate } from '@/lib/store';
import { Tag, Ticket, Plus, Edit2, Trash2, X, Save, Check, XCircle, RefreshCw, QrCode, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export default function Promotions() {
  const [subTab, setSubTab] = useState<'offers' | 'coupons'>('offers');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('offers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'offers' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Tag className="w-4 h-4" />
          العروض
        </button>
        <button
          onClick={() => setSubTab('coupons')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'coupons' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Ticket className="w-4 h-4" />
          الكوبونات
        </button>
      </div>

      {subTab === 'offers' ? <OffersPanel /> : <CouponsPanel />}
    </div>
  );
}

function isOfferLive(offer: Offer) {
  const now = new Date();
  return offer.isActive && new Date(offer.startDate) <= now && now <= new Date(offer.endDate);
}

function OffersPanel() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState<'product' | 'category' | 'bundle'>('category');
  const [productIds, setProductIds] = useState<number[]>([]);
  const [category, setCategory] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // عرض مجمّع (Bundle)
  const [bundleProducts, setBundleProducts] = useState<{productId: number; productName: string; qty: number}[]>([]);
  const [bundlePrice, setBundlePrice] = useState('');
  const addBundleProduct = (product: Product) => {
    if (bundleProducts.find(b => b.productId === product.id)) return;
    setBundleProducts(prev => [...prev, { productId: product.id!, productName: product.name, qty: 1 }]);
  };
  const removeBundleProduct = (productId: number) => setBundleProducts(prev => prev.filter(b => b.productId !== productId));
  const updateBundleQty = (productId: number, qty: number) =>
    setBundleProducts(prev => prev.map(b => b.productId === productId ? { ...b, qty: Math.max(1, qty) } : b));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [o, p, c] = await Promise.all([
      db.offers.toArray(),
      db.products.toArray(),
      db.categories.toArray(),
    ]);
    setOffers(o);
    setProducts(p);
    setCategories(c);
  };

  const toDateInput = (d: Date) => new Date(d).toISOString().split('T')[0];

  const openModal = (offer?: Offer) => {
    if (offer) {
      setEditingOffer(offer);
      setName(offer.name);
      setTargetType(offer.targetType);
      setProductIds(offer.productIds);
      setCategory(offer.category);
      setDiscountType(offer.discountType);
      setDiscountValue(offer.discountValue.toString());
      setStartDate(toDateInput(offer.startDate));
      setEndDate(toDateInput(offer.endDate));
      setBundleProducts(offer.bundleProducts || []);
      setBundlePrice(offer.bundlePrice?.toString() || '');
    } else {
      setEditingOffer(null);
      setName('');
      setTargetType('category');
      setProductIds([]);
      setCategory(categories[0]?.name || '');
      setDiscountType('percentage');
      setDiscountValue('10');
      setBundleProducts([]);
      setBundlePrice('');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    }
    setShowModal(true);
  };

  const toggleProduct = (id: number) => {
    setProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const saveOffer = async () => {
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم العرض');
      return;
    }
    if (targetType === 'product' && productIds.length === 0) {
      toast.error('يرجى اختيار منتج واحد على الأقل');
      return;
    }
    if (targetType === 'category' && !category) {
      toast.error('يرجى اختيار فئة');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('يرجى تحديد فترة العرض');
      return;
    }

    if (targetType === 'bundle' && bundleProducts.length < 2) {
      toast.error('العرض المجمّع يحتاج منتجين على الأقل');
      return;
    }
    const data = {
      name: name.trim(),
      targetType,
      productIds: targetType === 'product' ? productIds : [],
      category: targetType === 'category' ? category : '',
      discountType,
      discountValue: targetType === 'bundle' ? 0 : parseFloat(discountValue) || 0,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: editingOffer?.isActive ?? true,
      createdAt: editingOffer?.createdAt || new Date(),
      bundleProducts: targetType === 'bundle' ? bundleProducts : undefined,
      bundlePrice: targetType === 'bundle' ? (parseFloat(bundlePrice) || 0) : undefined,
    };

    if (editingOffer) {
      await db.offers.update(editingOffer.id!, data);
      toast.success('تم تحديث العرض');
    } else {
      await db.offers.add(data as Offer);
      toast.success('تم إضافة العرض');
    }
    setShowModal(false);
    loadData();
  };

  const toggleActive = async (offer: Offer) => {
    await db.offers.update(offer.id!, { isActive: !offer.isActive });
    loadData();
  };

  const deleteOffer = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    await db.offers.delete(id);
    toast.success('تم حذف العرض');
    loadData();
  };

  const targetLabel = (offer: Offer) =>
    offer.targetType === 'category'
      ? `الفئة: ${offer.category}`
      : `${offer.productIds.length} منتج محدد`;

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          عرض جديد
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العرض</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المستهدف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الخصم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الفترة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offers.map((offer) => (
                <tr key={offer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{offer.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{targetLabel(offer)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 font-medium">
                    {offer.discountType === 'percentage' ? `${offer.discountValue}%` : formatCurrency(offer.discountValue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {formatDate(offer.startDate)} - {formatDate(offer.endDate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(offer)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        isOfferLive(offer) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isOfferLive(offer) ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {offer.isActive ? (isOfferLive(offer) ? 'فعّال' : 'خارج الفترة') : 'معطّل'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openModal(offer)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteOffer(offer.id!)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {offers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Tag className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد عروض</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{editingOffer ? 'تعديل عرض' : 'عرض جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">اسم العرض *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">يُطبَّق على</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'category', label: 'فئة كاملة' },
                    { id: 'product', label: 'منتجات محددة' },
                    { id: 'bundle', label: '🎁 عرض مجمّع' },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTargetType(t.id)}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                        targetType === t.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {targetType === 'category' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">الفئة</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" dir="rtl">
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              ) : targetType === 'product' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">المنتجات</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                    {products.map((p) => (
                      <button key={p.id} onClick={() => toggleProduct(p.id!)}
                        className={`p-2 text-right text-sm rounded-lg border transition-colors ${productIds.includes(p.id!) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ===== عرض مجمّع ===== */
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">السعر الإجمالي للحزمة</label>
                    <input type="number" step="0.01" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="السعر المخفّض للحزمة كاملةً" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">منتجات الحزمة</label>
                    {bundleProducts.map((bp) => (
                      <div key={bp.productId} className="flex items-center gap-2 mb-2">
                        <span className="flex-1 text-sm text-slate-700">{bp.productName}</span>
                        <input type="number" min={1} value={bp.qty}
                          onChange={(e) => updateBundleQty(bp.productId, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center" />
                        <span className="text-xs text-slate-400">قطعة</span>
                        <button onClick={() => removeBundleProduct(bp.productId)} className="text-rose-400 hover:text-rose-600 text-xs">✕</button>
                      </div>
                    ))}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-36 overflow-y-auto p-2 border border-dashed border-slate-300 rounded-lg mt-1">
                      {products.filter(p => !bundleProducts.find(b => b.productId === p.id)).map((p) => (
                        <button key={p.id} onClick={() => addBundleProduct(p)}
                          className="p-1.5 text-right text-xs rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600">
                          + {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">نوع الخصم</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDiscountType('percentage')}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                        discountType === 'percentage' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      نسبة %
                    </button>
                    <button
                      onClick={() => setDiscountType('fixed')}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                        discountType === 'fixed' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      مبلغ ثابت
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">قيمة الخصم</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveOffer}
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

function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [minPurchase, setMinPurchase] = useState('0');
  const [expiryDate, setExpiryDate] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [codeView, setCodeView] = useState<Coupon | null>(null);
  const [printCount, setPrintCount] = useState('1');
  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadCoupons();
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
        <h3>كوبون خصم</h3>
        <div>${qrSvg}</div>
        <div>${barcodeSvgRef.current.outerHTML}</div>
      </div>
    `;
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>كوبون ${codeView.code}</title>
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

  const loadCoupons = async () => {
    setCoupons(await db.coupons.toArray());
  };

  const openModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCode(coupon.code);
      setDiscountType(coupon.discountType);
      setDiscountValue(coupon.discountValue.toString());
      setMinPurchase(coupon.minPurchase.toString());
      setExpiryDate(new Date(coupon.expiryDate).toISOString().split('T')[0]);
      setMaxUses(coupon.maxUses.toString());
    } else {
      setEditingCoupon(null);
      setCode(generateCouponCode());
      setDiscountType('percentage');
      setDiscountValue('10');
      setMinPurchase('0');
      const future = new Date();
      future.setMonth(future.getMonth() + 1);
      setExpiryDate(future.toISOString().split('T')[0]);
      setMaxUses('1');
    }
    setShowModal(true);
  };

  const saveCoupon = async () => {
    if (!code.trim()) {
      toast.error('يرجى إدخال كود الكوبون');
      return;
    }
    const data = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      minPurchase: parseFloat(minPurchase) || 0,
      expiryDate: new Date(expiryDate),
      maxUses: parseInt(maxUses) || 1,
      usedCount: editingCoupon?.usedCount || 0,
      isActive: editingCoupon?.isActive ?? true,
      createdAt: editingCoupon?.createdAt || new Date(),
    };
    try {
      if (editingCoupon) {
        await db.coupons.update(editingCoupon.id!, data);
        toast.success('تم تحديث الكوبون');
      } else {
        await db.coupons.add(data as Coupon);
        toast.success('تم إضافة الكوبون');
      }
      setShowModal(false);
      loadCoupons();
    } catch {
      toast.error('كود الكوبون مستخدم مسبقاً');
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    await db.coupons.update(coupon.id!, { isActive: !coupon.isActive });
    loadCoupons();
  };

  const deleteCoupon = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    await db.coupons.delete(id);
    toast.success('تم حذف الكوبون');
    loadCoupons();
  };

  const isCouponLive = (c: Coupon) => c.isActive && new Date(c.expiryDate) >= new Date() && c.usedCount < c.maxUses;

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          كوبون جديد
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الكود</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الخصم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">حد أدنى</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الانتهاء</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الاستخدام</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-slate-800">{coupon.code}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 font-medium">
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(coupon.minPurchase)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(coupon.expiryDate)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{coupon.usedCount} / {coupon.maxUses}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(coupon)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        isCouponLive(coupon) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isCouponLive(coupon) ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {coupon.isActive ? (isCouponLive(coupon) ? 'فعّال' : 'منتهي') : 'معطّل'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setCodeView(coupon); setPrintCount('1'); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="عرض QR والباركود">
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button onClick={() => openModal(coupon)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteCoupon(coupon.id!)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {coupons.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Ticket className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد كوبونات</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{editingCoupon ? 'تعديل كوبون' : 'كوبون جديد'}</h3>
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
                    onClick={() => setCode(generateCouponCode())}
                    title="توليد كود جديد"
                    className="px-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">نوع الخصم</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDiscountType('percentage')}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                        discountType === 'percentage' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      نسبة %
                    </button>
                    <button
                      onClick={() => setDiscountType('fixed')}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                        discountType === 'fixed' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      مبلغ ثابت
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">قيمة الخصم</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">حد أدنى للفاتورة</label>
                  <input
                    type="number"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">عدد مرات الاستخدام</label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveCoupon}
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
              <h3 className="font-bold text-slate-800">كوبون {codeView.code}</h3>
              <button onClick={() => setCodeView(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
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
    </>
  );
}

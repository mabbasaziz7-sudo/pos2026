'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/local-db';
import { useAppStore } from '@/lib/store';
import { Save, Store, Receipt, Check, Upload, X, Monitor, Gift, MessageCircle, Scale } from 'lucide-react';
import toast from 'react-hot-toast';

const currencies = [
  { code: 'SAR', label: 'ريال سعودي (SAR)' },
  { code: 'USD', label: 'دولار أمريكي (USD)' },
  { code: 'AED', label: 'درهم إماراتي (AED)' },
  { code: 'EGP', label: 'جنيه مصري (EGP)' },
  { code: 'KWD', label: 'دينار كويتي (KWD)' },
  { code: 'QAR', label: 'ريال قطري (QAR)' },
  { code: 'BHD', label: 'دينار بحريني (BHD)' },
  { code: 'OMR', label: 'ريال عماني (OMR)' },
  { code: 'JOD', label: 'دينار أردني (JOD)' },
];

export default function Settings() {
  const { setSettings } = useAppStore();
  const [storeName, setStoreName] = useState('');
  const [storeLogo, setStoreLogo] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxRatePercent, setTaxRatePercent] = useState('15');
  const [currencyCode, setCurrencyCode] = useState('SAR');
  const [receiptFooter, setReceiptFooter] = useState('شكراً لتسوقكم معنا');
  const [showAddressOnReceipt, setShowAddressOnReceipt] = useState(true);
  const [showPhoneOnReceipt, setShowPhoneOnReceipt] = useState(true);
  const [showTaxNumberOnReceipt, setShowTaxNumberOnReceipt] = useState(true);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [displayWelcomeMessage, setDisplayWelcomeMessage] = useState('مرحباً بكم');
  const [displayIdleImage, setDisplayIdleImage] = useState('');
  const [displayBgColor, setDisplayBgColor] = useState('#0f172a');
  const [displayAccentColor, setDisplayAccentColor] = useState('#10b981');
  const [loyaltyPointValue, setLoyaltyPointValue] = useState('0.1');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('966');
  const [enableScaleBarcodes, setEnableScaleBarcodes] = useState(false);
  const [scaleBarcodePrefix, setScaleBarcodePrefix] = useState('2');
  const [printAccentColor, setPrintAccentColor] = useState('#10b981');
  const [printFontFamily, setPrintFontFamily] = useState('Tahoma, Arial, sans-serif');
  // تخصيص حقول المطبوعات
  const [receiptShowLogo, setReceiptShowLogo] = useState(true);
  const [receiptShowCustomer, setReceiptShowCustomer] = useState(true);
  const [receiptShowBarcode, setReceiptShowBarcode] = useState(true);
  const [receiptShowPaymentMethod, setReceiptShowPaymentMethod] = useState(true);
  const [receiptShowTax, setReceiptShowTax] = useState(true);
  const [receiptShowDiscounts, setReceiptShowDiscounts] = useState(true);
  const [receiptShowRemaining, setReceiptShowRemaining] = useState(true);
  const [shiftShowLogo, setShiftShowLogo] = useState(true);
  const [shiftShowSalesList, setShiftShowSalesList] = useState(true);
  const [shiftShowCashDetails, setShiftShowCashDetails] = useState(true);
  const [returnShowBarcode, setReturnShowBarcode] = useState(true);
  const [returnShowOriginalInvoice, setReturnShowOriginalInvoice] = useState(true);
  const [returnShowReason, setReturnShowReason] = useState(true);
  const [reportShowProfit, setReportShowProfit] = useState(true);
  const [reportShowTopProducts, setReportShowTopProducts] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const current = await db.settings.get(1);
      if (current) {
        setStoreName(current.storeName);
        setStoreLogo(current.storeLogo ?? '');
        setStoreAddress(current.storeAddress);
        setStorePhone(current.storePhone);
        setTaxNumber(current.taxNumber);
        setTaxRatePercent(String(current.taxRate * 100));
        setCurrencyCode(current.currencyCode);
        setReceiptFooter(current.receiptFooter ?? 'شكراً لتسوقكم معنا');
        setShowAddressOnReceipt(current.showAddressOnReceipt ?? true);
        setShowPhoneOnReceipt(current.showPhoneOnReceipt ?? true);
        setShowTaxNumberOnReceipt(current.showTaxNumberOnReceipt ?? true);
        setPaperWidth(current.paperWidth ?? '80mm');
        setDisplayWelcomeMessage(current.displayWelcomeMessage ?? 'مرحباً بكم');
        setDisplayIdleImage(current.displayIdleImage ?? '');
        setDisplayBgColor(current.displayBgColor ?? '#0f172a');
        setDisplayAccentColor(current.displayAccentColor ?? '#10b981');
        setLoyaltyPointValue(String(current.loyaltyPointValue ?? 0.1));
        setWhatsappCountryCode(current.whatsappCountryCode ?? '966');
        setEnableScaleBarcodes(current.enableScaleBarcodes ?? false);
        setScaleBarcodePrefix(current.scaleBarcodePrefix ?? '2');
        setPrintAccentColor(current.printAccentColor ?? '#10b981');
        setPrintFontFamily(current.printFontFamily ?? 'Tahoma, Arial, sans-serif');
        setReceiptShowLogo(current.receiptShowLogo !== false);
        setReceiptShowCustomer(current.receiptShowCustomer !== false);
        setReceiptShowBarcode(current.receiptShowBarcode !== false);
        setReceiptShowPaymentMethod(current.receiptShowPaymentMethod !== false);
        setReceiptShowTax(current.receiptShowTax !== false);
        setReceiptShowDiscounts(current.receiptShowDiscounts !== false);
        setReceiptShowRemaining(current.receiptShowRemaining !== false);
        setShiftShowLogo(current.shiftShowLogo !== false);
        setShiftShowSalesList(current.shiftShowSalesList !== false);
        setShiftShowCashDetails(current.shiftShowCashDetails !== false);
        setReturnShowBarcode(current.returnShowBarcode !== false);
        setReturnShowOriginalInvoice(current.returnShowOriginalInvoice !== false);
        setReturnShowReason(current.returnShowReason !== false);
        setReportShowProfit(current.reportShowProfit !== false);
        setReportShowTopProducts(current.reportShowTopProducts !== false);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!storeName.trim()) {
      toast.error('يرجى إدخال اسم المتجر');
      return;
    }
    const updated = {
      id: 1,
      storeName: storeName.trim(),
      storeLogo,
      storeAddress: storeAddress.trim(),
      storePhone: storePhone.trim(),
      taxNumber: taxNumber.trim(),
      taxRate: (parseFloat(taxRatePercent) || 0) / 100,
      currencyCode,
      receiptFooter: receiptFooter.trim(),
      showAddressOnReceipt,
      showPhoneOnReceipt,
      showTaxNumberOnReceipt,
      paperWidth,
      displayWelcomeMessage: displayWelcomeMessage.trim(),
      displayIdleImage,
      displayBgColor,
      displayAccentColor,
      loyaltyPointValue: parseFloat(loyaltyPointValue) || 0,
      whatsappCountryCode: whatsappCountryCode.trim() || '966',
      enableScaleBarcodes,
      scaleBarcodePrefix: scaleBarcodePrefix.trim() || '2',
      printAccentColor,
      printFontFamily,
      receiptShowLogo, receiptShowCustomer, receiptShowBarcode, receiptShowPaymentMethod,
      receiptShowTax, receiptShowDiscounts, receiptShowRemaining,
      shiftShowLogo, shiftShowSalesList, shiftShowCashDetails,
      returnShowBarcode, returnShowOriginalInvoice, returnShowReason,
      reportShowProfit, reportShowTopProducts,
    };
    await db.settings.put(updated);
    setSettings(updated);
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  const readImageFile = (file: File, onLoaded: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onLoaded(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readImageFile(file, setStoreLogo);
  };

  const handleIdleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readImageFile(file, setDisplayIdleImage);
  };

  if (loading) return null;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-700">معلومات المتجر</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">شعار المتجر</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {storeLogo ? (
                  <img src={storeLogo} alt="شعار المتجر" className="w-full h-full object-contain" />
                ) : (
                  <Store className="w-7 h-7 text-slate-300" />
                )}
              </div>
              <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                رفع شعار
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {storeLogo && (
                <button
                  onClick={() => setStoreLogo('')}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  إزالة
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">اسم المتجر *</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">العنوان</label>
            <input
              type="text"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              dir="rtl"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">الرقم الضريبي</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                dir="rtl"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-700 mb-4">الضريبة والعملة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">نسبة الضريبة (%)</label>
            <input
              type="number"
              value={taxRatePercent}
              onChange={(e) => setTaxRatePercent(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">العملة</label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              dir="rtl"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-700">تخصيص الفاتورة المطبوعة</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">رسالة الختام</label>
            <textarea
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={2}
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">إظهار في الفاتورة</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'العنوان', value: showAddressOnReceipt, set: setShowAddressOnReceipt },
                { label: 'الهاتف', value: showPhoneOnReceipt, set: setShowPhoneOnReceipt },
                { label: 'الرقم الضريبي', value: showTaxNumberOnReceipt, set: setShowTaxNumberOnReceipt },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => item.set(!item.value)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${
                    item.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    item.value ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                  }`}>
                    {item.value && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">مقاس الورق</label>
            <div className="grid grid-cols-2 gap-2">
              {(['58mm', '80mm'] as const).map((width) => (
                <button
                  key={width}
                  onClick={() => setPaperWidth(width)}
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                    paperWidth === width
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {width}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-700">تخصيص المطبوعات (الفواتير، التقارير، ملخص الوردية، المرتجعات)</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">لون العلامة التجارية</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={printAccentColor}
                onChange={(e) => setPrintAccentColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{printAccentColor}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">يُطبَّق على العناوين والإجماليات والخطوط الفاصلة في كل المطبوعات</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">خط المطبوعات</label>
            <select
              value={printFontFamily}
              onChange={(e) => setPrintFontFamily(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              dir="rtl"
            >
              <option value="Tahoma, Arial, sans-serif">تاهوما (افتراضي)</option>
              <option value="'Segoe UI', Arial, sans-serif">Segoe UI</option>
              <option value="'Cairo', Tahoma, sans-serif">Cairo</option>
              <option value="'Tajawal', Tahoma, sans-serif">Tajawal</option>
              <option value="Georgia, 'Times New Roman', serif">كلاسيكي (Serif)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== تحكم بحقول المطبوعات ===== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Receipt className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-700">تحكم بحقول كل مطبوعة</h3>
        </div>

        {[
          {
            title: 'فاتورة البيع',
            fields: [
              { label: 'الشعار', state: receiptShowLogo, set: setReceiptShowLogo },
              { label: 'اسم العميل', state: receiptShowCustomer, set: setReceiptShowCustomer },
              { label: 'باركود الفاتورة', state: receiptShowBarcode, set: setReceiptShowBarcode },
              { label: 'طريقة الدفع', state: receiptShowPaymentMethod, set: setReceiptShowPaymentMethod },
              { label: 'الضريبة', state: receiptShowTax, set: setReceiptShowTax },
              { label: 'تفاصيل الخصومات (كوبون/قسيمة/نقاط)', state: receiptShowDiscounts, set: setReceiptShowDiscounts },
              { label: 'المبلغ المتبقي (آجل)', state: receiptShowRemaining, set: setReceiptShowRemaining },
            ],
          },
          {
            title: 'ملخص إغلاق الوردية',
            fields: [
              { label: 'الشعار', state: shiftShowLogo, set: setShiftShowLogo },
              { label: 'قائمة فواتير الوردية', state: shiftShowSalesList, set: setShiftShowSalesList },
              { label: 'تفاصيل النقدية (متوقع / فعلي / فرق)', state: shiftShowCashDetails, set: setShiftShowCashDetails },
            ],
          },
          {
            title: 'إيصال المرتجع',
            fields: [
              { label: 'باركود رقم المرتجع', state: returnShowBarcode, set: setReturnShowBarcode },
              { label: 'رقم الفاتورة الأصلية', state: returnShowOriginalInvoice, set: setReturnShowOriginalInvoice },
              { label: 'سبب الإرجاع', state: returnShowReason, set: setReturnShowReason },
            ],
          },
          {
            title: 'تقرير المبيعات',
            fields: [
              { label: 'عمود الربح التقديري', state: reportShowProfit, set: setReportShowProfit },
              { label: 'قسم أكثر المنتجات مبيعًا', state: reportShowTopProducts, set: setReportShowTopProducts },
            ],
          },
        ].map((group) => (
          <div key={group.title} className="mb-5">
            <p className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2 mb-3">{group.title}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {group.fields.map((field) => (
                <button
                  key={field.label}
                  type="button"
                  onClick={() => field.set(!field.state)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-sm transition-colors ${
                    field.state ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${
                    field.state ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                  }`}>
                    {field.state && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {field.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-700">تخصيص شاشة الزبون</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">صورة شاشة الترحيب</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {displayIdleImage ? (
                  <img src={displayIdleImage} alt="صورة الترحيب" className="w-full h-full object-cover" />
                ) : (
                  <Monitor className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                رفع صورة
                <input type="file" accept="image/*" onChange={handleIdleImageUpload} className="hidden" />
              </label>
              {displayIdleImage && (
                <button
                  onClick={() => setDisplayIdleImage('')}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  إزالة
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">رسالة الترحيب</label>
            <input
              type="text"
              value={displayWelcomeMessage}
              onChange={(e) => setDisplayWelcomeMessage(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              dir="rtl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">لون الخلفية</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={displayBgColor}
                  onChange={(e) => setDisplayBgColor(e.target.value)}
                  className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-sm text-slate-500 font-mono">{displayBgColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">اللون المميز</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={displayAccentColor}
                  onChange={(e) => setDisplayAccentColor(e.target.value)}
                  className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-sm text-slate-500 font-mono">{displayAccentColor}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-700">الولاء</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            قيمة النقطة الواحدة عند الاستبدال
          </label>
          <input
            type="number"
            value={loyaltyPointValue}
            onChange={(e) => setLoyaltyPointValue(e.target.value)}
            className="w-full max-w-xs px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            min="0"
            step="0.01"
          />
          <p className="text-xs text-slate-500 mt-1">
            العميل يكسب نقطة واحدة لكل وحدة عملة يُنفقها. مثال: قيمة 0.1 تعني أن 100 نقطة = 10 من العملة عند الاستبدال.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-700">واتساب</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">رمز الدولة</label>
          <input
            type="text"
            value={whatsappCountryCode}
            onChange={(e) => setWhatsappCountryCode(e.target.value)}
            className="w-full max-w-xs px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="966"
          />
          <p className="text-xs text-slate-500 mt-1">
            يُستخدم لتحويل أرقام العملاء المحلية (مثل 05xxxxxxxx) إلى الصيغة الدولية المطلوبة لإرسال رسائل واتساب.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-700">الميزان</h3>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => setEnableScaleBarcodes(!enableScaleBarcodes)}
            className="flex items-center gap-2"
          >
            <div className={`w-12 h-6 rounded-full transition-colors relative ${enableScaleBarcodes ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${enableScaleBarcodes ? 'left-6' : 'left-0.5'}`} />
            </div>
            <span className="text-sm text-slate-600">تفعيل قراءة أكواد الميزان عند المسح</span>
          </button>

          {enableScaleBarcodes && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">بادئة كود الميزان</label>
              <input
                type="text"
                value={scaleBarcodePrefix}
                onChange={(e) => setScaleBarcodePrefix(e.target.value)}
                className="w-full max-w-xs px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                maxLength={1}
              />
              <p className="text-xs text-slate-500 mt-1">
                الرقم الذي يبدأ به كود الباركود المطبوع من الميزان (عادة 2). يجب أيضًا تحديد &quot;كود الميزان (PLU)&quot; لكل منتج يُباع بالوزن من شاشة المنتجات.
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={save}
        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg shadow-sm transition-colors"
      >
        <Save className="w-4 h-4" />
        حفظ الإعدادات
      </button>
    </div>
  );
}

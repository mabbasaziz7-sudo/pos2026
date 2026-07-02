import type { Offer, Coupon, Voucher, Customer, Settings } from './local-db';

// ====== مساعد مشترك لفتح نافذة الطباعة ======
function openCardWindow(html: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ====== بطاقة العرض ======
export function printOfferCard(offer: Offer, settings: Settings | null) {
  const accent = settings?.printAccentColor || '#10b981';
  const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
  const storeName = settings?.storeName || 'نظام الكاشير';
  const logo = settings?.storeLogo ? `<img src="${settings.storeLogo}" style="height:48px;object-fit:contain;display:block;margin:0 auto 8px;">` : '';
  const discount = offer.targetType === 'bundle'
    ? `سعر الحزمة: ${offer.bundlePrice?.toFixed(3) ?? '—'}`
    : offer.discountType === 'percentage' ? `خصم ${offer.discountValue}%` : `خصم ${offer.discountValue.toFixed(3)}`;
  const target = offer.targetType === 'category' ? `على فئة: ${offer.category}`
    : offer.targetType === 'bundle' ? 'عرض مجمّع'
    : `على منتجات محددة`;

  openCardWindow(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
  <title>بطاقة عرض</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:${font}; background:#f0f0f0; display:flex; justify-content:center; align-items:flex-start; padding:20px; }
    .card { width:380px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.15); page-break-inside:avoid; }
    .card-header { background:${accent}; color:#fff; padding:20px 18px 14px; text-align:center; }
    .card-header .store { font-size:13px; opacity:.85; }
    .card-header .offer-title { font-size:22px; font-weight:bold; margin:8px 0 0; }
    .card-body { padding:18px 20px 14px; text-align:center; }
    .discount-badge { display:inline-block; background:${accent}15; color:${accent}; font-size:28px; font-weight:bold; padding:10px 24px; border-radius:50px; border:2px dashed ${accent}; margin:8px 0; }
    .offer-name { font-size:15px; font-weight:600; color:#1a1a2e; margin:8px 0; }
    .target { font-size:12px; color:#666; margin-bottom:6px; }
    .dates { font-size:11px; color:#888; border-top:1px solid #eee; padding-top:10px; margin-top:10px; }
    .dates span { display:inline-block; margin:2px 6px; }
    .status { display:inline-block; padding:3px 12px; border-radius:20px; font-size:11px; font-weight:bold; margin-top:8px; }
    .status.active { background:#d1fae5; color:#047857; }
    .status.inactive { background:#fee2e2; color:#b91c1c; }
    @media print { body { background:#fff; padding:0; } .card { box-shadow:none; } }
  </style>
  </head><body>
  <div class="card">
    <div class="card-header">
      ${logo}
      <div class="store">${storeName}</div>
      <div class="offer-title">🏷️ ${offer.name}</div>
    </div>
    <div class="card-body">
      <div class="discount-badge">${discount}</div>
      <div class="target">${target}</div>
      <div class="dates">
        <span>📅 من: ${new Date(offer.startDate).toLocaleDateString('ar-SA')}</span>
        <span>إلى: ${new Date(offer.endDate).toLocaleDateString('ar-SA')}</span>
      </div>
      <span class="status ${offer.isActive ? 'active' : 'inactive'}">${offer.isActive ? 'ساري' : 'منتهي'}</span>
    </div>
  </div>
  <script>window.print();</script>
  </body></html>`);
}

// ====== بطاقة الكوبون ======
export function printCouponCard(coupon: Coupon, settings: Settings | null) {
  const accent = settings?.printAccentColor || '#10b981';
  const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
  const storeName = settings?.storeName || 'نظام الكاشير';
  const logo = settings?.storeLogo ? `<img src="${settings.storeLogo}" style="height:40px;object-fit:contain;display:block;margin:0 auto 6px;">` : '';
  const discount = coupon.discountType === 'percentage' ? `${coupon.discountValue}% خصم` : `${coupon.discountValue.toFixed(3)} خصم`;

  openCardWindow(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
  <title>كوبون خصم</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:${font}; background:#f0f0f0; display:flex; justify-content:center; padding:20px; }
    .coupon { width:360px; background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.12); position:relative; }
    .coupon::before { content:''; position:absolute; top:0; right:0; width:6px; height:100%; background:repeating-linear-gradient(180deg,${accent},${accent} 8px,transparent 8px,transparent 16px); }
    .coupon-top { padding:16px 18px 12px; border-bottom:2px dashed #ddd; }
    .store-line { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .coupon-badge { background:${accent}; color:#fff; font-size:32px; font-weight:bold; text-align:center; padding:10px; border-radius:10px; margin:8px 0; }
    .coupon-label { text-align:center; font-size:12px; color:#666; font-weight:600; }
    .coupon-bottom { padding:12px 18px 14px; background:#fafafa; }
    .row { display:flex; justify-content:space-between; font-size:11px; color:#555; margin:3px 0; }
    .code-area { text-align:center; margin-top:10px; }
    .code-text { font-family:monospace; font-size:13px; font-weight:bold; color:#333; letter-spacing:1px; }
    @media print { body { background:#fff; padding:0; } .coupon { box-shadow:none; } }
  </style>
  </head><body>
  <div class="coupon">
    <div class="coupon-top">
      <div class="store-line">
        ${logo}
        <div style="font-weight:bold;font-size:14px;color:${accent};">${storeName}</div>
      </div>
      <div class="coupon-badge">${discount}</div>
      <div class="coupon-label">🎫 كوبون خصم</div>
    </div>
    <div class="coupon-bottom">
      <div class="row"><span>الحد الأدنى للشراء</span><span style="font-weight:bold;">${coupon.minPurchase > 0 ? coupon.minPurchase.toFixed(3) : 'لا يوجد'}</span></div>
      <div class="row"><span>الاستخدامات المتبقية</span><span style="font-weight:bold;color:${accent};">${coupon.maxUses - coupon.usedCount} من ${coupon.maxUses}</span></div>
      <div class="row"><span>صالح حتى</span><span style="font-weight:bold;color:#e11d48;">${new Date(coupon.expiryDate).toLocaleDateString('ar-SA')}</span></div>
      <div class="code-area">
        <svg id="barcode" style="display:block;margin:8px auto;max-width:100%;"></svg>
        <div class="code-text">${coupon.code}</div>
      </div>
    </div>
  </div>
  <script>
    JsBarcode('#barcode','${coupon.code}',{format:'CODE128',width:1.8,height:48,displayValue:false,margin:4});
    window.print();
  </script>
  </body></html>`);
}

// ====== بطاقة القسيمة (Gift Voucher) ======
export function printVoucherCard(voucher: Voucher, settings: Settings | null) {
  const accent = settings?.printAccentColor || '#10b981';
  const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
  const storeName = settings?.storeName || 'نظام الكاشير';
  const logo = settings?.storeLogo ? `<img src="${settings.storeLogo}" style="height:42px;object-fit:contain;display:block;margin:0 auto 8px;">` : '';

  openCardWindow(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
  <title>قسيمة هدايا</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:${font}; background:#f0f0f0; display:flex; justify-content:center; padding:20px; }
    .voucher { width:380px; background:linear-gradient(135deg,${accent}22 0%,#fff 50%,${accent}11 100%); border:2px solid ${accent}; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.12); }
    .voucher-header { background:${accent}; color:#fff; padding:16px 20px; text-align:center; }
    .gift-icon { font-size:36px; margin-bottom:4px; }
    .store-name { font-size:13px; opacity:.9; margin-bottom:4px; }
    .voucher-title { font-size:20px; font-weight:bold; }
    .voucher-body { padding:20px; text-align:center; }
    .value-display { font-size:40px; font-weight:bold; color:${accent}; line-height:1.1; }
    .value-label { font-size:11px; color:#888; margin-top:2px; }
    .balance-section { background:${accent}0d; border-radius:10px; padding:10px 14px; margin:14px 0 10px; }
    .balance-row { display:flex; justify-content:space-between; font-size:12px; color:#444; margin:3px 0; }
    .code-section { text-align:center; padding-top:10px; border-top:2px dashed ${accent}44; }
    .code-text { font-family:monospace; font-size:13px; font-weight:bold; color:#333; letter-spacing:1px; margin-top:6px; }
    .status-badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:10px; font-weight:bold; margin-top:8px; }
    .active { background:#d1fae5; color:#047857; }
    .inactive { background:#fee2e2; color:#b91c1c; }
    @media print { body { background:#fff; padding:0; } }
  </style>
  </head><body>
  <div class="voucher">
    <div class="voucher-header">
      ${logo}
      <div class="store-name">${storeName}</div>
      <div class="voucher-title">🎁 قسيمة هدايا</div>
    </div>
    <div class="voucher-body">
      <div class="value-display">${voucher.initialAmount.toFixed(3)}</div>
      <div class="value-label">القيمة الأصلية</div>
      <div class="balance-section">
        <div class="balance-row"><span>الرصيد المتبقي</span><span style="font-weight:bold;color:${accent};">${voucher.balance.toFixed(3)}</span></div>
        <div class="balance-row"><span>المُستخدم</span><span>${(voucher.initialAmount - voucher.balance).toFixed(3)}</span></div>
      </div>
      <div class="code-section">
        <svg id="barcode" style="display:block;margin:0 auto;max-width:100%;"></svg>
        <div class="code-text">${voucher.code}</div>
      </div>
      <span class="status-badge ${voucher.isActive && voucher.balance > 0 ? 'active' : 'inactive'}">
        ${voucher.isActive && voucher.balance > 0 ? 'نشطة' : !voucher.isActive ? 'معطّلة' : 'مستهلكة'}
      </span>
    </div>
  </div>
  <script>
    JsBarcode('#barcode','${voucher.code}',{format:'CODE128',width:1.8,height:48,displayValue:false,margin:4});
    window.print();
  </script>
  </body></html>`);
}

// ====== بطاقة ولاء العميل ======
export function printLoyaltyCard(customer: Customer, settings: Settings | null) {
  const accent = settings?.printAccentColor || '#10b981';
  const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
  const storeName = settings?.storeName || 'نظام الكاشير';
  const logo = settings?.storeLogo ? `<img src="${settings.storeLogo}" style="height:44px;object-fit:contain;">` : '';
  const pointValue = settings?.loyaltyPointValue ?? 0.1;
  const pointsValue = (customer.loyaltyPoints * pointValue).toFixed(3);

  // توليد رقم عضوية من id العميل
  const memberNo = `MBR-${String(customer.id).padStart(6, '0')}`;

  openCardWindow(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
  <title>بطاقة ولاء</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:${font}; background:#f0f0f0; display:flex; flex-direction:column; align-items:center; padding:20px; gap:20px; }
    /* بطاقة بحجم credit card: 85.6mm × 54mm */
    .loyalty-card { width:322px; height:204px; border-radius:14px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.18); position:relative; background:linear-gradient(135deg,${accent} 0%,${accent}cc 60%,${accent}88 100%); color:#fff; display:flex; flex-direction:column; justify-content:space-between; padding:16px 18px; }
    .card-top { display:flex; justify-content:space-between; align-items:flex-start; }
    .card-logo { opacity:.95; }
    .card-type { font-size:11px; opacity:.8; text-align:left; font-weight:600; }
    .card-middle { text-align:right; }
    .customer-name { font-size:18px; font-weight:bold; }
    .member-no { font-size:10px; opacity:.8; margin-top:2px; }
    .card-bottom { display:flex; justify-content:space-between; align-items:flex-end; }
    .points-section { }
    .points-label { font-size:9px; opacity:.8; }
    .points-value { font-size:24px; font-weight:bold; line-height:1; }
    .points-sub { font-size:9px; opacity:.8; }
    .circle-deco { position:absolute; bottom:-30px; left:-30px; width:130px; height:130px; border-radius:50%; background:rgba(255,255,255,.1); }
    .circle-deco2 { position:absolute; top:-40px; right:-20px; width:100px; height:100px; border-radius:50%; background:rgba(255,255,255,.08); }
    /* ظهر البطاقة */
    .card-back { width:322px; background:#fff; border:2px solid ${accent}; border-radius:14px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.12); }
    .card-back-header { background:${accent}; color:#fff; padding:8px 14px; text-align:center; font-size:12px; font-weight:bold; }
    .card-back-body { padding:12px 14px; text-align:center; }
    .back-member { font-size:11px; color:#555; margin-bottom:8px; }
    .balance-note { font-size:10px; color:#888; margin-top:8px; border-top:1px solid #eee; padding-top:8px; }
    @media print { body { background:#fff; padding:0; } * { box-shadow:none; } }
  </style>
  </head><body>
  <!-- وجه البطاقة -->
  <div class="loyalty-card">
    <div class="circle-deco"></div>
    <div class="circle-deco2"></div>
    <div class="card-top">
      <div class="card-logo">${logo || `<div style="font-size:20px;font-weight:bold;">${storeName.slice(0,2)}</div>`}</div>
      <div class="card-type">${storeName}<br>بطاقة الولاء</div>
    </div>
    <div class="card-middle">
      <div class="customer-name">${customer.name}</div>
      <div class="member-no">${memberNo}</div>
    </div>
    <div class="card-bottom">
      <div class="points-section">
        <div class="points-label">نقاط الولاء</div>
        <div class="points-value">${customer.loyaltyPoints.toLocaleString('ar-SA')}</div>
        <div class="points-sub">تساوي ${pointsValue}</div>
      </div>
    </div>
  </div>

  <!-- ظهر البطاقة -->
  <div class="card-back">
    <div class="card-back-header">بيانات العضوية — ${storeName}</div>
    <div class="card-back-body">
      <div class="back-member">رقم العضوية: <strong>${memberNo}</strong></div>
      <svg id="barcode" style="display:block;margin:0 auto;max-width:100%;"></svg>
      <div style="font-family:monospace;font-size:11px;color:#555;margin-top:4px;">${memberNo}</div>
      <div class="balance-note">
        رصيد الولاء: <strong style="color:${accent};">${customer.loyaltyPoints} نقطة</strong> = <strong>${pointsValue}</strong><br>
        ${customer.phone ? `📞 ${customer.phone}` : ''}
      </div>
    </div>
  </div>
  <script>
    JsBarcode('#barcode','${memberNo}',{format:'CODE128',width:1.8,height:40,displayValue:false,margin:4});
    window.print();
  </script>
  </body></html>`);
}

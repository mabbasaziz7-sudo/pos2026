import type { Shift, Sale, Settings } from './local-db';
import { PAYMENT_TYPE_LABELS } from './local-db';
import { formatCurrency, formatDate } from './store';

export function googleFontLink(font: string): string {
  if (font.includes('Cairo')) return '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">';
  if (font.includes('Tajawal')) return '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">';
  return '';
}

// الإعداد الافتراضي عند غياب المتغير (للتوافق مع البيانات القديمة قبل إضافة الحقل)
function on(val: boolean | undefined): boolean {
  return val !== false; // true بشكل افتراضي إذا لم يُعيَّن
}

export function openPrintWindow(title: string, bodyHtml: string, maxWidth = '500px', settings?: Settings | null) {
  const accent = settings?.printAccentColor || '#10b981';
  const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <html dir="rtl">
      <head>
        <title>${title}</title>
        ${googleFontLink(font)}
        <style>
          :root { --accent: ${accent}; }
          body { font-family: ${font}; padding: 20px; max-width: ${maxWidth}; margin: 0 auto; color: #1e293b; }
          .receipt-center { text-align: center; }
          .receipt-row { display: flex; justify-content: center; gap: 8px; }
          .receipt-logo { display: block; height: 56px; max-width: 100%; margin: 0 auto 8px; object-fit: contain; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; }
          th, td { text-align: center; padding: 6px 4px; border-bottom: 1px dashed #ccc; font-size: 12px; }
          thead tr { background: color-mix(in srgb, var(--accent) 15%, white); }
          h2 { text-align: center; margin: 0; color: var(--accent); }
          h3 { text-align: center; margin: 4px 0 12px; font-size: 14px; color: #555; }
          hr { border: none; border-top: 2px solid var(--accent); margin: 10px 0; }
          .stats-row { display: flex; justify-content: center; gap: 24px; margin: 12px 0; text-align: center; }
          .stats-row .label { font-size: 11px; color: #666; }
          .stats-row .value { font-size: 14px; font-weight: bold; color: var(--accent); }
          .section-title { font-weight: bold; margin: 14px 0 6px; text-align: center; color: var(--accent); border-bottom: 1px solid var(--accent); padding-bottom: 4px; }
          .grand-total { font-size: 16px; font-weight: bold; color: var(--accent); text-align: center; margin: 10px 0; }
          .print-footer { text-align: center; font-size: 11px; color: #888; margin-top: 16px; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}

export function printShiftSummary(shift: Shift, sales: Sale[], settings: Settings | null) {
  const showLogo = on(settings?.shiftShowLogo);
  const showCashDetails = on(settings?.shiftShowCashDetails);
  const showSalesList = on(settings?.shiftShowSalesList);

  const logo = showLogo && settings?.storeLogo
    ? `<img class="receipt-logo" src="${settings.storeLogo}" alt="" />`
    : '';

  const rows = sales.map((sale) => `
    <tr>
      <td>${sale.invoiceNumber}</td>
      <td>${sale.customerName || 'نقدي'}</td>
      <td>${formatCurrency(sale.total)}</td>
      <td>${PAYMENT_TYPE_LABELS[sale.paymentType]}</td>
      <td>${formatDate(sale.date)}</td>
    </tr>`).join('');

  const body = `
    <div class="receipt-center">
      ${logo}
      <h2>${settings?.storeName || 'نظام الكاشير'}</h2>
      <h3>ملخص الوردية #${shift.id}</h3>
    </div>
    <hr>
    <p><strong>الكاشير:</strong> ${shift.userName}</p>
    <p><strong>البداية:</strong> ${formatDate(shift.startTime)}</p>
    <p><strong>النهاية:</strong> ${shift.endTime ? formatDate(shift.endTime) : '-'}</p>
    <div class="stats-row">
      <div><p class="label">النقدية الافتتاحية</p><p class="value">${formatCurrency(shift.startingCash)}</p></div>
      <div><p class="label">إجمالي المبيعات</p><p class="value">${formatCurrency(shift.totalSales)}</p></div>
    </div>
    <div class="stats-row">
      <div><p class="label">مبيعات نقدية</p><p class="value">${formatCurrency(shift.totalCashSales)}</p></div>
      <div><p class="label">مبيعات آجلة</p><p class="value">${formatCurrency(shift.totalCreditSales)}</p></div>
    </div>
    ${showCashDetails ? `
    <div class="stats-row">
      <div><p class="label">النقدية المتوقعة</p><p class="value">${formatCurrency(shift.expectedCash)}</p></div>
      <div><p class="label">النقدية الفعلية</p><p class="value">${shift.actualCash !== undefined ? formatCurrency(shift.actualCash) : '-'}</p></div>
      <div><p class="label">الفرق</p><p class="value">${shift.difference !== undefined ? formatCurrency(shift.difference) : '-'}</p></div>
    </div>` : ''}
    ${showSalesList ? `
    <p class="section-title">فواتير البيع (${sales.length})</p>
    <table>
      <thead><tr><th>الفاتورة</th><th>العميل</th><th>المبلغ</th><th>الدفع</th><th>التاريخ</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">لا توجد فواتير</td></tr>'}</tbody>
    </table>` : ''}
  `;
  openPrintWindow(`ملخص الوردية #${shift.id}`, body, '500px', settings);
}

export function printInvoice(sale: Sale, settings: Settings | null) {
  const maxWidth = settings?.paperWidth === '58mm' ? '260px' : '320px';
  const showLogo = on(settings?.receiptShowLogo);
  const showCustomer = on(settings?.receiptShowCustomer);
  const showBarcode = on(settings?.receiptShowBarcode);
  const showPaymentMethod = on(settings?.receiptShowPaymentMethod);
  const showTax = on(settings?.receiptShowTax);
  const showDiscounts = on(settings?.receiptShowDiscounts);
  const showRemaining = on(settings?.receiptShowRemaining);

  const logo = showLogo && settings?.storeLogo ? `<img class="receipt-logo" src="${settings.storeLogo}" alt="" />` : '';

  const itemsRows = sale.items.map((item) => `
    <tr>
      <td>${item.productName}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.price)}</td>
      <td>${formatCurrency(item.total)}</td>
    </tr>`).join('');

  const barcodeScript = showBarcode ? `
    <div style="text-align:center;margin-top:12px;">
      <svg id="inv-barcode"></svg>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
    <script>try{JsBarcode('#inv-barcode','${sale.invoiceNumber}',{format:'CODE128',width:1.5,height:40,displayValue:true,fontSize:11,margin:4});}catch(e){}</script>` : '';

  const body = `
    <div class="receipt-center">
      ${logo}
      <h2>${settings?.storeName || 'نظام الكاشير'}</h2>
      ${settings?.showAddressOnReceipt && settings?.storeAddress ? `<p style="font-size:11px;color:#555;">${settings.storeAddress}</p>` : ''}
      ${settings?.showPhoneOnReceipt && settings?.storePhone ? `<p style="font-size:11px;color:#555;">${settings.storePhone}</p>` : ''}
      ${settings?.showTaxNumberOnReceipt && settings?.taxNumber ? `<p style="font-size:11px;color:#555;">الرقم الضريبي: ${settings.taxNumber}</p>` : ''}
    </div>
    <hr>
    <p class="receipt-row"><span>رقم الفاتورة:</span><strong>${sale.invoiceNumber}</strong></p>
    <p class="receipt-row"><span>التاريخ:</span><span>${formatDate(sale.date)}</span></p>
    ${showCustomer && sale.customerName ? `<p class="receipt-row"><span>العميل:</span><span>${sale.customerName}</span></p>` : ''}
    <table>
      <thead><tr><th>المنتج</th><th>كمية</th><th>سعر</th><th>إجمالي</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <hr>
    <div class="stats-row"><div><p class="label">الإجمالي الفرعي</p><p class="value">${formatCurrency(sale.subtotal)}</p></div></div>
    ${showDiscounts && sale.couponDiscount ? `<div class="stats-row"><div><p class="label">خصم كوبون (${sale.couponCode})</p><p class="value">-${formatCurrency(sale.couponDiscount)}</p></div></div>` : ''}
    ${showTax ? `<div class="stats-row"><div><p class="label">الضريبة</p><p class="value">${formatCurrency(sale.tax)}</p></div></div>` : ''}
    ${showDiscounts && sale.voucherAmount ? `<div class="stats-row"><div><p class="label">قسيمة (${sale.voucherCode})</p><p class="value">-${formatCurrency(sale.voucherAmount)}</p></div></div>` : ''}
    ${showDiscounts && sale.loyaltyDiscount ? `<div class="stats-row"><div><p class="label">نقاط ولاء</p><p class="value">-${formatCurrency(sale.loyaltyDiscount)}</p></div></div>` : ''}
    <p class="grand-total">الإجمالي: ${formatCurrency(sale.total)}</p>
    ${showPaymentMethod ? `<p class="receipt-row"><span>طريقة الدفع:</span><span>${PAYMENT_TYPE_LABELS[sale.paymentType]}</span></p>` : ''}
    ${showRemaining && sale.remaining > 0 ? `<p class="receipt-row"><span>المتبقي:</span><strong>${formatCurrency(sale.remaining)}</strong></p>` : ''}
    ${settings?.receiptFooter ? `<p class="print-footer">${settings.receiptFooter}</p>` : ''}
    ${barcodeScript}
  `;
  openPrintWindow(`فاتورة ${sale.invoiceNumber}`, body, maxWidth, settings);
}

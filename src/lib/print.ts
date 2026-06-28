import type { Shift, Sale, Settings } from './local-db';
import { formatCurrency, formatDate } from './store';

export function openPrintWindow(title: string, bodyHtml: string, maxWidth = '500px') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <html dir="rtl">
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: ${maxWidth}; margin: 0 auto; }
          .receipt-center { text-align: center; }
          .receipt-row { display: flex; justify-content: center; gap: 8px; }
          .receipt-logo { display: block; height: 56px; max-width: 100%; margin: 0 auto 8px; object-fit: contain; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; }
          th, td { text-align: center; padding: 6px 4px; border-bottom: 1px dashed #ccc; font-size: 12px; }
          thead tr { background: #f1f5f9; }
          h2 { text-align: center; margin: 0; }
          h3 { text-align: center; margin: 4px 0 12px; font-size: 14px; color: #555; }
          .stats-row { display: flex; justify-content: center; gap: 24px; margin: 12px 0; text-align: center; }
          .stats-row .label { font-size: 11px; color: #666; }
          .stats-row .value { font-size: 14px; font-weight: bold; }
          .section-title { font-weight: bold; margin: 14px 0 6px; text-align: center; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}

export function printShiftSummary(shift: Shift, sales: Sale[], settings: Settings | null) {
  const logo = settings?.storeLogo
    ? `<img class="receipt-logo" src="${settings.storeLogo}" alt="" />`
    : '';
  const rows = sales
    .map(
      (sale) => `
        <tr>
          <td>${sale.invoiceNumber}</td>
          <td>${sale.customerName || 'نقدي'}</td>
          <td>${formatCurrency(sale.total)}</td>
          <td>${sale.paymentType === 'cash' ? 'نقدي' : sale.paymentType === 'credit' ? 'آجل' : 'مختلط'}</td>
          <td>${formatDate(sale.date)}</td>
        </tr>
      `
    )
    .join('');

  const body = `
    <div class="receipt-center">
      ${logo}
      <h2>${settings?.storeName || 'نظام الكاشير'}</h2>
      <h3>ملخص الوردية #${shift.id}</h3>
    </div>
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
    <div class="stats-row">
      <div><p class="label">النقدية المتوقعة</p><p class="value">${formatCurrency(shift.expectedCash)}</p></div>
      <div><p class="label">النقدية الفعلية</p><p class="value">${shift.actualCash !== undefined ? formatCurrency(shift.actualCash) : '-'}</p></div>
      <div><p class="label">الفرق</p><p class="value">${shift.difference !== undefined ? formatCurrency(shift.difference) : '-'}</p></div>
    </div>
    <p class="section-title">فواتير البيع (${sales.length})</p>
    <table>
      <thead><tr><th>الفاتورة</th><th>العميل</th><th>المبلغ</th><th>الدفع</th><th>التاريخ</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">لا توجد فواتير</td></tr>'}</tbody>
    </table>
  `;
  openPrintWindow(`ملخص الوردية #${shift.id}`, body);
}

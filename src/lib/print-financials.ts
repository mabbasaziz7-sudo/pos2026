import type { FinancialVoucher, SalaryPayment, Settings } from './local-db';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function fmt(n: number, currency = 'SAR') {
  return n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function open(title: string, body: string, settings: Settings | null) {
  const accent = settings?.printAccentColor || '#10b981';
  const currency = settings?.currencyCode || 'SAR';
  const storeName = settings?.storeName || 'نظام الكاشير';
  const logo = settings?.storeLogo || '';
  const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';

  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:${font}; color:#111; background:#fff; padding:20px; font-size:13px; }
  .page { max-width:650px; margin:0 auto; border:2px solid ${accent}; border-radius:8px; padding:24px; }
  .header { text-align:center; border-bottom:2px solid ${accent}; padding-bottom:14px; margin-bottom:18px; }
  .header h1 { color:${accent}; font-size:20px; margin-bottom:4px; }
  .header p { color:#555; font-size:12px; }
  .logo { max-height:60px; max-width:160px; object-fit:contain; display:block; margin:0 auto 8px; }
  .voucher-title { background:${accent}; color:#fff; text-align:center; padding:8px; border-radius:6px; font-size:16px; font-weight:bold; margin-bottom:16px; }
  .meta { display:flex; justify-content:space-between; gap:16px; margin-bottom:16px; }
  .meta-box { background:#f8f9fa; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; flex:1; }
  .meta-box .label { color:#888; font-size:11px; margin-bottom:2px; }
  .meta-box .value { font-weight:bold; font-size:14px; color:#111; }
  .amount-box { background:${accent}18; border:2px solid ${accent}; border-radius:8px; text-align:center; padding:16px; margin:16px 0; }
  .amount-label { color:#555; font-size:12px; margin-bottom:4px; }
  .amount-value { color:${accent}; font-size:28px; font-weight:bold; }
  .rows { border-collapse:collapse; width:100%; margin:12px 0; }
  .rows td { padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:13px; }
  .rows td:first-child { color:#666; width:40%; }
  .rows td:last-child { font-weight:600; }
  .sig { display:flex; justify-content:space-between; margin-top:32px; gap:24px; }
  .sig-box { flex:1; text-align:center; border-top:1px dashed #aaa; padding-top:8px; color:#666; font-size:12px; }
  @media print { body { padding:0; } .page { border:none; max-width:100%; } }
</style></head><body>
<div class="page">
  <div class="header">
    ${logo ? `<img src="${logo}" class="logo" alt="logo">` : ''}
    <h1>${storeName}</h1>
    <p>${fmtDate(new Date())}</p>
  </div>
  ${body}
  <div class="sig">
    <div class="sig-box">المستلم / Received by</div>
    <div class="sig-box">المدفوع له / Paid to</div>
    <div class="sig-box">المدير / Manager</div>
  </div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800);}</script>
</body></html>`);
  win.document.close();
  void currency;
}

const VOUCHER_LABELS: Record<string, { ar: string; color: string }> = {
  receipt:    { ar: 'سند قبض',     color: '#10b981' },
  payment:    { ar: 'سند صرف',     color: '#ef4444' },
  collection: { ar: 'سند تحصيل',  color: '#3b82f6' },
};

const PARTY_LABELS: Record<string, string> = {
  customer: 'عميل',
  supplier: 'مورد',
  employee: 'موظف',
  other: 'أخرى',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي',
  transfer: 'تحويل بنكي',
  check: 'شيك',
};

export function printFinancialVoucher(v: FinancialVoucher, settings: Settings | null) {
  const lbl = VOUCHER_LABELS[v.type] || { ar: 'سند', color: '#10b981' };
  const currency = settings?.currencyCode || 'SAR';

  const body = `
    <div class="voucher-title">${lbl.ar}</div>
    <div class="meta">
      <div class="meta-box">
        <div class="label">رقم السند</div>
        <div class="value">${v.voucherNumber}</div>
      </div>
      <div class="meta-box">
        <div class="label">التاريخ</div>
        <div class="value">${fmtDate(v.date)}</div>
      </div>
    </div>
    <div class="amount-box">
      <div class="amount-label">المبلغ</div>
      <div class="amount-value">${fmt(v.amount, currency)}</div>
    </div>
    <table class="rows">
      <tr><td>${v.type === 'receipt' || v.type === 'collection' ? 'المُحَصَّل منه' : 'المدفوع له'}</td><td>${v.partyName} <span style="color:#888;font-size:11px">(${PARTY_LABELS[v.partyType] || ''})</span></td></tr>
      <tr><td>البيان / الوصف</td><td>${v.description}</td></tr>
      <tr><td>طريقة الدفع</td><td>${METHOD_LABELS[v.paymentMethod] || v.paymentMethod}</td></tr>
      ${v.checkNumber ? `<tr><td>رقم الشيك</td><td>${v.checkNumber}</td></tr>` : ''}
      ${v.bankName ? `<tr><td>البنك</td><td>${v.bankName}</td></tr>` : ''}
      ${v.notes ? `<tr><td>ملاحظات</td><td>${v.notes}</td></tr>` : ''}
      <tr><td>أعدّه</td><td>${v.userName}</td></tr>
    </table>`;

  open(`${lbl.ar} — ${v.voucherNumber}`, body, settings);
}

export function printSalarySlip(s: SalaryPayment, settings: Settings | null) {
  const currency = settings?.currencyCode || 'SAR';
  const monthName = MONTHS_AR[(s.month - 1)] || String(s.month);

  const body = `
    <div class="voucher-title">قسيمة راتب — ${monthName} ${s.year}</div>
    <div class="meta">
      <div class="meta-box">
        <div class="label">رقم القسيمة</div>
        <div class="value">${s.voucherNumber}</div>
      </div>
      <div class="meta-box">
        <div class="label">تاريخ الصرف</div>
        <div class="value">${s.paidAt ? fmtDate(s.paidAt) : '—'}</div>
      </div>
    </div>
    <table class="rows">
      <tr><td>اسم الموظف</td><td>${s.employeeName}</td></tr>
      <tr><td>المسمى الوظيفي</td><td>${s.employeePosition}</td></tr>
      <tr><td>الراتب الأساسي</td><td>${fmt(s.basicSalary, currency)}</td></tr>
      ${s.allowances > 0 ? `<tr><td>البدلات والإضافات</td><td style="color:#10b981">+ ${fmt(s.allowances, currency)}</td></tr>` : ''}
      ${s.deductions > 0 ? `<tr><td>الخصومات</td><td style="color:#ef4444">- ${fmt(s.deductions, currency)}</td></tr>` : ''}
    </table>
    <div class="amount-box">
      <div class="amount-label">صافي الراتب</div>
      <div class="amount-value">${fmt(s.netSalary, currency)}</div>
    </div>
    <table class="rows">
      <tr><td>طريقة الصرف</td><td>${s.paymentMethod === 'cash' ? 'نقدي' : 'تحويل بنكي'}</td></tr>
      <tr><td>الحالة</td><td>${s.status === 'paid' ? '✅ مصروف' : '⏳ معلّق'}</td></tr>
      ${s.notes ? `<tr><td>ملاحظات</td><td>${s.notes}</td></tr>` : ''}
      <tr><td>أعدّه</td><td>${s.userName}</td></tr>
    </table>`;

  open(`قسيمة راتب — ${s.employeeName}`, body, settings);
}

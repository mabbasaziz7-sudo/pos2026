import type { Sale, Settings, WhatsAppLog } from './local-db';
import { db, formatWhatsAppPhone } from './local-db';
import { formatCurrency, formatDate } from './store';

export function buildInvoiceMessageText(sale: Sale, storeName: string): string {
  const itemsText = sale.items
    .map((item) => `${item.productName} × ${item.quantity} — ${formatCurrency(item.total)}`)
    .join('\n');

  return [
    `*${storeName}*`,
    `فاتورة رقم: ${sale.invoiceNumber}`,
    `التاريخ: ${formatDate(sale.date)}`,
    '',
    itemsText,
    '',
    `الإجمالي: ${formatCurrency(sale.total)}`,
    'شكراً لتعاملكم معنا 🌟',
  ].join('\n');
}

export interface WhatsAppSendResult {
  success: boolean;
  method: 'api' | 'wa.me';
  error?: string;
  messageId?: string;
}

// نقطة الإرسال الموحّدة — تستخدم WhatsApp Business API (Meta) مباشرة إذا كانت مُفعَّلة،
// وإلا تفتح wa.me. كل محاولة تُسجَّل في whatsappLogs للإحصائيات.
export async function sendWhatsAppText(
  phone: string,
  text: string,
  settings: Settings | null,
  context: WhatsAppLog['context'],
  customerName?: string
): Promise<WhatsAppSendResult> {
  const countryCode = settings?.whatsappCountryCode || '966';
  const formattedPhone = formatWhatsAppPhone(phone, countryCode);

  let result: WhatsAppSendResult;

  if (settings?.whatsappApiEnabled && settings?.whatsappApiToken && settings?.whatsappPhoneNumberId) {
    // إرسال عبر الخادم (Meta Business API) — بدون فتح واتساب خارجي
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: formattedPhone, message: text }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        result = { success: true, method: 'api', messageId: data.messageId };
      } else {
        const errMsg = data.error || `HTTP ${res.status}`;
        // فشل الـ API — احتياطيًا نفتح wa.me
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
        result = { success: false, method: 'wa.me', error: `API: ${errMsg}` };
      }
    } catch (err) {
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
      result = { success: false, method: 'wa.me', error: err instanceof Error ? err.message : 'خطأ في الشبكة' };
    }
  } else {
    // الطريقة الاحتياطية: wa.me (فتح واتساب خارجيًا)
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
    result = { success: true, method: 'wa.me' };
  }

  await db.whatsappLogs.add({
    date: new Date(),
    phone: formattedPhone,
    customerName,
    message: text,
    success: result.success,
    method: result.method === 'api' ? 'gateway' : 'wa.me',
    context,
    error: result.error,
  });

  return result;
}

export async function sendInvoiceWhatsApp(
  sale: Sale,
  phone: string,
  settings: Settings | null
): Promise<WhatsAppSendResult> {
  const storeName = settings?.storeName || 'نظام الكاشير';
  const message = buildInvoiceMessageText(sale, storeName);
  return sendWhatsAppText(phone, message, settings, 'invoice', sale.customerName);
}

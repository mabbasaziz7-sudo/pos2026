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
  method: 'wa.me';
}

// Single shared entry point for every WhatsApp send in the app (campaigns,
// invoices, quick-send) — opens wa.me with the message ready, and logs every
// attempt to db.whatsappLogs so the الإحصائيات panel reflects all of them.
export async function sendWhatsAppText(
  phone: string,
  text: string,
  settings: Settings | null,
  context: WhatsAppLog['context'],
  customerName?: string
): Promise<WhatsAppSendResult> {
  const countryCode = settings?.whatsappCountryCode || '966';
  const formattedPhone = formatWhatsAppPhone(phone, countryCode);

  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');

  await db.whatsappLogs.add({
    date: new Date(),
    phone: formattedPhone,
    customerName,
    message: text,
    success: true,
    method: 'wa.me',
    context,
  });

  return { success: true, method: 'wa.me' };
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

import { NextRequest, NextResponse } from 'next/server';
import { query, ensureSchema } from '@/db';
import { getSessionFromCookies } from '@/lib/auth-server';
import { formatWhatsAppPhone } from '@/lib/local-db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });

    await ensureSchema();

    const { to, message, type = 'text' } = await req.json();
    if (!to || !message) {
      return NextResponse.json({ error: 'رقم الهاتف والرسالة مطلوبان' }, { status: 400 });
    }

    // استرجاع بيانات واجهة Meta API من إعدادات المتجر
    const result = await query('SELECT * FROM settings WHERE id = 1 LIMIT 1');
    const settings = result.rows[0];

    if (!settings?.whatsappApiEnabled || !settings?.whatsappApiToken || !settings?.whatsappPhoneNumberId) {
      return NextResponse.json({ error: 'واجهة WhatsApp Business API غير مُفعَّلة — أضف بيانات الاعتماد من الإعدادات', code: 'NOT_CONFIGURED' }, { status: 503 });
    }

    // تنسيق رقم الهاتف بالشكل الدولي بدون +
    const countryCode: string = settings.whatsappCountryCode || '966';
    const formattedPhone = formatWhatsAppPhone(String(to), countryCode);

    // إرسال الرسالة عبر Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${settings.whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.whatsappApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      return NextResponse.json({ error: errMsg, code: data?.error?.code }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      messageId: data?.messages?.[0]?.id,
      to: formattedPhone,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'خطأ غير متوقع' }, { status: 500 });
  }
}

// نقطة اختبار الاتصال بالـ API
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });

    await ensureSchema();
    const result = await query('SELECT * FROM settings WHERE id = 1 LIMIT 1');
    const settings = result.rows[0];

    if (!settings?.whatsappApiToken || !settings?.whatsappPhoneNumberId) {
      return NextResponse.json({ connected: false, error: 'بيانات الاعتماد غير مكتملة' });
    }

    // التحقق من صحة الـ Token عبر استعلام بسيط لمعلومات الرقم
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${settings.whatsappPhoneNumberId}`,
      { headers: { 'Authorization': `Bearer ${settings.whatsappApiToken}` } }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ connected: false, error: data?.error?.message || `HTTP ${response.status}` });
    }

    return NextResponse.json({ connected: true, phoneNumber: data?.display_phone_number, name: data?.verified_name });
  } catch (err) {
    return NextResponse.json({ connected: false, error: err instanceof Error ? err.message : 'خطأ' });
  }
}

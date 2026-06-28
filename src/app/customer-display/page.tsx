'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/local-db';
import { formatCurrency } from '@/lib/store';
import { CUSTOMER_DISPLAY_CHANNEL, type CustomerDisplayMessage, type CustomerDisplayItem } from '@/lib/customer-display';
import { Store, CheckCircle2 } from 'lucide-react';

interface CartState {
  storeName: string;
  items: CustomerDisplayItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  customerName?: string;
}

interface SaleCompleteState {
  invoiceNumber: string;
  total: number;
  paid: number;
  change: number;
}

export default function CustomerDisplayPage() {
  const [storeName, setStoreName] = useState('نظام الكاشير');
  const [storeLogo, setStoreLogo] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('مرحباً بكم');
  const [idleImage, setIdleImage] = useState('');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [cartState, setCartState] = useState<CartState | null>(null);
  const [saleComplete, setSaleComplete] = useState<SaleCompleteState | null>(null);
  const saleCompleteTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    db.settings.get(1).then((s) => {
      if (s) {
        setStoreName(s.storeName);
        setStoreLogo(s.storeLogo);
        setWelcomeMessage(s.displayWelcomeMessage || 'مرحباً بكم');
        setIdleImage(s.displayIdleImage || '');
        setBgColor(s.displayBgColor || '#0f172a');
        setAccentColor(s.displayAccentColor || '#10b981');
      }
    });
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    channel.onmessage = (e: MessageEvent<CustomerDisplayMessage>) => {
      const data = e.data;
      if (data.type === 'cart-update') {
        setCartState(data);
      } else if (data.type === 'sale-complete') {
        setSaleComplete(data);
        if (saleCompleteTimeout.current) clearTimeout(saleCompleteTimeout.current);
        saleCompleteTimeout.current = setTimeout(() => setSaleComplete(null), 6000);
      }
    };
    channel.postMessage({ type: 'request-sync' } satisfies CustomerDisplayMessage);
    return () => {
      channel.close();
      if (saleCompleteTimeout.current) clearTimeout(saleCompleteTimeout.current);
    };
  }, []);

  const hasItems = !!cartState && cartState.items.length > 0;

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ backgroundColor: bgColor }} dir="rtl">
      <header className="flex items-center gap-3 px-8 py-6 border-b border-white/10">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: accentColor }}
        >
          {storeLogo ? (
            <img src={storeLogo} alt={storeName} className="w-full h-full object-contain" />
          ) : (
            <Store className="w-6 h-6 text-white" />
          )}
        </div>
        <h1 className="text-2xl font-bold">{cartState?.storeName || storeName}</h1>
      </header>

      <main className="flex-1 flex flex-col">
        {saleComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <CheckCircle2 className="w-24 h-24" style={{ color: accentColor }} />
            <p className="text-4xl font-bold">شكراً لزيارتكم</p>
            <p className="text-slate-400 text-lg">فاتورة رقم {saleComplete.invoiceNumber}</p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 text-center">
              <div>
                <p className="text-slate-400 text-sm mb-1">الإجمالي</p>
                <p className="text-2xl font-bold">{formatCurrency(saleComplete.total)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">المدفوع</p>
                <p className="text-2xl font-bold">{formatCurrency(saleComplete.paid)}</p>
              </div>
              {saleComplete.change > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-1">الباقي</p>
                  <p className="text-2xl font-bold" style={{ color: accentColor }}>{formatCurrency(saleComplete.change)}</p>
                </div>
              )}
            </div>
          </div>
        ) : hasItems ? (
          <div className="flex-1 flex flex-col p-8 gap-6">
            {cartState!.customerName && (
              <p className="text-slate-400 text-lg">العميل: {cartState!.customerName}</p>
            )}
            <div className="flex-1 overflow-y-auto space-y-3">
              {cartState!.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl px-6 py-4">
                  <div>
                    <p className="text-xl font-semibold">{item.name}</p>
                    <p className="text-slate-400">
                      {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: accentColor }}>{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="flex justify-between text-lg text-slate-300">
                <span>الإجمالي الفرعي</span>
                <span>{formatCurrency(cartState!.subtotal)}</span>
              </div>
              {cartState!.discount > 0 && (
                <div className="flex justify-between text-lg text-amber-400">
                  <span>الخصم</span>
                  <span>-{formatCurrency(cartState!.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg text-slate-300">
                <span>الضريبة</span>
                <span>{formatCurrency(cartState!.tax)}</span>
              </div>
              <div className="flex justify-between text-4xl font-bold pt-2">
                <span>الإجمالي</span>
                <span style={{ color: accentColor }}>{formatCurrency(cartState!.total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            {idleImage ? (
              <img src={idleImage} alt="" className="max-w-2xl max-h-[60vh] object-contain rounded-2xl mb-2" />
            ) : (
              <Store className="w-20 h-20 text-slate-600" />
            )}
            <p className="text-3xl font-bold text-slate-300">{welcomeMessage}</p>
            <p className="text-slate-500">في انتظار بدء عملية البيع...</p>
          </div>
        )}
      </main>
    </div>
  );
}

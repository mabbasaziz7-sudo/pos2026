'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/local-db';
import { formatCurrency, setCurrencyCode } from '@/lib/store';
import { CUSTOMER_DISPLAY_CHANNEL, type CustomerDisplayMessage, type CustomerDisplayItem } from '@/lib/customer-display';
import { Store, CheckCircle2, ShoppingCart } from 'lucide-react';

interface CartState {
  storeName: string;
  items: CustomerDisplayItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  customerName?: string;
  currentItem?: CustomerDisplayItem;
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
        setCurrencyCode(s.currencyCode);
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
        setCartState(null);
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
  const currentItem = cartState?.currentItem;

  return (
    <div className="min-h-screen text-white flex flex-col overflow-hidden" style={{ backgroundColor: bgColor }} dir="rtl">

      {/* ── header ── */}
      <header className="flex items-center gap-3 px-8 py-4 border-b border-white/10 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ backgroundColor: accentColor }}>
          {storeLogo
            ? <img src={storeLogo} alt={storeName} className="w-full h-full object-contain" />
            : <Store className="w-5 h-5 text-white" />}
        </div>
        <h1 className="text-xl font-bold">{cartState?.storeName || storeName}</h1>
        {cartState?.customerName && (
          <span className="mr-auto text-sm px-3 py-1 rounded-full text-white/70 border border-white/20">
            العميل: {cartState.customerName}
          </span>
        )}
      </header>

      {/* ── main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ════ SALE COMPLETE ════ */}
        {saleComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <CheckCircle2 className="w-24 h-24" style={{ color: accentColor }} />
            <p className="text-5xl font-bold">شكراً لزيارتكم</p>
            <p className="text-slate-400 text-lg">فاتورة رقم {saleComplete.invoiceNumber}</p>
            <div className="mt-4 flex gap-10 text-center">
              <div>
                <p className="text-slate-400 text-sm mb-1">الإجمالي</p>
                <p className="text-3xl font-bold">{formatCurrency(saleComplete.total)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">المدفوع</p>
                <p className="text-3xl font-bold">{formatCurrency(saleComplete.paid)}</p>
              </div>
              {saleComplete.change > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-1">الباقي</p>
                  <p className="text-3xl font-bold" style={{ color: accentColor }}>{formatCurrency(saleComplete.change)}</p>
                </div>
              )}
            </div>
          </div>

        /* ════ ACTIVE CART ════ */
        ) : hasItems ? (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* CURRENT ITEM — prominently shown when a product is just scanned */}
            {currentItem ? (
              <div className="flex-shrink-0 flex flex-col items-center justify-center py-10 px-8 border-b border-white/10"
                style={{ background: `linear-gradient(135deg, ${bgColor}, ${accentColor}22)` }}>
                <p className="text-slate-400 text-base mb-3 tracking-widest uppercase">المنتج الحالي</p>
                <p className="text-4xl font-bold text-white mb-4 text-center leading-snug">{currentItem.name}</p>
                <div className="flex items-center gap-6">
                  {currentItem.quantity > 1 && (
                    <span className="text-2xl text-slate-400">{currentItem.quantity} ×</span>
                  )}
                  <p className="text-7xl font-black" style={{ color: accentColor }}>
                    {formatCurrency(currentItem.price)}
                  </p>
                </div>
                {currentItem.quantity > 1 && (
                  <p className="text-xl text-slate-300 mt-3">
                    الإجمالي: {formatCurrency(currentItem.total)}
                  </p>
                )}
              </div>
            ) : (
              /* No current scan — show a compact total banner */
              <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-white/10"
                style={{ background: `${accentColor}15` }}>
                <div className="flex items-center gap-3 text-slate-300">
                  <ShoppingCart className="w-5 h-5" />
                  <span>{cartState!.items.length} منتج</span>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-sm">الإجمالي</p>
                  <p className="text-4xl font-black" style={{ color: accentColor }}>
                    {formatCurrency(cartState!.total)}
                  </p>
                </div>
              </div>
            )}

            {/* Cart list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {cartState!.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold truncate">{item.name}</p>
                    <p className="text-slate-400 text-sm">
                      {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="text-xl font-bold flex-shrink-0 mr-4" style={{ color: accentColor }}>
                    {formatCurrency(item.total)}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer totals */}
            <div className="flex-shrink-0 border-t border-white/10 px-8 py-4 space-y-1.5"
              style={{ backgroundColor: `${bgColor}cc` }}>
              <div className="flex justify-between text-base text-slate-400">
                <span>الإجمالي الفرعي</span>
                <span>{formatCurrency(cartState!.subtotal)}</span>
              </div>
              {cartState!.discount > 0 && (
                <div className="flex justify-between text-base text-amber-400">
                  <span>الخصم</span>
                  <span>-{formatCurrency(cartState!.discount)}</span>
                </div>
              )}
              {cartState!.tax > 0 && (
                <div className="flex justify-between text-base text-slate-400">
                  <span>الضريبة</span>
                  <span>{formatCurrency(cartState!.tax)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-2xl font-bold">المجموع</span>
                <span className="text-5xl font-black" style={{ color: accentColor }}>
                  {formatCurrency(cartState!.total)}
                </span>
              </div>
            </div>
          </div>

        /* ════ IDLE ════ */
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            {idleImage ? (
              <img src={idleImage} alt="" className="max-w-2xl max-h-[55vh] object-contain rounded-2xl mb-2" />
            ) : (
              <Store className="w-24 h-24 text-slate-600" />
            )}
            <p className="text-4xl font-bold text-slate-300">{welcomeMessage}</p>
            <p className="text-slate-500 text-lg">في انتظار بدء عملية البيع...</p>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db, type Product, type Offer } from '@/lib/local-db';
import { formatCurrency, setCurrencyCode } from '@/lib/store';
import { PRICE_CHECK_CHANNEL, type PriceCheckMessage } from '@/lib/price-check-channel';
import {
  Search, Barcode, PackageX, Tag, X, Wifi, WifiOff,
  AlertTriangle, CheckCircle, Keyboard,
} from 'lucide-react';

const SHORTCUTS = [
  { key: 'F3', desc: 'تفعيل البحث' },
  { key: 'Enter', desc: 'بحث' },
  { key: 'Esc', desc: 'مسح' },
  { key: 'F5', desc: 'تحديث المنتجات' },
];

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock <= 0) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-red-500/20 text-red-300">
      <PackageX className="w-4 h-4" /> نفدت الكمية
    </span>
  );
  if (stock <= minStock) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-amber-500/20 text-amber-300">
      <AlertTriangle className="w-4 h-4" /> كمية محدودة
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-emerald-500/20 text-emerald-300">
      <CheckCircle className="w-4 h-4" /> متوفر في المخزن
    </span>
  );
}

type SearchState = 'idle' | 'searching' | 'found' | 'not-found';

export default function PriceCheckPage() {
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [product, setProduct] = useState<Product | null>(null);
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [storeName, setStoreName] = useState('');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastScan, setLastScan] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Load settings and products
  useEffect(() => {
    db.settings.get(1).then((s) => {
      if (!s) return;
      setCurrencyCode(s.currencyCode);
      setStoreName(s.storeName || 'نقطة البيع');
      setAccentColor(s.printAccentColor || '#10b981');
    });
    db.offers.filter((o) => o.isActive).toArray().then(setOffers);
    db.products.toArray().then(setProducts);
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // BroadcastChannel from POS
  useEffect(() => {
    const ch = new BroadcastChannel(PRICE_CHECK_CHANNEL);
    channelRef.current = ch;
    ch.onmessage = async (e: MessageEvent<PriceCheckMessage>) => {
      const msg = e.data;
      if (msg.type === 'product-found') {
        const p = await db.products.get(msg.productId);
        if (p) showProduct(p);
      } else if (msg.type === 'not-found') {
        setQuery(msg.query);
        setSearchState('not-found');
        setProduct(null);
        resetIdleTimer();
      } else if (msg.type === 'clear') {
        clearSearch();
      }
    };
    return () => { ch.close(); channelRef.current = null; };
  }, [offers]); // eslint-disable-line react-hooks/exhaustive-deps

  const getOfferDiscount = useCallback((p: Product): number => {
    const now = new Date();
    const active = offers.filter((o) => {
      if (!o.isActive) return false;
      if (o.discountType !== 'percentage') return false;
      const start = o.startDate ? new Date(o.startDate) : null;
      const end = o.endDate ? new Date(o.endDate) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return o.productIds?.includes(p.id!) || o.category === p.category;
    });
    return active.length > 0 ? Math.max(...active.map((o) => o.discountValue ?? 0)) : 0;
  }, [offers]);

  const showProduct = useCallback((p: Product) => {
    setProduct(p);
    setSearchState('found');
    setShowSuggestions(false);
    setLastScan(p.barcode || p.name);
    const offerDisc = getOfferDiscount(p);
    const totalDisc = Math.max(p.discount ?? 0, offerDisc);
    setDiscountedPrice(totalDisc > 0 ? p.price * (1 - totalDisc / 100) : null);
    resetIdleTimer();
  }, [getOfferDiscount]);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setSearchState('idle');
      setProduct(null);
      setQuery('');
      setDiscountedPrice(null);
    }, 30000);
  };

  const clearSearch = () => {
    setQuery('');
    setProduct(null);
    setSearchState('idle');
    setDiscountedPrice(null);
    setShowSuggestions(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    inputRef.current?.focus();
  };

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setSearchState('idle'); return; }
    setSearchState('searching');
    setShowSuggestions(false);

    // barcode exact match first
    let found = await db.products.where('barcode').equals(trimmed).first();
    if (!found) found = await db.products.where('plu').equals(trimmed).first();
    // fallback: name contains
    if (!found) {
      const all = await db.products.toArray();
      found = all.find((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()));
    }

    if (found) {
      showProduct(found);
    } else {
      setProduct(null);
      setSearchState('not-found');
      resetIdleTimer();
    }
  }, [showProduct]);

  // Suggestions while typing (name search only)
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const q = query.toLowerCase();
    const matches = products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.barcode.includes(q)
    ).slice(0, 6);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0 && searchState !== 'found');
  }, [query, products, searchState]);

  // Global keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'F3') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        db.products.toArray().then(setProducts);
        db.offers.filter((o) => o.isActive).toArray().then(setOffers);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSearch();
        return;
      }
      if (e.key === 'Enter' && inInput) {
        e.preventDefault();
        doSearch(query);
        return;
      }
      // Auto-focus input on any printable character when not in input
      if (!inInput && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [query, doSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const offerDiscount = product ? getOfferDiscount(product) : 0;
  const totalDiscount = product ? Math.max(product.discount ?? 0, offerDiscount) : 0;

  return (
    <div
      className="min-h-screen flex flex-col select-none"
      style={{ background: '#0a0f1e', direction: 'rtl' }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Barcode className="w-7 h-7" style={{ color: accentColor }} />
          <span className="text-white font-bold text-xl">{storeName}</span>
          <span className="text-slate-500 text-sm">— فحص الأسعار</span>
        </div>
        <div className="flex items-center gap-3">
          {isOnline
            ? <span className="flex items-center gap-1 text-xs text-emerald-400"><Wifi className="w-3.5 h-3.5" />متصل</span>
            : <span className="flex items-center gap-1 text-xs text-rose-400"><WifiOff className="w-3.5 h-3.5" />غير متصل</span>}
          <span className="text-slate-600 text-xs">{products.length} منتج</span>
        </div>
      </header>

      {/* Search bar */}
      <div className="px-8 py-5 relative">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doSearch(query); }}
            placeholder="ابحث بالباركود أو اسم المنتج... (F3)"
            className="w-full pr-12 pl-12 py-4 rounded-2xl text-lg text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            autoFocus
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute right-8 left-8 mt-1 z-50" style={{ maxWidth: '672px', margin: '0.25rem auto 0' }}>
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: '#141929' }}>
              {suggestions.map((p) => {
                const disc = Math.max(p.discount ?? 0, getOfferDiscount(p!));
                const finalPrice = disc > 0 ? p.price * (1 - disc / 100) : p.price;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setQuery(p.name); showProduct(p); }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-right border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {p.image
                        ? <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Tag className="w-4 h-4 text-slate-500" /></div>}
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.barcode}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: accentColor }}>{formatCurrency(finalPrice)}</p>
                      {disc > 0 && <p className="text-xs text-slate-500 line-through">{formatCurrency(p.price)}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-8 pb-8">

        {/* Idle */}
        {searchState === 'idle' && (
          <div className="text-center space-y-6 max-w-md">
            <div
              className="w-32 h-32 rounded-3xl mx-auto flex items-center justify-center"
              style={{ background: `${accentColor}18` }}
            >
              <Barcode className="w-16 h-16" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">جاهز للبحث</h2>
              <p className="text-slate-400">امسح الباركود أو ابحث باسم المنتج</p>
              <p className="text-slate-600 text-sm mt-1">يمكن أيضاً الاستقبال التلقائي من الكاشير</p>
            </div>
          </div>
        )}

        {/* Searching */}
        {searchState === 'searching' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mx-auto" style={{ borderColor: `${accentColor}44`, borderTopColor: accentColor }} />
            <p className="text-slate-400 text-lg">جارٍ البحث...</p>
          </div>
        )}

        {/* Not found */}
        {searchState === 'not-found' && (
          <div className="text-center space-y-5 max-w-md">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center bg-rose-500/10">
              <PackageX className="w-12 h-12 text-rose-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-rose-300">لم يُعثر على منتج</h2>
              <p className="text-slate-400 mt-2">«{query}» غير موجود في قاعدة البيانات</p>
              <p className="text-slate-600 text-sm mt-1">تحقق من الباركود أو راجع الكاشير</p>
            </div>
            <button onClick={clearSearch} className="px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm">
              بحث جديد (Esc)
            </button>
          </div>
        )}

        {/* Found */}
        {searchState === 'found' && product && (
          <div className="w-full max-w-2xl">
            <div
              className="rounded-3xl p-8 space-y-6 border border-white/5"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-start gap-6">
                {/* Product image */}
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-32 h-32 rounded-2xl object-cover flex-shrink-0 border border-white/10"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10" style={{ background: `${accentColor}18` }}>
                    <Tag className="w-10 h-10" style={{ color: accentColor }} />
                  </div>
                )}

                {/* Name + barcode + stock */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-3xl font-bold text-white leading-tight">{product.name}</h2>
                  <p className="text-slate-500 mt-1 font-mono text-sm">{product.barcode}</p>
                  {product.category && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs border border-white/10 text-slate-400">{product.category}</span>
                  )}
                  <div className="mt-3">
                    <StockBadge stock={product.stock} minStock={product.minStock} />
                  </div>
                </div>
              </div>

              {/* Price display */}
              <div className="rounded-2xl p-6 text-center" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}33` }}>
                {discountedPrice !== null ? (
                  <>
                    <p className="text-slate-400 line-through text-xl mb-1">{formatCurrency(product.price)}</p>
                    <p className="font-black text-7xl tracking-tight" style={{ color: accentColor }}>
                      {formatCurrency(discountedPrice)}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-rose-500/20 text-rose-300">
                        خصم {totalDiscount}%
                      </span>
                      {offerDiscount > 0 && (
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-amber-500/20 text-amber-300">
                          عرض خاص
                        </span>
                      )}
                      <span className="text-slate-400 text-sm">
                        توفر {formatCurrency(product.price - discountedPrice)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="font-black text-7xl tracking-tight" style={{ color: accentColor }}>
                    {formatCurrency(product.price)}
                  </p>
                )}
                <p className="text-slate-500 text-sm mt-2">
                  شامل الضريبة · الوحدة: {product.unit}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={clearSearch}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                >
                  <X className="w-4 h-4" /> بحث جديد (Esc)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts bar */}
      <footer className="px-8 py-3 border-t border-white/5 flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-slate-600 text-xs">
          <Keyboard className="w-3.5 h-3.5" />
          <span>اختصارات:</span>
        </div>
        {SHORTCUTS.map(({ key, desc }) => (
          <div key={key} className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded border border-white/10 text-slate-400 text-xs font-mono" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {key}
            </kbd>
            <span className="text-slate-600 text-xs">{desc}</span>
          </div>
        ))}
        {lastScan && (
          <span className="mr-auto text-slate-600 text-xs">
            آخر بحث: <span className="text-slate-400 font-mono">{lastScan}</span>
          </span>
        )}
      </footer>
    </div>
  );
}

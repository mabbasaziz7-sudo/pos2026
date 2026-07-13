'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, type Customer, type Sale, type WalletTransaction, type LoyaltyTier, PAYMENT_TYPE_LABELS } from '@/lib/local-db';
import { formatCurrency, setCurrencyCode } from '@/lib/store';
import { CUSTOMER_PORTAL_CHANNEL, type CustomerPortalMessage } from '@/lib/customer-portal-channel';
import {
  Search, Star, Wallet, CreditCard, ShoppingBag, Clock, ChevronLeft,
  CheckCircle, TrendingDown, TrendingUp, User, Phone, Loader2,
} from 'lucide-react';

type ActiveTx = Extract<CustomerPortalMessage, { type: 'transaction-update' }>;
type CompletedSale = Extract<CustomerPortalMessage, { type: 'sale-complete' }>;

function BalanceCard({
  label, value, icon: Icon, colorClass, subText,
}: {
  label: string; value: string; icon: React.ElementType;
  colorClass: string; subText?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${colorClass} flex flex-col gap-2`}>
      <div className="flex items-center gap-2 opacity-80">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {subText && <div className="text-xs opacity-70">{subText}</div>}
    </div>
  );
}

function TxRow({ tx }: { tx: WalletTransaction }) {
  const isIn = tx.type === 'topup' || tx.type === 'refund';
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${isIn ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {isIn ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{tx.type === 'topup' ? 'إيداع' : tx.type === 'purchase' ? 'شراء' : tx.type === 'refund' ? 'استرداد' : tx.type}</p>
          <p className="text-xs text-white/50">{new Date(tx.date).toLocaleDateString('ar-SA')}</p>
        </div>
      </div>
      <span className={`text-sm font-bold ${isIn ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isIn ? '+' : '-'}{formatCurrency(tx.amount)}
      </span>
    </div>
  );
}

function SaleRow({ sale }: { sale: Sale }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{sale.invoiceNumber}</p>
          <p className="text-xs text-white/50">{new Date(sale.date).toLocaleDateString('ar-SA')} — {PAYMENT_TYPE_LABELS[sale.paymentType]}</p>
        </div>
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-white">{formatCurrency(sale.total)}</p>
        {(sale.loyaltyPointsEarned ?? 0) > 0 && (
          <p className="text-xs text-amber-400">+{sale.loyaltyPointsEarned} نقطة</p>
        )}
      </div>
    </div>
  );
}

export default function CustomerPortalPage() {
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [walletTxs, setWalletTxs] = useState<WalletTransaction[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [tier, setTier] = useState<LoyaltyTier | null>(null);
  const [storeName, setStoreName] = useState('');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeTx, setActiveTx] = useState<ActiveTx | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'sales'>('overview');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const completedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    db.settings.get(1).then((s) => {
      if (!s) return;
      setCurrencyCode(s.currencyCode);
      setStoreName(s.storeName || 'نظام الكاشير');
      setAccentColor(s.printAccentColor || '#10b981');
    });
  }, []);

  const loadCustomer = useCallback(async (c: Customer) => {
    setCustomer(c);
    setNotFound(false);
    setPhone('');
    setCompletedSale(null);
    setActiveTx(null);

    const [txs, sales, tiers] = await Promise.all([
      db.walletTransactions.filter((t) => t.customerId === c.id).toArray(),
      db.sales.filter((s) => s.customerId === c.id).toArray(),
      db.loyaltyTiers.filter((t) => t.isActive && (t.minPoints ?? 0) <= (c.loyaltyPoints ?? 0)).toArray(),
    ]);

    setWalletTxs(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
    setRecentSales(sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
    const topTier = tiers.sort((a, b) => (b.minPoints ?? 0) - (a.minPoints ?? 0))[0] ?? null;
    setTier(topTier);
  }, []);

  // BroadcastChannel from POS
  useEffect(() => {
    const channel = new BroadcastChannel(CUSTOMER_PORTAL_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = async (e: MessageEvent<CustomerPortalMessage>) => {
      const msg = e.data;
      if (msg.type === 'customer-active') {
        const c = await db.customers.get(msg.customerId);
        if (c) loadCustomer(c);
      } else if (msg.type === 'transaction-update') {
        setActiveTx(msg);
      } else if (msg.type === 'sale-complete') {
        setCompletedSale(msg);
        setActiveTx(null);
        // Refresh customer data after sale
        if (customer) {
          const updated = await db.customers.get(customer.id!);
          if (updated) {
            setCustomer(updated);
            const txs = await db.walletTransactions.filter((t) => t.customerId === updated.id).toArray();
            setWalletTxs(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
          }
        }
        if (completedTimerRef.current) clearTimeout(completedTimerRef.current);
        completedTimerRef.current = setTimeout(() => setCompletedSale(null), 10000);
      } else if (msg.type === 'clear') {
        setActiveTx(null);
      }
    };
    return () => { channel.close(); channelRef.current = null; };
  }, [customer, loadCustomer]);

  const search = async () => {
    const q = phone.trim();
    if (!q) return;
    setSearching(true);
    setNotFound(false);
    const c = await db.customers
      .filter((cu) => cu.phone === q || cu.name.includes(q))
      .first();
    setSearching(false);
    if (c) loadCustomer(c);
    else setNotFound(true);
  };

  const tierColor = tier?.color || accentColor;
  const debt = Math.max(customer?.balance ?? 0, 0);
  const walletBal = customer?.walletBalance ?? 0;
  const points = customer?.loyaltyPoints ?? 0;

  // ── Completed sale overlay ──
  if (completedSale) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-6 px-8 animate-pulse-once">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-14 h-14 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">شكراً لزيارتك!</h2>
            <p className="text-slate-400">فاتورة رقم {completedSale.invoiceNumber}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-6 space-y-3 text-right">
            <div className="flex justify-between text-lg">
              <span className="text-slate-400">الإجمالي</span>
              <span className="text-white font-bold">{formatCurrency(completedSale.total)}</span>
            </div>
            {completedSale.pointsEarned > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">نقاط مكتسبة</span>
                <span className="text-amber-400 font-bold">+{completedSale.pointsEarned} نقطة</span>
              </div>
            )}
            {completedSale.newDebt > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">رصيد مديونية</span>
                <span className="text-rose-400 font-bold">{formatCurrency(completedSale.newDebt)}</span>
              </div>
            )}
          </div>
          <p className="text-slate-500 text-sm">نراك في زيارة قادمة 😊</p>
        </div>
      </div>
    );
  }

  // ── Active transaction overlay ──
  if (activeTx) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-6 px-8 max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: `${accentColor}22` }}>
            <ShoppingBag className="w-10 h-10" style={{ color: accentColor }} />
          </div>
          <h2 className="text-2xl font-bold text-white">جارٍ إتمام الدفع</h2>
          <div className="bg-white/5 rounded-2xl p-6 space-y-4 text-right">
            <div className="flex justify-between text-lg">
              <span className="text-slate-400">الإجمالي</span>
              <span className="text-white font-bold">{formatCurrency(activeTx.total)}</span>
            </div>
            {activeTx.cashPaid > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">نقداً</span>
                <span className="text-emerald-400 font-medium">{formatCurrency(activeTx.cashPaid)}</span>
              </div>
            )}
            {activeTx.walletAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">محفظة</span>
                <span className="text-blue-400 font-medium">{formatCurrency(activeTx.walletAmount)}</span>
              </div>
            )}
            {activeTx.creditAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">آجل</span>
                <span className="text-amber-400 font-medium">{formatCurrency(activeTx.creditAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Customer dashboard ──
  if (customer) {
    return (
      <div className="min-h-screen bg-slate-900" dir="rtl">
        {/* Header */}
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => { setCustomer(null); setActiveTx(null); setCompletedSale(null); }}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              بحث جديد
            </button>
            <span className="text-slate-500 text-sm">{storeName}</span>
          </div>

          {/* Customer info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
              style={{ background: tierColor }}>
              {customer.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
              {customer.phone && (
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
                  <Phone className="w-3.5 h-3.5" />
                  {customer.phone}
                </div>
              )}
              {tier && (
                <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: tierColor }}>
                  <Star className="w-3 h-3" />
                  {tier.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Balance cards */}
        <div className="px-6 grid grid-cols-3 gap-3 mt-2">
          <BalanceCard
            label="نقاط الولاء"
            value={points.toLocaleString('ar-SA')}
            icon={Star}
            colorClass="bg-amber-500/15 text-amber-300"
            subText={tier ? `مستوى ${tier.name}` : 'اكسب نقاطاً'}
          />
          <BalanceCard
            label="رصيد المحفظة"
            value={formatCurrency(walletBal)}
            icon={Wallet}
            colorClass="bg-blue-500/15 text-blue-300"
            subText="رصيد مدفوع مسبقاً"
          />
          <BalanceCard
            label="المديونية"
            value={formatCurrency(debt)}
            icon={CreditCard}
            colorClass={debt > 0 ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}
            subText={debt > 0 ? 'مستحق للمتجر' : 'لا توجد مديونية'}
          />
        </div>

        {/* Tabs */}
        <div className="px-6 mt-6">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {([['overview', 'نظرة عامة'], ['wallet', 'المحفظة'], ['sales', 'المشتريات']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === id ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6 mt-4 pb-8">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">عدد الفواتير</p>
                  <p className="text-2xl font-bold text-white mt-1">{recentSales.length}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">إجمالي المشتريات</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(recentSales.reduce((s, r) => s + r.total, 0))}
                  </p>
                </div>
              </div>

              {/* Last 5 sales */}
              {recentSales.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3">آخر الفواتير</h3>
                  {recentSales.slice(0, 5).map((s) => <SaleRow key={s.id} sale={s} />)}
                </div>
              )}

              {recentSales.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>لا توجد مشتريات بعد</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">سجل المحفظة</h3>
                  <span className="text-blue-400 font-bold">{formatCurrency(walletBal)}</span>
                </div>
                {walletTxs.length > 0
                  ? walletTxs.map((tx) => <TxRow key={tx.id} tx={tx} />)
                  : (
                    <div className="text-center py-8 text-slate-500">
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">لا توجد معاملات في المحفظة</p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">جميع الفواتير</h3>
              {recentSales.length > 0
                ? recentSales.map((s) => <SaleRow key={s.id} sale={s} />)
                : (
                  <div className="text-center py-8 text-slate-500">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">لا توجد فواتير بعد</p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Search screen ──
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-8" dir="rtl">
      <div className="w-full max-w-sm space-y-8">
        {/* Store brand */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
            style={{ background: `${accentColor}22` }}>
            <User className="w-10 h-10" style={{ color: accentColor }} />
          </div>
          <h1 className="text-3xl font-bold text-white">{storeName || 'بوابة العميل'}</h1>
          <p className="text-slate-400">أدخل رقم هاتفك للاطلاع على حسابك</p>
        </div>

        {/* Search input */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setNotFound(false); }}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="رقم الهاتف أو الاسم..."
              className="w-full pr-12 pl-4 py-4 bg-white/10 text-white placeholder-slate-400 rounded-2xl border border-white/10 focus:outline-none focus:border-white/30 text-lg"
            />
          </div>

          <button
            onClick={search}
            disabled={!phone.trim() || searching}
            className="w-full py-4 rounded-2xl font-bold text-white text-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: accentColor }}
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {searching ? 'جارٍ البحث...' : 'عرض حسابي'}
          </button>

          {notFound && (
            <div className="text-center py-4 text-rose-400 bg-rose-500/10 rounded-xl">
              <p className="font-medium">لم يتم العثور على حساب</p>
              <p className="text-sm opacity-70 mt-1">تحقق من الرقم أو اسأل الكاشير</p>
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Star, label: 'نقاط الولاء', color: 'text-amber-400' },
            { icon: Wallet, label: 'رصيد المحفظة', color: 'text-blue-400' },
            { icon: Clock, label: 'سجل المشتريات', color: 'text-purple-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="bg-white/5 rounded-xl p-3 space-y-1">
              <Icon className={`w-5 h-5 mx-auto ${color}`} />
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-600 text-xs">
          يمكن للكاشير تسجيل دخولك تلقائياً عند اختيارك
        </p>
      </div>
    </div>
  );
}

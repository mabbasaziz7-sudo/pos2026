'use client';

import { useAppStore } from '@/lib/store';
import {
  ShoppingCart, Package, Warehouse, Clock, Truck, Users,
  BarChart3, Shield, Download, LogOut, Menu, X, Store,
  ChevronLeft, Settings, Receipt, ClipboardList, Tag, Gift,
  MessageCircle, RotateCcw, LayoutDashboard, Palette, Wifi, WifiOff,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const menuItems = [
  { id: 'dashboard',  label: 'لوحة التحكم',      icon: LayoutDashboard, color: 'text-yellow-400' },
  { id: 'pos',        label: 'نقطة البيع',        icon: ShoppingCart,    color: 'text-emerald-400' },
  { id: 'sales',      label: 'المبيعات',          icon: Receipt,         color: 'text-lime-400' },
  { id: 'returns',    label: 'المرتجعات',         icon: RotateCcw,       color: 'text-red-400' },
  { id: 'purchases',  label: 'المشتريات',         icon: ClipboardList,   color: 'text-violet-400' },
  { id: 'products',   label: 'المنتجات',          icon: Package,         color: 'text-blue-400' },
  { id: 'inventory',  label: 'المخزون',           icon: Warehouse,       color: 'text-amber-400' },
  { id: 'shifts',     label: 'الورديات',          icon: Clock,           color: 'text-purple-400' },
  { id: 'suppliers',  label: 'الموردين',          icon: Truck,           color: 'text-rose-400' },
  { id: 'customers',  label: 'العملاء',           icon: Users,           color: 'text-cyan-400' },
  { id: 'promotions', label: 'العروض والكوبونات', icon: Tag,             color: 'text-pink-400' },
  { id: 'vouchers',   label: 'القسائم',           icon: Gift,            color: 'text-fuchsia-400' },
  { id: 'campaigns',  label: 'واتساب',            icon: MessageCircle,   color: 'text-green-400' },
  { id: 'reports',    label: 'التقارير',          icon: BarChart3,       color: 'text-orange-400' },
  { id: 'users',      label: 'المستخدمين',        icon: Shield,          color: 'text-indigo-400' },
  { id: 'backup',     label: 'نسخ احتياطي',      icon: Download,        color: 'text-teal-400' },
  { id: 'themes',     label: 'القوالب والمظاهر', icon: Palette,         color: 'text-pink-300' },
  { id: 'settings',   label: 'الإعدادات',         icon: Settings,        color: 'text-slate-400' },
];

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-xs text-slate-500 font-mono">{time}</span>;
}

function DBStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (mounted) setOnline(res.ok);
      } catch {
        if (mounted) setOnline(false);
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (online === null) return null;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
      online ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
    }`}>
      {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      DB {online ? 'Online' : 'Offline'}
    </span>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, activeTab, setActiveTab, logout, currentShift, settings } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sidebarBg = settings?.sidebarBg || '#0f172a';
  const accentColor = settings?.printAccentColor || '#10b981';

  const handleLogout = () => { logout(); toast.success('تم تسجيل الخروج'); };

  if (!currentUser) return null;

  const canAccess = (tabId: string) => {
    if (currentUser.role === 'admin') return true;
    if (tabId === 'users' || tabId === 'settings' || tabId === 'themes') return false;
    if (tabId === 'dashboard') return true;
    return currentUser.permissions?.includes(tabId) ?? false;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 right-0 z-50 text-white transition-all duration-300 lg:static"
        style={{
          background: sidebarBg,
          width: sidebarOpen ? 240 : 0,
          overflow: sidebarOpen ? undefined : 'hidden',
        }}
      >
        <div className="h-full flex flex-col w-60">
          {/* Logo */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: accentColor }}>
              {settings?.storeLogo
                ? <img src={settings.storeLogo} alt="" className="w-full h-full object-contain" />
                : <Store className="w-5 h-5 text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sm truncate">{settings?.storeName || 'نظام الكاشير'}</h1>
              <p className="text-xs opacity-50">POS PRO</p>
            </div>
          </div>

          {/* User */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${accentColor}33` }}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{currentUser.name}</p>
                <p className="text-xs opacity-50">{currentUser.role === 'admin' ? 'مدير' : currentUser.role === 'manager' ? 'مدير فرع' : 'كاشير'}</p>
              </div>
            </div>
            {currentShift && (
              <div className="mt-2 px-2 py-1 rounded-lg text-xs flex items-center gap-1" style={{ background: `${accentColor}22`, color: accentColor }}>
                <Clock className="w-3 h-3" /> وردية #{currentShift.id} مفتوحة
              </div>
            )}
          </div>

          {/* Menu */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {menuItems.map((item) => {
              if (!canAccess(item.id)) return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left"
                  style={isActive
                    ? { background: accentColor, color: '#fff', boxShadow: `0 4px 14px ${accentColor}55` }
                    : { color: 'rgba(255,255,255,0.65)' }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                  {isActive && <ChevronLeft className="w-3 h-3 mr-auto opacity-70 flex-shrink-0" />}
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-2 border-t border-white/10">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-300 hover:bg-rose-500/10 transition-all">
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5 text-slate-500" /> : <Menu className="w-5 h-5 text-slate-500" />}
          </button>
          <h2 className="text-sm font-semibold text-slate-800">
            {menuItems.find(i => i.id === activeTab)?.label}
          </h2>
          <div className="mr-auto flex items-center gap-3">
            <LiveClock />
            <DBStatus />
            {currentShift && (
              <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full" style={{ background: `${accentColor}18`, color: accentColor }}>
                <Clock className="w-3 h-3" /> وردية #{currentShift.id}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-5">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

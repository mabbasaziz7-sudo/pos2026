'use client';

import { useAppStore } from '@/lib/store';
import {
  ShoppingCart,
  Package,
  Warehouse,
  Clock,
  Truck,
  Users,
  BarChart3,
  Shield,
  Download,
  LogOut,
  Menu,
  X,
  Store,
  ChevronLeft,
  Settings,
  Receipt,
  ClipboardList,
  Tag,
  Gift,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const menuItems = [
  { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart, color: 'text-emerald-400' },
  { id: 'sales', label: 'المبيعات', icon: Receipt, color: 'text-lime-400' },
  { id: 'returns', label: 'المرتجعات', icon: RotateCcw, color: 'text-red-400' },
  { id: 'purchases', label: 'المشتريات', icon: ClipboardList, color: 'text-violet-400' },
  { id: 'products', label: 'المنتجات', icon: Package, color: 'text-blue-400' },
  { id: 'inventory', label: 'المخزون', icon: Warehouse, color: 'text-amber-400' },
  { id: 'shifts', label: 'الورديات', icon: Clock, color: 'text-purple-400' },
  { id: 'suppliers', label: 'الموردين', icon: Truck, color: 'text-rose-400' },
  { id: 'customers', label: 'العملاء', icon: Users, color: 'text-cyan-400' },
  { id: 'promotions', label: 'العروض والكوبونات', icon: Tag, color: 'text-pink-400' },
  { id: 'vouchers', label: 'القسائم', icon: Gift, color: 'text-fuchsia-400' },
  { id: 'campaigns', label: 'واتساب', icon: MessageCircle, color: 'text-green-400' },
  { id: 'reports', label: 'التقارير', icon: BarChart3, color: 'text-orange-400' },
  { id: 'users', label: 'المستخدمين', icon: Shield, color: 'text-indigo-400' },
  { id: 'backup', label: 'نسخ احتياطي', icon: Download, color: 'text-teal-400' },
  { id: 'settings', label: 'الإعدادات', icon: Settings, color: 'text-slate-400' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, activeTab, setActiveTab, logout, currentShift, settings } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    toast.success('تم تسجيل الخروج');
  };

  if (!currentUser) return null;

  const canAccess = (tabId: string) => {
    if (currentUser.role === 'admin') return true;
    if (tabId === 'users' || tabId === 'settings') return false;
    return currentUser.permissions?.includes(tabId) ?? false;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 bg-slate-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 translate-x-full overflow-hidden'
        } lg:static lg:translate-x-0 lg:w-64`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center overflow-hidden">
                {settings?.storeLogo ? (
                  <img src={settings.storeLogo} alt={settings.storeName} className="w-full h-full object-contain" />
                ) : (
                  <Store className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-lg truncate">{settings?.storeName || 'نظام الكاشير'}</h1>
                <p className="text-xs text-slate-400">إدارة المحلات</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400">
                  {currentUser.role === 'admin' ? 'مدير' : currentUser.role === 'manager' ? 'مدير فرع' : 'كاشير'}
                </p>
              </div>
            </div>
            {currentShift && (
              <div className="mt-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
                <p className="text-xs text-emerald-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  وردية مفتوحة
                </p>
              </div>
            )}
          </div>

          {/* Menu */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {menuItems.map((item) => {
              if (!canAccess(item.id)) return null;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeTab === item.id
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {activeTab === item.id && <ChevronLeft className="w-4 h-4 mr-auto" />}
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-300 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h2 className="text-lg font-semibold text-slate-800">
            {menuItems.find((i) => i.id === activeTab)?.label}
          </h2>
          {currentShift && (
            <span className="mr-auto px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              وردية #{currentShift.id}
            </span>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

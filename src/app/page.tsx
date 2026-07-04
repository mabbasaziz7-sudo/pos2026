'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from '@/lib/store';
import { db } from '@/lib/local-db';
import Login from '@/components/login';
import AppLayout from '@/components/app-layout';
import POS from '@/components/pos';
import Sales from '@/components/sales';
import Returns from '@/components/returns';
import Purchases from '@/components/purchases';
import Products from '@/components/products';
import Inventory from '@/components/inventory';
import Shifts from '@/components/shifts';
import Suppliers from '@/components/suppliers';
import Customers from '@/components/customers';
import Promotions from '@/components/promotions';
import Vouchers from '@/components/vouchers';
import Campaigns from '@/components/campaigns';
import Reports from '@/components/reports';
import Users from '@/components/users';
import Backup from '@/components/backup';
import Settings from '@/components/settings';
import Dashboard from '@/components/dashboard';
import Themes from '@/components/themes';
import Deliveries from '@/components/deliveries';
import Employees from '@/components/employees';
import Orders from '@/components/orders';
import Transactions from '@/components/transactions';
import LoyaltyPrograms from '@/components/loyalty-programs';

export default function HomePage() {
  const { currentUser, activeTab, setCurrentUser, setSettings } = useAppStore();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // استعادة الجلسة + الإعدادات معًا عند أي إعادة تحميل —
    // بدون هذا يظل كود العملة (وغيره) على القيم الافتراضية حتى نهاية الجلسة
    const restore = async () => {
      try {
        const [sessionData, storedSettings] = await Promise.all([
          fetch('/api/auth/me').then((r) => r.json()).catch(() => ({})),
          db.settings.get(1).catch(() => null),
        ]);
        if (sessionData.user) setCurrentUser(sessionData.user);
        if (storedSettings) {
          setSettings(storedSettings);
          if (storedSettings.favicon) {
            let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
            if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
            link.href = storedSettings.favicon;
          }
        }
      } finally {
        setCheckingSession(false);
      }
    };
    restore();
  }, [setCurrentUser, setSettings]);

  if (checkingSession) return null;

  if (!currentUser) {
    return (
      <>
        <Login />
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      </>
    );
  }

  return (
    <AppLayout>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {(activeTab === 'dashboard' || !activeTab) && <Dashboard />}
      {activeTab === 'pos' && <POS />}
      {activeTab === 'sales' && <Sales />}
      {activeTab === 'returns' && <Returns />}
      {activeTab === 'purchases' && <Purchases />}
      {activeTab === 'products' && <Products />}
      {activeTab === 'inventory' && <Inventory />}
      {activeTab === 'shifts' && <Shifts />}
      {activeTab === 'suppliers' && <Suppliers />}
      {activeTab === 'customers' && <Customers />}
      {activeTab === 'promotions' && <Promotions />}
      {activeTab === 'vouchers' && <Vouchers />}
      {activeTab === 'campaigns' && <Campaigns />}
      {activeTab === 'deliveries' && <Deliveries />}
      {activeTab === 'employees' && <Employees />}
      {activeTab === 'orders' && <Orders />}
      {activeTab === 'transactions' && <Transactions />}
      {activeTab === 'loyalty' && <LoyaltyPrograms />}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'users' && <Users />}
      {activeTab === 'backup' && <Backup />}
      {activeTab === 'themes' && <Themes />}
      {activeTab === 'settings' && <Settings />}
    </AppLayout>
  );
}

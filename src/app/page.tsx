'use client';

import { Toaster } from 'react-hot-toast';
import { useAppStore } from '@/lib/store';
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

export default function HomePage() {
  const { currentUser, activeTab } = useAppStore();

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
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'users' && <Users />}
      {activeTab === 'backup' && <Backup />}
      {activeTab === 'settings' && <Settings />}
    </AppLayout>
  );
}

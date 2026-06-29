import { create } from 'zustand';
import type { User, Shift, Settings } from './local-db';

interface AppState {
  currentUser: User | null;
  currentShift: Shift | null;
  activeTab: string;
  settings: Settings | null;
  pendingReturnInvoice: string | null;
  setCurrentUser: (user: User | null) => void;
  setCurrentShift: (shift: Shift | null) => void;
  setActiveTab: (tab: string) => void;
  setSettings: (settings: Settings | null) => void;
  setPendingReturnInvoice: (invoiceNumber: string | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  currentShift: null,
  activeTab: 'pos',
  settings: null,
  pendingReturnInvoice: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentShift: (shift) => set({ currentShift: shift }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSettings: (settings) => {
    if (settings) setCurrencyCode(settings.currencyCode);
    set({ settings });
  },
  setPendingReturnInvoice: (invoiceNumber) => set({ pendingReturnInvoice: invoiceNumber }),
  logout: () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    set({ currentUser: null, currentShift: null, activeTab: 'pos' });
  },
}));

let currentCurrencyCode = 'SAR';

export function setCurrencyCode(code: string): void {
  currentCurrencyCode = code;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currentCurrencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-SA').format(num);
}

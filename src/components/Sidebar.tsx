"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/", label: "لوحة التحكم", icon: "📊" },
  { href: "/orders", label: "الطلبات", icon: "📋" },
  { href: "/work-orders", label: "أوامر الشغل", icon: "⚙️" },
  { href: "/invoices/sales", label: "فواتير المبيعات", icon: "🧾" },
  { href: "/invoices/purchases", label: "فواتير المشتريات", icon: "🛒" },
  { href: "/quotations", label: "عروض الأسعار", icon: "💼" },
  { href: "/customers", label: "العملاء", icon: "👥" },
  { href: "/suppliers", label: "الموردين", icon: "🚚" },
  { href: "/installments", label: "الأقساط", icon: "💳" },
  { href: "/products", label: "المنتجات", icon: "📦" },
  { href: "/raw-materials", label: "المخزون", icon: "🗂️" },
  { href: "/shipments", label: "الشحن", icon: "🚛" },
  { href: "/employees", label: "الموظفين", icon: "👨‍💼" },
  { href: "/attendance", label: "الحضور", icon: "🕐" },
  { href: "/salaries", label: "الرواتب", icon: "💰" },
  { href: "/expenses", label: "المصروفات", icon: "💸" },
  { href: "/reports", label: "التقارير", icon: "📈" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 right-4 z-50 bg-orange-500 text-white p-2 rounded-lg shadow-lg"
      >
        ☰
      </button>

      <aside
        className={`fixed lg:sticky top-0 right-0 h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-y-auto z-40 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-orange-400">سمارت أوفيس</h1>
          <p className="text-xs text-slate-400 mt-1">نظام إدارة المطابع</p>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-orange-500 text-white font-semibold shadow-lg"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-4 border-t border-slate-700">
          <div className="bg-slate-700/50 rounded-lg p-3 text-xs text-slate-300">
            <p className="font-semibold text-orange-300">الإصدار 1.0</p>
            <p className="mt-1">جميع الحقوق محفوظة © 2024</p>
          </div>
        </div>
      </aside>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
        />
      )}
    </>
  );
}

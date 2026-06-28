import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام الكاشير - إدارة المحلات والمبيعات",
  description: "نظام كاشير وإدارة متكامل للمحلات والشركات الصغيرة يعمل بدون إنترنت",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}

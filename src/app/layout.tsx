import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "سمارت أوفيس - نظام إدارة المطابع",
  description: "نظام متكامل لإدارة المطابع وورش الطباعة",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script
          id="hydration-extension-fix"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const removeAttr = (el) => {
                  if (el && el.removeAttribute && el.hasAttribute && el.hasAttribute('bis_skin_checked')) {
                    el.removeAttribute('bis_skin_checked');
                  }
                };
                const observer = new MutationObserver((mutations) => {
                  for (let i = 0; i < mutations.length; i++) {
                    const mutation = mutations[i];
                    if (mutation.addedNodes) {
                      for (let j = 0; j < mutation.addedNodes.length; j++) {
                        const node = mutation.addedNodes[j];
                        if (node.nodeType === 1) {
                          removeAttr(node);
                          const children = node.getElementsByTagName('*');
                          for (let k = 0; k < children.length; k++) {
                            removeAttr(children[k]);
                          }
                        }
                      }
                    }
                    if (mutation.target && mutation.target.nodeType === 1) {
                      removeAttr(mutation.target);
                    }
                  }
                });
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['bis_skin_checked']
                });
                document.addEventListener('DOMContentLoaded', () => {
                  const all = document.getElementsByTagName('*');
                  for (let i = 0; i < all.length; i++) {
                    removeAttr(all[i]);
                  }
                });
              })();
            `
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}

'use client';

import { useState } from 'react';
import { db } from '@/lib/local-db';
import { useAppStore } from '@/lib/store';
import { Check, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

export const THEMES = [
  { id: 'emerald',  name: 'زمردي',  sidebar: '#064e3b', accent: '#10b981', preview: ['#064e3b','#10b981','#d1fae5'] },
  { id: 'rose',     name: 'وردي',   sidebar: '#881337', accent: '#f43f5e', preview: ['#881337','#f43f5e','#ffe4e6'] },
  { id: 'purple',   name: 'نفسجي',  sidebar: '#4c1d95', accent: '#7c3aed', preview: ['#4c1d95','#7c3aed','#ede9fe'] },
  { id: 'blue',     name: 'أزرق',   sidebar: '#1e3a8a', accent: '#2563eb', preview: ['#1e3a8a','#2563eb','#dbeafe'] },
  { id: 'teal',     name: 'فيروزي', sidebar: '#134e4a', accent: '#0d9488', preview: ['#134e4a','#0d9488','#ccfbf1'] },
  { id: 'amber',    name: 'عنبري',  sidebar: '#78350f', accent: '#d97706', preview: ['#78350f','#d97706','#fef3c7'] },
  { id: 'slate',    name: 'أحادي',  sidebar: '#1e293b', accent: '#475569', preview: ['#1e293b','#475569','#f1f5f9'] },
  { id: 'red',      name: 'أحمر',   sidebar: '#7f1d1d', accent: '#dc2626', preview: ['#7f1d1d','#dc2626','#fee2e2'] },
  { id: 'indigo',   name: 'نيلي',   sidebar: '#312e81', accent: '#4f46e5', preview: ['#312e81','#4f46e5','#e0e7ff'] },
  { id: 'pink',     name: 'زهري',   sidebar: '#831843', accent: '#db2777', preview: ['#831843','#db2777','#fce7f3'] },
  { id: 'cyan',     name: 'سماوي',  sidebar: '#164e63', accent: '#0891b2', preview: ['#164e63','#0891b2','#cffafe'] },
  { id: 'lime',     name: 'ليموني', sidebar: '#1a2e05', accent: '#65a30d', preview: ['#1a2e05','#65a30d','#ecfccb'] },
] as const;

export default function Themes() {
  const { settings, setSettings } = useAppStore();
  const [applying, setApplying] = useState<string | null>(null);

  const applyTheme = async (theme: typeof THEMES[number]) => {
    setApplying(theme.id);
    try {
      const current = await db.settings.get(1);
      if (!current) return;
      const updated = {
        ...current,
        themeId: theme.id,
        sidebarBg: theme.sidebar,
        printAccentColor: theme.accent,
      };
      await db.settings.put(updated);
      setSettings(updated);
      toast.success(`تم تطبيق ثيم "${theme.name}"`);
    } catch {
      toast.error('فشل تطبيق الثيم');
    } finally {
      setApplying(null);
    }
  };

  const currentThemeId = settings?.themeId || 'emerald';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Palette className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">القوالب والمظاهر</h2>
          <p className="text-sm text-slate-500">اختر مظهرًا يناسب علامتك التجارية — يُطبَّق فورًا على كل الشاشات والمطبوعات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {THEMES.map((theme) => {
          const isActive = currentThemeId === theme.id;
          return (
            <div
              key={theme.id}
              className={`relative bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer ${
                isActive ? 'border-slate-800 ring-2 ring-offset-2 ring-slate-800' : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => applyTheme(theme)}
            >
              {/* Preview */}
              <div className="h-24 flex">
                {/* Fake sidebar */}
                <div className="w-10 flex-shrink-0" style={{ background: theme.sidebar }}>
                  {[20,30,25,20,28].map((h, i) => (
                    <div key={i} className="mx-1 mt-2 rounded-sm opacity-60" style={{ height: 4, background: `${theme.accent}99` }} />
                  ))}
                </div>
                {/* Fake content */}
                <div className="flex-1 p-2" style={{ background: theme.preview[2] }}>
                  <div className="h-2 rounded-full mb-1 w-3/4" style={{ background: theme.preview[1] + '80' }} />
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-5 rounded-lg" style={{ background: '#fff', border: `1.5px solid ${theme.accent}30` }} />
                    ))}
                  </div>
                  <div className="mt-2 h-3 rounded-lg w-full" style={{ background: theme.accent, opacity: 0.9 }} />
                </div>
              </div>

              {/* Color dots */}
              <div className="px-3 py-2.5 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {theme.preview.map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: c }} />
                    ))}
                    <span className="text-xs font-semibold text-slate-700 mr-1">{theme.name}</span>
                  </div>
                  {isActive && (
                    <span className="flex items-center gap-1 text-xs text-white font-medium px-2 py-0.5 rounded-full" style={{ background: theme.sidebar }}>
                      <Check className="w-3 h-3" /> مطبّق
                    </span>
                  )}
                </div>
              </div>

              {/* Loading overlay */}
              {applying === theme.id && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        💡 <strong>تخصيص إضافي:</strong> يمكنك تعديل اللون الدقيق من تبويب <strong>الإعدادات → تخصيص المطبوعات</strong> بعد اختيار الثيم.
      </div>
    </div>
  );
}

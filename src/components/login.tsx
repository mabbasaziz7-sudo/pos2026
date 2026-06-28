'use client';

import { useState, useEffect } from 'react';
import { db, seedDefaultData } from '@/lib/local-db';
import { useAppStore } from '@/lib/store';
import { Store, Eye, EyeOff, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setCurrentUser, settings, setSettings } = useAppStore();

  useEffect(() => {
    (async () => {
      await seedDefaultData();
      const storedSettings = await db.settings.get(1);
      if (storedSettings) setSettings(storedSettings);
    })();
  }, [setSettings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      await seedDefaultData();
      const user = await db.users.where('username').equals(username.trim()).first();
      if (!user || user.password !== password) {
        toast.error('اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }
      if (!user.isActive) {
        toast.error('هذا الحساب معطل');
        setLoading(false);
        return;
      }
      setCurrentUser(user);
      toast.success(`مرحباً ${user.name}`);
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
              {settings?.storeLogo ? (
                <img src={settings.storeLogo} alt={settings.storeName} className="w-full h-full object-contain" />
              ) : (
                <Store className="w-10 h-10 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{settings?.storeName || 'نظام الكاشير'}</h1>
            <p className="text-slate-300">نظام إدارة المحلات والمبيعات</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="أدخل اسم المستخدم"
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="أدخل كلمة المرور"
                  dir="rtl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            <p>الحساب الافتراضي: admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, Camera } from 'lucide-react';

type FacingMode = 'environment' | 'user';

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

const SCANNER_DIV_ID = 'camera-scanner-viewport';

export default function CameraScanner({ onScan, onClose }: Props) {
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const activeRef = useRef(true);

  // دائمًا استخدم أحدث نسخة من onScan بدون إعادة تشغيل الكاميرا عند تغيير الدالة
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    activeRef.current = true;
    setError('');
    setLoading(true);

    let scanner: import('html5-qrcode').Html5Qrcode | null = null;

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!activeRef.current) return;

        scanner = new Html5Qrcode(SCANNER_DIV_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            onScanRef.current(decoded);
          },
          // أخطاء القراءة المتقطعة — طبيعية أثناء البحث عن كود، لا تُظهرها
          () => {}
        );

        if (activeRef.current) setLoading(false);
      } catch (err) {
        if (!activeRef.current) return;
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
          setError('لم يتم السماح بالوصول للكاميرا. يرجى منح الإذن من إعدادات المتصفح ثم إعادة المحاولة.');
        } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('devices')) {
          setError('لا توجد كاميرا متاحة على هذا الجهاز.');
        } else {
          setError(`تعذّر تشغيل الكاميرا${msg ? `: ${msg}` : ''}`);
        }
        setLoading(false);
      }
    }

    start();

    return () => {
      activeRef.current = false;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => {
          try { scanner?.clear(); } catch { /* ignore */ }
        });
      }
    };
  }, [facingMode]);

  const switchCamera = () => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-slate-800">مسح الباركود / QR بالكاميرا</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black" style={{ minHeight: 300 }}>
          {/* html5-qrcode مounts its UI into this div */}
          <div id={SCANNER_DIV_ID} style={{ width: '100%' }} />

          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Camera className="w-10 h-10 opacity-50 animate-pulse" />
              <p className="text-sm opacity-75">جاري تشغيل الكاميرا...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-900">
              <Camera className="w-10 h-10 text-rose-400" />
              <p className="text-white text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100">
          <p className="text-xs text-slate-400">وجّه الكاميرا نحو الباركود أو رمز QR</p>
          <button
            onClick={switchCamera}
            disabled={!!error}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            تبديل الكاميرا
          </button>
        </div>
      </div>
    </div>
  );
}

// API client utility functions

export async function fetchApi<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers as any || {}),
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "خطأ في الاتصال" }));
    throw new Error(error.error || "خطأ في الاتصال");
  }
  return res.json();
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount || 0);
  return new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const orderStatusLabels: Record<string, string> = {
  new: "جديد",
  design: "تصميم",
  production: "إنتاج",
  ready: "جاهز للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const orderStatusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  design: "bg-purple-100 text-purple-800",
  production: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export const productionStatusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  paused: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export const productionStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const shipmentStatusLabels: Record<string, string> = {
  pending: "قيد التجهيز",
  shipped: "تم الشحن",
  in_transit: "في الطريق",
  delivered: "تم التسليم",
  returned: "مرتجع",
};

export const attendanceStatusLabels: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  leave: "إجازة",
  sick: "مريض",
};

export const attendanceStatusColors: Record<string, string> = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  late: "bg-yellow-100 text-yellow-800",
  leave: "bg-blue-100 text-blue-800",
  sick: "bg-orange-100 text-orange-800",
};

export const roleLabels: Record<string, string> = {
  admin: "مدير عام",
  manager: "مدير",
  accountant: "محاسب",
  designer: "مصمم",
  worker: "عامل",
  sales: "مبيعات",
};

export const paymentMethodLabels: Record<string, string> = {
  cash: "نقدي",
  bank: "بنكي",
  card: "بطاقة",
  credit: "آجل",
  check: "شيك",
};

export async function cleanStylesForHtml2Canvas(): Promise<() => void> {
  if (typeof window === "undefined") return () => {};

  const styleElements = Array.from(document.querySelectorAll("style"));
  const linkElements = Array.from(document.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[];

  const restorations: (() => void)[] = [];

  // Clean style tags
  styleElements.forEach(style => {
    const text = style.innerHTML;
    if (text.includes("oklch") || text.includes("lab")) {
      let cleanedText = text.replace(/oklch\([^)]+\)/g, "#f97316"); // default brand orange
      cleanedText = cleanedText.replace(/lab\([^)]+\)/g, "#f97316");
      style.innerHTML = cleanedText;
      restorations.push(() => {
        style.innerHTML = text;
      });
    }
  });

  // Clean link tags
  for (const link of linkElements) {
    try {
      const response = await fetch(link.href);
      const text = await response.text();
      if (text.includes("oklch") || text.includes("lab")) {
        let cleanedText = text.replace(/oklch\([^)]+\)/g, "#f97316");
        cleanedText = cleanedText.replace(/lab\([^)]+\)/g, "#f97316");

        // Create new style element
        const tempStyle = document.createElement("style");
        tempStyle.innerHTML = cleanedText;
        document.head.appendChild(tempStyle);

        // Disable original link
        link.disabled = true;

        restorations.push(() => {
          tempStyle.remove();
          link.disabled = false;
        });
      }
    } catch (e) {
      console.warn("Failed to clean external stylesheet:", link.href, e);
    }
  }

  return () => {
    restorations.forEach(restore => restore());
  };
}

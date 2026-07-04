'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';

// ssr: false ضروري لأن html5-qrcode يستخدم واجهات المتصفح (camera, MediaDevices)
// التي لا تتوفر في Node.js أثناء بناء Next.js على الخادم.
const CameraScanner = dynamic(() => import('./camera-scanner'), { ssr: false });
import { db, type Product, type Sale, type Customer, type Offer, type Coupon, type Voucher, type ParkedSale, type PriceTier, generateInvoiceNumber, decodeScaleBarcode } from '@/lib/local-db';
import { useAppStore, formatCurrency } from '@/lib/store';
import { printShiftSummary, googleFontLink } from '@/lib/print';
import { sendInvoiceWhatsApp } from '@/lib/whatsapp-gateway';
import { CUSTOMER_DISPLAY_CHANNEL, type CustomerDisplayMessage } from '@/lib/customer-display';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  User,
  Printer,
  Barcode,
  X,
  Check,
  AlertCircle,
  Monitor,
  Ticket,
  Gift,
  Star,
  Package,
  Lock,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Camera,
  Clock,
  Truck,
  Package2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import { playScanBeep } from '@/lib/sounds';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  originalPrice?: number; // السعر الأصلي قبل تطبيق سعر الجملة
}

export default function POS() {
  const { currentUser, currentShift, setCurrentShift, settings } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'mixed' | 'wallet'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [startingCash, setStartingCash] = useState('');
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [closeActualCash, setCloseActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const invoiceBarcodeRef = useRef<SVGSVGElement>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastDeliveryInfo, setLastDeliveryInfo] = useState<{name:string;phone:string;address:string;notes:string;fee:number}|null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [loyaltyPointsInput, setLoyaltyPointsInput] = useState('');
  // ===== تعليق الفاتورة =====
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);
  const [showParkedModal, setShowParkedModal] = useState(false);
  const [parkLabel, setParkLabel] = useState('');
  // ===== التوصيل =====
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  // ===== عروض الجملة (تسعيرة متدرجة) =====
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadOffers();
    loadParkedSales();
    loadPriceTiers();
    checkShift();
  }, []);

  useEffect(() => {
    if (showPrintModal && lastSale && invoiceBarcodeRef.current) {
      JsBarcode(invoiceBarcodeRef.current, lastSale.invoiceNumber, {
        format: 'CODE128',
        width: 1.5,
        height: 45,
        displayValue: true,
        fontSize: 12,
      });
    }
  }, [showPrintModal, lastSale]);

  const loadProducts = async () => {
    const all = await db.products.toArray();
    setProducts(all);
  };

  const loadCustomers = async () => {
    const all = await db.customers.toArray();
    setCustomers(all);
  };

  const loadOffers = async () => {
    const all = await db.offers.toArray();
    setOffers(all);
  };

  const loadParkedSales = async () => {
    const all = await db.parkedSales.orderBy('createdAt').reverse().toArray();
    setParkedSales(all);
  };

  const loadPriceTiers = async () => {
    const all = await db.priceTiers.toArray();
    setPriceTiers(all);
  };

  // أفضل سعر جملة لمنتج بكمية معينة
  const getWholesalePrice = (productId: number, qty: number, basePrice: number): number => {
    const tiers = priceTiers
      .filter((t) => t.productId === productId && Number(t.minQty) <= qty)
      .sort((a, b) => Number(b.minQty) - Number(a.minQty));
    return tiers.length > 0 ? Number(tiers[0].price) : basePrice;
  };

  // ===== تعليق الفاتورة =====
  const parkCurrentSale = async () => {
    if (cart.length === 0) { toast.error('السلة فارغة'); return; }
    await db.parkedSales.add({
      label: parkLabel || `فاتورة ${new Date().toLocaleTimeString('ar-SA')}`,
      cartItems: cart.map((item) => ({
        productId: item.product.id!,
        productName: item.product.name,
        barcode: item.product.barcode,
        price: item.product.price,
        cost: item.product.cost,
        quantity: item.quantity,
        discount: item.discount,
        image: item.product.image,
      })),
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      couponCode: appliedCoupon?.code,
      couponDiscount: couponDiscountAmount,
      voucherCode: appliedVoucher?.code,
      voucherAmount,
      loyaltyPointsRedeemed,
      paymentType,
      createdAt: new Date(),
    });
    setCart([]);
    setSelectedCustomer(null);
    setAppliedCoupon(null);
    setAppliedVoucher(null);
    setParkLabel('');
    setShowParkedModal(false);
    toast.success('تم تعليق الفاتورة');
    loadParkedSales();
  };

  const restoreParkedSale = async (parked: ParkedSale) => {
    if (cart.length > 0 && !window.confirm('هل تريد مسح السلة الحالية واستعادة الفاتورة المعلقة؟')) return;
    const allProducts = await db.products.toArray();
    const productMap = Object.fromEntries(allProducts.map((p) => [p.id, p]));
    const restoredCart = parked.cartItems
      .map((ci) => {
        const product = productMap[ci.productId];
        if (!product) return null;
        return { product: { ...product, price: ci.price }, quantity: ci.quantity, discount: ci.discount };
      })
      .filter(Boolean) as CartItem[];
    setCart(restoredCart);
    if (parked.customerId) {
      const cust = await db.customers.get(parked.customerId);
      if (cust) setSelectedCustomer(cust);
    }
    if (parked.couponCode) {
      const coupon = await db.coupons.where('code').equals(parked.couponCode).first();
      if (coupon) setAppliedCoupon(coupon);
    }
    if (parked.voucherCode) {
      const voucher = await db.vouchers.where('code').equals(parked.voucherCode).first();
      if (voucher) setAppliedVoucher(voucher);
    }
    setPaymentType(parked.paymentType);
    await db.parkedSales.delete(parked.id!);
    setShowParkedModal(false);
    toast.success('تم استعادة الفاتورة المعلقة');
    loadParkedSales();
  };

  const getOfferDiscountPercent = (product: Product) => {
    const now = new Date();
    const liveOffers = offers.filter(
      (o) =>
        o.isActive &&
        new Date(o.startDate) <= now &&
        now <= new Date(o.endDate) &&
        (o.targetType === 'category' ? o.category === product.category : o.productIds.includes(product.id!))
    );
    if (liveOffers.length === 0) return 0;
    const percents = liveOffers.map((o) =>
      o.discountType === 'percentage' ? o.discountValue : (o.discountValue / product.price) * 100
    );
    return Math.min(100, Math.max(...percents));
  };

  const checkShift = async () => {
    if (!currentShift && currentUser) {
      // find this employee's own open shift — each user has their own independent shift
      const myShift = await db.shifts
        .filter((s) => s.status === 'open' && s.userId === currentUser.id)
        .first();
      if (myShift) {
        setCurrentShift(myShift);
      } else {
        setShowShiftModal(true);
      }
    }
  };

  const startShift = async () => {
    if (!currentUser || !startingCash) return;
    const shift = await db.shifts.add({
      userId: currentUser.id!,
      userName: currentUser.name,
      startTime: new Date(),
      startingCash: parseFloat(startingCash),
      expectedCash: parseFloat(startingCash),
      totalSales: 0,
      totalCashSales: 0,
      totalCreditSales: 0,
      totalReturns: 0,
      status: 'open',
    });
    const newShift = await db.shifts.get(shift);
    if (newShift) {
      setCurrentShift(newShift);
      setShowShiftModal(false);
      toast.success('تم فتح الوردية بنجاح');
    }
  };

  const closeCurrentShift = async () => {
    if (!currentShift || !closeActualCash) return;
    const actual = parseFloat(closeActualCash);
    const difference = actual - currentShift.expectedCash;
    const closedShiftSales = await db.sales.where('shiftId').equals(currentShift.id!).toArray();

    await db.shifts.update(currentShift.id!, {
      endTime: new Date(),
      actualCash: actual,
      difference,
      status: 'closed',
      notes: closeNotes,
    });

    const closedShift = await db.shifts.get(currentShift.id!);
    if (closedShift) printShiftSummary(closedShift, closedShiftSales, settings);

    setCurrentShift(null);
    setShowCloseShiftModal(false);
    setCloseActualCash('');
    setCloseNotes('');
    toast.success('تم إغلاق الوردية بنجاح');
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.category.includes(searchQuery)
  );

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      toast.error('المنتج غير متوفر في المخزون');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const newQty = (existing?.quantity || 0) + quantity;
      if (newQty > product.stock) {
        toast.error('الكمية المطلوبة غير متوفرة');
        return prev;
      }
      if (existing) {
        // أعِد تطبيق سعر الجملة بالكمية الجديدة
        const originalPrice = existing.originalPrice ?? product.price;
        const tierPrice = getWholesalePrice(product.id!, newQty, originalPrice);
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newQty, product: { ...item.product, price: tierPrice } }
            : item
        );
      }
      const discount = Math.max(product.discount || 0, getOfferDiscountPercent(product));
      const tierPrice = getWholesalePrice(product.id!, quantity, product.price);
      const productWithTier = tierPrice !== product.price ? { ...product, price: tierPrice } : product;
      return [...prev, { product: productWithTier, quantity, discount, originalPrice: product.price }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return item;
          if (newQty > item.product.stock) {
            toast.error('الكمية المطلوبة غير متوفرة');
            return item;
          }
          const originalPrice = item.originalPrice ?? item.product.price;
          const tierPrice = getWholesalePrice(productId, newQty, originalPrice);
          return { ...item, quantity: newQty, product: { ...item.product, price: tierPrice } };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const coupon = await db.coupons.where('code').equals(code).first();
    if (!coupon || !coupon.isActive) {
      toast.error('كوبون غير صالح');
      return;
    }
    if (new Date(coupon.expiryDate) < new Date()) {
      toast.error('انتهت صلاحية الكوبون');
      return;
    }
    if (coupon.usedCount >= coupon.maxUses) {
      toast.error('تم استخدام هذا الكوبون بالحد الأقصى');
      return;
    }
    if (subtotal < coupon.minPurchase) {
      toast.error(`الحد الأدنى للفاتورة ${formatCurrency(coupon.minPurchase)}`);
      return;
    }
    setAppliedCoupon(coupon);
    toast.success('تم تطبيق الكوبون');
  };

  const applyVoucher = async () => {
    const input = voucherInput.trim().toUpperCase();
    if (!input) return;

    let voucher = await db.vouchers.where('code').equals(input).first();

    if (!voucher) {
      // Allow entering a return's invoice number instead of its generated voucher code
      // (returnNumber isn't an indexed field, so filter rather than where())
      const relatedReturn = await db.returns.filter((r) => r.returnNumber === input).first();
      if (relatedReturn?.voucherCode) {
        voucher = await db.vouchers.where('code').equals(relatedReturn.voucherCode).first();
      }
    }

    if (!voucher || !voucher.isActive || voucher.balance <= 0) {
      toast.error('قسيمة أو رقم مرتجع غير صالح');
      return;
    }
    setAppliedVoucher(voucher);
    toast.success('تم تطبيق القسيمة');
  };

  const updateItemDiscount = (productId: number, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, discount } : item
      )
    );
  };

  const subtotal = cart.reduce((sum, item) => {
    const price = item.product.price * (1 - item.discount / 100);
    return sum + price * item.quantity;
  }, 0);

  const discountTotal = cart.reduce(
    (sum, item) => sum + (item.product.price * item.discount / 100) * item.quantity,
    0
  );

  const couponDiscountAmount =
    appliedCoupon && subtotal >= appliedCoupon.minPurchase
      ? Math.min(
          subtotal,
          appliedCoupon.discountType === 'percentage'
            ? subtotal * (appliedCoupon.discountValue / 100)
            : appliedCoupon.discountValue
        )
      : 0;

  // ===== عروض الجملة المجمّعة (Bundle) =====
  const activeBundles = offers.filter((o) => {
    const now = new Date();
    return o.isActive && o.targetType === 'bundle' && o.bundleProducts && o.bundlePrice != null
      && new Date(o.startDate) <= now && now <= new Date(o.endDate);
  });
  const appliedBundles = activeBundles.filter((bundle) =>
    (bundle.bundleProducts || []).every((bp) => {
      const cartItem = cart.find((c) => c.product.id === bp.productId);
      return cartItem && cartItem.quantity >= bp.qty;
    })
  );
  const bundleDiscount = appliedBundles.reduce((sum, bundle) => {
    const normalCost = (bundle.bundleProducts || []).reduce((s, bp) => {
      const ci = cart.find((c) => c.product.id === bp.productId);
      return s + (ci ? ci.product.price * bp.qty : 0);
    }, 0);
    return sum + Math.max(0, normalCost - (bundle.bundlePrice || 0));
  }, 0);

  const deliveryFeeNum = hasDelivery ? parseFloat(deliveryFee) || 0 : 0;

  const tax = (subtotal - couponDiscountAmount - bundleDiscount) * (settings?.taxRate ?? 0.15);
  const total = subtotal - couponDiscountAmount - bundleDiscount + tax + deliveryFeeNum;

  const voucherAmount = appliedVoucher ? Math.min(appliedVoucher.balance, total) : 0;

  const loyaltyPointValue = settings?.loyaltyPointValue ?? 0.1;
  const pointsRequested = Math.max(Math.floor(parseFloat(loyaltyPointsInput) || 0), 0);
  const maxPointsByBalance = selectedCustomer?.loyaltyPoints ?? 0;
  const maxPointsByDue = loyaltyPointValue > 0 ? Math.floor(Math.max(total - voucherAmount, 0) / loyaltyPointValue) : 0;
  const loyaltyPointsRedeemed = Math.min(pointsRequested, maxPointsByBalance, maxPointsByDue);
  const loyaltyRedeemAmount = loyaltyPointsRedeemed * loyaltyPointValue;

  const finalDue = Math.max(total - voucherAmount - loyaltyRedeemAmount, 0);

  const displayChannelRef = useRef<BroadcastChannel | null>(null);
  const currentItemRef = useRef<import('@/lib/customer-display').CustomerDisplayItem | null>(null);
  const currentItemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const broadcastCart = useCallback(() => {
    displayChannelRef.current?.postMessage({
      type: 'cart-update',
      storeName: settings?.storeName || 'نظام الكاشير',
      items: cart.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price * (1 - item.discount / 100),
        total: item.product.price * (1 - item.discount / 100) * item.quantity,
      })),
      subtotal,
      discount: discountTotal,
      tax,
      total,
      customerName: selectedCustomer?.name,
      currentItem: currentItemRef.current ?? undefined,
    } satisfies CustomerDisplayMessage);
  }, [cart, subtotal, discountTotal, tax, total, selectedCustomer, settings]);

  useEffect(() => {
    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    displayChannelRef.current = channel;
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!displayChannelRef.current) return;
    displayChannelRef.current.onmessage = (e: MessageEvent<CustomerDisplayMessage>) => {
      if (e.data?.type === 'request-sync') broadcastCart();
    };
  }, [broadcastCart]);

  useEffect(() => {
    broadcastCart();
  }, [broadcastCart]);

  const openCustomerDisplay = () => {
    window.open('/customer-display', 'customerDisplay', 'width=1000,height=700');
  };

  const processBarcode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      if (settings?.enableScaleBarcodes) {
        const decoded = decodeScaleBarcode(trimmed, settings.scaleBarcodePrefix || '2');
        if (decoded) {
          const weighedProduct = await db.products.filter((p) => p.plu === decoded.plu).first();
          if (weighedProduct) {
            addToCart(weighedProduct, decoded.weightKg);
            setBarcodeInput('');
            playScanBeep('success');
            toast.success(`تمت إضافة ${decoded.weightKg.toFixed(3)} كجم من ${weighedProduct.name}`);
            return;
          }
          playScanBeep('error');
          toast.error('لم يتم العثور على منتج بكود الميزان هذا');
          return;
        }
      }

      const product = await db.products.where('barcode').equals(trimmed).first();
      if (product) {
        const price = product.price * (1 - Math.max(product.discount || 0, getOfferDiscountPercent(product)) / 100);
        currentItemRef.current = { name: product.name, quantity: 1, price, total: price };
        if (currentItemTimerRef.current) clearTimeout(currentItemTimerRef.current);
        currentItemTimerRef.current = setTimeout(() => {
          currentItemRef.current = null;
          broadcastCart();
        }, 3500);
        addToCart(product);
        setBarcodeInput('');
        playScanBeep('success');
      } else {
        playScanBeep('error');
        toast.error('الباركود غير موجود');
      }
    },
    [settings, broadcastCart]
  );

  const handleBarcode = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      processBarcode(barcodeInput);
    },
    [barcodeInput, processBarcode]
  );

  const completeSale = async () => {
    if (!currentUser || !currentShift) return;
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    const cashPaid = (paymentType === 'credit' || paymentType === 'wallet') ? 0 : parseFloat(paidAmount) || finalDue;
    const unpaidPortion = finalDue - cashPaid;

    if (paymentType === 'cash' && cashPaid < finalDue) {
      toast.error('المبلغ المدفوع أقل من المطلوب');
      return;
    }

    if (paymentType === 'credit' && !selectedCustomer) {
      toast.error('يرجى اختيار عميل للبيع بالآجل');
      return;
    }

    if (paymentType === 'wallet') {
      if (!selectedCustomer) {
        toast.error('يرجى اختيار عميل للدفع من المحفظة');
        return;
      }
      if ((selectedCustomer.walletBalance ?? 0) < finalDue) {
        toast.error(`رصيد المحفظة غير كافٍ — الرصيد الحالي: ${formatCurrency(selectedCustomer.walletBalance ?? 0)}`);
        return;
      }
    }

    const saleItems = cart.map((item) => ({
      productId: item.product.id!,
      productName: item.product.name,
      barcode: item.product.barcode,
      quantity: item.quantity,
      price: item.product.price,
      cost: item.product.cost,
      discount: item.discount,
      total: item.product.price * (1 - item.discount / 100) * item.quantity,
    }));

    const totalPaid = cashPaid + voucherAmount + loyaltyRedeemAmount;
    const remaining = total - totalPaid;

    const sale: Sale = {
      invoiceNumber: generateInvoiceNumber(),
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      shiftId: currentShift.id!,
      userId: currentUser.id!,
      userName: currentUser.name,
      items: saleItems,
      subtotal,
      discount: discountTotal,
      tax,
      total,
      paid: totalPaid,
      remaining,
      paymentType,
      status: 'completed',
      date: new Date(),
      notes: saleNotes,
      couponCode: appliedCoupon?.code,
      couponDiscount: couponDiscountAmount,
      voucherCode: appliedVoucher?.code,
      voucherAmount,
      loyaltyPointsRedeemed,
      loyaltyDiscount: loyaltyRedeemAmount,
      loyaltyPointsEarned: selectedCustomer ? Math.floor(total) : 0,
      hasDelivery,
      deliveryFee: deliveryFeeNum,
    };

    try {
      // Save sale
      const saleId = await db.sales.add(sale);

      // حفظ التوصيل إن وُجد
      if (hasDelivery && deliveryAddress.trim()) {
        const deliveryId = await db.deliveries.add({
          saleId,
          invoiceNumber: sale.invoiceNumber,
          recipientName: deliveryName || (selectedCustomer?.name ?? ''),
          recipientPhone: deliveryPhone || (selectedCustomer?.phone ?? ''),
          address: deliveryAddress,
          notes: deliveryNotes,
          deliveryFee: deliveryFeeNum,
          status: 'pending',
          createdAt: new Date(),
        });
        await db.sales.update(saleId, { deliveryId });
      }

      // Update stock
      for (const item of cart) {
        await db.products.update(item.product.id!, {
          stock: item.product.stock - item.quantity,
        });
      }

      // Update customer balance if credit
      if (selectedCustomer && paymentType === 'credit') {
        await db.customers.update(selectedCustomer.id!, {
          balance: selectedCustomer.balance + remaining,
        });
      }

      // Deduct wallet balance if wallet payment
      if (selectedCustomer && paymentType === 'wallet') {
        const walletBefore = selectedCustomer.walletBalance ?? 0;
        const walletAfter = walletBefore - finalDue;
        await db.customers.update(selectedCustomer.id!, { walletBalance: walletAfter });
        await db.walletTransactions.add({
          customerId: selectedCustomer.id!,
          customerName: selectedCustomer.name,
          type: 'purchase',
          amount: finalDue,
          balanceBefore: walletBefore,
          balanceAfter: walletAfter,
          saleId: saleId,
          date: new Date(),
          userId: currentUser.id!,
          userName: currentUser.name,
        });
      }

      // Update customer loyalty points (redeem + earn)
      if (selectedCustomer) {
        await db.customers.update(selectedCustomer.id!, {
          loyaltyPoints: (selectedCustomer.loyaltyPoints ?? 0) - loyaltyPointsRedeemed + sale.loyaltyPointsEarned,
        });
      }

      // Update coupon usage
      if (appliedCoupon) {
        await db.coupons.update(appliedCoupon.id!, { usedCount: appliedCoupon.usedCount + 1 });
      }

      // Update voucher balance
      if (appliedVoucher && voucherAmount > 0) {
        await db.vouchers.update(appliedVoucher.id!, { balance: appliedVoucher.balance - voucherAmount });
      }

      // Update shift
      const cashSales = paymentType === 'cash' ? finalDue : cashPaid;
      const creditSales = paymentType === 'credit' ? finalDue : unpaidPortion;
      await db.shifts.update(currentShift.id!, {
        totalSales: currentShift.totalSales + total,
        totalCashSales: currentShift.totalCashSales + cashSales,
        totalCreditSales: currentShift.totalCreditSales + creditSales,
        expectedCash: currentShift.expectedCash + cashSales,
      });

      const updatedShift = await db.shifts.get(currentShift.id!);
      if (updatedShift) setCurrentShift(updatedShift);

      const savedSale = await db.sales.get(saleId);
      if (savedSale) {
        setLastSale(savedSale);
        // احفظ تفاصيل التوصيل قبل إعادة تعيينها حتى تظهر على الفاتورة
        if (hasDelivery && deliveryAddress.trim()) {
          setLastDeliveryInfo({
            name: deliveryName || savedSale.customerName || '',
            phone: deliveryPhone || '',
            address: deliveryAddress,
            notes: deliveryNotes,
            fee: deliveryFeeNum,
          });
        } else {
          setLastDeliveryInfo(null);
        }
        setShowPrintModal(true);
      }

      displayChannelRef.current?.postMessage({
        type: 'sale-complete',
        invoiceNumber: sale.invoiceNumber,
        total: finalDue,
        paid: cashPaid,
        change: paymentType === 'cash' ? Math.max(cashPaid - finalDue, 0) : 0,
      } satisfies CustomerDisplayMessage);

      // Reset cart
      setCart([]);
      setSelectedCustomer(null);
      setPaidAmount('');
      setSaleNotes('');
      setAppliedCoupon(null);
      setCouponInput('');
      setAppliedVoucher(null);
      setVoucherInput('');
      setLoyaltyPointsInput('');
      setHasDelivery(false);
      setDeliveryName('');
      setDeliveryPhone('');
      setDeliveryAddress('');
      setDeliveryFee('0');
      setDeliveryNotes('');
      setShowPaymentModal(false);
      loadProducts();
      loadCustomers();
      toast.success('تم إتمام البيع بنجاح');
    } catch (error) {
      toast.error(`حدث خطأ أثناء إتمام البيع: ${error instanceof Error ? error.message : 'غير معروف'}`);
    }
  };

  const sendLastSaleToCustomer = async () => {
    if (!lastSale) return;
    if (!lastSale.customerId) {
      toast.error('لا يوجد عميل مرتبط بهذه الفاتورة');
      return;
    }
    const customer = await db.customers.get(lastSale.customerId);
    if (!customer?.phone) {
      toast.error('لا يوجد رقم هاتف لهذا العميل');
      return;
    }
    await sendInvoiceWhatsApp(lastSale, customer.phone, settings);
  };

  const printInvoice = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const maxWidth = settings?.paperWidth === '58mm' ? '220px' : '300px';
    const accent = settings?.printAccentColor || '#10b981';
    const font = settings?.printFontFamily || 'Tahoma, Arial, sans-serif';
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة ${lastSale?.invoiceNumber}</title>
          ${googleFontLink(font)}
          <style>
            :root { --accent: ${accent}; }
            body { font-family: ${font}; padding: 20px; max-width: ${maxWidth}; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed var(--accent); padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; padding: 3px 0; }
            .total { border-top: 2px solid var(--accent); margin-top: 10px; padding-top: 10px; font-weight: bold; color: var(--accent); }
            .barcode { text-align: center; margin-top: 15px; }
            .receipt-logo { display: block; height: 56px; max-width: 100%; margin: 0 auto 8px; object-fit: contain; }
            .receipt-items-table { border-collapse: collapse; text-align: center; width: 100%; }
            .receipt-items-table th, .receipt-items-table td { text-align: center; padding: 4px 2px; border-bottom: 1px dashed #ccc; }
            .receipt-items-table thead tr { background: color-mix(in srgb, var(--accent) 15%, white); }
            .receipt-center { text-align: center; }
            .receipt-totals { text-align: center; }
            .receipt-row { display: flex; justify-content: center; gap: 8px; }
            /* قسم التوصيل في الفاتورة */
            .border-t-2.border-dashed { border-top: 2px dashed #ccc; margin-top: 8px; padding-top: 8px; }
            .text-center { text-align: center; }
            .font-medium { font-weight: 600; }
            .font-bold { font-weight: bold; }
            .italic { font-style: italic; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  if (!currentShift) {
    return (
      <>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-slate-600">لا يوجد وردية مفتوحة</p>
            <button
              onClick={() => setShowShiftModal(true)}
              className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              فتح وردية جديدة
            </button>
          </div>
        </div>

        {showShiftModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">فتح وردية جديدة</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">النقدية الافتتاحية</label>
                  <input
                    type="number"
                    value={startingCash}
                    onChange={(e) => setStartingCash(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={startShift}
                    disabled={!startingCash}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-lg"
                  >
                    فتح الوردية
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const canCloseShift =
    currentUser && (currentUser.role === 'admin' || currentShift.userId === currentUser.id);

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
        {/* Products Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Search & Barcode */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث بالاسم أو الباركود أو الفئة..."
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div className="relative sm:w-48">
                <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcode}
                  placeholder="مسح الباركود..."
                  className="w-full pr-10 pl-10 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
                <button
                  onClick={() => setShowCameraScanner(true)}
                  title="مسح بالكاميرا"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-500 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={openCustomerDisplay}
                title="فتح شاشة الزبون"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">شاشة الزبون</span>
              </button>
              {canCloseShift && (
                <button
                  onClick={() => setShowCloseShiftModal(true)}
                  title="إغلاق الوردية"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">إغلاق الوردية</span>
                </button>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">المنتجات</h3>
              <span className="text-sm text-slate-500">{filteredProducts.length} منتج</span>
            </div>
            <div className="overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[500px]">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    product.stock <= 0
                      ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  <div className="w-full h-24 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-2 p-1.5">
                    {product.image ? (
                      <img src={product.image} alt="" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <p className="font-medium text-sm text-slate-800 truncate">{product.name}</p>
                  <p className="text-emerald-600 font-bold text-sm mt-1">{formatCurrency(product.price)}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    مخزون: {product.stock} {product.unit}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                السلة
              </h3>
              {cart.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowParkedModal(true)}
                    title="تعليق الفاتورة"
                    className="text-amber-500 text-sm hover:text-amber-600 flex items-center gap-1"
                  >
                    <Clock className="w-4 h-4" />
                    تعليق
                  </button>
                  <button
                    onClick={() => setCart([])}
                    className="text-rose-500 text-sm hover:text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    إفراغ
                  </button>
                </div>
              )}
              {parkedSales.length > 0 && cart.length === 0 && (
                <button onClick={() => setShowParkedModal(true)}
                  className="text-amber-500 text-sm hover:text-amber-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {parkedSales.length} فاتورة معلقة
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[400px]">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>السلة فارغة</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(item.product.price)} × {item.quantity}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id!)}
                      className="text-rose-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product.id!, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id!, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <div className="mr-auto flex items-center gap-1">
                      <span className="text-xs text-slate-500">خصم %</span>
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) => updateItemDiscount(item.product.id!, parseFloat(e.target.value) || 0)}
                        className="w-14 px-2 py-1 text-sm border border-slate-200 rounded text-center"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 mt-1 text-left">
                    {formatCurrency(item.product.price * (1 - item.discount / 100) * item.quantity)}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="p-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">الإجمالي</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">الضريبة ({Math.round((settings?.taxRate ?? 0.15) * 100)}%)</span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
              <span>الصافي</span>
              <span className="text-emerald-600">{formatCurrency(total)}</span>
            </div>

            {/* Customer Selection */}
            <button
              onClick={() => setShowCustomerModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span className="flex-1 text-right">
                {selectedCustomer ? selectedCustomer.name : 'اختيار العميل (اختياري)'}
              </span>
            </button>

            {/* Payment Button */}
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              إتمام البيع
            </button>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">اختيار العميل</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1">
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                }}
                className={`w-full p-3 rounded-lg border text-right transition-colors ${
                  !selectedCustomer ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <p className="font-medium">عميل نقدي</p>
              </button>
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                  }}
                  className={`w-full p-3 rounded-lg border text-right transition-colors ${
                    selectedCustomer?.id === customer.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-slate-500">{customer.phone}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">إتمام الدفع</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">الإجمالي الفرعي</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>خصم الكوبون ({appliedCoupon?.code})</span>
                    <span>-{formatCurrency(couponDiscountAmount)}</span>
                  </div>
                )}
                {bundleDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    <span className="flex items-center gap-1"><Package2 className="w-3.5 h-3.5" /> خصم عروض مجمّعة</span>
                    <span>-{formatCurrency(bundleDiscount)}</span>
                  </div>
                )}
                {appliedBundles.map((b) => (
                  <div key={b.id} className="text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1 flex items-center gap-1">
                    <Package2 className="w-3 h-3" /> عرض مجمّع: {b.name}
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">الضريبة</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
                {deliveryFeeNum > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> رسوم التوصيل</span>
                    <span>+{formatCurrency(deliveryFeeNum)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {voucherAmount > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>قسيمة هدايا ({appliedVoucher?.code})</span>
                    <span>-{formatCurrency(voucherAmount)}</span>
                  </div>
                )}
                {loyaltyRedeemAmount > 0 && (
                  <div className="flex justify-between text-sm text-purple-600">
                    <span>نقاط ولاء ({loyaltyPointsRedeemed} نقطة)</span>
                    <span>-{formatCurrency(loyaltyRedeemAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-1.5">
                  <span>المطلوب دفعه</span>
                  <span className="text-emerald-600">{formatCurrency(finalDue)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">كوبون خصم</label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 border border-emerald-200 bg-emerald-50 rounded-lg">
                    <span className="text-sm font-mono text-emerald-700">{appliedCoupon.code}</span>
                    <button onClick={() => { setAppliedCoupon(null); setCouponInput(''); }} className="text-rose-500 hover:text-rose-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="أدخل كود الكوبون"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <button onClick={applyCoupon} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm rounded-lg">
                      تطبيق
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">قسيمة هدايا / رقم فاتورة مرتجع</label>
                {appliedVoucher ? (
                  <div className="flex items-center justify-between p-2.5 border border-blue-200 bg-blue-50 rounded-lg">
                    <span className="text-sm font-mono text-blue-700">
                      {appliedVoucher.code} ({formatCurrency(appliedVoucher.balance)})
                    </span>
                    <button onClick={() => { setAppliedVoucher(null); setVoucherInput(''); }} className="text-rose-500 hover:text-rose-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value)}
                      placeholder="كود القسيمة أو RET-..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <button onClick={applyVoucher} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm rounded-lg">
                      تطبيق
                    </button>
                  </div>
                )}
              </div>

              {selectedCustomer && (selectedCustomer.loyaltyPoints ?? 0) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    نقاط الولاء (متاح {selectedCustomer.loyaltyPoints} نقطة = {formatCurrency((selectedCustomer.loyaltyPoints ?? 0) * loyaltyPointValue)})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={loyaltyPointsInput}
                      onChange={(e) => setLoyaltyPointsInput(e.target.value)}
                      placeholder="عدد النقاط المراد استبدالها"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                      max={Math.min(selectedCustomer.loyaltyPoints ?? 0, maxPointsByDue)}
                    />
                    <button
                      onClick={() => setLoyaltyPointsInput(String(Math.min(selectedCustomer.loyaltyPoints ?? 0, maxPointsByDue)))}
                      className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 whitespace-nowrap"
                    >
                      استخدام الكل
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'credit', 'mixed', 'wallet'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPaymentType(type)}
                    disabled={type === 'wallet' && !selectedCustomer}
                    className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                      paymentType === type
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : type === 'wallet' && !selectedCustomer
                        ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'cash' ? '💵 نقدي' : type === 'credit' ? '📋 آجل' : type === 'mixed' ? '🔀 مختلط' : '👛 محفظة'}
                  </button>
                ))}
              </div>
              {paymentType === 'wallet' && selectedCustomer && (
                <div className={`p-3 rounded-lg text-sm ${(selectedCustomer.walletBalance ?? 0) >= finalDue ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                  <div className="flex justify-between">
                    <span className="text-slate-600">رصيد المحفظة</span>
                    <span className={`font-bold ${(selectedCustomer.walletBalance ?? 0) >= finalDue ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(selectedCustomer.walletBalance ?? 0)}
                    </span>
                  </div>
                  {(selectedCustomer.walletBalance ?? 0) >= finalDue ? (
                    <p className="text-xs text-emerald-600 mt-1">✓ الرصيد كافٍ — سيُخصم {formatCurrency(finalDue)}</p>
                  ) : (
                    <p className="text-xs text-rose-600 mt-1">✗ الرصيد غير كافٍ — ينقص {formatCurrency(finalDue - (selectedCustomer.walletBalance ?? 0))}</p>
                  )}
                </div>
              )}

              {paymentType !== 'credit' && paymentType !== 'wallet' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">المبلغ المدفوع</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={finalDue.toString()}
                    min="0"
                    step="0.01"
                  />
                  {parseFloat(paidAmount) > finalDue && (
                    <p className="text-sm text-amber-600 mt-1">
                      الباقي: {formatCurrency(parseFloat(paidAmount) - finalDue)}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                  placeholder="ملاحظات اختيارية..."
                />
              </div>

              {/* ===== قسم التوصيل ===== */}
              <div className="border border-slate-200 rounded-xl p-3">
                <button
                  type="button"
                  onClick={() => setHasDelivery(!hasDelivery)}
                  className={`w-full flex items-center gap-2 text-sm font-medium transition-colors ${hasDelivery ? 'text-blue-600' : 'text-slate-500'}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${hasDelivery ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                    {hasDelivery && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <Truck className="w-4 h-4" />
                  تفعيل التوصيل
                </button>
                {hasDelivery && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">اسم المستلم</label>
                        <input type="text" value={deliveryName} onChange={(e) => setDeliveryName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder={selectedCustomer?.name || 'الاسم'} />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">هاتف المستلم</label>
                        <input type="text" value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder={selectedCustomer?.phone || 'رقم الهاتف'} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">عنوان التوصيل *</label>
                      <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="العنوان التفصيلي" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">رسوم التوصيل</label>
                        <input type="number" step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">ملاحظات التوصيل</label>
                        <input type="text" value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="اختياري" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={completeSale}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                تأكيد البيع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && lastSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">طباعة الفاتورة</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={printRef} className="p-4 border border-slate-200 rounded-lg text-sm" dir="rtl">
              <div className="receipt-center text-center border-b-2 border-dashed border-slate-300 pb-3 mb-3">
                {settings?.storeLogo && (
                  <img
                    src={settings.storeLogo}
                    alt={settings.storeName}
                    className="receipt-logo h-14 mx-auto mb-2 object-contain"
                  />
                )}
                <h2 className="font-bold text-lg">{settings?.storeName || 'نظام الكاشير'}</h2>
                {settings?.showAddressOnReceipt && settings?.storeAddress && (
                  <p className="text-slate-500 text-xs mt-1">{settings.storeAddress}</p>
                )}
                {settings?.showPhoneOnReceipt && settings?.storePhone && (
                  <p className="text-slate-500 text-xs">{settings.storePhone}</p>
                )}
                {settings?.showTaxNumberOnReceipt && settings?.taxNumber && (
                  <p className="text-slate-500 text-xs">الرقم الضريبي: {settings.taxNumber}</p>
                )}
                <p className="text-slate-500 text-xs mt-1">فاتورة ضريبية مبسطة</p>
                <p className="text-slate-500 text-xs">{new Date(lastSale.date).toLocaleString('ar-SA')}</p>
              </div>

              <div className="receipt-center mb-3 text-center">
                <p className="text-xs text-slate-500">رقم الفاتورة: {lastSale.invoiceNumber}</p>
                <p className="text-xs text-slate-500">الكاشير: {lastSale.userName}</p>
                {lastSale.customerName && (
                  <p className="text-xs text-slate-500">العميل: {lastSale.customerName}</p>
                )}
              </div>

              <table className="receipt-items-table w-full text-xs border-b border-dashed border-slate-300 pb-2 mb-2">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-center">المنتج</th>
                    <th className="text-center">الكمية</th>
                    <th className="text-center">السعر</th>
                    <th className="text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-center">{item.productName}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-center">{formatCurrency(item.price)}</td>
                      <td className="text-center">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-totals space-y-1 text-center">
                <div className="receipt-row flex justify-center gap-2">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(lastSale.subtotal)}</span>
                </div>
                {lastSale.couponDiscount > 0 && (
                  <div className="receipt-row flex justify-center gap-2">
                    <span>خصم كوبون ({lastSale.couponCode})</span>
                    <span>-{formatCurrency(lastSale.couponDiscount)}</span>
                  </div>
                )}
                <div className="receipt-row flex justify-center gap-2">
                  <span>الضريبة</span>
                  <span>{formatCurrency(lastSale.tax)}</span>
                </div>
                <div className="receipt-row flex justify-center gap-2 font-bold border-t border-slate-300 pt-1 mt-1">
                  <span>الصافي</span>
                  <span>{formatCurrency(lastSale.total)}</span>
                </div>
                {lastSale.voucherAmount > 0 && (
                  <div className="receipt-row flex justify-center gap-2">
                    <span>قسيمة هدايا ({lastSale.voucherCode})</span>
                    <span>-{formatCurrency(lastSale.voucherAmount)}</span>
                  </div>
                )}
                {lastSale.loyaltyDiscount > 0 && (
                  <div className="receipt-row flex justify-center gap-2">
                    <span>نقاط ولاء ({lastSale.loyaltyPointsRedeemed} نقطة)</span>
                    <span>-{formatCurrency(lastSale.loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="receipt-center text-xs text-slate-500 pt-1">
                  <p>طريقة الدفع</p>
                  <p>{lastSale.paymentType === 'cash' ? 'نقدي' : lastSale.paymentType === 'credit' ? 'آجل' : lastSale.paymentType === 'wallet' ? 'محفظة' : 'مختلط'}</p>
                </div>

                {/* معلومات التوصيل على الإيصال */}
                {lastDeliveryInfo && (
                  <div className="mt-3 pt-3 border-t-2 border-dashed border-slate-300">
                    <p className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1">
                      <Truck className="w-3 h-3" /> معلومات التوصيل
                    </p>
                    {lastDeliveryInfo.name && <p className="text-xs text-slate-600 text-center mt-1">{lastDeliveryInfo.name}</p>}
                    {lastDeliveryInfo.phone && <p className="text-xs text-slate-600 text-center">{lastDeliveryInfo.phone}</p>}
                    <p className="text-xs text-slate-700 font-medium text-center">{lastDeliveryInfo.address}</p>
                    {lastDeliveryInfo.notes && <p className="text-xs text-slate-500 text-center italic">{lastDeliveryInfo.notes}</p>}
                    {lastDeliveryInfo.fee > 0 && (
                      <p className="text-xs text-slate-600 text-center">رسوم التوصيل: {formatCurrency(lastDeliveryInfo.fee)}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="barcode text-center mt-3">
                <svg ref={invoiceBarcodeRef} />
              </div>

              <div className="receipt-center text-center mt-4 pt-3 border-t-2 border-dashed border-slate-300">
                <p className="text-xs text-slate-500">{settings?.receiptFooter || 'شكراً لتسوقكم معنا'}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={printInvoice}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </button>
              {lastSale?.customerId && (
                <button
                  onClick={sendLastSaleToCustomer}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  إرسال واتساب
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">إغلاق الوردية</h3>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">النقدية الافتتاحية</span>
                  <span className="font-medium">{formatCurrency(currentShift.startingCash)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">إجمالي المبيعات النقدية</span>
                  <span className="font-medium">{formatCurrency(currentShift.totalCashSales)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
                  <span>النقدية المتوقعة</span>
                  <span className="text-emerald-600">{formatCurrency(currentShift.expectedCash)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">النقدية الفعلية في الدرج</label>
                <input
                  type="number"
                  value={closeActualCash}
                  onChange={(e) => setCloseActualCash(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="أدخل المبلغ الفعلي"
                  min="0"
                  step="0.01"
                />
              </div>

              {closeActualCash && (
                <div className={`p-3 rounded-lg text-center ${parseFloat(closeActualCash) > currentShift.expectedCash ? 'bg-emerald-50 text-emerald-700' : parseFloat(closeActualCash) < currentShift.expectedCash ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}`}>
                  {parseFloat(closeActualCash) > currentShift.expectedCash ? (
                    <p className="font-bold flex items-center justify-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      فائض: {formatCurrency(parseFloat(closeActualCash) - currentShift.expectedCash)}
                    </p>
                  ) : parseFloat(closeActualCash) < currentShift.expectedCash ? (
                    <p className="font-bold flex items-center justify-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      عجز: {formatCurrency(currentShift.expectedCash - parseFloat(closeActualCash))}
                    </p>
                  ) : (
                    <p className="font-bold">الصندوق متزن</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                  placeholder="ملاحظات الوردية..."
                  dir="rtl"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={closeCurrentShift}
                  disabled={!closeActualCash}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  تأكيد الإغلاق وطباعة التقفيل
                </button>
                <button
                  onClick={() => { setShowCloseShiftModal(false); setCloseActualCash(''); }}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== نافذة تعليق/استعادة الفاتورة ===== */}
      {showParkedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> الفواتير المعلقة
              </h3>
              <button onClick={() => setShowParkedModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* تعليق الفاتورة الحالية */}
            {cart.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm font-medium text-amber-700 mb-2">تعليق الفاتورة الحالية ({cart.length} منتج)</p>
                <input type="text" value={parkLabel} onChange={(e) => setParkLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm mb-2"
                  placeholder="تسمية للفاتورة (اختياري)" />
                <button onClick={parkCurrentSale}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">
                  تعليق الفاتورة
                </button>
              </div>
            )}

            {/* قائمة الفواتير المعلقة */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {parkedSales.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">لا توجد فواتير معلقة</p>
              ) : (
                parkedSales.map((parked) => (
                  <div key={parked.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100">
                    <div>
                      <p className="font-medium text-sm text-slate-800">{parked.label || 'فاتورة معلقة'}</p>
                      <p className="text-xs text-slate-500">{parked.cartItems.length} منتج — {parked.customerName || 'بدون عميل'}</p>
                      <p className="text-xs text-slate-400">{new Date(parked.createdAt).toLocaleTimeString('ar-SA')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => restoreParkedSale(parked)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg">
                        استعادة
                      </button>
                      <button onClick={async () => { await db.parkedSales.delete(parked.id!); loadParkedSales(); }}
                        className="px-2 py-1.5 text-rose-500 hover:bg-rose-50 text-xs rounded-lg">
                        حذف
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showCameraScanner && (
        <Suspense fallback={null}>
          <CameraScanner
            onScan={(code) => {
              setShowCameraScanner(false);
              processBarcode(code);
            }}
            onClose={() => setShowCameraScanner(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

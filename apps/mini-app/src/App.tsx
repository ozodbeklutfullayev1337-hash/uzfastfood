import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  Home,
  LayoutGrid,
  Heart,
  ShoppingBag,
  User as UserIcon,
  Search,
  MapPin,
  Sparkles,
  Clock,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Award,
  Phone,
  Navigation,
  Tag,
  RotateCcw,
  Volume2,
  VolumeX,
  Flame,
  ChevronRight,
  Crown,
  Wallet,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { apiFetch, formatUZS, haptic } from './lib/api';
import { soundFX } from './lib/sound';
import { Onboarding } from './components/Onboarding';
import { ProductItem, ProductSheet, CustomizationOpt } from './components/ProductSheet';
import { ComboBuilder } from './components/ComboBuilder';
import { StoryItem, StoryViewer } from './components/StoryViewer';

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
}

interface CartEntry {
  uid: string;
  product: ProductItem;
  quantity: number;
  customizations: CustomizationOpt[];
  isCombo?: boolean;
  comboDetails?: string[];
  overrideUnitPrice?: number;
}

interface OrderRecord {
  id: string;
  orderNumber: number;
  totalAmount: number;
  orderStatus: string;
  address: string;
  createdAt: string;
  items: Array<{
    productId: string;
    name: string;
    imageUrl: string;
    unitPrice: number;
    quantity: number;
  }>;
}

const STORIES: StoryItem[] = [
  {
    id: 's1',
    title: 'YANGI TA\'M',
    badge: 'NEW DROP',
    image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=1000&q=85',
    headline: 'Double Truffle Cheeseburger',
    description: 'Ikki hissa marmar mol go\'shti va maxsus trufel sousi uyg\'unligi.',
    ctaText: 'HOZIROQ SINAB KO\'RISH',
  },
  {
    id: 's2',
    title: 'CHEGIRMALAR',
    badge: '-15% PROMO',
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=85',
    headline: 'WELCOME15 promo-kodi faol!',
    description: 'Ilova orqali ilk buyurtmangizga 15% chegirma oling.',
    ctaText: 'KATALOGGA O\'TISH',
  },
  {
    id: 's3',
    title: 'SMART COMBO',
    badge: '10% TEJANG',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1000&q=85',
    headline: 'O\'z Combo menyuingizni yarating',
    description: 'Burger + Fri + Ichimlik tanlang va avtomatik 10% chegirmaga ega bo\'ling.',
    ctaText: 'COMBO TUZISH',
  },
  {
    id: 's4',
    title: 'VIP BONUS',
    badge: '5% CASHBACK',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=85',
    headline: 'Har bir xariddan 5% keshbek',
    description: 'Yig\'ilgan ballarni keyingi buyurtmalarda naqd puldek ishlating.',
    ctaText: 'PROFILNI KO\'RISH',
  },
];

const TRACKING_STEPS = [
  { key: 'PENDING', label: 'Qabul qilindi' },
  { key: 'CONFIRMED', label: 'Tasdiqlandi' },
  { key: 'PREPARING', label: 'Tayyorlanmoqda' },
  { key: 'READY', label: 'Tayyor' },
  { key: 'ON_THE_WAY', label: 'Yo\'lda' },
  { key: 'DELIVERED', label: 'Yetkazildi' },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [soundOn, setSoundOn] = useState(() => soundFX.isEnabled());
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('tff_onboarding_seen'));
  const [activeTab, setActiveTab] = useState<'home' | 'catalog' | 'favorites' | 'cart' | 'profile'>('home');

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [settings, setSettings] = useState<{
    companyName: string;
    companyPhone: string;
    deliveryZone: string;
    deliveryFee: number;
    freeDeliveryThreshold: number;
  } | null>(null);

  const [userProfile, setUserProfile] = useState<{
    telegramId?: string;
    balance?: number;
    isAdmin?: boolean;
    firstName: string;
    phone?: string;
    loyalty?: { points: number; tier: string; totalSpent: number };
    addresses?: Array<{ id: string; title: string; address: string }>;
  } | null>(null);

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [cart, setCart] = useState<CartEntry[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState<OrderRecord | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc'>('popular');
  const [onlyDiscounts, setOnlyDiscounts] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [address, setAddress] = useState('Toshkent sh., ');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD_ON_DELIVERY' | 'BALANCE'>('CASH');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(1000);
  const [activeTopUp, setActiveTopUp] = useState<{
    id: string;
    uniqueAmount: number;
    cardNumber: string;
    cardHolder: string;
    status: string;
  } | null>(null);
  const [creatingTopUp, setCreatingTopUp] = useState(false);
  const [copiedField, setCopiedField] = useState<'card' | 'amount' | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number } | null>(null);
  const [useBonus, setUseBonus] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const loadBootstrap = async () => {
    try {
      const data = await apiFetch<{
        settings: typeof settings;
        categories: CategoryItem[];
        products: ProductItem[];
        user: {
          firstName: string;
          phone?: string;
          loyalty?: { points: number; tier: string; totalSpent: number };
          favorites?: Array<{ productId: string }>;
          addresses?: Array<{ id: string; title: string; address: string }>;
        } | null;
      }>('/bootstrap');

      setSettings(data.settings);
      setCategories(data.categories);
      setProducts(data.products);
      if (data.user) {
        setUserProfile(data.user);
        setCustomerName(data.user.firstName || '');
        if (data.user.phone) setPhone(data.user.phone);
        setFavoriteIds((data.user.favorites || []).map((f) => f.productId));
      }
    } catch (err) {
      console.error('Bootstrap error:', err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await apiFetch<{ orders: OrderRecord[] }>('/my/orders');
      setOrders(res.orders);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    window.Telegram?.WebApp?.setHeaderColor?.('#070709');
    window.Telegram?.WebApp?.setBackgroundColor?.('#070709');

    const timer = setTimeout(() => setShowSplash(false), 1300);
    loadBootstrap();
    loadOrders();

    const wsUrl = import.meta.env.VITE_WS_URL || 'https://uzfastfood.onrender.com';
    const socket = io(wsUrl);
    socket.on('order:updated', () => loadOrders());
    socket.on('wallet:updated', (ev: { requestId?: string; newBalance?: number }) => {
      loadBootstrap();
      setActiveTopUp((prev) => (prev && prev.id === ev.requestId ? { ...prev, status: 'COMPLETED' } : prev));
      haptic('heavy');
    });
    socket.on('catalog:updated', () => loadBootstrap());

    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
  }, []);


  useEffect(() => {
    if (!activeTopUp || activeTopUp.status === 'COMPLETED') return;
    const iv = setInterval(async () => {
      try {
        const res = await apiFetch<{ request: { status: string }; balance: number }>(`/wallet/topup/${activeTopUp.id}`);
        if (res.request?.status === 'COMPLETED') {
          setActiveTopUp((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
          loadBootstrap();
          haptic('heavy');
        }
      } catch {}
    }, 4000);
    return () => clearInterval(iv);
  }, [activeTopUp]);


  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const loadAdminOrders = async () => {
    try {
      const res = await apiFetch<{ orders: any[] }>('/admin/orders');
      setAdminOrders(res.orders || []);
    } catch {}
  };
  const updateAdminOrderStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      haptic('medium');
      loadAdminOrders();
    } catch {}
  };

  const startTopUp = async () => {
    setCreatingTopUp(true);
    try {
      const res = await apiFetch<{
        request: { id: string; uniqueAmount: number; status: string };
        cardNumber: string;
        cardHolder: string;
      }>('/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: topUpAmount }),
      });
      setActiveTopUp({
        id: res.request.id,
        uniqueAmount: res.request.uniqueAmount,
        cardNumber: res.cardNumber,
        cardHolder: res.cardHolder,
        status: res.request.status,
      });
      haptic('medium');
    } catch (e: any) {
      alert(e.message || 'Xatolik yuz berdi');
    } finally {
      setCreatingTopUp(false);
    }
  };

  const copyText = (val: string, field: 'card' | 'amount') => {
    navigator.clipboard?.writeText(val);
    setCopiedField(field);
    haptic('light');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const addToCart = (
    product: ProductItem,
    quantity = 1,
    customizations: CustomizationOpt[] = [],
    isCombo = false,
    comboDetails?: string[],
    overrideUnitPrice?: number
  ) => {
    haptic('medium');
    const uid = `${product.id}_${customizations.map((c) => c.id).join('-')}_${isCombo ? 'combo' : 'std'}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.uid === uid);
      if (existing) {
        return prev.map((i) => (i.uid === uid ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { uid, product, quantity, customizations, isCombo, comboDetails, overrideUnitPrice }];
    });
  };

  const toggleFavorite = async (productId: string) => {
    haptic('light');
    setFavoriteIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
    try {
      await apiFetch(`/my/favorites/${productId}`, { method: 'POST' });
    } catch {
      // ignore
    }
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => (selectedCategory === 'all' ? true : p.categoryId === selectedCategory))
      .filter((p) => (onlyDiscounts ? Boolean(p.oldPrice && p.oldPrice > p.price) : true))
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        return Number(b.isPopular) - Number(a.isPopular);
      });
  }, [products, selectedCategory, onlyDiscounts, searchQuery, sortBy]);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const extras = item.customizations.reduce((s, c) => s + c.price, 0);
      const unit = item.overrideUnitPrice ?? item.product.price + extras;
      return sum + unit * item.quantity;
    }, 0);
  }, [cart]);

  const discountAmount = appliedPromo?.discountAmount || 0;
  const availablePoints = userProfile?.loyalty?.points || 0;
  const bonusApplied = useBonus ? Math.min(availablePoints, Math.max(0, cartSubtotal - discountAmount)) : 0;
  const freeThreshold = settings?.freeDeliveryThreshold ?? 100000;
  const deliveryFee = cartSubtotal === 0 || cartSubtotal - discountAmount >= freeThreshold ? 0 : settings?.deliveryFee ?? 15000;
  const finalTotal = Math.max(0, cartSubtotal - discountAmount - bonusApplied + deliveryFee);

  const activeOrder = orders.find((o) => !['DELIVERED', 'CANCELLED'].includes(o.orderStatus));

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    try {
      const res = await apiFetch<{ code: string; discountAmount: number }>('/promotions/validate', {
        method: 'POST',
        body: JSON.stringify({ code: promoInput, subtotal: cartSubtotal }),
      });
      setAppliedPromo(res);
      haptic('medium');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Promo-kod yaroqsiz');
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Qurilmangiz geolokatsiyani qo\'llab-quvvatlamaydi');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAddress(`Toshkent sh. (GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        haptic('medium');
      },
      () => alert('Geolokatsiyaga ruxsat berilmadi')
    );
  };

  const submitOrder = async () => {
    if (!customerName.trim() || phone.trim().length < 9 || address.trim().length < 5) {
      alert('Iltimos, ism, telefon raqam va manzilni to\'liq kiriting');
      return;
    }
    setSubmittingOrder(true);
    try {
      const idempotencyKey = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const payload = {
        idempotencyKey,
        customerName,
        phone,
        address,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        comment,
        paymentMethod,
        promoCode: appliedPromo?.code,
        useBonusPoints: bonusApplied,
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          customizations: c.customizations,
          isCombo: c.isCombo,
          comboDetails: c.comboDetails,
        })),
      };

      const res = await apiFetch<{ order: OrderRecord }>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCart([]);
      setAppliedPromo(null);
      setUseBonus(false);
      setShowCheckout(false);
      setOrderSuccessModal(res.order);
      loadOrders();
      loadBootstrap();
      haptic('heavy');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Buyurtma yuborishda xatolik');
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070709] flex flex-col items-center justify-center text-white overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full bg-[#D4AF37]/15 blur-[100px]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-center space-y-4"
        >
          <div className="w-20 h-20 mx-auto rounded-[28px] gold-card flex items-center justify-center shadow-luxury">
            <Crown className="w-9 h-9 text-[#D4AF37]" />
          </div>
          <h1 className="font-serif text-4xl tracking-[0.22em] font-bold bg-gradient-to-r from-[#F5E6B3] via-[#D4AF37] to-[#F5E6B3] bg-clip-text text-transparent">
            THE FAST FOOD
          </h1>
          <p className="text-[11px] tracking-[0.38em] text-zinc-400 uppercase">Haute Fast Cuisine</p>
        </motion.div>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#070709] text-[#FAFAFA] pb-32 max-w-lg mx-auto relative overflow-x-hidden">
      {/* Ambient Luxury Lighting */}
      <div className="pointer-events-none fixed top-[-120px] left-1/2 -translate-x-1/2 w-[420px] h-[280px] rounded-full bg-[#D4AF37]/10 blur-[120px] z-0" />
      <div className="pointer-events-none fixed bottom-20 right-[-80px] w-[260px] h-[260px] rounded-full bg-[#E11D48]/10 blur-[110px] z-0" />

      {/* FLOATING GLASS HEADER */}
      <header className="sticky top-0 z-30 bg-[#070709]/80 backdrop-blur-2xl px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gold-card flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <div className="font-serif font-bold tracking-[0.14em] text-base leading-none text-white">
              THE FAST FOOD
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-1">
              <MapPin className="w-3 h-3 text-[#D4AF37]" />
              <span className="truncate max-w-[155px]">{settings?.deliveryZone || 'Toshkent shahri'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn(soundFX.toggle())}
            aria-label="Ovoz"
            className="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-[#D4AF37] active:scale-90 transition-transform"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          <button
            onClick={() => {
              haptic('light');
              setActiveTab('profile');
            }}
            className="flex items-center gap-2 glass-panel pl-3 pr-1.5 py-1 rounded-full active:scale-95 transition-transform"
          >
            <div className="text-right">
              <div className="text-[11px] font-bold text-white leading-none">{userProfile?.firstName || 'Mehmon'}</div>
              <div className="text-[10px] font-extrabold text-[#D4AF37] mt-0.5">
                {formatUZS(userProfile?.balance || 0)}
              </div>
            </div>
            <div className="w-7 h-7 rounded-full btn-gold flex items-center justify-center font-bold text-xs">
              {(userProfile?.firstName || 'M')[0]}
            </div>
          </button>
        </div>
      </header>

      {/* LIVE ORDER TRACKING BANNER */}
      {activeOrder && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mt-4 p-4 rounded-[26px] gold-card shadow-luxury space-y-2.5 relative z-10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-[#D4AF37]">
                JONLI KUZATUV • #{activeOrder.orderNumber}
              </span>
            </div>
            <span className="text-xs font-extrabold text-white">{formatUZS(activeOrder.totalAmount)}</span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {TRACKING_STEPS.map((st, idx) => {
              const currentIdx = TRACKING_STEPS.findIndex((s) => s.key === activeOrder.orderStatus);
              const done = idx <= currentIdx;
              return (
                <div
                  key={st.key}
                  className={`h-1.5 rounded-full transition-all ${done ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E6B3]' : 'bg-white/10'}`}
                />
              );
            })}
          </div>
          <div className="text-xs text-zinc-300 flex items-center justify-between">
            <span>
              Holat:{' '}
              <strong className="text-white">
                {TRACKING_STEPS.find((s) => s.key === activeOrder.orderStatus)?.label || activeOrder.orderStatus}
              </strong>
            </span>
            <span className="text-[11px] text-[#D4AF37] font-semibold">~25 daq</span>
          </div>
        </motion.div>
      )}

      {/* TAB 1: HOME */}
      {activeTab === 'home' && (
        <main className="px-5 pt-4 space-y-7 relative z-10">
          {/* Luxury Stories */}
          <div className="flex gap-3.5 overflow-x-auto no-scrollbar py-1">
            {STORIES.map((story) => (
              <button
                key={story.id}
                onClick={() => {
                  haptic('light');
                  setActiveStory(story);
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="w-[70px] h-[70px] rounded-[24px] p-[2px] bg-gradient-to-tr from-[#E11D48] via-[#D4AF37] to-[#F5E6B3] group-active:scale-95 transition-transform">
                  <img
                    src={story.image}
                    alt={story.title}
                    className="w-full h-full object-cover rounded-[22px] border-2 border-[#070709]"
                  />
                </div>
                <span className="text-[10px] font-bold tracking-wider text-zinc-300">{story.title}</span>
              </button>
            ))}
          </div>

          {/* Cinematic 3D Hero Card */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-72 rounded-[34px] overflow-hidden border border-[#D4AF37]/25 shadow-luxury flex flex-col justify-end p-6"
          >
            <img
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=90"
              alt="Signature Burger"
              className="absolute inset-0 w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/55 to-transparent" />
            <div className="relative z-10 space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-extrabold tracking-[0.2em] uppercase">
                <Sparkles className="w-3 h-3" />
                CHEF'S PRIVATE COLLECTION
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-none text-white">
                Haqiqiy Ta'm San'ati
              </h2>
              <p className="text-xs text-zinc-300 max-w-[270px]">
                Marmar mol go'shti, trufel souslari va 25 daqiqada issiq yetkazib berish.
              </p>
              <div className="pt-1 flex items-center gap-2.5">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    haptic('light');
                    setActiveTab('catalog');
                  }}
                  className="px-6 py-3 rounded-2xl btn-gold font-extrabold text-xs tracking-wider uppercase shadow-lg"
                >
                  MENYUNI OCHISH
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    haptic('light');
                    setShowComboBuilder(true);
                  }}
                  className="px-4 py-3 rounded-2xl glass-panel text-white font-bold text-xs"
                >
                  Combo -10%
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* Horizontal Category Quick Pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                haptic('light');
                setSelectedCategory('all');
                setActiveTab('catalog');
              }}
              className="px-4 py-2.5 rounded-2xl btn-gold text-xs font-extrabold shrink-0"
            >
              Barchasi
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  haptic('light');
                  setSelectedCategory(cat.id);
                  setActiveTab('catalog');
                }}
                className="px-4 py-2.5 rounded-2xl glass-panel text-xs font-bold text-zinc-200 shrink-0 hover:border-[#D4AF37]/40 transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Smart Combo VIP Card */}
          <motion.section
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic('light');
              setShowComboBuilder(true);
            }}
            className="p-5 rounded-[30px] gold-card flex items-center justify-between cursor-pointer shadow-luxury"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#D4AF37] uppercase tracking-[0.2em]">
                <Flame className="w-3.5 h-3.5 text-[#E11D48]" />
                SMART COMBO • -10% CHEGIRMA
              </div>
              <h3 className="font-serif text-2xl font-bold text-white">O'z Combo setingizni tuzing</h3>
              <p className="text-xs text-zinc-400">Burger + Fri + Ichimlik tanlang va avtomatik 10% tejang</p>
            </div>
            <div className="w-12 h-12 rounded-2xl btn-gold flex items-center justify-center shrink-0 shadow-lg">
              <ChevronRight className="w-6 h-6" />
            </div>
          </motion.section>

          {/* Popular Bento Grid (2 Columns) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-[0.25em] text-[#D4AF37] uppercase">BESTSELLERS</span>
                <h3 className="font-serif text-2xl font-bold text-white">Eng mashhur taomlar</h3>
              </div>
              <button
                onClick={() => {
                  haptic('light');
                  setActiveTab('catalog');
                }}
                className="text-xs font-bold text-[#D4AF37] flex items-center gap-1"
              >
                Barchasi <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {products.filter((p) => p.isPopular).map((product) => (
                <BentoProductCard
                  key={product.id}
                  product={product}
                  isFavorite={favoriteIds.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                  onOpen={() => setSelectedProduct(product)}
                  onQuickAdd={() => addToCart(product, 1, [])}
                />
              ))}
            </div>
          </section>
        </main>
      )}

      {/* TAB 2: CATALOG */}
      {activeTab === 'catalog' && (
        <main className="px-5 pt-4 space-y-5 relative z-10">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Taom nomini izlang..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass-panel text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => {
                haptic('light');
                setSelectedCategory('all');
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold shrink-0 transition-all ${
                selectedCategory === 'all' ? 'btn-gold shadow-md' : 'glass-panel text-zinc-300'
              }`}
            >
              Barchasi
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  haptic('light');
                  setSelectedCategory(cat.id);
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold shrink-0 transition-all ${
                  selectedCategory === cat.id ? 'btn-gold shadow-md' : 'glass-panel text-zinc-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => {
                haptic('light');
                setOnlyDiscounts(!onlyDiscounts);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                onlyDiscounts ? 'btn-crimson border-transparent' : 'glass-panel text-zinc-300'
              }`}
            >
              % Chegirmalar
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'price_asc' | 'price_desc')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold glass-panel text-zinc-200 focus:outline-none"
            >
              <option value="popular" className="bg-[#121216]">Mashhurlik bo'yicha</option>
              <option value="price_asc" className="bg-[#121216]">Arzonroq avval</option>
              <option value="price_desc" className="bg-[#121216]">Qimmatroq avval</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {filteredProducts.map((product) => (
              <BentoProductCard
                key={product.id}
                product={product}
                isFavorite={favoriteIds.includes(product.id)}
                onToggleFavorite={toggleFavorite}
                onOpen={() => setSelectedProduct(product)}
                onQuickAdd={() => addToCart(product, 1, [])}
              />
            ))}
          </div>
        </main>
      )}

      {/* TAB 3: FAVORITES */}
      {activeTab === 'favorites' && (
        <main className="px-5 pt-5 space-y-5 relative z-10">
          <h2 className="font-serif text-3xl font-bold text-white">Sevimli taomlar</h2>
          {products.filter((p) => favoriteIds.includes(p.id)).length === 0 ? (
            <div className="p-10 text-center glass-panel rounded-[32px] space-y-3">
              <Heart className="w-10 h-10 mx-auto text-[#E11D48]" />
              <p className="text-sm font-semibold text-zinc-400">Hali sevimli taomlar qo'shilmagan</p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-6 py-3 rounded-2xl btn-gold text-xs font-extrabold"
              >
                MENYUNI KO'RISH
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {products
                .filter((p) => favoriteIds.includes(p.id))
                .map((product) => (
                  <BentoProductCard
                    key={product.id}
                    product={product}
                    isFavorite={true}
                    onToggleFavorite={toggleFavorite}
                    onOpen={() => setSelectedProduct(product)}
                    onQuickAdd={() => addToCart(product, 1, [])}
                  />
                ))}
            </div>
          )}
        </main>
      )}

      {/* TAB 4: CART */}
      {activeTab === 'cart' && (
        <main className="px-5 pt-5 space-y-5 relative z-10">
          <h2 className="font-serif text-3xl font-bold text-white">Savatcha</h2>

          {cart.length === 0 ? (
            <div className="p-10 text-center glass-panel rounded-[32px] space-y-3">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#D4AF37]" />
              <p className="text-sm font-semibold text-zinc-400">Savatchangiz hozircha bo'sh</p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-6 py-3 rounded-2xl btn-gold text-xs font-extrabold"
              >
                TAOM TANLASH
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((item) => {
                  const extras = item.customizations.reduce((s, c) => s + c.price, 0);
                  const unit = item.overrideUnitPrice ?? item.product.price + extras;
                  return (
                    <div key={item.uid} className="p-3.5 rounded-[28px] glass-panel flex gap-3.5 items-center">
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">
                          {item.isCombo ? `Combo: ${item.product.name}` : item.product.name}
                        </h4>
                        {item.customizations.length > 0 && (
                          <p className="text-[11px] text-zinc-400 truncate">
                            {item.customizations.map((c) => c.name).join(', ')}
                          </p>
                        )}
                        {item.comboDetails && (
                          <p className="text-[11px] text-[#D4AF37] font-medium truncate">{item.comboDetails.join(' • ')}</p>
                        )}
                        <div className="font-extrabold text-sm text-[#D4AF37] mt-1">{formatUZS(unit * item.quantity)}</div>
                      </div>

                      <div className="flex flex-col items-center gap-1 bg-white/[0.06] rounded-2xl p-1">
                        <button
                          onClick={() => {
                            haptic('light');
                            setCart((prev) =>
                              prev.map((c) => (c.uid === item.uid ? { ...c, quantity: c.quantity + 1 } : c))
                            );
                          }}
                          className="w-7 h-7 flex items-center justify-center text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-extrabold">{item.quantity}</span>
                        <button
                          onClick={() => {
                            haptic('light');
                            setCart((prev) =>
                              item.quantity > 1
                                ? prev.map((c) => (c.uid === item.uid ? { ...c, quantity: c.quantity - 1 } : c))
                                : prev.filter((c) => c.uid !== item.uid)
                            );
                          }}
                          className="w-7 h-7 flex items-center justify-center text-zinc-300"
                        >
                          {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-[#E11D48]" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Smart Upsell */}
              <div className="p-4 rounded-[28px] gold-card space-y-2.5">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#D4AF37]">
                  TAVSIYA ETILADIGAN QO'SHIMCHALAR
                </div>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                  {products
                    .filter((p) => ['cola', 'fries', 'milkshake', 'fanta'].some((s) => p.name.toLowerCase().includes(s)))
                    .slice(0, 4)
                    .map((upsell) => (
                      <button
                        key={upsell.id}
                        onClick={() => addToCart(upsell, 1, [])}
                        className="shrink-0 flex items-center gap-2.5 glass-panel p-2 pr-3.5 rounded-2xl active:scale-95 transition-transform"
                      >
                        <img src={upsell.imageUrl} alt={upsell.name} className="w-10 h-10 rounded-xl object-cover" />
                        <div className="text-left">
                          <div className="text-xs font-bold text-white">{upsell.name}</div>
                          <div className="text-[11px] font-extrabold text-[#D4AF37]">+ {formatUZS(upsell.price)}</div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-5 rounded-[30px] glass-panel space-y-3.5">
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Promo-kod (WELCOME15)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs uppercase font-bold text-white"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-4 py-2.5 rounded-xl btn-gold text-xs font-extrabold"
                  >
                    Qo'llash
                  </button>
                </div>

                {availablePoints > 0 && (
                  <label className="flex items-center justify-between text-xs font-semibold text-zinc-300 pt-1">
                    <span>Bonus ballarni ishlatish ({availablePoints.toLocaleString('ru-RU')} ball)</span>
                    <input
                      type="checkbox"
                      checked={useBonus}
                      onChange={(e) => setUseBonus(e.target.checked)}
                      className="w-4 h-4 accent-[#D4AF37]"
                    />
                  </label>
                )}

                <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Taomlar summasi:</span>
                    <span className="font-bold text-white">{formatUZS(cartSubtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#E11D48]">
                      <span>Chegirma ({appliedPromo?.code}):</span>
                      <span className="font-bold">-{formatUZS(discountAmount)}</span>
                    </div>
                  )}
                  {bonusApplied > 0 && (
                    <div className="flex justify-between text-[#D4AF37]">
                      <span>Bonus ballar:</span>
                      <span className="font-bold">-{formatUZS(bonusApplied)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-400">
                    <span>Yetkazib berish:</span>
                    <span className="font-bold text-emerald-400">{deliveryFee === 0 ? 'BEPUL' : formatUZS(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold pt-2 border-t border-white/10 text-white">
                    <span>Jami to'lov:</span>
                    <span className="text-[#D4AF37]">{formatUZS(finalTotal)}</span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    haptic('light');
                    setShowCheckout(true);
                  }}
                  className="w-full py-4 rounded-2xl btn-crimson font-extrabold text-sm tracking-wider uppercase shadow-luxury"
                >
                  BUYURTMANI RASMIYLASHTIRISH
                </motion.button>
              </div>
            </>
          )}
        </main>
      )}

      {/* TAB 5: PROFILE */}
      {activeTab === 'profile' && (
        <main className="px-5 pt-5 space-y-6 relative z-10">
          {/* HUMO HAMYON BALANSI */}
          <div className="p-6 rounded-[34px] bg-gradient-to-br from-[#18181F] via-[#101015] to-[#1E1418] border border-[#D4AF37]/40 shadow-luxury space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-[0.25em] text-[#D4AF37] uppercase flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                THE FAST FOOD WALLET
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-extrabold">
                HUMO AUTO-PAY
              </span>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Ichki hisob balansi</div>
              <div className="font-serif text-4xl font-bold text-white mt-0.5">
                {formatUZS(userProfile?.balance || 0)}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic('light');
                setActiveTopUp(null);
                setShowTopUp(true);
              }}
              className="w-full py-3.5 rounded-2xl btn-gold font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              BALANSNI TO'LDIRISH (HUMO)
            </motion.button>
          </div>

          <div className="p-6 rounded-[34px] gold-card shadow-luxury space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-[0.25em] text-[#D4AF37] uppercase">
                THE FAST FOOD PRIVILEGE
              </span>
              <span className="px-3 py-1 rounded-full btn-gold text-[10px] font-extrabold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                {userProfile?.loyalty?.tier || 'VIP GOLD'}
              </span>
            </div>

            <div>
              <div className="text-xs text-zinc-400">Mavjud bonus balans</div>
              <div className="font-serif text-4xl font-bold text-white mt-0.5">
                {(userProfile?.loyalty?.points || 0).toLocaleString('ru-RU')}{' '}
                <span className="text-sm text-[#D4AF37] font-sans">ball</span>
              </div>
            </div>

            <div className="text-xs text-zinc-300 flex justify-between pt-3 border-t border-white/10">
              <span>Mijoz: {userProfile?.firstName || 'Mehmon'}</span>
              <span>Jami xarid: {formatUZS(userProfile?.loyalty?.totalSpent || 0)}</span>
            </div>
          </div>

          <div className="p-4 rounded-[26px] glass-panel flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E11D48]/15 flex items-center justify-center">
                <Tag className="w-5 h-5 text-[#E11D48]" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white">WELCOME15</div>
                <div className="text-[11px] text-zinc-400">Birinchi buyurtmaga 15% chegirma</div>
              </div>
            </div>
            <button
              onClick={() => {
                haptic('light');
                setPromoInput('WELCOME15');
                setActiveTab('cart');
              }}
              className="px-3.5 py-2 rounded-xl btn-gold text-xs font-extrabold"
            >
              Ishlatish
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-serif text-2xl font-bold text-white">Buyurtmalar tarixi</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-zinc-500">Hali buyurtmalar mavjud emas.</p>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="p-4 rounded-[26px] glass-panel space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">Buyurtma #{ord.orderNumber}</span>
                    <span className="px-2.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-[10px] font-extrabold">
                      {TRACKING_STEPS.find((s) => s.key === ord.orderStatus)?.label || ord.orderStatus}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {ord.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="font-extrabold text-sm text-[#D4AF37]">{formatUZS(ord.totalAmount)}</span>
                    <button
                      onClick={() => {
                        for (const item of ord.items) {
                          const found = products.find((p) => p.id === item.productId);
                          if (found) addToCart(found, item.quantity, []);
                        }
                        setActiveTab('cart');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Takrorlash
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* FLOATING CART PILL (When cart has items and not on cart tab) */}
      <AnimatePresence>
        {cartCount > 0 && activeTab !== 'cart' && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-24 inset-x-0 max-w-lg mx-auto px-5 z-30"
          >
            <button
              onClick={() => {
                haptic('light');
                setActiveTab('cart');
              }}
              className="w-full py-3.5 px-5 rounded-[24px] btn-crimson shadow-luxury flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-black/25 flex items-center justify-center text-xs font-extrabold">
                  {cartCount}
                </span>
                <span className="text-xs font-extrabold tracking-wider uppercase">Savatchani ko'rish</span>
              </div>
              <span className="text-sm font-extrabold">{formatUZS(cartSubtotal)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING DYNAMIC DOCK NAVIGATION */}
      <div className="fixed bottom-4 inset-x-0 max-w-lg mx-auto px-4 z-30">
        <nav className="glass-panel rounded-[28px] px-2 py-2 flex items-center justify-around shadow-luxury">
          {[
            { id: 'home', icon: Home, label: 'Asosiy' },
            { id: 'catalog', icon: LayoutGrid, label: 'Menyu' },
            { id: 'favorites', icon: Heart, label: 'Sevimli' },
            { id: 'cart', icon: ShoppingBag, label: 'Savat', badge: cartCount },
            { id: 'profile', icon: UserIcon, label: 'Profil' },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  haptic('light');
                  setActiveTab(tab.id as typeof activeTab);
                }}
                className={`relative flex flex-col items-center gap-1 px-3.5 py-2 rounded-2xl transition-all ${
                  active ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold">{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-[#E11D48] text-white text-[9px] font-extrabold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        
          {userProfile?.isAdmin && (
            <button
              onClick={() => {
                haptic('light');
                setActiveTab('admin');
                loadAdminOrders();
              }}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all ${
                activeTab === 'admin' ? 'text-[#D4AF37]' : 'text-zinc-400'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] font-extrabold">Admin</span>
            </button>
          )}

        </nav>
      </div>


      {/* HUMO BALANS TO'LDIRISH MODALI */}
      <AnimatePresence>
        {showTopUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end justify-center"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg bg-[#0D0D11] border-t border-[#D4AF37]/35 rounded-t-[34px] p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#D4AF37] uppercase">AVTOMATIK TO'LOV</span>
                  <h2 className="font-serif text-2xl font-bold text-white">Balansni to'ldirish</h2>
                </div>
                <button
                  onClick={() => setShowTopUp(false)}
                  className="text-xs font-bold px-3.5 py-1.5 rounded-full glass-panel text-zinc-300"
                >
                  Yopish
                </button>
              </div>

              {!activeTopUp ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[25000, 50000, 100000, 150000, 200000, 300000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          haptic('light');
                          setTopUpAmount(amt);
                        }}
                        className={`py-3 rounded-2xl text-xs font-extrabold border transition-all ${
                          topUpAmount === amt ? 'btn-gold border-transparent' : 'glass-panel text-zinc-200'
                        }`}
                      >
                        {amt.toLocaleString('ru-RU')}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-400">Yoki boshqa summa kiriting (so'm)</label>
                    <input
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(Number(e.target.value))}
                      className="w-full mt-1.5 px-4 py-3.5 rounded-2xl glass-panel text-base font-extrabold text-[#D4AF37]"
                    />
                  </div>

                  <button
                    disabled={creatingTopUp || topUpAmount < 1000}
                    onClick={startTopUp}
                    className="w-full py-4 rounded-2xl btn-crimson font-extrabold text-sm tracking-wider uppercase shadow-luxury disabled:opacity-50"
                  >
                    {creatingTopUp ? 'TAYYORLANMOQDA...' : 'TO\'LOV REKVIZITLARINI OLISH'}
                  </button>
                </div>
              ) : activeTopUp.status === 'COMPLETED' ? (
                <div className="py-6 text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-400" />
                  <h3 className="font-serif text-3xl font-bold text-white">Balans to'ldirildi!</h3>
                  <p className="text-xs text-zinc-300">
                    Hisobingizga <strong className="text-[#D4AF37]">{formatUZS(activeTopUp.uniqueAmount)}</strong> avtomatik qo'shildi.
                  </p>
                  <button
                    onClick={() => setShowTopUp(false)}
                    className="w-full py-3.5 rounded-2xl btn-gold font-extrabold text-xs uppercase"
                  >
                    DAVOM ETISH
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#E11D48]/15 border border-[#E11D48]/35 text-xs text-zinc-200 leading-relaxed">
                    ⚠️ <b>Muhim:</b> To'lov avtomatik tasdiqlanishi uchun quyidagi HUMO kartaga <b>aynan ko'rsatilgan aniq summani</b> o'tkazing:
                  </div>

                  <div className="p-4 rounded-2xl glass-panel space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase font-bold">HUMO Karta raqami</div>
                        <div className="text-base font-extrabold text-white tracking-wider mt-0.5">
                          {activeTopUp.cardNumber}
                        </div>
                      </div>
                      <button
                        onClick={() => copyText(activeTopUp.cardNumber.replace(/\s+/g, ''), 'card')}
                        className="px-3 py-2 rounded-xl btn-gold text-xs font-extrabold flex items-center gap-1"
                      >
                        {copiedField === 'card' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedField === 'card' ? 'Nusxalandi' : 'Nusxalash'}
                      </button>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase font-bold">O'tkazish summasi (Aniq)</div>
                        <div className="text-xl font-extrabold text-[#D4AF37] mt-0.5">
                          {formatUZS(activeTopUp.uniqueAmount)}
                        </div>
                      </div>
                      <button
                        onClick={() => copyText(String(activeTopUp.uniqueAmount), 'amount')}
                        className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-extrabold flex items-center gap-1"
                      >
                        {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedField === 'amount' ? 'Nusxalandi' : 'Summa'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2.5 py-2 text-xs text-[#D4AF37] font-bold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>@HUMOcardbot orqali to'lov kutilmoqda...</span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg max-h-[92vh] bg-[#0D0D11] border-t border-[#D4AF37]/30 rounded-t-[34px] p-6 overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold text-white">Buyurtmani tasdiqlash</h2>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="text-xs font-bold px-3.5 py-1.5 rounded-full glass-panel text-zinc-300"
                >
                  Yopish
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400">Ismingiz</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full mt-1 px-4 py-3 rounded-2xl glass-panel text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400">Telefon raqam</label>
                  <div className="relative mt-1">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl glass-panel text-sm text-white"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400">Yetkazib berish manzili</label>
                    <button onClick={detectLocation} className="inline-flex items-center gap-1 text-xs font-bold text-[#D4AF37]">
                      <Navigation className="w-3.5 h-3.5" />
                      GPS aniqlash
                    </button>
                  </div>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full mt-1 px-4 py-3 rounded-2xl glass-panel text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400">Kuryer uchun izoh</label>
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Masalan: 2-kirish yo'lagi, domofon 45"
                    className="w-full mt-1 px-4 py-3 rounded-2xl glass-panel text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400">To'lov usuli</label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    <button
                      onClick={() => setPaymentMethod('BALANCE')}
                      className={`py-3 px-2 rounded-2xl text-[11px] font-extrabold border flex flex-col items-center gap-0.5 ${
                        paymentMethod === 'BALANCE' ? 'btn-gold border-transparent' : 'glass-panel text-zinc-300'
                      }`}
                    >
                      <span>Balansdan</span>
                      <span className="text-[9px] opacity-80">{formatUZS(userProfile?.balance || 0)}</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('CASH')}
                      className={`py-3 rounded-2xl text-xs font-extrabold border ${
                        paymentMethod === 'CASH' ? 'btn-gold border-transparent' : 'glass-panel text-zinc-300'
                      }`}
                    >
                      Naqd pul
                    </button>
                    <button
                      onClick={() => setPaymentMethod('CARD_ON_DELIVERY')}
                      className={`py-3 rounded-2xl text-xs font-extrabold border ${
                        paymentMethod === 'CARD_ON_DELIVERY' ? 'btn-gold border-transparent' : 'glass-panel text-zinc-300'
                      }`}
                    >
                      Yetkazishda karta
                    </button>
                  </div>
                </div>
              </div>

              <button
                disabled={submittingOrder}
                onClick={submitOrder}
                className="w-full py-4 rounded-2xl btn-crimson font-extrabold text-sm shadow-luxury disabled:opacity-50"
              >
                {submittingOrder ? 'YUBORILMOQDA...' : `TASDIQLASH • ${formatUZS(finalTotal)}`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ORDER SUCCESS MODAL */}
      <AnimatePresence>
        {orderSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-full max-w-sm gold-card rounded-[34px] p-7 text-center space-y-4 shadow-luxury"
            >
              <CheckCircle2 className="w-16 h-16 mx-auto text-[#D4AF37]" />
              <h3 className="font-serif text-3xl font-bold text-white">Buyurtma qabul qilindi!</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Buyurtma raqamingiz: <strong className="text-[#D4AF37]">#{orderSuccessModal.orderNumber}</strong>. Oshxonamiz taomingizni tayyorlashni boshladi!
              </p>
              <button
                onClick={() => {
                  setOrderSuccessModal(null);
                  setActiveTab('home');
                }}
                className="w-full py-3.5 rounded-2xl btn-gold font-extrabold text-xs tracking-wider"
              >
                JONLI KUZATISHGA O'TISH
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProduct && (
          <ProductSheet
            product={selectedProduct}
            isFavorite={favoriteIds.includes(selectedProduct.id)}
            onToggleFavorite={toggleFavorite}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={(p, q, c) => addToCart(p, q, c)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComboBuilder && (
          <ComboBuilder
            products={products}
            onClose={() => setShowComboBuilder(false)}
            onAddCombo={(main, details, price) => addToCart(main, 1, [], true, details, price)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeStory && (
          <StoryViewer
            story={activeStory}
            onClose={() => setActiveStory(null)}
            onAction={() => setActiveTab('catalog')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BentoProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onQuickAdd,
}: {
  product: ProductItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: () => void;
  onQuickAdd: () => void;
}) {
  const discountPct =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-panel rounded-[26px] overflow-hidden flex flex-col justify-between group hover:border-[#D4AF37]/35 transition-all"
    >
      <div onClick={onOpen} className="relative h-36 overflow-hidden cursor-pointer bg-[#121216]">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D11] via-transparent to-black/25" />

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {discountPct > 0 && (
            <span className="px-2 py-0.5 rounded-full btn-crimson text-[9px] font-extrabold">
              -{discountPct}%
            </span>
          )}
          {product.isNew && (
            <span className="px-2 py-0.5 rounded-full btn-gold text-[9px] font-extrabold">
              NEW
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center border border-white/10"
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[#E11D48] text-[#E11D48]' : 'text-white'}`} />
        </button>

        <span className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[10px] font-semibold text-zinc-200 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 text-[#D4AF37]" />
          {product.preparationTime}d
        </span>
      </div>

      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div onClick={onOpen} className="cursor-pointer">
          <h4 className="font-bold text-xs text-white line-clamp-1">{product.name}</h4>
          <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">{product.description}</p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            {product.oldPrice && product.oldPrice > product.price && (
              <div className="text-[9px] line-through text-zinc-500">{formatUZS(product.oldPrice)}</div>
            )}
            <div className="text-xs font-extrabold text-[#D4AF37]">{formatUZS(product.price)}</div>
          </div>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onQuickAdd}
            aria-label="Qo'shish"
            className="w-8 h-8 rounded-xl btn-gold flex items-center justify-center shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

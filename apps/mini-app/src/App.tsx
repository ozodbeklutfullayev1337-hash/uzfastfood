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
} from 'lucide-react';
import { apiFetch, formatUZS, haptic } from './lib/api';
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
    title: 'YANGI TA'M',
    badge: 'NEW DROP',
    image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=1000&q=85',
    headline: 'Double Truffle Cheeseburger',
    description: 'Ikki hissa marmar mol go'shti va maxsus trufel sousi uyg'unligi.',
    ctaText: 'HOZIROQ SINAB KO'RISH',
  },
  {
    id: 's2',
    title: 'CHEGIRMALAR',
    badge: '-15% PROMO',
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=85',
    headline: 'WELCOME15 promo-kodi faol!',
    description: 'Ilova orqali ilk buyurtmangizga 15% chegirma oling.',
    ctaText: 'KATALOGGA O'TISH',
  },
  {
    id: 's3',
    title: 'SMART COMBO',
    badge: '10% TEJANG',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1000&q=85',
    headline: 'O'z Combo menyuingizni yarating',
    description: 'Burger + Fri + Ichimlik tanlang va avtomatik 10% chegirmaga ega bo'ling.',
    ctaText: 'COMBO TUZISH',
  },
  {
    id: 's4',
    title: 'VIP BONUS',
    badge: '5% CASHBACK',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=85',
    headline: 'Har bir xariddan 5% keshbek',
    description: 'Yig'ilgan ballarni keyingi buyurtmalarda naqd puldek ishlating.',
    ctaText: 'PROFILNI KO'RISH',
  },
];

const TRACKING_STEPS = [
  { key: 'PENDING', label: 'Buyurtma qabul qilindi' },
  { key: 'CONFIRMED', label: 'Tasdiqlandi' },
  { key: 'PREPARING', label: 'Tayyorlanmoqda' },
  { key: 'READY', label: 'Tayyor' },
  { key: 'ON_THE_WAY', label: 'Yo'lda' },
  { key: 'DELIVERED', label: 'Yetkazildi' },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
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
    firstName: string;
    phone?: string;
    loyalty?: { points: number; tier: string; totalSpent: number };
    addresses?: Array<{ id: string; title: string; address: string }>;
  } | null>(null);

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [cart, setCart] = useState<CartEntry[]>([]);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState<OrderRecord | null>(null);

  // Catalog filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc'>('popular');
  const [onlyDiscounts, setOnlyDiscounts] = useState(false);

  // Checkout state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [address, setAddress] = useState('Toshkent sh., ');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD_ON_DELIVERY'>('CASH');
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

    const timer = setTimeout(() => setShowSplash(false), 1400);
    loadBootstrap();
    loadOrders();

    const wsUrl = import.meta.env.VITE_WS_URL || 'https://uzfastfood.onrender.com';
    const socket = io(wsUrl);
    socket.on('order:updated', () => loadOrders());
    socket.on('catalog:updated', () => loadBootstrap());

    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
  }, []);

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
      // revert if needed
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
      alert('Qurilmangiz geolokatsiyani qo'llab-quvvatlamaydi');
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
      alert('Iltimos, ism, telefon raqam va manzilni to'liq kiriting');
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

  // Luxury Splash Screen
  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0F0F0F] flex flex-col items-center justify-center text-[#FAF7F2]">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl border border-[#C59B27]/50 flex items-center justify-center bg-[#C59B27]/10">
            <Sparkles className="w-8 h-8 text-[#C59B27]" />
          </div>
          <h1 className="font-serif text-3xl tracking-[0.25em] font-bold">THE FAST FOOD</h1>
          <p className="text-xs tracking-[0.35em] text-[#C59B27] uppercase">Premium Food Experience</p>
        </motion.div>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0F0F0F] pb-28 max-w-lg mx-auto relative shadow-2xl">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-xl px-5 py-4 border-b border-[#0F0F0F]/5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
            <span className="font-serif font-extrabold tracking-[0.16em] text-sm">THE FAST FOOD</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#0F0F0F]/65 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-[#C59B27]" />
            <span className="truncate max-w-[200px]">{settings?.deliveryZone || 'Toshkent shahri'}</span>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-2.5 bg-[#F2ECE1] pl-3 pr-2 py-1.5 rounded-full border border-[#0F0F0F]/5"
        >
          <div className="text-right">
            <div className="text-xs font-bold leading-none">{userProfile?.firstName || 'Mehmon'}</div>
            <div className="text-[10px] font-bold text-[#C59B27] mt-0.5">
              {(userProfile?.loyalty?.points || 0).toLocaleString('ru-RU')} ball
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0F0F0F] text-[#FAF7F2] flex items-center justify-center font-serif font-bold text-xs">
            {(userProfile?.firstName || 'M')[0]}
          </div>
        </button>
      </header>

      {/* LIVE ORDER TRACKING BANNER */}
      {activeOrder && (
        <div className="mx-5 mt-4 p-4 rounded-3xl bg-[#0F0F0F] text-[#FAF7F2] shadow-luxury space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C59B27] animate-ping" />
              <span className="text-xs font-bold tracking-wider uppercase text-[#C59B27]">
                JONLI KUZATUV ' BUYURTMA #{activeOrder.orderNumber}
              </span>
            </div>
            <span className="text-xs font-bold">{formatUZS(activeOrder.totalAmount)}</span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {TRACKING_STEPS.map((st, idx) => {
              const currentIdx = TRACKING_STEPS.findIndex((s) => s.key === activeOrder.orderStatus);
              const done = idx <= currentIdx;
              return (
                <div key={st.key} className="space-y-1">
                  <div className={`h-1.5 rounded-full ${done ? 'bg-[#C59B27]' : 'bg-white/20'}`} />
                </div>
              );
            })}
          </div>
          <div className="text-xs text-white/80 font-medium">
            Holat:{' '}
            <strong className="text-white">
              {TRACKING_STEPS.find((s) => s.key === activeOrder.orderStatus)?.label || activeOrder.orderStatus}
            </strong>
          </div>
        </div>
      )}

      {/* TAB 1: HOME */}
      {activeTab === 'home' && (
        <main className="px-5 pt-4 space-y-7">
          {/* Stories */}
          <div className="flex gap-3.5 overflow-x-auto no-scrollbar py-1">
            {STORIES.map((story) => (
              <button
                key={story.id}
                onClick={() => setActiveStory(story)}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <div className="w-[72px] h-[72px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#B91C1C] via-[#C59B27] to-[#0F0F0F]">
                  <img
                    src={story.image}
                    alt={story.title}
                    className="w-full h-full object-cover rounded-full border-2 border-[#FAF7F2]"
                  />
                </div>
                <span className="text-[11px] font-bold tracking-tight text-[#0F0F0F]/85">{story.title}</span>
              </button>
            ))}
          </div>

          {/* Cinematic Hero Banner */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-72 rounded-[32px] overflow-hidden bg-[#0F0F0F] shadow-luxury flex flex-col justify-end p-6 text-white"
          >
            <img
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=90"
              alt="Signature Burger"
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/45 to-transparent" />
            <div className="relative z-10 space-y-2.5">
              <span className="inline-block px-3 py-1 rounded-full bg-[#C59B27] text-[#0F0F0F] text-[10px] font-extrabold tracking-widest uppercase">
                CHEF SIGNATURE
              </span>
              <h2 className="font-serif text-3xl font-bold leading-tight">BUGUN O'ZINGIZNI SIYLANG!</h2>
              <p className="text-xs text-white/80">Sevimli ta'mingizni bir bosishda issiqqina buyurtma qiling.</p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="mt-2 px-6 py-3 rounded-2xl bg-[#B91C1C] text-white font-bold text-xs tracking-wider uppercase shadow-lg"
              >
                BUYURTMA BERISH
              </button>
            </div>
          </motion.section>

          {/* Smart Combo Builder Banner */}
          <section
            onClick={() => setShowComboBuilder(true)}
            className="p-5 rounded-[28px] bg-gradient-to-r from-[#F2ECE1] to-[#E8DEC8] border border-[#C59B27]/30 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#B91C1C] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                SMART COMBO BUILDER
              </div>
              <h3 className="font-serif text-xl font-bold text-[#0F0F0F]">O'z Combo menyuingizni tuzing</h3>
              <p className="text-xs text-[#0F0F0F]/70">Taom + Fri + Ichimlik tanlang va 10% tejang!</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#0F0F0F] text-[#C59B27] flex items-center justify-center shrink-0">
              <Plus className="w-6 h-6" />
            </div>
          </section>

          {/* Popular Products */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl font-bold">Eng mashhur taomlar</h3>
              <button onClick={() => setActiveTab('catalog')} className="text-xs font-bold text-[#B91C1C]">
                Barchasi в†'
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {products.filter((p) => p.isPopular).map((product) => (
                <ProductCard
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
        <main className="px-5 pt-4 space-y-5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#0F0F0F]/45 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Burger, pizza, fri yoki ichimlik izlash..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-[#0F0F0F]/10 text-sm focus:outline-none focus:border-[#0F0F0F]"
            />
          </div>

          {/* Horizontal Category Pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === 'all' ? 'bg-[#0F0F0F] text-[#FAF7F2]' : 'bg-[#F2ECE1] text-[#0F0F0F]'
              }`}
            >
              Barchasi
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
                  selectedCategory === cat.id ? 'bg-[#0F0F0F] text-[#FAF7F2]' : 'bg-[#F2ECE1] text-[#0F0F0F]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sort & Discount Filters */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setOnlyDiscounts(!onlyDiscounts)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${
                onlyDiscounts ? 'bg-[#B91C1C] text-white border-[#B91C1C]' : 'bg-white border-[#0F0F0F]/10'
              }`}
            >
              % Chegirmalar
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'price_asc' | 'price_desc')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-[#0F0F0F]/10"
            >
              <option value="popular">Mashhurlik bo'yicha</option>
              <option value="price_asc">Arzonroq avval</option>
              <option value="price_desc">Qimmatroq avval</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
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
        <main className="px-5 pt-5 space-y-5">
          <h2 className="font-serif text-2xl font-bold">Sevimli taomlarim</h2>
          {products.filter((p) => favoriteIds.includes(p.id)).length === 0 ? (
            <div className="p-10 text-center bg-[#F2ECE1] rounded-3xl space-y-3">
              <Heart className="w-10 h-10 mx-auto text-[#B91C1C]/60" />
              <p className="text-sm font-semibold text-[#0F0F0F]/70">Hali sevimli taomlar qo'shilmagan</p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-5 py-2.5 rounded-xl bg-[#0F0F0F] text-white text-xs font-bold"
              >
                Menyuni ko'rish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {products
                .filter((p) => favoriteIds.includes(p.id))
                .map((product) => (
                  <ProductCard
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
        <main className="px-5 pt-5 space-y-5">
          <h2 className="font-serif text-2xl font-bold">Savatcha</h2>

          {cart.length === 0 ? (
            <div className="p-10 text-center bg-[#F2ECE1] rounded-3xl space-y-3">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#0F0F0F]/40" />
              <p className="text-sm font-semibold text-[#0F0F0F]/70">Savatchangiz hozircha bo'sh</p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-6 py-3 rounded-2xl bg-[#B91C1C] text-white text-xs font-bold"
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
                    <div key={item.uid} className="p-3.5 rounded-3xl bg-white border border-[#0F0F0F]/5 flex gap-3.5 items-center shadow-sm">
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">
                          {item.isCombo ? `Combo: ${item.product.name}` : item.product.name}
                        </h4>
                        {item.customizations.length > 0 && (
                          <p className="text-[11px] text-[#0F0F0F]/60 truncate">
                            {item.customizations.map((c) => c.name).join(', ')}
                          </p>
                        )}
                        {item.comboDetails && (
                          <p className="text-[11px] text-[#C59B27] font-medium truncate">{item.comboDetails.join(' ' ')}</p>
                        )}
                        <div className="font-extrabold text-sm text-[#B91C1C] mt-1">{formatUZS(unit * item.quantity)}</div>
                      </div>

                      <div className="flex flex-col items-center gap-1 bg-[#F2ECE1] rounded-2xl p-1">
                        <button
                          onClick={() =>
                            setCart((prev) =>
                              prev.map((c) => (c.uid === item.uid ? { ...c, quantity: c.quantity + 1 } : c))
                            )
                          }
                          className="w-7 h-7 flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() =>
                            setCart((prev) =>
                              item.quantity > 1
                                ? prev.map((c) => (c.uid === item.uid ? { ...c, quantity: c.quantity - 1 } : c))
                                : prev.filter((c) => c.uid !== item.uid)
                            )
                          }
                          className="w-7 h-7 flex items-center justify-center"
                        >
                          {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-[#B91C1C]" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SMART UPSELL */}
              <div className="p-4 rounded-3xl bg-[#F2ECE1] space-y-2.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#0F0F0F]/65">
                  Bunga Coca-Cola yoki Fri ham qo'shamizmi?
                </div>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                  {products
                    .filter((p) => ['coca-cola', 'french-fries', 'milkshake'].some((s) => p.name.toLowerCase().includes(s.split('-')[0])))
                    .slice(0, 3)
                    .map((upsell) => (
                      <button
                        key={upsell.id}
                        onClick={() => addToCart(upsell, 1, [])}
                        className="shrink-0 flex items-center gap-2.5 bg-white p-2 pr-3.5 rounded-2xl border border-[#0F0F0F]/10"
                      >
                        <img src={upsell.imageUrl} alt={upsell.name} className="w-10 h-10 rounded-xl object-cover" />
                        <div className="text-left">
                          <div className="text-xs font-bold">{upsell.name}</div>
                          <div className="text-[11px] font-bold text-[#B91C1C]">+ {formatUZS(upsell.price)}</div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Promo & Summary */}
              <div className="p-5 rounded-3xl bg-white border border-[#0F0F0F]/10 space-y-3">
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Promo-kod (masalan: WELCOME15)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#0F0F0F]/10 text-xs uppercase font-bold"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-4 py-2.5 rounded-xl bg-[#0F0F0F] text-white text-xs font-bold"
                  >
                    Qo'llash
                  </button>
                </div>

                {availablePoints > 0 && (
                  <label className="flex items-center justify-between text-xs font-semibold pt-1">
                    <span>Bonus ballarni ishlatish ({availablePoints.toLocaleString('ru-RU')} ball)</span>
                    <input
                      type="checkbox"
                      checked={useBonus}
                      onChange={(e) => setUseBonus(e.target.checked)}
                      className="w-4 h-4 accent-[#B91C1C]"
                    />
                  </label>
                )}

                <div className="space-y-1.5 pt-2 border-t border-[#0F0F0F]/10 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#0F0F0F]/65">Taomlar summasi:</span>
                    <span className="font-bold">{formatUZS(cartSubtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#B91C1C]">
                      <span>Chegirma ({appliedPromo?.code}):</span>
                      <span className="font-bold">-{formatUZS(discountAmount)}</span>
                    </div>
                  )}
                  {bonusApplied > 0 && (
                    <div className="flex justify-between text-[#C59B27]">
                      <span>Bonus ballar:</span>
                      <span className="font-bold">-{formatUZS(bonusApplied)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#0F0F0F]/65">Yetkazib berish:</span>
                    <span className="font-bold">{deliveryFee === 0 ? 'BEPUL' : formatUZS(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold pt-2 border-t border-[#0F0F0F]/10">
                    <span>Jami to'lov:</span>
                    <span>{formatUZS(finalTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-4 rounded-2xl bg-[#B91C1C] text-white font-bold text-sm tracking-wide shadow-luxury"
                >
                  BUYURTMANI RASMIYLASHTIRISH
                </button>
              </div>
            </>
          )}
        </main>
      )}

      {/* TAB 5: PROFILE & LOYALTY */}
      {activeTab === 'profile' && (
        <main className="px-5 pt-5 space-y-6">
          {/* VIP Loyalty Card */}
          <div className="p-6 rounded-[32px] bg-gradient-to-br from-[#0F0F0F] via-[#1C1917] to-[#292524] text-[#FAF7F2] shadow-luxury space-y-4 border border-[#C59B27]/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-[0.2em] text-[#C59B27] uppercase">
                THE FAST FOOD CLUB
              </span>
              <span className="px-3 py-1 rounded-full bg-[#C59B27]/20 text-[#C59B27] text-xs font-extrabold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                {userProfile?.loyalty?.tier || 'BRONZE'}
              </span>
            </div>

            <div>
              <div className="text-xs text-white/60">Mavjud bonus balans</div>
              <div className="font-serif text-3xl font-bold text-white mt-0.5">
                {(userProfile?.loyalty?.points || 0).toLocaleString('ru-RU')} <span className="text-sm text-[#C59B27]">ball</span>
              </div>
            </div>

            <div className="text-xs text-white/70 flex justify-between pt-2 border-t border-white/10">
              <span>Mijoz: {userProfile?.firstName || 'Mehmon'}</span>
              <span>Jami xarid: {formatUZS(userProfile?.loyalty?.totalSpent || 0)}</span>
            </div>
          </div>

          {/* Active Promo Codes */}
          <div className="p-4 rounded-3xl bg-[#F2ECE1] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-[#B91C1C]" />
              <div>
                <div className="text-xs font-extrabold">WELCOME15</div>
                <div className="text-[11px] text-[#0F0F0F]/70">Birinchi buyurtmaga 15% chegirma</div>
              </div>
            </div>
            <button
              onClick={() => {
                setPromoInput('WELCOME15');
                setActiveTab('cart');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#0F0F0F] text-white text-xs font-bold"
            >
              Ishlatish
            </button>
          </div>

          {/* Order History */}
          <div className="space-y-3">
            <h3 className="font-serif text-xl font-bold">Buyurtmalar tarixi</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-[#0F0F0F]/60">Hali buyurtmalar mavjud emas.</p>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="p-4 rounded-3xl bg-white border border-[#0F0F0F]/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm">Buyurtma #{ord.orderNumber}</span>
                    <span className="px-2.5 py-1 rounded-full bg-[#F2ECE1] text-[11px] font-bold">
                      {TRACKING_STEPS.find((s) => s.key === ord.orderStatus)?.label || ord.orderStatus}
                    </span>
                  </div>
                  <div className="text-xs text-[#0F0F0F]/70">
                    {ord.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#0F0F0F]/5">
                    <span className="font-bold text-sm">{formatUZS(ord.totalAmount)}</span>
                    <button
                      onClick={() => {
                        for (const item of ord.items) {
                          const found = products.find((p) => p.id === item.productId);
                          if (found) addToCart(found, item.quantity, []);
                        }
                        setActiveTab('cart');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F0F0F] text-white text-xs font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Yana buyurtma berish
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* CHECKOUT MODAL */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg max-h-[92vh] bg-[#FAF7F2] rounded-t-[32px] p-6 overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold">Buyurtmani tasdiqlash</h2>
                <button onClick={() => setShowCheckout(false)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#F2ECE1]">
                  Yopish
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#0F0F0F]/70">Ismingiz</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full mt-1 px-4 py-3 rounded-2xl bg-white border border-[#0F0F0F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F0F0F]/70">Telefon raqam</label>
                  <div className="relative mt-1">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0F0F0F]/45" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#0F0F0F]/15 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0F0F0F]/70">Yetkazib berish manzili</label>
                    <button onClick={detectLocation} className="inline-flex items-center gap-1 text-xs font-bold text-[#B91C1C]">
                      <Navigation className="w-3.5 h-3.5" />
                      GPS aniqlash
                    </button>
                  </div>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full mt-1 px-4 py-3 rounded-2xl bg-white border border-[#0F0F0F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F0F0F]/70">Kuryer uchun izoh (ixtiyoriy)</label>
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Masalan: 2-kirish yo'lagi, domofon 45"
                    className="w-full mt-1 px-4 py-3 rounded-2xl bg-white border border-[#0F0F0F]/15 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F0F0F]/70">To'lov usuli</label>
                  <div className="grid grid-cols-2 gap-2.5 mt-1.5">
                    <button
                      onClick={() => setPaymentMethod('CASH')}
                      className={`py-3 rounded-2xl text-xs font-bold border ${
                        paymentMethod === 'CASH' ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]' : 'bg-white border-[#0F0F0F]/15'
                      }`}
                    >
                      Naqd pul
                    </button>
                    <button
                      onClick={() => setPaymentMethod('CARD_ON_DELIVERY')}
                      className={`py-3 rounded-2xl text-xs font-bold border ${
                        paymentMethod === 'CARD_ON_DELIVERY'
                          ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                          : 'bg-white border-[#0F0F0F]/15'
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
                className="w-full py-4 rounded-2xl bg-[#B91C1C] text-white font-bold text-sm shadow-luxury disabled:opacity-50"
              >
                {submittingOrder ? 'YUBORILMOQDA...' : `TASDIQLASH - ${formatUZS(finalTotal)}`}
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
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-full max-w-sm bg-[#FAF7F2] rounded-[32px] p-7 text-center space-y-4"
            >
              <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-600" />
              <h3 className="font-serif text-2xl font-bold">Buyurtma qabul qilindi!</h3>
              <p className="text-xs text-[#0F0F0F]/75 leading-relaxed">
                Buyurtma raqamingiz: <strong>#{orderSuccessModal.orderNumber}</strong>. Oshxonamiz taomingizni tayyorlashni boshladi!
              </p>
              <button
                onClick={() => {
                  setOrderSuccessModal(null);
                  setActiveTab('home');
                }}
                className="w-full py-3.5 rounded-2xl bg-[#0F0F0F] text-white font-bold text-xs"
              >
                JONLI KUZATISHGA O'TISH
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRODUCT 3D BOTTOM SHEET */}
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

      {/* SMART COMBO BUILDER */}
      <AnimatePresence>
        {showComboBuilder && (
          <ComboBuilder
            products={products}
            onClose={() => setShowComboBuilder(false)}
            onAddCombo={(main, details, price) => addToCart(main, 1, [], true, details, price)}
          />
        )}
      </AnimatePresence>

      {/* STORY VIEWER */}
      <AnimatePresence>
        {activeStory && (
          <StoryViewer
            story={activeStory}
            onClose={() => setActiveStory(null)}
            onAction={() => setActiveTab('catalog')}
          />
        )}
      </AnimatePresence>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto z-30 bg-[#FAF7F2]/95 backdrop-blur-xl border-t border-[#0F0F0F]/10 px-4 py-2.5 flex items-center justify-around">
        {[
          { id: 'home', icon: Home, label: 'Asosiy' },
          { id: 'catalog', icon: LayoutGrid, label: 'Katalog' },
          { id: 'favorites', icon: Heart, label: 'Sevimli' },
          { id: 'cart', icon: ShoppingBag, label: 'Savatcha', badge: cart.reduce((s, i) => s + i.quantity, 0) },
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
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all ${
                active ? 'text-[#B91C1C]' : 'text-[#0F0F0F]/55'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-[#B91C1C] text-white text-[10px] font-extrabold flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function ProductCard({
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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-[28px] overflow-hidden border border-[#0F0F0F]/5 shadow-sm hover:shadow-luxury transition-shadow"
    >
      <div onClick={onOpen} className="relative h-56 overflow-hidden cursor-pointer bg-[#F2ECE1]">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3.5 left-3.5 flex gap-1.5">
          {discountPct > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-[#B91C1C] text-white text-[11px] font-extrabold">
              -{discountPct}%
            </span>
          )}
          {product.isNew && (
            <span className="px-2.5 py-1 rounded-full bg-[#0F0F0F] text-[#C59B27] text-[11px] font-extrabold">
              YANGI
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-3.5 right-3.5 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#B91C1C] text-[#B91C1C]' : 'text-[#0F0F0F]'}`} />
        </button>

        <span className="absolute bottom-3 left-3.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#C59B27]" />
          {product.preparationTime} daq
        </span>
      </div>

      <div className="p-5 space-y-3">
        <div onClick={onOpen} className="cursor-pointer">
          <h4 className="font-serif text-xl font-bold text-[#0F0F0F]">{product.name}</h4>
          <p className="text-xs text-[#0F0F0F]/65 line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            {product.oldPrice && product.oldPrice > product.price && (
              <div className="text-xs line-through text-[#0F0F0F]/40">{formatUZS(product.oldPrice)}</div>
            )}
            <div className="text-lg font-extrabold text-[#0F0F0F]">{formatUZS(product.price)}</div>
          </div>

          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={onQuickAdd}
            className="px-5 py-3 rounded-2xl bg-[#0F0F0F] text-[#FAF7F2] font-bold text-xs tracking-wide flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4 text-[#C59B27]" />
            QO'SHISH
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
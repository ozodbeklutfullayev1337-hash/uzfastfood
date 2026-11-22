import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Layers,
  Tag,
  Users,
  Store,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Trash2,
  Download,
  TrendingUp,
  Clock,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'https://uzfastfood.onrender.com/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'https://uzfastfood.onrender.com';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Qabul qilindi', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'CONFIRMED', label: 'Tasdiqlandi', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'PREPARING', label: 'Tayyorlanmoqda', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'READY', label: 'Tayyor', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { value: 'COURIER_ASSIGNED', label: 'Kuryerda', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { value: 'ON_THE_WAY', label: 'Yo’lda', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'DELIVERED', label: 'Yetkazildi', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'CANCELLED', label: 'Bekor qilindi', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
];

function fmt(n: number) {
  return `${Math.round(n || 0).toLocaleString('ru-RU')} so’m`;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tff_admin_token'));
  const [loginInput, setLoginInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('admin12345');
  const [loginError, setLoginError] = useState('');

  const [tab, setTab] = useState<'dashboard' | 'orders' | 'products' | 'categories' | 'promotions' | 'customers' | 'branches' | 'settings'>('dashboard');

  const [dashboardData, setDashboardData] = useState<{
    metrics: Record<string, number>;
    topProducts: Array<{ name: string; count: number; revenue: number }>;
    chartData: Array<{ date: string; revenue: number; orders: number }>;
  } | null>(null);

  const [orders, setOrders] = useState<Array<any>>([]);
  const [products, setProducts] = useState<Array<any>>([]);
  const [categories, setCategories] = useState<Array<any>>([]);
  const [promotions, setPromotions] = useState<Array<any>>([]);
  const [customers, setCustomers] = useState<Array<any>>([]);
  const [branches, setBranches] = useState<Array<any>>([]);
  const [settings, setSettings] = useState<any>(null);

  // Forms
  const [newProd, setNewProd] = useState({ name: '', description: '', imageUrl: '', categoryId: '', price: '', oldPrice: '', preparationTime: '15', isPopular: true });
  const [newCat, setNewCat] = useState({ name: '', description: '', imageUrl: '', sortOrder: '1' });
  const [newPromo, setNewPromo] = useState({ code: '', title: '', discountType: 'PERCENTAGE', discountValue: '10', minOrderAmount: '50000' });
  const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '+998 90 755 31 23', workingHours: '10:00 - 03:00' });

  const adminFetch = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_URL}/admin${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) {
      setToken(null);
      localStorage.removeItem('tff_admin_token');
      throw new Error('Sessiya tugadi');
    }
    return res.json();
  };

  const loadAll = async () => {
    if (!token) return;
    try {
      const [dash, ord, prod, cat, promo, cust, br, sett] = await Promise.all([
        adminFetch('/dashboard'),
        adminFetch('/orders'),
        adminFetch('/products'),
        adminFetch('/categories'),
        adminFetch('/promotions'),
        adminFetch('/customers'),
        adminFetch('/branches'),
        adminFetch('/settings'),
      ]);
      setDashboardData(dash);
      setOrders(ord.orders || []);
      setProducts(prod.products || []);
      setCategories(cat.categories || []);
      setPromotions(promo.promotions || []);
      setCustomers(cust.customers || []);
      setBranches(br.branches || []);
      setSettings(sett.settings || null);
      if (cat.categories?.length && !newProd.categoryId) {
        setNewProd((p) => ({ ...p, categoryId: cat.categories[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAll();
    if (!token) return;
    const socket = io(WS_URL);
    socket.on('order:created', () => loadAll());
    socket.on('order:updated', () => loadAll());
    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput, password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik');
      localStorage.setItem('tff_admin_token', data.token);
      setToken(data.token);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Kirishda xatolik');
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Buyurtma #', 'Mijoz', 'Telefon', 'Summa', 'Manzil', 'Holat', 'Sana'],
      ...orders.map((o) => [
        o.orderNumber,
        o.customerName,
        o.phone,
        o.totalAmount,
        `"${o.address}"`,
        o.orderStatus,
        new Date(o.createdAt).toLocaleString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `the-fast-food-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0C0E] p-4">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-[#14161A] border border-white/10 rounded-3xl p-8 space-y-5 shadow-2xl">
          <div>
            <div className="text-xs font-extrabold tracking-[0.25em] text-[#C59B27] uppercase">THE FAST FOOD</div>
            <h1 className="text-2xl font-bold mt-1">Admin Command Center</h1>
            <p className="text-xs text-slate-400 mt-1">Boshqaruv paneliga kirish uchun ma’lumotlarni kiriting</p>
          </div>
          {loginError && <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">{loginError}</div>}
          <div>
            <label className="text-xs font-semibold text-slate-400">Login</label>
            <input
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-[#0B0C0E] border border-white/10 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400">Parol</label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-[#0B0C0E] border border-white/10 text-sm"
            />
          </div>
          <button type="submit" className="w-full py-3.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] font-bold text-sm transition-colors">
            TIZIMGA KIRISH
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0B0C0E] text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111317] border-r border-white/10 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div>
            <div className="text-xs font-extrabold tracking-[0.22em] text-[#C59B27]">THE FAST FOOD</div>
            <div className="text-lg font-extrabold mt-0.5">Executive Panel</div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard & Analitika', icon: LayoutDashboard },
              { id: 'orders', label: `Buyurtmalar (${orders.length})`, icon: ShoppingBag },
              { id: 'products', label: 'Mahsulotlar CRUD', icon: UtensilsCrossed },
              { id: 'categories', label: 'Kategoriyalar', icon: Layers },
              { id: 'promotions', label: 'Promo-kodlar', icon: Tag },
              { id: 'customers', label: 'Mijozlar bazasi', icon: Users },
              { id: 'branches', label: 'Filiallar', icon: Store },
              { id: 'settings', label: 'Yetkazib berish & Sozlama', icon: SettingsIcon },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id as typeof tab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    tab === item.id ? 'bg-[#B91C1C] text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('tff_admin_token');
            setToken(null);
          }}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10"
        >
          <LogOut className="w-4 h-4" />
          Chiqish
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        {/* 1. DASHBOARD */}
        {tab === 'dashboard' && dashboardData && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold">Biznes ko’rsatkichlari</h1>
                <p className="text-xs text-slate-400">Real vaqt rejimidagi PostgreSQL ma’lumotlari</p>
              </div>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold"
              >
                <Download className="w-4 h-4 text-[#C59B27]" />
                CSV Hisobot yuklash
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Bugungi savdo', val: fmt(dashboardData.metrics.todayRevenue), icon: DollarSign, color: 'text-emerald-400' },
                { label: 'Umumiy daromad', val: fmt(dashboardData.metrics.totalRevenue), icon: TrendingUp, color: 'text-[#C59B27]' },
                { label: 'Jami buyurtmalar', val: `${dashboardData.metrics.totalOrders} ta`, icon: ShoppingBag, color: 'text-blue-400' },
                { label: 'O’rtacha chek', val: fmt(dashboardData.metrics.avgOrderValue), icon: CheckCircle2, color: 'text-purple-400' },
                { label: 'Yangi buyurtmalar', val: `${dashboardData.metrics.pendingOrders} ta`, icon: Clock, color: 'text-amber-400' },
                { label: 'Tayyorlanmoqda', val: `${dashboardData.metrics.preparingOrders} ta`, icon: UtensilsCrossed, color: 'text-orange-400' },
                { label: 'Yetkazilgan', val: `${dashboardData.metrics.deliveredOrders} ta`, icon: CheckCircle2, color: 'text-emerald-400' },
                { label: 'Mijozlar soni', val: `${dashboardData.metrics.customersCount} nafar`, icon: Users, color: 'text-cyan-400' },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="p-5 rounded-2xl bg-[#14161A] border border-white/10">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{card.label}</span>
                      <Icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                    <div className="text-xl font-extrabold mt-2">{card.val}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-2xl bg-[#14161A] border border-white/10">
                <h3 className="text-sm font-bold mb-4">So’nggi 7 kunlik daromad dinamikasi</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262930" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#14161A', borderColor: '#334155' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#C59B27" fill="#C59B27" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#14161A] border border-white/10">
                <h3 className="text-sm font-bold mb-4">Top sotilgan mahsulotlar</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.topProducts} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={110} stroke="#cbd5e1" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#14161A', borderColor: '#334155' }} />
                      <Bar dataKey="count" fill="#B91C1C" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 2. ORDERS */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold">Barcha buyurtmalar</h1>
            <div className="bg-[#14161A] border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 uppercase">
                  <tr>
                    <th className="p-4">#</th>
                    <th className="p-4">Mijoz</th>
                    <th className="p-4">Taomlar</th>
                    <th className="p-4">Summa</th>
                    <th className="p-4">Manzil</th>
                    <th className="p-4">Holatni o’zgartirish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-extrabold text-[#C59B27]">#{ord.orderNumber}</td>
                      <td className="p-4">
                        <div className="font-bold">{ord.customerName}</div>
                        <div className="text-slate-400">{ord.phone}</div>
                      </td>
                      <td className="p-4 max-w-xs">
                        {ord.items.map((i: any, idx: number) => (
                          <div key={idx}>
                            {i.name} <strong>x{i.quantity}</strong>
                          </div>
                        ))}
                      </td>
                      <td className="p-4 font-bold">{fmt(ord.totalAmount)}</td>
                      <td className="p-4 max-w-xs text-slate-300">{ord.address}</td>
                      <td className="p-4">
                        <select
                          value={ord.orderStatus}
                          onChange={async (e) => {
                            await adminFetch(`/orders/${ord.id}/status`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: e.target.value }),
                            });
                            loadAll();
                          }}
                          className="px-3 py-2 rounded-xl bg-[#0B0C0E] border border-white/15 font-bold"
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. PRODUCTS CRUD */}
        {tab === 'products' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold">Mahsulotlarni boshqarish</h1>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await adminFetch('/products', { method: 'POST', body: JSON.stringify(newProd) });
                setNewProd({ ...newProd, name: '', description: '', imageUrl: '', price: '', oldPrice: '' });
                loadAll();
              }}
              className="p-5 rounded-2xl bg-[#14161A] border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              <input
                required
                placeholder="Mahsulot nomi"
                value={newProd.name}
                onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs"
              />
              <select
                value={newProd.categoryId}
                onChange={(e) => setNewProd({ ...newProd, categoryId: e.target.value })}
                className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                placeholder="Narxi (so’m)"
                value={newProd.price}
                onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs"
              />
              <input
                required
                placeholder="Rasm URL (https://...)"
                value={newProd.imageUrl}
                onChange={(e) => setNewProd({ ...newProd, imageUrl: e.target.value })}
                className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs"
              />
              <input
                required
                placeholder="Qisqa tarkibi"
                value={newProd.description}
                onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs"
              />
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#B91C1C] font-bold text-xs flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Mahsulot qo’shish
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-[#14161A] border border-white/10 flex gap-3.5 items-center">
                  <img src={p.imageUrl} alt={p.name} className="w-16 h-16 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{p.name}</div>
                    <div className="text-xs text-[#C59B27] font-bold">{fmt(p.price)}</div>
                    <div className="text-[11px] text-slate-400">{p.category?.name}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await adminFetch(`/products/${p.id}`, { method: 'DELETE' });
                      loadAll();
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. CATEGORIES */}
        {tab === 'categories' && (
          <div className="space-y-5">
            <h1 className="text-2xl font-extrabold">Kategoriyalar</h1>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await adminFetch('/categories', { method: 'POST', body: JSON.stringify(newCat) });
                setNewCat({ name: '', description: '', imageUrl: '', sortOrder: '1' });
                loadAll();
              }}
              className="p-5 rounded-2xl bg-[#14161A] border border-white/10 grid grid-cols-1 md:grid-cols-4 gap-3"
            >
              <input required placeholder="Kategoriya nomi" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              <input required placeholder="Rasm URL" value={newCat.imageUrl} onChange={(e) => setNewCat({ ...newCat, imageUrl: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              <input placeholder="Tavsif" value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#B91C1C] font-bold text-xs">Qo’shish</button>
            </form>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-[#14161A] border border-white/10 flex items-center justify-between">
                  <span className="font-bold text-sm">{c.name}</span>
                  <button
                    onClick={async () => {
                      await adminFetch(`/categories/${c.id}`, { method: 'DELETE' });
                      loadAll();
                    }}
                    className="text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. PROMOTIONS */}
        {tab === 'promotions' && (
          <div className="space-y-5">
            <h1 className="text-2xl font-extrabold">Promo-kodlar va Aksiyalar</h1>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await adminFetch('/promotions', { method: 'POST', body: JSON.stringify(newPromo) });
                setNewPromo({ code: '', title: '', discountType: 'PERCENTAGE', discountValue: '10', minOrderAmount: '50000' });
                loadAll();
              }}
              className="p-5 rounded-2xl bg-[#14161A] border border-white/10 grid grid-cols-1 md:grid-cols-5 gap-3"
            >
              <input required placeholder="KOD (VIP20)" value={newPromo.code} onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs uppercase" />
              <input required placeholder="Sarlavha" value={newPromo.title} onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              <select value={newPromo.discountType} onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs">
                <option value="PERCENTAGE">Foiz (%)</option>
                <option value="FIXED">Summa (so’m)</option>
              </select>
              <input required type="number" placeholder="Qiymati" value={newPromo.discountValue} onChange={(e) => setNewPromo({ ...newPromo, discountValue: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#B91C1C] font-bold text-xs">Yaratish</button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {promotions.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-[#14161A] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[#C59B27]">{p.code}</div>
                    <div className="text-xs text-slate-300">{p.title}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await adminFetch(`/promotions/${p.id}/toggle`, { method: 'PATCH' });
                      loadAll();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${p.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {p.isActive ? 'Faol' : 'O’chirilgan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. CUSTOMERS */}
        {tab === 'customers' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold">Mijozlar bazasi ({customers.length})</h1>
            <div className="bg-[#14161A] border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400">
                  <tr>
                    <th className="p-4">Ism</th>
                    <th className="p-4">Telegram ID</th>
                    <th className="p-4">Telefon</th>
                    <th className="p-4">Sodiqlik darajasi</th>
                    <th className="p-4">Bonus balans</th>
                    <th className="p-4">Buyurtmalar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="p-4 font-bold">{c.firstName}</td>
                      <td className="p-4 text-slate-400">{c.telegramId}</td>
                      <td className="p-4">{c.phone || '-'}</td>
                      <td className="p-4 text-[#C59B27] font-bold">{c.loyalty?.tier || 'BRONZE'}</td>
                      <td className="p-4">{(c.loyalty?.points || 0).toLocaleString('ru-RU')} ball</td>
                      <td className="p-4">{c.orders?.length || 0} ta</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. BRANCHES */}
        {tab === 'branches' && (
          <div className="space-y-5">
            <h1 className="text-2xl font-extrabold">Filiallar</h1>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await adminFetch('/branches', { method: 'POST', body: JSON.stringify(newBranch) });
                setNewBranch({ name: '', address: '', phone: '+998 90 755 31 23', workingHours: '10:00 - 03:00' });
                loadAll();
              }}
              className="p-5 rounded-2xl bg-[#14161A] border border-white/10 grid grid-cols-1 md:grid-cols-4 gap-3"
            >
              <input required placeholder="Filial nomi" value={newBranch.name} onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              <input required placeholder="Manzil" value={newBranch.address} onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              <input required placeholder="Telefon" value={newBranch.phone} onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })} className="px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#B91C1C] font-bold text-xs">Filial qo’shish</button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((b) => (
                <div key={b.id} className="p-5 rounded-2xl bg-[#14161A] border border-white/10 space-y-1">
                  <div className="font-bold text-base">{b.name}</div>
                  <div className="text-xs text-slate-400">{b.address}</div>
                  <div className="text-xs text-[#C59B27]">{b.phone} ' {b.workingHours}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. SETTINGS */}
        {tab === 'settings' && settings && (
          <div className="max-w-xl space-y-4">
            <h1 className="text-2xl font-extrabold">Yetkazib berish va Kompaniya sozlamalari</h1>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await adminFetch('/settings', { method: 'PUT', body: JSON.stringify(settings) });
                alert('Sozlamalar saqlandi!');
                loadAll();
              }}
              className="p-6 rounded-2xl bg-[#14161A] border border-white/10 space-y-3"
            >
              <div>
                <label className="text-xs text-slate-400">Yetkazib berish hududi</label>
                <input value={settings.deliveryZone} onChange={(e) => setSettings({ ...settings, deliveryZone: e.target.value })} className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Yetkazib berish narxi (so’m)</label>
                <input type="number" value={settings.deliveryFee} onChange={(e) => setSettings({ ...settings, deliveryFee: e.target.value })} className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Bepul yetkazish chegarasi (so’m)</label>
                <input type="number" value={settings.freeDeliveryThreshold} onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: e.target.value })} className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Keshbek foizi (%)</label>
                <input type="number" value={settings.cashbackPercent} onChange={(e) => setSettings({ ...settings, cashbackPercent: e.target.value })} className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-[#B91C1C] font-bold text-xs">SAQLASH</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
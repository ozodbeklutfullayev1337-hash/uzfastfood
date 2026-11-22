import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { ChefHat, Clock, CheckCircle2, Flame } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

interface KitchenOrder {
  id: string;
  orderNumber: number;
  orderStatus: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY';
  comment?: string | null;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    customizations?: Array<{ name: string }>;
    comboDetails?: string[];
  }>;
}

export default function App() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);

  const loadOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/kitchen/orders`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOrders();
    const socket = io(WS_URL);
    socket.on('order:created', () => loadOrders());
    socket.on('order:updated', () => loadOrders());
    return () => {
      socket.disconnect();
    };
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API_URL}/admin/kitchen/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadOrders();
  };

  return (
    <div className="min-h-screen bg-[#090A0D] text-white p-6 space-y-6">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#B91C1C] flex items-center justify-center">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-extrabold tracking-[0.2em] text-[#C59B27]">THE FAST FOOD</div>
            <h1 className="text-2xl font-extrabold">KITCHEN DISPLAY SYSTEM (KDS)</h1>
          </div>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold">
          Faol buyurtmalar: <span className="text-[#C59B27]">{orders.length} ta</span>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="h-[65vh] flex flex-col items-center justify-center text-slate-500 space-y-3">
          <CheckCircle2 className="w-16 h-16 text-emerald-500/40" />
          <div className="text-xl font-bold">Hozircha navbatda buyurtmalar yo‘q</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((order) => {
            const isPreparing = order.orderStatus === 'PREPARING';
            const isReady = order.orderStatus === 'READY';
            return (
              <div
                key={order.id}
                className={`rounded-3xl p-5 border-2 flex flex-col justify-between space-y-4 ${
                  isReady
                    ? 'bg-emerald-950/30 border-emerald-500'
                    : isPreparing
                    ? 'bg-amber-950/30 border-amber-500'
                    : 'bg-[#14161B] border-[#B91C1C]'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-2xl font-black text-[#C59B27]">#{order.orderNumber}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-black/40 space-y-1">
                        <div className="flex items-center justify-between text-base font-extrabold">
                          <span>{item.name}</span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#B91C1C] text-white">x{item.quantity}</span>
                        </div>
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="text-xs text-amber-300 font-semibold">
                            + {item.customizations.map((c) => c.name).join(', ')}
                          </div>
                        )}
                        {item.comboDetails && item.comboDetails.length > 0 && (
                          <div className="text-xs text-cyan-300">{item.comboDetails.join(' • ')}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.comment && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 font-semibold">
                      Izoh: {order.comment}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  {!isPreparing && !isReady && (
                    <button
                      onClick={() => updateStatus(order.id, 'PREPARING')}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 text-black font-extrabold text-sm flex items-center justify-center gap-2"
                    >
                      <Flame className="w-5 h-5" /> TAYYORLASHNI BOSHLASH
                    </button>
                  )}
                  {isPreparing && (
                    <button
                      onClick={() => updateStatus(order.id, 'READY')}
                      className="w-full py-3.5 rounded-2xl bg-emerald-500 text-black font-extrabold text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> TAYYOR BO‘LDI
                    </button>
                  )}
                  {isReady && (
                    <div className="w-full py-3 text-center rounded-2xl bg-emerald-500/20 text-emerald-300 font-extrabold text-sm">
                      KURYERNI KUTMOQDA
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
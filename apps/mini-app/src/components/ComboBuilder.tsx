import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, X } from 'lucide-react';
import { ProductItem } from './ProductSheet';
import { formatUZS, haptic } from '../lib/api';

interface ComboBuilderProps {
  products: ProductItem[];
  onClose: () => void;
  onAddCombo: (mainProduct: ProductItem, comboDetails: string[], totalDiscountedPrice: number) => void;
}

export const ComboBuilder: React.FC<ComboBuilderProps> = ({ products, onClose, onAddCombo }) => {
  const burgers = products.filter((p) => p.price >= 26000 && p.price <= 85000);
  const fries = products.filter((p) => p.name.toLowerCase().includes('fries') || p.name.toLowerCase().includes(\'nuggets'));
  const drinks = products.filter((p) => p.price <= 15000 || p.name.toLowerCase().includes('milkshake'));

  const [selectedMain, setSelectedMain] = useState<ProductItem | null>(burgers[0] || products[0] || null);
  const [selectedSide, setSelectedSide] = useState<ProductItem | null>(fries[0] || null);
  const [selectedDrink, setSelectedDrink] = useState<ProductItem | null>(drinks[0] || null);
  const [sauce, setSauce] = useState('Issiq pishloqli sous');

  const rawTotal = (selectedMain?.price || 0) + (selectedSide?.price || 0) + (selectedDrink?.price || 0);
  const finalPrice = Math.round(rawTotal * 0.9); // 10% Combo chegirma

  const handleConfirm = () => {
    if (!selectedMain) return;
    haptic('heavy');
    const details = [
      `Asosiy: ${selectedMain.name}`,
      selectedSide ? `Garir: ${selectedSide.name}` : '',
      selectedDrink ? `Ichimlik: ${selectedDrink.name}` : '',
      `Sous: ${sauce}`,
    ].filter(Boolean);

    onAddCombo(selectedMain, details, finalPrice);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end justify-center"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="w-full max-w-lg max-h-[92vh] bg-[#FAF7F2] rounded-t-[32px] flex flex-col overflow-hidden"
      >
        <div className="p-5 bg-[#0F0F0F] text-[#FAF7F2] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[#C59B27] text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              SMART COMBO BUILDER • -10% TEJAMKORLIK
            </div>
            <h2 className="font-serif text-2xl font-bold mt-0.5">O’z Combo menyuingizni tuzing</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 pb-28">
          {/* 1. Asosiy taom */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F0F0F]/60">1. Asosiy taomni tanlang</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {burgers.slice(0, 6).map((item) => {
                const active = selectedMain?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMain(item)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      active ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]' : \'bg-white border-[#0F0F0F]/10'
                    }`}
                  >
                    <img src={item.imageUrl} alt={item.name} className="w-full h-20 object-cover rounded-xl mb-2" />
                    <div className="font-bold text-xs line-clamp-1">{item.name}</div>
                    <div className="text-[11px] text-[#C59B27] font-semibold mt-0.5">{formatUZS(item.price)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Fri / Snack */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F0F0F]/60">2. Fri yoki Snacks</h3>
            <div className="grid grid-cols-3 gap-2">
              {fries.map((item) => {
                const active = selectedSide?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSide(item)}
                    className={`p-2.5 rounded-2xl border text-left ${
                      active ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]' : \'bg-white border-[#0F0F0F]/10'
                    }`}
                  >
                    <div className="font-bold text-xs line-clamp-1">{item.name}</div>
                    <div className="text-[11px] text-[#C59B27] mt-1">{formatUZS(item.price)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Ichimlik */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F0F0F]/60">3. Ichimlik tanlang</h3>
            <div className="grid grid-cols-2 gap-2">
              {drinks.map((item) => {
                const active = selectedDrink?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedDrink(item)}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      active ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]' : \'bg-white border-[#0F0F0F]/10'
                    }`}
                  >
                    <span className="font-bold text-xs">{item.name}</span>
                    {active && <Check className="w-4 h-4 text-[#C59B27]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Sous */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F0F0F]/60">4. Maxsus sous (Bepul)</h3>
            <div className="flex flex-wrap gap-2">
              {['Issiq pishloqli sous', \'Firmali BBQ sous', \'Trufelli mayonez', \'Achchiq Chili'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSauce(s)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold ${
                    sauce === s ? 'bg-[#B91C1C] text-white' : \'bg-[#F2ECE1] text-[#0F0F0F]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#FAF7F2] border-t border-[#0F0F0F]/10">
          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl bg-[#B91C1C] text-white font-bold text-sm shadow-luxury flex items-center justify-between px-6"
          >
            <span>COMBO QO’SHISH (-10%)</span>
            <div className="text-right">
              <span className="line-through text-xs text-white/60 mr-2">{formatUZS(rawTotal)}</span>
              <span>{formatUZS(finalPrice)}</span>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
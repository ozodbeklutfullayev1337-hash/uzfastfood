import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Heart, Clock, Flame, Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { formatUZS, haptic } from '../lib/api';

export interface CustomizationOpt {
  id: string;
  name: string;
  price: number;
}

export interface ProductItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  ingredients: string[];
  calories?: number | null;
  imageUrl: string;
  categoryId: string;
  price: number;
  oldPrice?: number | null;
  isPopular?: boolean;
  isNew?: boolean;
  preparationTime: number;
  customizations?: CustomizationOpt[] | null;
}

interface ProductSheetProps {
  product: ProductItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
  onAddToCart: (product: ProductItem, quantity: number, customizations: CustomizationOpt[]) => void;
}

export const ProductSheet: React.FC<ProductSheetProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOpts, setSelectedOpts] = useState<CustomizationOpt[]>([]);

  const options: CustomizationOpt[] = Array.isArray(product.customizations)
    ? product.customizations
    : [
        { id: 'cheese', name: "Qo'shimcha Cheddar pishloq", price: 5000 },
        { id: 'sauce', name: 'Maxsus trufel sousi', price: 4000 },
        { id: 'jalapeno', name: 'Xalapenyo qalampiri', price: 3000 },
      ];

  const toggleOption = (opt: CustomizationOpt) => {
    haptic('light');
    setSelectedOpts((prev) =>
      prev.some((o) => o.id === opt.id) ? prev.filter((o) => o.id !== opt.id) : [...prev, opt]
    );
  };

  const extrasTotal = selectedOpts.reduce((s, o) => s + o.price, 0);
  const totalPrice = (product.price + extrasTotal) * quantity;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end justify-center"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] bg-[#0B0B0F] border-t border-[#D4AF37]/30 rounded-t-[34px] flex flex-col overflow-hidden shadow-luxury"
      >
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
          {/* Top Image Header */}
          <div className="relative h-64 w-full bg-[#121216]">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/25 to-black/40" />

            {/* Top Action Buttons */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
              <button
                onClick={onClose}
                aria-label="Yopish"
                className="w-10 h-10 rounded-full bg-black/65 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>

              <button
                onClick={() => onToggleFavorite(product.id)}
                aria-label="Sevimli"
                className="w-10 h-10 rounded-full bg-black/65 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#E11D48] text-[#E11D48]' : 'text-white'}`} />
              </button>
            </div>

            {/* Time & Calories Badges */}
            <div className="absolute bottom-3 left-5 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                {product.preparationTime} daqiqa
              </span>
              {product.calories && (
                <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#E11D48]" />
                  {product.calories} kkal
                </span>
              )}
            </div>
          </div>

          {/* Details Body */}
          <div className="px-5 pt-3 space-y-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-3xl font-bold text-white leading-tight">{product.name}</h2>
                <div className="text-right shrink-0">
                  {product.oldPrice && product.oldPrice > product.price && (
                    <div className="text-xs line-through text-zinc-500">{formatUZS(product.oldPrice)}</div>
                  )}
                  <div className="text-lg font-extrabold text-[#D4AF37]">{formatUZS(product.price)}</div>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mt-2">{product.description}</p>
            </div>

            {/* Ingredients */}
            {product.ingredients && product.ingredients.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-extrabold tracking-[0.2em] text-zinc-500 uppercase">TARKIBI</div>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-medium text-zinc-200"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons / Customizations */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#D4AF37] uppercase">
                QO'SHIMCHA MASALLIQLAR
              </div>
              <div className="space-y-2">
                {options.map((opt) => {
                  const active = selectedOpts.some((o) => o.id === opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(opt)}
                      className={`w-full p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                        active
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-white'
                          : 'bg-white/[0.03] border-white/10 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            active ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'border-zinc-600'
                          }`}
                        >
                          {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold">{opt.name}</span>
                      </div>
                      <span className="text-xs font-extrabold text-[#D4AF37]">+{formatUZS(opt.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action Bar (No Overlap!) */}
        <div className="p-4 bg-[#0D0D12] border-t border-white/10 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 bg-white/[0.06] border border-white/10 rounded-2xl px-3 py-2.5">
            <button
              onClick={() => {
                haptic('light');
                setQuantity((q) => Math.max(1, q - 1));
              }}
              className="w-7 h-7 flex items-center justify-center text-zinc-300 active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold text-white min-w-[18px] text-center">{quantity}</span>
            <button
              onClick={() => {
                haptic('light');
                setQuantity((q) => q + 1);
              }}
              className="w-7 h-7 flex items-center justify-center text-white active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              onAddToCart(product, quantity, selectedOpts);
              onClose();
            }}
            className="flex-1 py-3.5 px-4 rounded-2xl btn-gold font-extrabold text-xs tracking-wider uppercase flex items-center justify-between shadow-lg"
          >
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              QO'SHISH
            </span>
            <span className="text-sm font-extrabold">{formatUZS(totalPrice)}</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

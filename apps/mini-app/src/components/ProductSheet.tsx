import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Flame, Check, Plus, Minus, Heart } from 'lucide-react';
import { formatUZS, haptic } from '../lib/api';

export interface CustomizationOpt {
  id: string;
  name: string;
  price: number;
  group: string;
}

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  calories?: number | null;
  imageUrl: string;
  price: number;
  oldPrice?: number | null;
  preparationTime: number;
  isPopular?: boolean;
  isNew?: boolean;
  categoryId: string;
  customizations?: CustomizationOpt[] | null;
}

interface ProductSheetProps {
  product: ProductItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
  onAddToCart: (product: ProductItem, quantity: number, selectedCustomizations: CustomizationOpt[]) => void;
}

export const ProductSheet: React.FC<ProductSheetProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const options = Array.isArray(product.customizations) ? product.customizations : [];
  const grouped = options.reduce<Record<string, CustomizationOpt[]>>((acc, opt) => {
    if (!acc[opt.group]) acc[opt.group] = [];
    acc[opt.group].push(opt);
    return acc;
  }, {});

  const toggleOption = (id: string) => {
    haptic('light');
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectedCustomizations = options.filter((o) => selectedIds.includes(o.id));
  const extrasSum = selectedCustomizations.reduce((sum, o) => sum + o.price, 0);
  const totalPrice = (product.price + extrasSum) * quantity;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] bg-[#09090B] rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Scrollable Content */}
        <div className="overflow-y-auto no-scrollbar pb-28">
          {/* 3D Floating Hero Image */}
          <div className="relative h-72 sm:h-80 bg-[#18181D] overflow-hidden">
            <motion.img
              initial={{ scale: 1.15, rotate: -2 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6 }}
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#FAF7F2] via-transparent to-black/40" />

            <div className="absolute top-4 inset-x-4 flex justify-between items-center">
              <button
                onClick={() => onToggleFavorite(product.id)}
                className="w-11 h-11 rounded-full bg-[#141418]/90 backdrop-blur-md flex items-center justify-center shadow-md"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#E11D48] text-[#E11D48]' : 'text-[#F4F4F5]'}`} />
              </button>
              <button
                onClick={onClose}
                className="w-11 h-11 rounded-full bg-[#18181D]/80 backdrop-blur-md text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-6 -mt-6 relative z-10 space-y-5">
            <div>
              <div className="flex items-center gap-3 text-xs font-semibold text-[#F4F4F5]/65 mb-1.5">
                <span className="inline-flex items-center gap-1 bg-[#141418] px-2.5 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {product.preparationTime} daqiqa
                </span>
                {product.calories && (
                  <span className="inline-flex items-center gap-1 bg-[#141418] px-2.5 py-1 rounded-full">
                    <Flame className="w-3.5 h-3.5 text-[#E11D48]" />
                    {product.calories} kkal
                  </span>
                )}
              </div>
              <h2 className="font-serif text-3xl font-bold text-[#F4F4F5]">{product.name}</h2>
              <p className="text-sm text-[#F4F4F5]/75 mt-2 leading-relaxed">{product.description}</p>
            </div>

            {/* Ingredients */}
            {product.ingredients?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#F4F4F5]/55">Tarkibi</h4>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ing) => (
                    <span key={ing} className="px-3 py-1.5 rounded-xl bg-[#141418] text-xs font-semibold text-[#F4F4F5]">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Customizations */}
            {Object.entries(grouped).map(([groupName, items]) => (
              <div key={groupName} className="space-y-2.5 pt-2 border-t border-white/10/10">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#F4F4F5]/65">{groupName}</h4>
                <div className="space-y-2">
                  {items.map((opt) => {
                    const active = selectedIds.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleOption(opt.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          active
                            ? 'bg-[#18181D] text-[#FAF7F2] border-white/10 shadow-md'
                            : 'bg-[#121216] text-[#F4F4F5] border-white/10/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                              active ? 'bg-[#D4AF37] border-[#D4AF37] text-white' : 'border-white/10/30'
                            }`}
                          >
                            {active && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-sm font-semibold">{opt.name}</span>
                        </div>
                        <span className={`text-xs font-bold ${active ? 'text-[#D4AF37]' : 'text-[#F4F4F5]/70'}`}>
                          {opt.price > 0 ? `+${formatUZS(opt.price)}` : 'Bepul'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky Bottom CTA */}
        <div className="absolute bottom-0 inset-x-0 bg-[#09090B]/95 backdrop-blur-xl border-t border-white/10/10 p-4 flex items-center gap-3">
          <div className="flex items-center bg-[#141418] rounded-2xl p-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-11 rounded-xl flex items-center justify-center text-[#F4F4F5]"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-base">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-11 rounded-xl flex items-center justify-center text-[#F4F4F5]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              haptic('heavy');
              onAddToCart(product, quantity, selectedCustomizations);
              onClose();
            }}
            className="flex-1 py-4 px-5 rounded-2xl bg-[#E11D48] text-white font-bold text-sm tracking-wide shadow-luxury flex items-center justify-center"
          >
            SAVATCHAGA QO’SHISH — {formatUZS(totalPrice)}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
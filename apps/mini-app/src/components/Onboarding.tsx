import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { haptic } from '../lib/api';

interface OnboardingProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    id: 1,
    tag: 'THE FAST FOOD • LUXURY EDITION',
    title: 'Siz xohlagan taʼm — endi yanada yaqin!',
    subtitle: '100% marmar mol go‘shti, mualliflik souslari va har bir luqmada san’at darajasidagi sifat.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=90',
  },
  {
    id: 2,
    tag: 'EXPRESS HOT DELIVERY',
    title: 'Sevimli taomingizni tanlang. Biz uni issiqqina yetkazamiz.',
    subtitle: 'Maxsus termo-qadoqlash texnologiyasi taomning oshxonadan chiqqan lahzadagi ta’mini saqlaydi.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=90',
  },
  {
    id: 3,
    tag: 'UNFORGETTABLE EXPERIENCE',
    title: 'THE FAST FOOD bilan har bir luqma — alohida zavq!',
    subtitle: 'Har bir buyurtmadan bonus ballar yig‘ing va VIP imtiyozlardan foydalaning.',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1200&q=90',
  },
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const current = SLIDES[step];

  const handleNext = () => {
    haptic('medium');
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('tff_onboarding_seen', '1');
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F0F0F] text-[#FAF7F2] flex flex-col justify-between overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img src={current.image} alt={current.title} className="w-full h-full object-cover opacity-65" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/55 to-black/30" />
        </motion.div>
      </AnimatePresence>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C59B27]" />
          <span className="font-serif tracking-[0.2em] text-sm font-bold text-[#FAF7F2]">THE FAST FOOD</span>
        </div>
        <button
          onClick={() => {
            localStorage.setItem('tff_onboarding_seen', '1');
            onComplete();
          }}
          className="text-xs uppercase tracking-widest text-[#FAF7F2]/70 hover:text-white px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md"
        >
          O‘tkazish
        </button>
      </div>

      {/* Bottom Content */}
      <div className="relative z-10 px-6 pb-10 space-y-6">
        {/* Progress Indicator */}
        <div className="flex gap-2">
          {SLIDES.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === step ? 'w-12 bg-[#C59B27]' : idx < step ? 'w-6 bg-[#FAF7F2]/70' : 'w-6 bg-white/25'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45 }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C59B27]/20 border border-[#C59B27]/40 text-[#C59B27] text-[11px] font-bold tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              {current.tag}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight text-white">{current.title}</h1>
            <p className="text-sm sm:text-base text-[#FAF7F2]/80 leading-relaxed">{current.subtitle}</p>
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#B91C1C] to-[#991B1B] text-white font-bold text-base tracking-wide shadow-luxury flex items-center justify-center gap-3 border border-white/15"
        >
          <span>{step === SLIDES.length - 1 ? 'BOSHLA' : 'KEYINGISI'}</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
};
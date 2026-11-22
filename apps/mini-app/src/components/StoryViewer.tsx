import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Flame } from 'lucide-react';

export interface StoryItem {
  id: string;
  title: string;
  badge: string;
  image: string;
  headline: string;
  description: string;
  ctaText: string;
}

interface StoryViewerProps {
  story: StoryItem;
  onClose: () => void;
  onAction: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ story, onClose, onAction }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [story, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#18181D] flex flex-col justify-between"
    >
      <img src={story.image} alt={story.title} className="absolute inset-0 w-full h-full object-cover opacity-75" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-black/60" />

      <div className="relative z-10 p-4 space-y-3">
        <div className="w-full h-1 bg-[#121216]/25 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 6, ease: 'linear' }}
            className="h-full bg-[#D4AF37]"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-[#E11D48] text-white text-xs font-bold uppercase tracking-wider">
            {story.badge}
          </span>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative z-10 p-6 pb-10 space-y-4 text-white">
        <div className="inline-flex items-center gap-1.5 text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
          <Flame className="w-4 h-4" />
          {story.title}
        </div>
        <h2 className="font-serif text-3xl font-bold leading-tight">{story.headline}</h2>
        <p className="text-sm text-white/80 leading-relaxed">{story.description}</p>
        <button
          onClick={() => {
            onClose();
            onAction();
          }}
          className="w-full py-4 rounded-2xl bg-[#09090B] text-[#F4F4F5] font-extrabold text-sm tracking-wide shadow-luxury"
        >
          {story.ctaText}
        </button>
      </div>
    </motion.div>
  );
};
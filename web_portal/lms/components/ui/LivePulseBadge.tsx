import React from 'react';
import { motion } from 'framer-motion';

export const LivePulseBadge: React.FC = () => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulsing ring */}
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-8 h-8 rounded-full bg-[#B22222]"
      />
      {/* Inner solid badge */}
      <div className="relative z-10 flex items-center gap-1.5 bg-gradient-to-r from-[#8B0000] to-[#B22222] px-2.5 py-0.5 rounded-full border border-[#F8F8F8]/20 shadow-[0_0_10px_#B22222]">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="text-white text-xs font-bold tracking-widest">LIVE</span>
      </div>
    </div>
  );
};

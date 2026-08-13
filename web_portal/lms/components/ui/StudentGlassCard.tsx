import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StudentGlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const StudentGlassCard: React.FC<StudentGlassCardProps> = ({ 
  children, 
  className, 
  interactive = false,
  ...props 
}) => {
  return (
    <motion.div
      whileHover={interactive ? { y: -5, scale: 1.02 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        "bg-white/[0.08] backdrop-blur-[18px]",
        "border-[#B22222]/30 shadow-[0_8px_32px_rgba(26,10,10,0.5)]",
        "flex flex-col",
        interactive && "cursor-pointer hover:border-[#D4AF37]/50 hover:shadow-[0_8px_40px_rgba(212,175,55,0.15)]",
        className
      )}
      {...props}
    >
      <div className="relative z-10 w-full h-full p-5">
        {children}
      </div>
      
      {/* Subtle top glare effect for 3D depth */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 pointer-events-none" />
    </motion.div>
  );
};

import React from 'react';
import { motion } from 'framer-motion';
import { StudentGlassCard } from './StudentGlassCard';
import { PlayCircle } from 'lucide-react';

interface CourseProgressCardProps {
  title: string;
  completionPercentage: number;
  thumbnailUrl?: string;
  onClick?: () => void;
}

export const CourseProgressCard: React.FC<CourseProgressCardProps> = ({
  title,
  completionPercentage,
  thumbnailUrl,
  onClick
}) => {
  return (
    <StudentGlassCard interactive onClick={onClick} className="group">
      <div className="relative h-36 w-full rounded-xl overflow-hidden mb-4 bg-gradient-to-tr from-[#1A0A0A] to-[#121212] border border-[#333]">
        {/* Placeholder for thumbnail */}
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayCircle className="text-[#E5E5E5]/50 w-12 h-12" />
          </div>
        )}
        
        {/* Depth Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-80" />
      </div>
      
      <h3 className="font-semibold text-[#F8F8F8] truncate mb-3">{title}</h3>
      
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[#1A0A0A] h-2 rounded-full overflow-hidden border border-[#333]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-[#8B0000] to-[#D4AF37] rounded-full shadow-[0_0_10px_#8B0000]" 
          />
        </div>
        <span className="text-xs font-bold text-[#D4AF37]">{Math.round(completionPercentage)}%</span>
      </div>
    </StudentGlassCard>
  );
};

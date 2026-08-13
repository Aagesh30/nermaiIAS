import React from 'react';
import { FileText, Lock } from 'lucide-react';
import { StudentGlassCard } from './StudentGlassCard';

interface ResourceCardProps {
  title: string;
  type: string;
  isLocked?: boolean;
  onClick?: () => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ title, type, isLocked = false, onClick }) => {
  return (
    <div onClick={() => !isLocked && onClick && onClick()}>
      <StudentGlassCard 
        interactive={!isLocked} 
        className={`flex flex-row items-center gap-4 ${isLocked ? 'border-[#8B0000]/50 opacity-90' : ''}`}
      >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#B22222]/20 to-[#8B0000]/40 flex items-center justify-center border border-[#B22222]/30 shadow-inner">
        {isLocked ? (
          <Lock className="text-[#D4AF37] w-5 h-5 drop-shadow-[0_0_5px_#D4AF37]" />
        ) : (
          <FileText className="text-[#F8F8F8] w-5 h-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium truncate ${isLocked ? 'text-[#E5E5E5]' : 'text-[#F8F8F8]'}`}>
          {title}
        </h4>
        <p className="text-xs text-[#D4AF37] font-semibold mt-0.5 tracking-wider">
          {type.toUpperCase()}
        </p>
      </div>

      {isLocked && (
        <div className="absolute inset-0 bg-[#121212]/40 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none rounded-2xl">
          <span className="bg-[#1A0A0A]/80 border border-[#D4AF37]/50 text-[#D4AF37] px-3 py-1 rounded-full text-xs font-bold tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            PREMIUM
          </span>
        </div>
      )}
    </StudentGlassCard>
    </div>
  );
};

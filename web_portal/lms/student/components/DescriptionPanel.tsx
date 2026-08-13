import React from 'react';

interface DescriptionPanelProps {
  description: string;
}

export const DescriptionPanel: React.FC<DescriptionPanelProps> = ({ description }) => {
  return (
    <div className="mt-6 p-6 rounded-2xl bg-[#1A0808]/80 border border-white/[0.06] shadow-sm">
      <h3 className="text-sm font-bold text-slate-100 mb-2 tracking-wide">
        About this video
      </h3>
      <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
        {description}
      </p>
    </div>
  );
};


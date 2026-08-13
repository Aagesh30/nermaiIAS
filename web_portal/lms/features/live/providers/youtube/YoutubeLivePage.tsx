import React from 'react';

export const YoutubeLivePage: React.FC<{ payload: any }> = ({ payload }) => {
  return (
    <div className="flex items-center justify-center w-full h-full bg-black text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">YouTube Live</h2>
        <p className="text-gray-400">YouTube integration coming soon...</p>
      </div>
    </div>
  );
};

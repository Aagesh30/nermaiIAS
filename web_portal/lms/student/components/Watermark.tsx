import React, { useState, useEffect } from 'react';

interface WatermarkProps {
  userName: string;
  userEmail: string;
}

export const Watermark: React.FC<WatermarkProps> = ({ userName, userEmail }) => {
  const [position, setPosition] = useState({ top: '10%', left: '10%' });
  const [opacity, setOpacity] = useState(0.35);
  const [scale, setScale] = useState(1);
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    // Update time every minute
    const timeInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    // Move watermark randomly every 15-30 seconds
    const moveInterval = setInterval(() => {
      setPosition({
        top: `${Math.floor(Math.random() * 80 + 10)}%`,
        left: `${Math.floor(Math.random() * 80 + 10)}%`,
      });
      setOpacity(Math.random() * 0.3 + 0.15); // Between 0.15 and 0.45
      setScale(Math.random() * 0.3 + 0.85); // Between 0.85 and 1.15
    }, Math.floor(Math.random() * 15000) + 15000);
    return () => clearInterval(moveInterval);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        opacity: opacity,
        transform: `scale(${scale})`,
        transition: 'top 2s ease-in-out, left 2s ease-in-out, opacity 2s ease-in-out, transform 2s ease-in-out',
        zIndex: 9999,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        color: 'white',
        fontWeight: 'bold',
        textShadow: '1px 1px 2px black, 0 0 1em black',
        fontFamily: 'sans-serif'
      }}
    >
      {userName} | {userEmail} | {time}
    </div>
  );
};


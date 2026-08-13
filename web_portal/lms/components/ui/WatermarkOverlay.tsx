import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';

export const WatermarkOverlay: React.FC = () => {
  const { currentUser } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [pos, setPos] = useState({ x: 50, y: 50 });
  
  // Animation state ref to avoid triggering re-renders for every frame
  const animState = useRef({
    x: 50,
    y: 50,
    dx: 1.5,
    dy: 1.5,
    width: 250,
    height: 80,
    containerWidth: 800,
    containerHeight: 600
  });

  const watermarkText = useMemo(() => {
    const email = currentUser?.email || 'student@nermai.com';
    const date = new Date().toLocaleDateString();
    return `NERMAI ACADEMY\n${email}\n${date}`;
  }, [currentUser]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        animState.current.containerWidth = containerRef.current.clientWidth;
        animState.current.containerHeight = containerRef.current.clientHeight;
      }
      if (cardRef.current) {
        animState.current.width = cardRef.current.clientWidth;
        animState.current.height = cardRef.current.clientHeight;
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    let animationId: number;
    
    const animate = () => {
      const state = animState.current;
      
      // Update position
      state.x += state.dx;
      state.y += state.dy;
      
      // Bounce off walls
      if (state.x <= 0) {
        state.x = 0;
        state.dx *= -1;
      } else if (state.x + state.width >= state.containerWidth) {
        state.x = state.containerWidth - state.width;
        state.dx *= -1;
      }
      
      if (state.y <= 0) {
        state.y = 0;
        state.dy *= -1;
      } else if (state.y + state.height >= state.containerHeight) {
        state.y = state.containerHeight - state.height;
        state.dy *= -1;
      }
      
      // Apply position directly to DOM for better performance
      if (cardRef.current) {
        cardRef.current.style.transform = `translate(${state.x}px, ${state.y}px)`;
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleMouseEnter = () => {
    // Jump to a random position when hovered
    const state = animState.current;
    
    const minX = 0;
    const maxX = Math.max(0, state.containerWidth - state.width);
    const minY = 0;
    const maxY = Math.max(0, state.containerHeight - state.height);
    
    // Pick a new position at least a quarter screen away
    let newX = state.x;
    let newY = state.y;
    
    while (Math.abs(newX - state.x) < maxX * 0.25 || Math.abs(newY - state.y) < maxY * 0.25) {
      newX = Math.random() * maxX;
      newY = Math.random() * maxY;
    }
    
    state.x = newX;
    state.y = newY;
    
    // Randomize direction slightly
    state.dx = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random());
    state.dy = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random());
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Let clicks pass through to PDF by default
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      <div
        ref={cardRef}
        onMouseEnter={handleMouseEnter}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'auto', // Capture mouse events just for the card
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          transition: 'transform 0.1s linear',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>
          NERMAI ACADEMY
        </span>
        <span style={{ fontSize: '11px', color: '#333', textAlign: 'center', whiteSpace: 'pre-wrap' }}>
          {currentUser?.email || 'student@nermai.com'}
        </span>
        <span style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
          {new Date().toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

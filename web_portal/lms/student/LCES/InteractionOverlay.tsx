import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface InteractionEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  xOffset: number; // Random horizontal offset for variety
}

interface InteractionOverlayProps {
  liveSessionId: string;
}

export const InteractionOverlay: React.FC<InteractionOverlayProps> = ({ liveSessionId }) => {
  const [events, setEvents] = useState<InteractionEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    
    const connectStream = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const token = localStorage.getItem('token');
      // Using standard SSE endpoint. Authentication may be via cookie or query param if required by backend SSE.
      // Usually, a token query parameter is needed for EventSource if auth is required.
      const url = `/api/v1/interaction/stream/live/${liveSessionId}?token=${token}`;
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'REACTION') {
            const newEvent: InteractionEvent = {
              id: Math.random().toString(36).substring(7),
              type: data.type,
              payload: data.payload,
              timestamp: Date.now(),
              xOffset: Math.random() * 60 - 30, // -30px to +30px
            };
            
            setEvents(prev => [...prev, newEvent]);
            
            // Remove after 3 seconds
            setTimeout(() => {
              setEvents(prev => prev.filter(e => e.id !== newEvent.id));
            }, 3000);
          }
        } catch (e) {
          console.error('Failed to parse interaction SSE', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Interaction SSE error:', error);
        eventSource.close();
        // Automatic reconnection attempt after 5 seconds
        reconnectTimer = setTimeout(connectStream, 5000);
      };
    };

    if (liveSessionId) {
      connectStream();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearTimeout(reconnectTimer);
    };
  }, [liveSessionId]);

  const getReactionIcon = (type: string) => {
    switch (type) {
      case 'HELPFUL': return '👍';
      case 'LIKE': return '🔥';
      case 'LOVE': return '❤️';
      case 'CLAP': return '👏';
      case 'LAUGH': return '😂';
      case 'WOW': return '😲';
      default: return '👍';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 50, x: `calc(10% + ${event.xOffset}px)`, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -200, scale: [0.5, 1.2, 1, 0.8] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="absolute bottom-[20%] text-2xl drop-shadow-lg"
            style={{ left: `calc(80% + ${event.xOffset}px)` }} // Bottom right corner mostly
          >
            {getReactionIcon(event.payload?.reactionType || event.payload)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

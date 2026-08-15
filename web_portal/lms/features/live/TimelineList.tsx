import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { liveEventBusMobile, LiveEventTypeMobile, LiveEventCallback } from '../../student/streaming/LiveEventBusMobile';
import { Clock, Info } from 'lucide-react-native';

interface TimelineEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
}

export const TimelineList: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const handleEvent: LiveEventCallback = (payload) => {
      const typeStr = (payload as any).type || 'EVENT';
      const desc = (payload as any).participant?.name 
        ? `${(payload as any).participant.name} triggered ${typeStr}` 
        : `System triggered ${typeStr}`;
        
      setEvents(prev => {
        const newEvents = [{
          id: Math.random().toString(),
          timestamp: Date.now(),
          type: typeStr,
          description: desc
        }, ...prev];
        return newEvents.slice(0, 500); // Prevent memory bloat
      });
    };

    // Listen to major events
    const s1 = liveEventBusMobile.on(LiveEventTypeMobile.PARTICIPANT_JOINED, handleEvent);
    const s2 = liveEventBusMobile.on(LiveEventTypeMobile.PARTICIPANT_LEFT, handleEvent);
    const s3 = liveEventBusMobile.on(LiveEventTypeMobile.SESSION_CONNECTED, handleEvent);
    const s4 = liveEventBusMobile.on(LiveEventTypeMobile.ATTENDANCE_STARTED, handleEvent);
    
    return () => { s1(); s2(); s3(); s4(); };
  }, []);

  const renderItem = ({ item }: { item: TimelineEvent }) => (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Info size={16} color="#D4AF37" />
      </View>
      <View style={styles.info}>
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.time}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Timeline</Text>
      </View>
      {events.length === 0 ? (
        <View style={styles.empty}>
          <Clock size={24} color="#555" />
          <Text style={styles.emptyText}>No activity recorded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  title: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#777', marginTop: 12 },
  row: { flexDirection: 'row', marginBottom: 16 },
  iconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  desc: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  time: { color: '#777', fontSize: 12, marginTop: 4 }
});

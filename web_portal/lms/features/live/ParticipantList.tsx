import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { liveEventBusMobile, LiveEventTypeMobile, LiveEventCallback } from '../../student/streaming/LiveEventBusMobile';
import { User, Shield, Hand } from 'lucide-react-native';

export const ParticipantList: React.FC = () => {
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    const handleJoined: LiveEventCallback = (payload) => {
      setParticipants(prev => {
        if (prev.find(p => p.id === payload.participant.id)) return prev;
        return [...prev, payload.participant];
      });
    };

    const handleLeft: LiveEventCallback = (payload) => {
      setParticipants(prev => prev.filter(p => p.id !== payload.participant.id));
    };

    const handleHand: LiveEventCallback = (payload) => {
      setParticipants(prev => prev.map(p => 
        p.id === payload.participant.id 
          ? { ...p, isHandRaised: payload.isRaised } 
          : p
      ));
    };

    const sub1 = liveEventBusMobile.on(LiveEventTypeMobile.PARTICIPANT_JOINED, handleJoined);
    const sub2 = liveEventBusMobile.on(LiveEventTypeMobile.PARTICIPANT_LEFT, handleLeft);
    const sub3 = liveEventBusMobile.on(LiveEventTypeMobile.HAND_RAISED, handleHand);

    return () => {
      sub1();
      sub2();
      sub3();
    };
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <User size={16} color="#FFF" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.role}>{item.role}</Text>
      </View>
      {item.isHost && <Shield size={16} color="#D4AF37" />}
      {item.isHandRaised && <Hand size={16} color="#F39C12" />}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Participants ({participants.length})</Text>
      </View>
      {participants.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color="#D4AF37" />
          <Text style={styles.emptyText}>Waiting for participants...</Text>
        </View>
      ) : (
        <FlatList
          data={participants}
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
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  name: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  role: { color: '#777', fontSize: 12, textTransform: 'capitalize', marginTop: 2 }
});

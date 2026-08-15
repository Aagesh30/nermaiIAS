import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ZoomEnvironment } from '../ZoomCompatibility';

interface ZoomStatusCardProps {
  environment: ZoomEnvironment;
  sdkAvailable: boolean;
  message: string;
  requiresAction: string | null;
}

export const ZoomStatusCard: React.FC<ZoomStatusCardProps> = ({
  environment,
  sdkAvailable,
  message,
  requiresAction,
}) => {
  const isError = !sdkAvailable || environment === 'expo-go';
  const headerBg = isError ? '#3d1616' : '#163d1f';
  const headerBorder = isError ? '#ef4444' : '#22c55e';
  const headerText = isError ? '#fca5a5' : '#86efac';

  return (
    <View style={styles.card}>
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <Text style={[styles.headerTitle, { color: headerText }]}>
          {isError ? 'SDK Verification Failed' : 'SDK Verified'}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Environment:</Text>
          <Text style={styles.value}>{environment}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>SDK Native Module:</Text>
          <Text style={[styles.value, { color: sdkAvailable ? '#4ade80' : '#f87171' }]}>
            {sdkAvailable ? 'Loaded Successfully' : 'Not Available'}
          </Text>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>

        {requiresAction && (
          <View style={styles.actionBox}>
            <Text style={styles.actionTitle}>Required Action:</Text>
            <Text style={styles.actionText}>{requiresAction}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  value: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  messageBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#e5e5e5',
    lineHeight: 20,
  },
  actionBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
  },
  actionTitle: {
    fontSize: 13,
    color: '#fca5a5',
    fontWeight: '700',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
});

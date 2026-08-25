import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';

interface RNSkeletonProps {
  style?: ViewStyle | ViewStyle[];
  darkMode?: boolean;
}

export const RNSkeleton: React.FC<RNSkeletonProps> = ({ style, darkMode = false }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const baseBg = darkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.10)';

  return (
    <Animated.View
      style={[
        {
          backgroundColor: baseBg,
          borderRadius: 6,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const RNDashboardSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => {
  return (
    <View style={{ padding: 16, gap: 16, width: '100%' }}>
      {/* Welcome Card Container Skeleton */}
      <View style={{
        padding: 16,
        borderRadius: 12,
        backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
        borderWidth: 1,
        borderColor: darkMode ? "#333" : "#e0e0e0",
        gap: 8
      }}>
        <RNSkeleton darkMode={darkMode} style={{ width: 240, height: 20, borderRadius: 4 }} />
        <RNSkeleton darkMode={darkMode} style={{ width: '95%', height: 14, borderRadius: 4, marginTop: 4 }} />
        <RNSkeleton darkMode={darkMode} style={{ width: '80%', height: 14, borderRadius: 4 }} />
      </View>

      {/* Official Announcements & Notice Board Container Section */}
      <View style={{ width: '100%', gap: 10, marginTop: 4 }}>
        <RNSkeleton darkMode={darkMode} style={{ width: 280, height: 20, borderRadius: 4, marginBottom: 4 }} />
        <RNNoticeCardSkeleton darkMode={darkMode} />
        <RNNoticeCardSkeleton darkMode={darkMode} />
      </View>

      {/* System Alerts & Notifications Container Section */}
      <View style={{ width: '100%', gap: 10, marginTop: 4 }}>
        <RNSkeleton darkMode={darkMode} style={{ width: 220, height: 20, borderRadius: 4, marginBottom: 4 }} />
        <RNSystemAlertCardSkeleton darkMode={darkMode} />
      </View>
    </View>
  );
};

export const RNTableSkeleton: React.FC<{ rows?: number; darkMode?: boolean }> = ({ rows = 6, darkMode }) => {
  return (
    <View style={{ padding: 16, gap: 12, width: '100%' }}>
      {/* Search & Actions Header Skeleton */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 }}>
        <RNSkeleton darkMode={darkMode} style={{ height: 42, flex: 2, borderRadius: 10 }} />
        <RNSkeleton darkMode={darkMode} style={{ height: 42, flex: 1, borderRadius: 10 }} />
      </View>
      {/* Table Header */}
      <RNSkeleton darkMode={darkMode} style={{ height: 44, width: '100%', borderRadius: 8 }} />
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <RNSkeleton key={i} darkMode={darkMode} style={{ height: 50, width: '100%', borderRadius: 8 }} />
      ))}
    </View>
  );
};

export const RNCardGridSkeleton: React.FC<{ count?: number; darkMode?: boolean }> = ({ count = 6, darkMode }) => {
  return (
    <View style={{ padding: 16, gap: 16, width: '100%' }}>
      {/* Search & Filter Header */}
      <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
        <RNSkeleton darkMode={darkMode} style={{ height: 40, flex: 1, borderRadius: 10 }} />
        <RNSkeleton darkMode={darkMode} style={{ height: 40, width: 100, borderRadius: 10 }} />
      </View>
      {/* Cards Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, width: '100%' }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={{ width: '48%', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: darkMode ? '#333' : '#eee' }}>
            <RNSkeleton darkMode={darkMode} style={{ height: 110, width: '100%', borderRadius: 8 }} />
            <RNSkeleton darkMode={darkMode} style={{ height: 20, width: '80%', borderRadius: 4 }} />
            <RNSkeleton darkMode={darkMode} style={{ height: 14, width: '50%', borderRadius: 4 }} />
            <RNSkeleton darkMode={darkMode} style={{ height: 36, width: '100%', borderRadius: 8, marginTop: 4 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

export const RNProfileSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => {
  return (
    <View style={{ padding: 20, gap: 16, width: '100%', alignItems: 'center' }}>
      <RNSkeleton darkMode={darkMode} style={{ width: 100, height: 100, borderRadius: 50 }} />
      <RNSkeleton darkMode={darkMode} style={{ width: 180, height: 24, borderRadius: 6 }} />
      <RNSkeleton darkMode={darkMode} style={{ width: 120, height: 16, borderRadius: 4 }} />
      <View style={{ width: '100%', gap: 12, marginTop: 12 }}>
        <RNSkeleton darkMode={darkMode} style={{ height: 60, width: '100%', borderRadius: 10 }} />
        <RNSkeleton darkMode={darkMode} style={{ height: 60, width: '100%', borderRadius: 10 }} />
        <RNSkeleton darkMode={darkMode} style={{ height: 60, width: '100%', borderRadius: 10 }} />
        <RNSkeleton darkMode={darkMode} style={{ height: 60, width: '100%', borderRadius: 10 }} />
      </View>
    </View>
  );
};

export const RNFormSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => {
  return (
    <View style={{ padding: 20, gap: 16, width: '100%' }}>
      <RNSkeleton darkMode={darkMode} style={{ height: 28, width: '40%', borderRadius: 6 }} />
      <RNSkeleton darkMode={darkMode} style={{ height: 48, width: '100%', borderRadius: 10 }} />
      <RNSkeleton darkMode={darkMode} style={{ height: 48, width: '100%', borderRadius: 10 }} />
      <RNSkeleton darkMode={darkMode} style={{ height: 48, width: '100%', borderRadius: 10 }} />
      <RNSkeleton darkMode={darkMode} style={{ height: 48, width: '100%', borderRadius: 10 }} />
      <RNSkeleton darkMode={darkMode} style={{ height: 44, width: 140, borderRadius: 10, alignSelf: 'flex-end' }} />
    </View>
  );
};

export const RNNoticeCardSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => {
  return (
    <View style={{
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderLeftWidth: 4,
      borderLeftColor: darkMode ? "#333" : "#d0d0d0",
      backgroundColor: darkMode ? "#1e1e1e" : "#f8f9fa",
      gap: 6
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <RNSkeleton darkMode={darkMode} style={{ width: 110, height: 14, borderRadius: 4 }} />
        <RNSkeleton darkMode={darkMode} style={{ width: 60, height: 12, borderRadius: 4 }} />
      </View>
      <RNSkeleton darkMode={darkMode} style={{ width: '65%', height: 18, borderRadius: 4, marginVertical: 2 }} />
      <RNSkeleton darkMode={darkMode} style={{ width: '90%', height: 14, borderRadius: 4 }} />
      <RNSkeleton darkMode={darkMode} style={{ width: 70, height: 22, borderRadius: 6, marginTop: 4 }} />
    </View>
  );
};

export const RNNoticeSectionSkeleton: React.FC<{ darkMode?: boolean; count?: number }> = ({ darkMode, count = 2 }) => {
  return (
    <View style={{ width: '100%', gap: 10, marginTop: 10 }}>
      <RNSkeleton darkMode={darkMode} style={{ width: 260, height: 22, borderRadius: 6, marginBottom: 4 }} />
      {Array.from({ length: count }).map((_, i) => (
        <RNNoticeCardSkeleton key={i} darkMode={darkMode} />
      ))}
    </View>
  );
};

export const RNSystemAlertCardSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => {
  return (
    <View style={{
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderLeftWidth: 4,
      borderLeftColor: darkMode ? "#1565c0" : "#1976d2",
      backgroundColor: darkMode ? "#162338" : "#e3f2fd",
      gap: 6
    }}>
      <RNSkeleton darkMode={darkMode} style={{ width: 130, height: 14, borderRadius: 4 }} />
      <RNSkeleton darkMode={darkMode} style={{ width: '55%', height: 18, borderRadius: 4 }} />
      <RNSkeleton darkMode={darkMode} style={{ width: '75%', height: 14, borderRadius: 4 }} />
      <RNSkeleton darkMode={darkMode} style={{ width: 160, height: 12, borderRadius: 4, marginTop: 4 }} />
    </View>
  );
};

export const RNClosedTestCardSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => {
  return (
    <View style={{
      backgroundColor: darkMode ? "#1e1e1e" : "#fafafa",
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: darkMode ? "#444" : "#e0e0e0"
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <RNSkeleton darkMode={darkMode} style={{ width: '60%', height: 18, borderRadius: 4 }} />
        <RNSkeleton darkMode={darkMode} style={{ width: 55, height: 20, borderRadius: 10 }} />
      </View>
      <RNSkeleton darkMode={darkMode} style={{ width: 160, height: 13, borderRadius: 4, marginTop: 6 }} />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <RNSkeleton darkMode={darkMode} style={{ flex: 1, height: 36, borderRadius: 8 }} />
        <RNSkeleton darkMode={darkMode} style={{ flex: 1, height: 36, borderRadius: 8 }} />
      </View>
    </View>
  );
};

export const RNClosedTestsSectionSkeleton: React.FC<{ darkMode?: boolean; count?: number }> = ({ darkMode, count = 4 }) => {
  return (
    <View style={{
      backgroundColor: darkMode ? "#121212" : "#ffffff",
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: darkMode ? "#2a2a2a" : "#e0e0e0",
      gap: 12
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <RNSkeleton darkMode={darkMode} style={{ width: 10, height: 10, borderRadius: 5 }} />
        <RNSkeleton darkMode={darkMode} style={{ width: 150, height: 20, borderRadius: 6 }} />
      </View>
      {Array.from({ length: count }).map((_, i) => (
        <RNClosedTestCardSkeleton key={i} darkMode={darkMode} />
      ))}
    </View>
  );
};

/** Generic container/section skeleton — used for any page section without a specific variant */
export const RNContainerSkeleton: React.FC<{ darkMode?: boolean; rows?: number }> = ({ darkMode, rows = 4 }) => {
  return (
    <View style={{
      padding: 16,
      gap: 14,
      width: '100%',
      backgroundColor: darkMode ? "#121212" : "#ffffff",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: darkMode ? "#2a2a2a" : "#e8e8e8",
    }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <RNSkeleton darkMode={darkMode} style={{ width: 180, height: 22, borderRadius: 6 }} />
        <RNSkeleton darkMode={darkMode} style={{ width: 90, height: 34, borderRadius: 8 }} />
      </View>
      {/* Content rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{
          padding: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: darkMode ? '#2a2a2a' : '#f0f0f0',
          gap: 8,
          backgroundColor: darkMode ? '#1a1a1a' : '#fafafa',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <RNSkeleton darkMode={darkMode} style={{ width: '55%', height: 16, borderRadius: 4 }} />
            <RNSkeleton darkMode={darkMode} style={{ width: 60, height: 22, borderRadius: 10 }} />
          </View>
          <RNSkeleton darkMode={darkMode} style={{ width: '75%', height: 12, borderRadius: 4 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <RNSkeleton darkMode={darkMode} style={{ width: 80, height: 28, borderRadius: 6 }} />
            <RNSkeleton darkMode={darkMode} style={{ width: 80, height: 28, borderRadius: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
};


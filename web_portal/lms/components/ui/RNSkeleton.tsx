import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, Platform } from 'react-native';

interface RNSkeletonProps {
  style?: ViewStyle | ViewStyle[];
  darkMode?: boolean;
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = '__nermai_rn_spin_style';
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      @keyframes nermai-rn-spin {
        0%   { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(el);
  }
}

export const RNSkeleton: React.FC<RNSkeletonProps> = ({ style, darkMode = false }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  if (Platform.OS === 'web') {
    const flatStyle = (Array.isArray(style) ? Object.assign({}, ...style) : style) || {};
    return (
      <div
        style={{
          borderRadius: 6,
          backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
          ...flatStyle,
        }}
      />
    );
  }

  const baseBg = darkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.10)';
  return (
    <Animated.View
      style={[{ backgroundColor: baseBg, borderRadius: 6, opacity }, style]}
    />
  );
};

export const RNEducationalLoader: React.FC<{ message?: string; darkMode?: boolean }> = ({ message = "Preparing your educational content...", darkMode }) => {
  return (
    <View style={{
      width: '100%',
      minHeight: 280,
      paddingVertical: 50,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {Platform.OS === 'web' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: darkMode ? '4px solid rgba(139,0,0,0.2)' : '4px solid #fee2e2',
            borderTop: '4px solid #b91c1c',
            animation: 'nermai-rn-spin 1s linear infinite'
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: darkMode ? '#f3f4f6' : '#1f2937',
              letterSpacing: '0.025em'
            }}>
              Loading...
            </p>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              {message}
            </p>
          </div>
        </div>
      ) : (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <RNSkeleton darkMode={darkMode} style={{ width: 48, height: 48, borderRadius: 24 }} />
          <RNSkeleton darkMode={darkMode} style={{ width: 140, height: 18, borderRadius: 6 }} />
        </View>
      )}
    </View>
  );
};

export const RNDashboardSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => (
  <RNEducationalLoader message="Loading dashboard..." darkMode={darkMode} />
);

export const RNTableSkeleton: React.FC<{ rows?: number; darkMode?: boolean }> = ({ darkMode }) => (
  <RNEducationalLoader message="Loading records..." darkMode={darkMode} />
);

export const RNCardGridSkeleton: React.FC<{ count?: number; darkMode?: boolean }> = ({ darkMode }) => (
  <RNEducationalLoader message="Preparing content..." darkMode={darkMode} />
);

export const RNProfileSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => (
  <RNEducationalLoader message="Loading profile..." darkMode={darkMode} />
);

export const RNFormSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => (
  <RNEducationalLoader message="Loading details..." darkMode={darkMode} />
);

export const RNNoticeCardSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => (
  <RNEducationalLoader message="Loading notice..." darkMode={darkMode} />
);

export const RNNoticeSectionSkeleton: React.FC<{ darkMode?: boolean; count?: number }> = ({ darkMode }) => (
  <RNEducationalLoader message="Loading notices..." darkMode={darkMode} />
);

export const RNSystemAlertCardSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => (
  <RNEducationalLoader message="Loading alerts..." darkMode={darkMode} />
);

export const RNClosedTestCardSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => (
  <RNEducationalLoader message="Loading closed test..." darkMode={darkMode} />
);

export const RNClosedTestsSectionSkeleton: React.FC<{ darkMode?: boolean; count?: number }> = ({ darkMode }) => (
  <RNEducationalLoader message="Loading closed tests..." darkMode={darkMode} />
);

export const RNContainerSkeleton: React.FC<{ darkMode?: boolean; rows?: number }> = ({ darkMode }) => (
  <RNEducationalLoader message="Preparing section content..." darkMode={darkMode} />
);

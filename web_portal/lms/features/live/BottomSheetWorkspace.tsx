import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { mobileWorkspaceRegistry } from './MobileWorkspaceRegistry';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_HEIGHT = 60; // Height of the handle/tabs when collapsed
const MAX_HEIGHT = SCREEN_HEIGHT * 0.7; // 70% of screen height when expanded

interface Props {
  capabilities?: string[];
  isLive?: boolean;
}

export const BottomSheetWorkspace: React.FC<Props> = ({ capabilities = [], isLive = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const animatedHeight = useRef(new Animated.Value(MIN_HEIGHT)).current;

  const workspaces = mobileWorkspaceRegistry.getAvailableWorkspaces(capabilities, isLive);

  useEffect(() => {
    if (workspaces.length > 0 && !activeTab) {
      setActiveTab(workspaces[0].id);
    }
  }, [workspaces]);

  const toggleSheet = (forceExpand?: boolean) => {
    const toExpand = forceExpand !== undefined ? forceExpand : !expanded;
    setExpanded(toExpand);
    Animated.spring(animatedHeight, {
      toValue: toExpand ? MAX_HEIGHT : MIN_HEIGHT,
      useNativeDriver: false,
      friction: 8,
      tension: 60
    }).start();
  };

  const handleTabPress = (id: string) => {
    setActiveTab(id);
    if (!expanded) {
      toggleSheet(true);
    }
  };

  const ActiveComponent = workspaces.find(w => w.id === activeTab)?.component;

  if (workspaces.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { height: animatedHeight }]}>
      <TouchableOpacity 
        style={styles.handleContainer} 
        onPress={() => toggleSheet()}
        activeOpacity={0.8}
      >
        <View style={styles.handle} />
        <View style={styles.tabRow}>
          {workspaces.map(ws => {
            const Icon = ws.icon;
            const isActive = activeTab === ws.id;
            return (
              <TouchableOpacity
                key={ws.id}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => handleTabPress(ws.id)}
              >
                <Icon size={16} color={isActive ? '#000' : '#FFF'} />
                {isActive && <Text style={styles.tabText}>{ws.title}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>

      {expanded && ActiveComponent && (
        <View style={styles.content}>
          <ActiveComponent />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 1000,
  },
  handleContainer: {
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
    marginBottom: 12
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    width: '100%'
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#333',
    gap: 6
  },
  activeTab: {
    backgroundColor: '#FFF'
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000'
  },
  content: {
    flex: 1,
    backgroundColor: '#121212'
  }
});

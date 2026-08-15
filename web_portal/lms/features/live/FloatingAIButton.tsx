import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

interface Props {
  sessionId: string;
  courseId: string;
  topicId: string;
}

export const FloatingAIButton: React.FC<Props> = ({ sessionId, courseId, topicId }) => {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    // Navigate to the dedicated AI Chat screen, passing the context
    navigation.navigate('AssistantChat', {
      context: { sessionId, courseId, topicId }
    });
  };

  return (
    <TouchableOpacity style={styles.fab} onPress={handlePress} activeOpacity={0.8}>
      <Bot size={24} color="#FFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80, // Above the collapsed BottomSheet
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8E44AD',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 900
  }
});

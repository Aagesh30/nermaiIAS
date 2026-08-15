import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { colors } from '../../core/theme';

export interface ActionItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: ActionItem[];
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ visible, onClose, title, items }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.item, index === items.length - 1 && styles.lastItem]}
                  onPress={() => {
                    item.onPress();
                    onClose();
                  }}
                >
                  <Text style={[styles.itemText, item.destructive && styles.destructiveText]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface || '#1E1E1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary || '#A0A0A0',
    marginBottom: 12,
    textAlign: 'center',
  },
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemText: {
    fontSize: 15,
    color: colors.textPrimary || '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  destructiveText: {
    color: '#FF3B30',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  cancelText: {
    fontSize: 15,
    color: colors.textSecondary || '#A0A0A0',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

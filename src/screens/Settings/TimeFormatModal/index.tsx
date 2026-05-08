import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native'
import React, { useState } from 'react'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TimeFormatOption {
  id: string;
  label: string;
  format: string;
  example: string;
}

interface TimeFormatModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (format: string) => void;
  currentFormat?: string;
}

const TimeFormatModal = ({ visible, onClose, onSelect, currentFormat = '12-Hour' }: TimeFormatModalProps) => {
  const [selectedFormat, setSelectedFormat] = useState(currentFormat);

  const timeFormatOptions: TimeFormatOption[] = [
    {
      id: '1',
      label: '12-Hour Format',
      format: '12-Hour',
      example: '3:45 PM',
    },
    {
      id: '2',
      label: '24-Hour Format',
      format: '24-Hour',
      example: '15:45',
    },
  ];

  const handleSelect = (format: string) => {
    setSelectedFormat(format);
  };

  const handleApply = () => {
    onSelect(selectedFormat);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="arrow-left" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Time Format</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {timeFormatOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.formatCard,
                selectedFormat === option.format && styles.formatCardActive,
              ]}
              onPress={() => handleSelect(option.format)}
            >
              <View style={styles.formatContent}>
                <Text
                  style={[
                    styles.formatLabel,
                    selectedFormat === option.format && styles.formatLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.formatExample,
                    selectedFormat === option.format && styles.formatExampleActive,
                  ]}
                >
                  Example: {option.example}
                </Text>
              </View>
              {selectedFormat === option.format && (
                <Icon name="check-circle" size={24} color="#E10600" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default TimeFormatModal

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F8F8',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  closeButton: {
    padding: 8,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

  formatCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },

  formatCardActive: {
    borderColor: '#E10600',
    backgroundColor: '#FFF5F5',
  },

  formatContent: {
    flex: 1,
  },

  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  formatLabelActive: {
    color: '#E10600',
  },

  formatExample: {
    fontSize: 14,
    color: '#999',
  },

  formatExampleActive: {
    color: '#E10600',
    fontWeight: '500',
  },

  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  applyButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})

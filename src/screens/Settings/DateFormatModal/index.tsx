import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native'
import React, { useState } from 'react'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DateFormatOption {
  id: string;
  label: string;
  format: string;
}

interface DateFormatModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (format: string) => void;
  currentFormat?: string;
}

const DateFormatModal = ({ visible, onClose, onSelect, currentFormat = 'DD/MM/YY' }: DateFormatModalProps) => {
  const [selectedFormat, setSelectedFormat] = useState(currentFormat);

  const dateFormatOptions: DateFormatOption[] = [
    { id: '1', label: 'DD/MM/YY', format: 'DD/MM/YY' },
    { id: '2', label: 'MM/DD/YY', format: 'MM/DD/YY' },
    { id: '3', label: 'DD-MM-YYYY', format: 'DD-MM-YYYY' },
    { id: '4', label: 'MM-DD-YYYY', format: 'MM-DD-YYYY' },
    { id: '5', label: 'YYYY/MM/DD', format: 'YYYY/MM/DD' },
    { id: '6', label: 'YYYY-MM-DD', format: 'YYYY-MM-DD' },
    { id: '7', label: 'DD MMM YYYY', format: 'DD MMM YYYY' },
    { id: '8', label: 'MMM DD, YYYY', format: 'MMM DD, YYYY' },
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
          <Text style={styles.headerTitle}>Date Format</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {dateFormatOptions.map((option) => (
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
                  Example: {option.format === 'DD/MM/YY' && '23/04/26'}
                  {option.format === 'MM/DD/YY' && '04/23/26'}
                  {option.format === 'DD-MM-YYYY' && '23-04-2026'}
                  {option.format === 'MM-DD-YYYY' && '04-23-2026'}
                  {option.format === 'YYYY/MM/DD' && '2026/04/23'}
                  {option.format === 'YYYY-MM-DD' && '2026-04-23'}
                  {option.format === 'DD MMM YYYY' && '23 Apr 2026'}
                  {option.format === 'MMM DD, YYYY' && 'Apr 23, 2026'}
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

export default DateFormatModal

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
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
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
    marginBottom: 4,
  },

  formatLabelActive: {
    color: '#E10600',
  },

  formatExample: {
    fontSize: 12,
    color: '#999',
  },

  formatExampleActive: {
    color: '#E10600',
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

import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native'
import React, { useState } from 'react'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CURRENCY_OPTIONS } from '../../../utils/currency';

interface CurrencyModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (currency: string) => void;
  currentCurrency?: string;
}

const CurrencyModal = ({ visible, onClose, onSelect, currentCurrency = 'PKR' }: CurrencyModalProps) => {
  const [selectedCurrency, setSelectedCurrency] = useState(currentCurrency);

  const currencyOptions = CURRENCY_OPTIONS;

  const handleSelect = (code: string) => {
    setSelectedCurrency(code);
  };

  const handleApply = () => {
    onSelect(selectedCurrency);
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
          <Text style={styles.headerTitle}>Currency</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {currencyOptions.map((option) => (
            <TouchableOpacity
              key={option.code}
              style={[
                styles.currencyCard,
                selectedCurrency === option.code && styles.currencyCardActive,
              ]}
              onPress={() => handleSelect(option.code)}
            >
              <View style={styles.currencyContent}>
                <View style={styles.currencyHeader}>
                  <Text
                    style={[
                      styles.currencyCode,
                      selectedCurrency === option.code && styles.currencyCodeActive,
                    ]}
                  >
                    {option.symbol}
                  </Text>
                  <View style={styles.currencyTextContainer}>
                    <Text
                      style={[
                        styles.currencyName,
                        selectedCurrency === option.code && styles.currencyNameActive,
                      ]}
                    >
                      {option.code}
                    </Text>
                    <Text
                      style={[
                        styles.currencyLabel,
                        selectedCurrency === option.code && styles.currencyLabelActive,
                      ]}
                    >
                      {option.name}
                    </Text>
                  </View>
                </View>
              </View>
              {selectedCurrency === option.code && (
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

export default CurrencyModal

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

  currencyCard: {
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

  currencyCardActive: {
    borderColor: '#E10600',
    backgroundColor: '#FFF5F5',
  },

  currencyContent: {
    flex: 1,
  },

  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  currencyCode: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    width: 40,
    textAlign: 'center',
  },

  currencyCodeActive: {
    color: '#E10600',
  },

  currencyTextContainer: {
    flex: 1,
  },

  currencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },

  currencyNameActive: {
    color: '#E10600',
  },

  currencyLabel: {
    fontSize: 12,
    color: '#999',
  },

  currencyLabelActive: {
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

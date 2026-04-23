import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Modal } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const DatabaseBackup = () => {
  const navigation = useNavigation();
  const [autoBackup, setAutoBackup] = useState(true);
  const [selectedFrequency, setSelectedFrequency] = useState('Daily');
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);

  const frequencyOptions = ['Daily', 'Weekly', 'Monthly'];

  return (
    <>
      <AppHeader
        title="Database Backup"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Last Backup Section */}
          <View style={styles.section}>
            <View style={styles.itemRow}>
              <View>
                <Text style={styles.itemLabel}>Last backup</Text>
                <Text style={styles.itemValue}>20 April, 2026</Text>
              </View>
            </View>
          </View>

          {/* Auto Backup Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Auto Backup</Text>
            </View>
            <View style={[styles.itemRow, styles.itemWithBorder]}>
              <Text style={styles.itemLabel}>Toggle ON</Text>
              <Switch
                value={autoBackup}
                onValueChange={setAutoBackup}
                trackColor={{ false: '#ccc', true: '#E10600' }}
                thumbColor={autoBackup ? '#E10600' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Frequency Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Frequency</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
            >
              <Text style={styles.dropdownButtonText}>{selectedFrequency}</Text>
              <Icon
                name={showFrequencyDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#E10600"
              />
            </TouchableOpacity>
            {showFrequencyDropdown && (
              <View style={styles.dropdownMenu}>
                {frequencyOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownItem,
                      index !== frequencyOptions.length - 1 && styles.dropdownItemBorder,
                    ]}
                    onPress={() => {
                      setSelectedFrequency(option);
                      setShowFrequencyDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedFrequency === option && styles.dropdownItemTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                    {selectedFrequency === option && (
                      <Icon name="check" size={18} color="#E10600" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.downloadButton}>
              <Text style={styles.downloadButtonText}>Download Backup</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backupNowButton}>
              <Text style={styles.backupNowButtonText}>Backup Now</Text>
            </TouchableOpacity>
          </View>

          {/* Restore Data Button */}
          <View style={styles.restoreButtonContainer}>
            <TouchableOpacity style={styles.restoreButton}>
              <Text style={styles.restoreButtonText}>Restore Data</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default DatabaseBackup

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 30, paddingTop: 0 },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },

  sectionHeader: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  itemWithBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  itemLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },

  itemValue: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  frequencyContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  frequencyButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
  },

  frequencyButtonActive: {
    borderColor: '#E10600',
    backgroundColor: '#FFF5F5',
  },

  frequencyText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  frequencyTextActive: {
    color: '#E10600',
    fontWeight: '600',
  },

  checkIcon: {
    marginLeft: 8,
  },

  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  dropdownButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  dropdownMenu: {
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  dropdownItemText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  dropdownItemTextActive: {
    color: '#E10600',
    fontWeight: '600',
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
  },

  downloadButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E10600',
  },

  backupNowButton: {
    flex: 1,
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backupNowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  restoreButtonContainer: {
    marginHorizontal: 16,
    marginTop: 12,
  },

  restoreButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})

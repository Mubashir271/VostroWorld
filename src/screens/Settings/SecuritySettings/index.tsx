import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Modal } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const SecuritySettings = () => {
  const navigation = useNavigation();
  const [addressToggle1, setAddressToggle1] = useState(true);
  const [addressToggle2, setAddressToggle2] = useState(true);
  const [selectedTimeout, setSelectedTimeout] = useState('15 mins');
  const [showTimeoutDropdown, setShowTimeoutDropdown] = useState(false);

  const timeoutOptions = ['5 mins', '10 mins', '15 mins', '30 mins', '1 hour'];

  return (
    <>
      <AppHeader
        title="Security Settings"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Session Timeout Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Session Timeout</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowTimeoutDropdown(!showTimeoutDropdown)}
            >
              <Text style={styles.dropdownButtonText}>{selectedTimeout}</Text>
              <Icon
                name={showTimeoutDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#E10600"
              />
            </TouchableOpacity>
            {showTimeoutDropdown && (
              <View style={styles.dropdownMenu}>
                {timeoutOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownItem,
                      index !== timeoutOptions.length - 1 && styles.dropdownItemBorder,
                    ]}
                    onPress={() => {
                      setSelectedTimeout(option);
                      setShowTimeoutDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedTimeout === option && styles.dropdownItemTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                    {selectedTimeout === option && (
                      <Icon name="check" size={18} color="#E10600" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Address Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Address</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemLabel}>Toggle ON</Text>
              <Switch
                value={addressToggle1}
                onValueChange={setAddressToggle1}
                trackColor={{ false: '#ccc', true: '#E10600' }}
                thumbColor={addressToggle1 ? '#E10600' : '#f4f3f4'}
              />
            </View>
            <View style={[styles.itemRow, styles.itemWithBorder]}>
              <Text style={styles.itemLabel}>Toggle ON</Text>
              <Switch
                value={addressToggle2}
                onValueChange={setAddressToggle2}
                trackColor={{ false: '#ccc', true: '#E10600' }}
                thumbColor={addressToggle2 ? '#E10600' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Password Policy Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.policyRow}>
              <Text style={styles.itemLabel}>Password Policy</Text>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default SecuritySettings

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

  timeoutContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  timeoutButton: {
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

  timeoutButtonActive: {
    borderColor: '#E10600',
    backgroundColor: '#FFF5F5',
  },

  timeoutText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  timeoutTextActive: {
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

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  itemWithBorder: {
    borderBottomWidth: 0,
  },

  itemLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  saveButtonContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },

  saveButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})

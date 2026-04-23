import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native'
import React, { useState } from 'react'
import AppHeader from '../../components/AppHeader'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

interface LeaveData {
  id: string;
  employeeName: string;
  leaveType: string;
  dates: string;
  status: string;
}

const ApplyLeave = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const leaveData = (route.params as any)?.leaveData as LeaveData || {
    employeeName: 'Employee Name',
    leaveType: 'Sick | Casual',
  };

  const [selectedLeaveType, setSelectedLeaveType] = useState('Sick | Casual');
  const [showLeaveTypeDropdown, setShowLeaveTypeDropdown] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const leaveTypeOptions = ['Sick', 'Casual', 'Annual', 'Maternity', 'Paternity'];

  const handleSubmit = () => {
    console.log('Submit leave application', {
      leaveType: selectedLeaveType,
      startDate,
      endDate,
      reason,
    });
  };

  return (
    <>
      <AppHeader
        title="Apply leave"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Employee Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Employee</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Employee</Text>
              <View style={styles.displayField}>
                <Text style={styles.displayFieldText}>{leaveData.employeeName}</Text>
              </View>
            </View>
          </View>

          {/* Leave Type Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leave Type</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowLeaveTypeDropdown(!showLeaveTypeDropdown)}
            >
              <Text style={styles.dropdownButtonText}>{selectedLeaveType}</Text>
              <Icon
                name={showLeaveTypeDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#E10600"
              />
            </TouchableOpacity>
            {showLeaveTypeDropdown && (
              <View style={styles.dropdownMenu}>
                {leaveTypeOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownItem,
                      index !== leaveTypeOptions.length - 1 && styles.dropdownItemBorder,
                    ]}
                    onPress={() => {
                      setSelectedLeaveType(option);
                      setShowLeaveTypeDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedLeaveType === option && styles.dropdownItemTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                    {selectedLeaveType === option && (
                      <Icon name="check" size={18} color="#E10600" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Start Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start Data</Text>
            <TouchableOpacity style={styles.datePickerButton}>
              <Text style={styles.datePickerText}>Select Data</Text>
              <Icon name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* End Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>End Data</Text>
            <TouchableOpacity style={styles.datePickerButton}>
              <Text style={styles.datePickerText}>Select Data</Text>
              <Icon name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Reason Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for leave"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
            />
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* Bottom Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tab}>
            <Icon name="home" size={24} color="#E10600" />
            <Text style={styles.tabLabel}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="package-variant" size={24} color="#999" />
            <Text style={styles.tabLabel}>Package</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="account-group" size={24} color="#999" />
            <Text style={styles.tabLabel}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="chart-box" size={24} color="#999" />
            <Text style={styles.tabLabel}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="account" size={24} color="#999" />
            <Text style={styles.tabLabel}>Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  )
}

export default ApplyLeave

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20, paddingTop: 0 },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#E10600',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  fieldContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  fieldLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },

  displayField: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  displayFieldText: {
    fontSize: 14,
    color: '#666',
  },

  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  dropdownButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  dropdownMenu: {
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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

  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  datePickerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },

  reasonInput: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },

  submitButton: {
    backgroundColor: '#E10600',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFD9D9',
  },

  tab: {
    alignItems: 'center',
    flex: 1,
  },

  tabLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
})

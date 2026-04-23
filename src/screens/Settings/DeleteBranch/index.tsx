import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import DateTimePicker from 'react-native-modal-datetime-picker';

const DeleteBranch = () => {
  const navigation = useNavigation();
  const [branchName, setBranchName] = useState('abc@gamil.com');
  const [address1, setAddress1] = useState('This is test mail');
  const [address2, setAddress2] = useState('This is test mail');
  const [managerSchedule, setManagerSchedule] = useState('Operating Hours');
  const [isDateTimePickerVisible, setDateTimePickerVisibility] = useState(false);
  const [scheduleTime, setScheduleTime] = useState<Date | null>(null);

  const handleSave = () => {
    if (!branchName || !address1 || !address2) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    Alert.alert('Success', 'Branch deleted successfully!');
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleAddSchedule = () => {
    setDateTimePickerVisibility(true);
  };

  const handleConfirmDateTime = (date: Date) => {
    setDateTimePickerVisibility(false);
    setScheduleTime(date);
    
    // Format the date and time
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    setManagerSchedule(`${formattedDate} ${formattedTime}`);
  };

  const handleCancelDateTime = () => {
    setDateTimePickerVisibility(false);
  };

  return (
    <>
      <AppHeader
        title="Delete Branch"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Branch Name Field */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Branch Name</Text>
            <TextInput
              style={styles.input}
              placeholder="abc@gamil.com"
              placeholderTextColor="#999"
              value={branchName}
              onChangeText={setBranchName}
              autoCapitalize="none"
            />
          </View>

          {/* Address Section */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="This is test mail"
              placeholderTextColor="#999"
              value={address1}
              onChangeText={setAddress1}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TextInput
              style={styles.input}
              placeholder="This is test mail"
              placeholderTextColor="#999"
              value={address2}
              onChangeText={setAddress2}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Manager Section */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Manager</Text>
            <View style={styles.managerContainer}>
              <View style={styles.managerLeft}>
                <Text style={styles.managerLabel}>{managerSchedule}</Text>
              </View>
              <TouchableOpacity 
                style={styles.addScheduleBtn}
                onPress={handleAddSchedule}
              >
                <Text style={styles.addScheduleText}>Add Schedule</Text>
                <Icon name="chevron-down" size={16} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.spacer} />

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Date Time Picker Modal */}
        <DateTimePicker
          isVisible={isDateTimePickerVisible}
          mode="datetime"
          onConfirm={handleConfirmDateTime}
          onCancel={handleCancelDateTime}
          isDarkModeEnabled={false}
        />
      </SafeAreaView>
    </>
  )
}

export default DeleteBranch

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#333',
  },
  managerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  managerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  managerLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  addScheduleBtn: {
    backgroundColor: '#E5E5E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addScheduleText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  spacer: {
    height: 40,
  },
  saveBtn: {
    backgroundColor: '#E10600',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
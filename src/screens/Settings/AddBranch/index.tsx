import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';

const AddBranch = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const isEdit = !!route.params?.branchId;

  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [manager, setManager] = useState('');

  const handleSave = () => {
    if (!branchName || !address || !city) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    Alert.alert('Success', isEdit ? 'Branch updated successfully!' : 'Branch added successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <>
      <AppHeader
        title={isEdit ? 'Edit Branch' : 'Add Branch'}
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Branch Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. F-11 Branch"
              placeholderTextColor="#999"
              value={branchName}
              onChangeText={setBranchName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Street, area, building"
              placeholderTextColor="#999"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Islamabad"
              placeholderTextColor="#999"
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 051-1234567"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Branch Manager</Text>
            <TouchableOpacity style={styles.selectInput}>
              <Text style={[styles.selectText, !manager && styles.placeholder]}>
                {manager || 'Select a manager'}
              </Text>
              <Icon name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
            {/* Quick-pick demo managers since there is no managers API wired yet */}
            <View style={styles.chipRow}>
              {['Ali Raza', 'Sara Khan', 'Bilal Ahmed'].map(name => (
                <TouchableOpacity
                  key={name}
                  style={[styles.chip, manager === name && styles.chipActive]}
                  onPress={() => setManager(name)}
                >
                  <Text style={[styles.chipText, manager === name && styles.chipTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.spacer} />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{isEdit ? 'Update Branch' : 'Save Branch'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default AddBranch

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 100 },

  formGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
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
  multilineInput: { minHeight: 80 },

  selectInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: { fontSize: 14, color: '#333' },
  placeholder: { color: '#999' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  chipActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  chipText: { fontSize: 12, color: '#555', fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  spacer: { height: 10 },
  saveBtn: { backgroundColor: '#E10600', paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
})

import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, FlatList, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';

const MANAGERS = ['Ali Raza', 'Sara Khan', 'Bilal Ahmed', 'Fatima Noor', 'Hassan Tariq'];

const INITIAL_ASSIGNMENTS = [
  { id: 1, branch: 'F-11 Branch', manager: 'Ali Raza' },
  { id: 2, branch: 'G-13 Branch', manager: 'Sara Khan' },
  { id: 3, branch: 'DHA Branch', manager: 'Bilal Ahmed' },
];

const BranchManagerAssignment = () => {
  const navigation = useNavigation();
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState<number | null>(null);

  const openPicker = (branchId: number) => {
    setActiveBranchId(branchId);
    setPickerVisible(true);
  };

  const assignManager = (manager: string) => {
    setAssignments(prev =>
      prev.map(item => (item.id === activeBranchId ? { ...item, manager } : item))
    );
    setPickerVisible(false);
    setActiveBranchId(null);
  };

  const handleSave = () => {
    Alert.alert('Success', 'Branch manager assignments saved successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <>
      <AppHeader
        title="Branch Manager Assignment"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.hint}>Assign a manager to each branch. Tap a branch to change its manager.</Text>

          {assignments.map(item => (
            <TouchableOpacity key={item.id} style={styles.row} onPress={() => openPicker(item.id)}>
              <View style={styles.iconWrap}>
                <Icon name="office-building-outline" size={20} color="#E10600" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.branchName}>{item.branch}</Text>
                <View style={styles.managerRow}>
                  <Icon name="account-outline" size={14} color="#999" />
                  <Text style={styles.managerName}>{item.manager}</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          ))}

          <View style={styles.spacer} />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Assignments</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={pickerVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Select Manager</Text>
              <FlatList
                data={MANAGERS}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.option} onPress={() => assignManager(item)}>
                    <Icon name="account-outline" size={18} color="#555" />
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </>
  )
}

export default BranchManagerAssignment

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollContent: { padding: 16, paddingBottom: 60 },

  hint: { fontSize: 13, color: '#999', marginBottom: 16, lineHeight: 18 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  managerName: { fontSize: 13, color: '#666' },

  spacer: { height: 10 },
  saveBtn: { backgroundColor: '#E10600', paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '60%' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  optionText: { fontSize: 14, color: '#333', fontWeight: '500' },
})

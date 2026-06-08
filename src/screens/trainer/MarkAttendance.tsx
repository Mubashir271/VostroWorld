import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { submitMarkAttendance, fetchTakenSlots } from '../../redux/slices/trainerSlice';
import { RootState } from '../../redux/store';
import AppHeader from '../../components/AppHeader';

const MarkAttendance = ({ route, navigation }: any) => {
  const { client } = route.params;
  const dispatch = useDispatch<any>();
  const { loading } = useSelector((state: RootState) => state.trainer);

  const [staffStatus, setStaffStatus] = useState<'Delivered' | 'No Show' | 'Cancel'>('Delivered');
  const [clientStatus, setClientStatus] = useState<'Delivered' | 'No Show' | 'Cancel'>('Delivered');
  const [staffNote, setStaffNote] = useState('');
  const [clientNote, setClientNote] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    dispatch(fetchTakenSlots(today));
  }, [dispatch]);

  const handleSubmit = () => {
    const payload = {
      branch_id: client.branch_id || 1, // adjust as per your profile
      client_id: client.client_id,
      order_id: client.order_id,
      package_id: client.package_id,
      date: new Date().toISOString().split('T')[0],
      staff_status: staffStatus,
      client_status: clientStatus,
      time_slot: client.today_time_slot,
      staff_note: staffNote,
      client_note: clientNote,
      type: 'PT',
    };

    dispatch(submitMarkAttendance(payload))
      .unwrap()
      .then(() => {
        Alert.alert('Success', 'Session marked successfully!');
        navigation.goBack();
      })
      .catch((err: any) => {
        Alert.alert('Error', err.message || 'Failed to mark attendance');
      });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Mark Attendance" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{client.client_name}</Text>
          <Text style={styles.package}>{client.package_name}</Text>
          <Text style={styles.slot}>Slot: {client.today_time_slot}</Text>
        </View>

        <Text style={styles.label}>Staff Status</Text>
        <View style={styles.statusRow}>
          {(['Delivered', 'No Show', 'Cancel'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusBtn, staffStatus === status && styles.activeStatus]}
              onPress={() => setStaffStatus(status)}
            >
              <Text style={staffStatus === status ? styles.activeStatusText : styles.statusText}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Client Status</Text>
        <View style={styles.statusRow}>
          {(['Delivered', 'No Show', 'Cancel'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusBtn, clientStatus === status && styles.activeStatus]}
              onPress={() => setClientStatus(status)}
            >
              <Text style={clientStatus === status ? styles.activeStatusText : styles.statusText}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Staff Note (Optional)</Text>
        <TextInput
          style={styles.input}
          value={staffNote}
          onChangeText={setStaffNote}
          placeholder="Great session today..."
          multiline
        />

        <Text style={styles.label}>Client Note (Optional)</Text>
        <TextInput
          style={styles.input}
          value={clientNote}
          onChangeText={setClientNote}
          placeholder="Client feedback..."
          multiline
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading.marking}>
          <Text style={styles.submitText}>
            {loading.marking ? 'Marking...' : 'Mark Session'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  clientInfo: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, marginBottom: 20 },
  clientName: { fontSize: 20, fontWeight: '700' },
  package: { fontSize: 16, color: '#64748b' },
  slot: { fontSize: 15, color: '#f59e0b', marginTop: 4 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  activeStatus: { backgroundColor: '#E10600' },
  statusText: { fontWeight: '600' },
  activeStatusText: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#E10600',
    padding: 16,
    borderRadius: 12,
    marginTop: 30,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

export default MarkAttendance;
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dd}`;
};

// Lightweight text-based date field (kept dependency-free, consistent with AddMealsPlan)
const DateField = ({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) => {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(value);

  const commit = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      onChange(raw);
    } else {
      Alert.alert('Invalid Date', 'Please enter date as YYYY-MM-DD.');
      setRaw(value);
    }
    setEditing(false);
  };

  return (
    <View style={s.formGroup}>
      <Text style={s.label}>{label}{required && <Text style={s.required}> *</Text>}</Text>
      {editing ? (
        <View style={s.dateInputRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={raw}
            onChangeText={setRaw}
            onBlur={commit}
            onSubmitEditing={commit}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
            autoFocus
          />
          <TouchableOpacity style={s.okBtn} onPress={commit}>
            <Text style={s.okBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.dateDisplay} onPress={() => { setRaw(value); setEditing(true); }}>
          <Icon name="calendar" size={16} color="#E63946" />
          <Text style={s.dateText}>{value}</Text>
          <Icon name="pencil-outline" size={14} color="#aaa" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const AddFitnessPlan = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchName = profile?.branchName ?? `Branch ${profile?.branchId ?? ''}`;
  const trainerName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'Trainer';

  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [clientError, setClientError] = useState(false);

  const handleSubmit = () => {
    if (!clientName.trim()) {
      setClientError(true);
      return;
    }
    setClientError(false);
    Alert.alert('Success', 'Fitness plan added successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <>
      <AppHeader
        title="Add Fitness Plan"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.scrollContent}>
          <View style={s.noticeBar}>
            <Icon name="alert-circle-outline" size={16} color="#E63946" />
            <Text style={s.noticeText}>Fields marked <Text style={s.required}>*</Text> are required.</Text>
          </View>

          <View style={s.row}>
            <View style={[s.formGroup, s.flex1]}>
              <Text style={s.label}>Branch Name <Text style={s.required}>*</Text></Text>
              <View style={s.readonlyBox}>
                <Text style={s.readonlyText}>{branchName}</Text>
              </View>
            </View>
            <View style={[s.formGroup, s.flex1]}>
              <Text style={s.label}>Trainer <Text style={s.required}>*</Text></Text>
              <View style={s.readonlyBox}>
                <Text style={s.readonlyText}>{trainerName}</Text>
              </View>
            </View>
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Client Name <Text style={s.required}>*</Text></Text>
            <TextInput
              style={[s.input, clientError && s.inputError]}
              placeholder="Enter client name"
              placeholderTextColor="#999"
              value={clientName}
              onChangeText={(v) => { setClientName(v); if (v.trim()) setClientError(false); }}
            />
            {clientError && <Text style={s.errorText}>Required</Text>}
          </View>

          <View style={s.row}>
            <View style={[s.flex1]}>
              <DateField label="Start Date" value={startDate} onChange={setStartDate} required />
            </View>
            <View style={[s.flex1]}>
              <DateField label="End Date" value={endDate} onChange={setEndDate} required />
            </View>
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Note</Text>
            <TextInput
              style={[s.input, s.multilineInput]}
              placeholder="Enter note"
              placeholderTextColor="#999"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={s.spacer} />

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit}>
            <Text style={s.submitBtnText}>Submit</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollContent: { padding: 16, paddingBottom: 60 },

  noticeBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF5F5', borderRadius: 8, padding: 12, marginBottom: 18 },
  noticeText: { fontSize: 12, color: '#666' },

  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },

  formGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  required: { color: '#E63946' },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: '#333',
  },
  inputError: { borderColor: '#E63946' },
  errorText: { fontSize: 11, color: '#E63946', marginTop: 4 },
  multilineInput: { minHeight: 90 },

  readonlyBox: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyText: { fontSize: 13, color: '#555', fontWeight: '500' },

  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  okBtn: { backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  okBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  dateDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E5',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
  },
  dateText: { flex: 1, fontSize: 13, color: '#333' },

  spacer: { height: 8 },
  submitBtn: { backgroundColor: '#E10600', paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default AddFitnessPlan;

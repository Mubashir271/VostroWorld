import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { RootState } from '../../../redux/store';
import {
  getClientHub,
  getAppointmentConversionOptions,
  getAppointmentTrainers,
  addNutritionAppointment,
} from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
];

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const display = (s: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

const displayTime = (t: string) => {
  if (!t) return 'Select Time Slot';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

const clientLabel = (c: any) => c?.full_name || `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || '—';

const today = fmt(new Date());

const AddNutritionAppointment = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [entryDate] = useState(today);

  const [client, setClient] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [clientName, setClientName] = useState('');
  const [contact, setContact] = useState('');

  const [appointmentDate, setAppointmentDate] = useState(today);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [appointmentTime, setAppointmentTime] = useState('');
  const [timeDropOpen, setTimeDropOpen] = useState(false);

  const [consultation, setConsultation] = useState('');

  const [conversion, setConversion] = useState('');
  const [conversionOptions, setConversionOptions] = useState<string[]>([]);
  const [conversionDropOpen, setConversionDropOpen] = useState(false);

  const [trainer, setTrainer] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [trainerDropOpen, setTrainerDropOpen] = useState(false);

  const [clientRemarks, setClientRemarks] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAppointmentConversionOptions({ branch_id: branchId })
      .then(res => setConversionOptions(res.data?.data ?? []))
      .catch(() => setConversionOptions([]));
    getAppointmentTrainers({ branch_id: branchId })
      .then(res => setTrainers(res.data?.data ?? []))
      .catch(() => setTrainers([]));
  }, [branchId]);

  const searchClients = useCallback(async (text: string) => {
    setClientSearch(text);
    if (text.trim().length < 2) { setClientResults([]); return; }
    setSearching(true);
    try {
      const res = await getClientHub({ branch_id: branchId, search: text.trim(), limit: 10 });
      const data = res.data?.data?.data ?? [];
      setClientResults(Array.isArray(data) ? data : []);
    } catch {
      setClientResults([]);
    } finally {
      setSearching(false);
    }
  }, [branchId]);

  const selectClient = (c: any) => {
    setClient(c);
    setClientName(clientLabel(c));
    setContact(c.phone ?? contact);
    setClientDropOpen(false);
    setClientResults([]);
    setClientSearch('');
  };

  const clearClient = () => {
    setClient(null);
    setClientName('');
    setContact('');
  };

  const handleDateConfirm = (date: Date) => {
    setAppointmentDate(fmt(date));
    setPickerOpen(false);
  };

  const handleCreate = async () => {
    if (!clientName.trim() || !contact.trim() || !appointmentDate) {
      Alert.alert('Missing Fields', 'Please fill in Client Name, Contact and Appointment Date.');
      return;
    }
    setSaving(true);
    try {
      await addNutritionAppointment({
        branch_id: branchId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime || undefined,
        trainer_id: trainer?.id,
        client_id: client?.id,
        client_name: clientName.trim(),
        contact: contact.trim(),
        conversion: conversion || undefined,
        consultation: consultation.trim() || undefined,
        client_remarks: clientRemarks.trim() || undefined,
      });
      Alert.alert('Success', 'Appointment created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not create the appointment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add New Appointment"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Entry Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Entry Date</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{display(entryDate)}</Text>
              <Icon name="calendar" size={16} color="#888" />
            </View>
          </View>

          {/* Search & Select Client */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Search &amp; Select Client (optional)</Text>
            {client ? (
              <View style={styles.selectedClient}>
                <Icon name="account-circle-outline" size={20} color="#1E88E5" />
                <Text style={styles.selectedClientText}>{clientLabel(client)}</Text>
                <TouchableOpacity onPress={clearClient}>
                  <Icon name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.searchBox}>
                  <Icon name="magnify" size={18} color="#999" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search client by name or phone..."
                    placeholderTextColor="#aaa"
                    value={clientSearch}
                    onChangeText={(t) => { searchClients(t); setClientDropOpen(true); }}
                  />
                  {searching && <ActivityIndicator size="small" color="#999" />}
                </View>
                {clientDropOpen && clientResults.length > 0 && (
                  <View style={styles.dropdownMenu}>
                    {clientResults.map(c => (
                      <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => selectClient(c)}>
                        <Text style={styles.dropdownItemText}>{clientLabel(c)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Client Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Client Name <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter client name"
              placeholderTextColor="#aaa"
              value={clientName}
              onChangeText={setClientName}
            />
          </View>

          {/* Contact */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Contact <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter contact number"
              placeholderTextColor="#aaa"
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
            />
          </View>

          {/* Appointment Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Appointment Date <Text style={styles.req}>*</Text></Text>
            <TouchableOpacity style={styles.dateBox} onPress={() => setPickerOpen(true)}>
              <Text style={styles.dateText}>{display(appointmentDate)}</Text>
              <Icon name="calendar" size={16} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Appointment Time */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Appointment Time</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setTimeDropOpen(v => !v)}>
              <Text style={styles.dropdownText}>{displayTime(appointmentTime)}</Text>
              <Icon name={timeDropOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
            </TouchableOpacity>
            {timeDropOpen && (
              <View style={styles.dropdownMenu}>
                <ScrollView style={{ maxHeight: 220 }}>
                  {TIME_SLOTS.map(slot => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.dropdownItem, appointmentTime === slot && styles.dropdownItemActive]}
                      onPress={() => { setAppointmentTime(slot); setTimeDropOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, appointmentTime === slot && styles.dropdownItemTextActive]}>{displayTime(slot)}</Text>
                      {appointmentTime === slot && <Icon name="check" size={14} color="#E63946" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Consultation */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Consultation</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter consultation type"
              placeholderTextColor="#aaa"
              value={consultation}
              onChangeText={setConsultation}
            />
          </View>

          {/* Conversion */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Conversion</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setConversionDropOpen(v => !v)}>
              <Text style={styles.dropdownText}>{conversion || 'Select Status'}</Text>
              <Icon name={conversionDropOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
            </TouchableOpacity>
            {conversionDropOpen && (
              <View style={styles.dropdownMenu}>
                {conversionOptions.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownItem, conversion === opt && styles.dropdownItemActive]}
                    onPress={() => { setConversion(opt); setConversionDropOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, conversion === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                    {conversion === opt && <Icon name="check" size={14} color="#E63946" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Trainer */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Trainer</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setTrainerDropOpen(v => !v)}>
              <Text style={styles.dropdownText}>{trainer ? clientLabel(trainer) : 'Select Trainer'}</Text>
              <Icon name={trainerDropOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
            </TouchableOpacity>
            {trainerDropOpen && (
              <View style={styles.dropdownMenu}>
                <ScrollView style={{ maxHeight: 220 }}>
                  {trainers.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.dropdownItem, trainer?.id === t.id && styles.dropdownItemActive]}
                      onPress={() => { setTrainer(t); setTrainerDropOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, trainer?.id === t.id && styles.dropdownItemTextActive]}>{clientLabel(t)}</Text>
                      {trainer?.id === t.id && <Icon name="check" size={14} color="#E63946" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Client Remarks */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Client Remarks</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Enter remarks"
              placeholderTextColor="#aaa"
              value={clientRemarks}
              onChangeText={setClientRemarks}
              multiline
            />
          </View>
        </View>

        {/* Cancel / Create */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.createBtnText}>Create</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      <DateTimePickerModal
        isVisible={pickerOpen}
        mode="date"
        date={new Date(appointmentDate)}
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },

  field:        { marginBottom: 14 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  req:          { color: '#E63946' },

  input:        { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  textarea:     { height: 80, textAlignVertical: 'top' },

  readonlyBox:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F5F5F5' },
  readonlyText: { fontSize: 14, color: '#555' },

  dateBox:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 14, color: '#1A1A1A' },

  dropdown:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dropdownText: { fontSize: 14, color: '#1A1A1A' },
  dropdownMenu: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemActive: { backgroundColor: '#FFF5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },
  dropdownItemTextActive: { color: '#E63946', fontWeight: '700' },

  selectedClient: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F7FF', borderRadius: 8, padding: 10 },
  selectedClientText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA' },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },

  btnRow:       { flexDirection: 'row', gap: 10 },
  cancelBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 13, backgroundColor: '#F0F0F0' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#555' },
  createBtn:    { flex: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 13, backgroundColor: '#E63946' },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default AddNutritionAppointment;

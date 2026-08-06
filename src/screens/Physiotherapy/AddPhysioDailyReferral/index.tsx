import React, { useState, useEffect } from 'react';
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
  getPhysioAppointmentPhysios,
  getPhysioDailyReferralTrainers,
  addPhysioDailyReferral,
} from '../../../api/physio';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const display = (s: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

const personLabel = (p: any) =>
  p?.name || p?.full_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || '—';

const today = fmt(new Date());

const AddPhysioDailyReferral = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [physios, setPhysios] = useState<any[]>([]);
  const [physio, setPhysio] = useState<any>(null);
  const [physioDropOpen, setPhysioDropOpen] = useState(false);

  const [trainers, setTrainers] = useState<any[]>([]);
  const [trainer, setTrainer] = useState<any>(null);
  const [trainerDropOpen, setTrainerDropOpen] = useState(false);

  const [referralDate, setReferralDate] = useState(today);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [referredCount, setReferredCount] = useState('');
  const [sessionRecommended, setSessionRecommended] = useState('');
  const [clientReferral, setClientReferral] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPhysioAppointmentPhysios({ branch_id: branchId })
      .then(res => setPhysios(res.data?.data ?? []))
      .catch(() => setPhysios([]));
    getPhysioDailyReferralTrainers({ branch_id: branchId })
      .then(res => setTrainers(res.data?.data ?? []))
      .catch(() => setTrainers([]));
  }, [branchId]);

  const handleDateConfirm = (date: Date) => {
    setReferralDate(fmt(date));
    setPickerOpen(false);
  };

  const handleCreate = async () => {
    if (!patientName.trim() || !referralDate) {
      Alert.alert('Missing Fields', 'Please fill in Patient Name and Date.');
      return;
    }
    setSaving(true);
    try {
      await addPhysioDailyReferral({
        branch_id: branchId,
        physiotherapist_id: physio?.id,
        referral_date: referralDate,
        patient_name: patientName.trim(),
        trainer_id: trainer?.id,
        referred_count: referredCount.trim() || undefined,
        session_recommended: sessionRecommended.trim() || undefined,
        client_referral: clientReferral.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Success', 'Referral created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not create the referral. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Daily Referral"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Physiotherapist / Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Physiotherapist</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setPhysioDropOpen(v => !v)}>
              <Text style={styles.dropdownText}>{physio ? personLabel(physio) : 'Select physiotherapist'}</Text>
              <Icon name={physioDropOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
            </TouchableOpacity>
            {physioDropOpen && (
              <View style={styles.dropdownMenu}>
                <ScrollView style={{ maxHeight: 220 }}>
                  {physios.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.dropdownItem, physio?.id === p.id && styles.dropdownItemActive]}
                      onPress={() => { setPhysio(p); setPhysioDropOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, physio?.id === p.id && styles.dropdownItemTextActive]}>{personLabel(p)}</Text>
                      {physio?.id === p.id && <Icon name="check" size={14} color="#E63946" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date <Text style={styles.req}>*</Text></Text>
            <TouchableOpacity style={styles.dateBox} onPress={() => setPickerOpen(true)}>
              <Text style={styles.dateText}>{display(referralDate)}</Text>
              <Icon name="calendar" size={16} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Patient Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Patient Name <Text style={styles.req}>*</Text></Text>
            <TextInput style={styles.input} placeholder="Enter patient name" placeholderTextColor="#aaa" value={patientName} onChangeText={setPatientName} />
          </View>

          {/* Trainer */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Trainer</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setTrainerDropOpen(v => !v)}>
              <Text style={styles.dropdownText}>{trainer ? personLabel(trainer) : 'Select trainer'}</Text>
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
                      <Text style={[styles.dropdownItemText, trainer?.id === t.id && styles.dropdownItemTextActive]}>{personLabel(t)}</Text>
                      {trainer?.id === t.id && <Icon name="check" size={14} color="#E63946" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Referred Count / Session Recommended */}
          <View style={styles.row}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.fieldLabel}>Referred Count</Text>
              <TextInput style={styles.input} placeholder="Count" placeholderTextColor="#aaa" value={referredCount} onChangeText={setReferredCount} keyboardType="number-pad" />
            </View>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.fieldLabel}>Session Recommended</Text>
              <TextInput style={styles.input} placeholder="consultation / 10 / etc." placeholderTextColor="#aaa" value={sessionRecommended} onChangeText={setSessionRecommended} />
            </View>
          </View>

          {/* Client Referral */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Client Referral</Text>
            <TextInput style={styles.input} placeholder="Enter client referral" placeholderTextColor="#aaa" value={clientReferral} onChangeText={setClientReferral} />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Enter notes" placeholderTextColor="#aaa" value={notes} onChangeText={setNotes} multiline />
          </View>
        </View>

        {/* Cancel / Save */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.createBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      <DateTimePickerModal
        isVisible={pickerOpen}
        mode="date"
        date={new Date(referralDate)}
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
  row:          { flexDirection: 'row', gap: 10 },
  half:         { flex: 1 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  req:          { color: '#E63946' },

  input:        { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  textarea:     { height: 80, textAlignVertical: 'top' },

  dateBox:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 14, color: '#1A1A1A' },

  dropdown:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dropdownText: { fontSize: 14, color: '#1A1A1A' },
  dropdownMenu: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemActive: { backgroundColor: '#FFF5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },
  dropdownItemTextActive: { color: '#E63946', fontWeight: '700' },

  btnRow:       { flexDirection: 'row', gap: 10 },
  cancelBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 13, backgroundColor: '#F0F0F0' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#555' },
  createBtn:    { flex: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 13, backgroundColor: '#E63946' },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default AddPhysioDailyReferral;

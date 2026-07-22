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
import { getPhysioAppointmentPhysios, addPhysioPrescription } from '../../../api/physio';
import { getClientNames } from '../../../api/employeeDashboard';
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

const AddPhysioPrescription = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [physios, setPhysios] = useState<any[]>([]);
  const [physio, setPhysio] = useState<any>(null);
  const [physioDropOpen, setPhysioDropOpen] = useState(false);

  const [clients, setClients] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropOpen, setClientDropOpen] = useState(false);

  const [prescriptionDate, setPrescriptionDate] = useState(today);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [clientName, setClientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [region, setRegion] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [painSite, setPainSite] = useState('');
  const [painType, setPainType] = useState('');
  const [painScore, setPainScore] = useState('');
  const [aggravatingFactor, setAggravatingFactor] = useState('');
  const [relievingFactor, setRelievingFactor] = useState('');
  const [radiating, setRadiating] = useState('');
  const [sessionRecommended, setSessionRecommended] = useState('');
  const [functionalLimitation, setFunctionalLimitation] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [goals, setGoals] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPhysioAppointmentPhysios({ branch_id: branchId })
      .then(res => setPhysios(res.data?.data ?? []))
      .catch(() => setPhysios([]));
    getClientNames({ branch_id: branchId })
      .then(res => setClients(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setClients([]));
  }, [branchId]);

  const filteredClients = useCallback(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return [];
    return clients.filter(c => personLabel(c).toLowerCase().includes(q) || (c.phone ?? '').includes(q)).slice(0, 10);
  }, [clients, clientSearch]);

  const selectClient = (c: any) => {
    setClient(c);
    setClientName(personLabel(c));
    setClientDropOpen(false);
    setClientSearch('');
  };

  const clearClient = () => {
    setClient(null);
    setClientName('');
  };

  const handleDateConfirm = (date: Date) => {
    setPrescriptionDate(fmt(date));
    setPickerOpen(false);
  };

  const handleCreate = async () => {
    if (!clientName.trim() || !prescriptionDate) {
      Alert.alert('Missing Fields', 'Please fill in Client Name and Date.');
      return;
    }
    setSaving(true);
    try {
      await addPhysioPrescription({
        branch_id: branchId,
        physiotherapist_id: physio?.id,
        client_id: client?.id,
        prescription_date: prescriptionDate,
        client_name: clientName.trim(),
        age: age.trim() || undefined,
        gender: gender.trim() || undefined,
        region: region.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        chief_complaint: chiefComplaint.trim() || undefined,
        pain_site: painSite.trim() || undefined,
        pain_type: painType.trim() || undefined,
        pain_score: painScore.trim() || undefined,
        aggravating_factor: aggravatingFactor.trim() || undefined,
        relieving_factor: relievingFactor.trim() || undefined,
        radiating: radiating.trim() || undefined,
        session_recommended: sessionRecommended.trim() || undefined,
        functional_limitation: functionalLimitation.trim() || undefined,
        treatment_plan: treatmentPlan.trim() || undefined,
        goals: goals.trim() || undefined,
        recommendations: recommendations.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Success', 'Prescription created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not create the prescription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Prescription"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Physiotherapist */}
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

          {/* Select Insider Client */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Select Insider Client (optional)</Text>
            {client ? (
              <View style={styles.selectedClient}>
                <Icon name="account-circle-outline" size={20} color="#1E88E5" />
                <Text style={styles.selectedClientText}>{personLabel(client)}</Text>
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
                    placeholder="Search client by name/phone"
                    placeholderTextColor="#aaa"
                    value={clientSearch}
                    onChangeText={(t) => { setClientSearch(t); setClientDropOpen(true); }}
                  />
                </View>
                {clientDropOpen && filteredClients().length > 0 && (
                  <View style={styles.dropdownMenu}>
                    {filteredClients().map(c => (
                      <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => selectClient(c)}>
                        <Text style={styles.dropdownItemText}>{personLabel(c)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date <Text style={styles.req}>*</Text></Text>
            <TouchableOpacity style={styles.dateBox} onPress={() => setPickerOpen(true)}>
              <Text style={styles.dateText}>{display(prescriptionDate)}</Text>
              <Icon name="calendar" size={16} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Client Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Client Name <Text style={styles.req}>*</Text></Text>
            <TextInput style={styles.input} placeholder="Enter client name" placeholderTextColor="#aaa" value={clientName} onChangeText={setClientName} />
          </View>

          {/* Age / Gender */}
          <View style={styles.row}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#aaa" value={age} onChangeText={setAge} keyboardType="number-pad" />
            </View>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <TextInput style={styles.input} placeholder="Gender" placeholderTextColor="#aaa" value={gender} onChangeText={setGender} />
            </View>
          </View>

          {/* Region */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Region</Text>
            <TextInput style={styles.input} placeholder="Enter region" placeholderTextColor="#aaa" value={region} onChangeText={setRegion} />
          </View>

          {/* Diagnosis */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Diagnosis</Text>
            <TextInput style={styles.input} placeholder="Enter diagnosis" placeholderTextColor="#aaa" value={diagnosis} onChangeText={setDiagnosis} />
          </View>

          {/* C/O (Chief Complaint) */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>C/O (Chief Complaint)</Text>
            <TextInput style={styles.input} placeholder="Enter chief complaint" placeholderTextColor="#aaa" value={chiefComplaint} onChangeText={setChiefComplaint} />
          </View>

          {/* Pain Site */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pain Site</Text>
            <TextInput style={styles.input} placeholder="Enter pain site" placeholderTextColor="#aaa" value={painSite} onChangeText={setPainSite} />
          </View>

          {/* Pain Type / Pain Score */}
          <View style={styles.row}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.fieldLabel}>Pain Type</Text>
              <TextInput style={styles.input} placeholder="Pain type" placeholderTextColor="#aaa" value={painType} onChangeText={setPainType} />
            </View>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.fieldLabel}>Pain Score (0-10)</Text>
              <TextInput style={styles.input} placeholder="0-10" placeholderTextColor="#aaa" value={painScore} onChangeText={setPainScore} keyboardType="number-pad" />
            </View>
          </View>

          {/* Aggravating Factor */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Aggravating Factor</Text>
            <TextInput style={styles.input} placeholder="Enter aggravating factor" placeholderTextColor="#aaa" value={aggravatingFactor} onChangeText={setAggravatingFactor} />
          </View>

          {/* Relieving Factor */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Relieving Factor</Text>
            <TextInput style={styles.input} placeholder="Enter relieving factor" placeholderTextColor="#aaa" value={relievingFactor} onChangeText={setRelievingFactor} />
          </View>

          {/* Radiating */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Radiating</Text>
            <TextInput style={styles.input} placeholder="Enter radiating" placeholderTextColor="#aaa" value={radiating} onChangeText={setRadiating} />
          </View>

          {/* Session Recommended */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Session Recommended</Text>
            <TextInput style={styles.input} placeholder="e.g. consultation / 6 / 10 sessions" placeholderTextColor="#aaa" value={sessionRecommended} onChangeText={setSessionRecommended} />
          </View>

          {/* Functional Limitation */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Functional Limitation</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Enter functional limitation" placeholderTextColor="#aaa" value={functionalLimitation} onChangeText={setFunctionalLimitation} multiline />
          </View>

          {/* Treatment Plan */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Treatment Plan</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Enter treatment plan" placeholderTextColor="#aaa" value={treatmentPlan} onChangeText={setTreatmentPlan} multiline />
          </View>

          {/* Goals / Recommendations */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Goals</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Enter goals" placeholderTextColor="#aaa" value={goals} onChangeText={setGoals} multiline />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Recommendations</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Enter recommendations" placeholderTextColor="#aaa" value={recommendations} onChangeText={setRecommendations} multiline />
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
        date={new Date(prescriptionDate)}
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

export default AddPhysioPrescription;

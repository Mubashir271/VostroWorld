import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { RootState } from '../../../redux/store';
import {
  getClientHub,
  getDietPlanGoalOptions,
  getAppointmentTrainers,
} from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const display = (s: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${m}/${d}/${y}`;
};

const clientLabel = (c: any) => c?.full_name || `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || '—';

const today = fmt(new Date());

const AddDietPlanIssued = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [client, setClient] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [date, setDate] = useState(today);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [trainer, setTrainer] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [trainerDropOpen, setTrainerDropOpen] = useState(false);

  const [goal, setGoal] = useState('');
  const [goalOptions, setGoalOptions] = useState<string[]>([]);
  const [goalDropOpen, setGoalDropOpen] = useState(false);

  const [dietPlanIssued, setDietPlanIssued] = useState(false);
  const [remarks, setRemarks] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDietPlanGoalOptions({ branch_id: branchId })
      .then(res => setGoalOptions(res.data?.data ?? []))
      .catch(() => setGoalOptions([]));
  }, [branchId]);

  useFocusEffect(
    useCallback(() => {
      getAppointmentTrainers({ branch_id: branchId })
        .then(res => setTrainers(res.data?.data ?? []))
        .catch(() => setTrainers([]));
    }, [branchId]),
  );

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
    setClientDropOpen(false);
    setClientResults([]);
    setClientSearch('');
  };

  const clearClient = () => setClient(null);

  const handleDateConfirm = (d: Date) => {
    setDate(fmt(d));
    setPickerOpen(false);
  };

  const handleSave = () => {
    if (!client || !date) {
      Alert.alert('Missing Fields', 'Please select a Client and Date.');
      return;
    }
    // NOTE: POST /v1/nutrition/diet-plans (addDietPlanIssued) is implemented in
    // src/api/nutrition.ts but intentionally not called yet, per the
    // "avoid POST for now" guidance.
    Alert.alert('Not Yet Enabled', 'Saving diet plan records is not yet enabled in this build.');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Diet Plan Record"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Client */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Client <Text style={styles.req}>*</Text></Text>
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
                    placeholder="Type to search client by name or phone..."
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

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date <Text style={styles.req}>*</Text></Text>
            <TouchableOpacity style={styles.dateBox} onPress={() => setPickerOpen(true)}>
              <Text style={styles.dateText}>{display(date)}</Text>
              <Icon name="calendar" size={16} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={styles.row2}>
            {/* Trainer */}
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Trainer</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setTrainerDropOpen(v => !v)}>
                <Text style={styles.dropdownText} numberOfLines={1}>{trainer ? clientLabel(trainer) : '— Select Trainer —'}</Text>
                <Icon name={trainerDropOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
              </TouchableOpacity>
              {trainerDropOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={{ maxHeight: 200 }}>
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

            {/* Goal */}
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Goal</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setGoalDropOpen(v => !v)}>
                <Text style={styles.dropdownText} numberOfLines={1}>{goal || '— Select Goal —'}</Text>
                <Icon name={goalDropOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />
              </TouchableOpacity>
              {goalDropOpen && (
                <View style={styles.dropdownMenu}>
                  {goalOptions.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.dropdownItem, goal === opt && styles.dropdownItemActive]}
                      onPress={() => { setGoal(opt); setGoalDropOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, goal === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                      {goal === opt && <Icon name="check" size={14} color="#E63946" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Diet Plan Issued toggle */}
          <View style={styles.switchRow}>
            <Switch
              value={dietPlanIssued}
              onValueChange={setDietPlanIssued}
              trackColor={{ false: '#E0E0E0', true: '#F8C9CD' }}
              thumbColor={dietPlanIssued ? '#E63946' : '#FFF'}
            />
            <Text style={styles.switchLabel}>Diet Plan Issued</Text>
          </View>

          {/* Remarks */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Remarks</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Optional notes..."
              placeholderTextColor="#aaa"
              value={remarks}
              onChangeText={setRemarks}
              multiline
            />
          </View>
        </View>

        {/* Cancel / Save */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      <DateTimePickerModal
        isVisible={pickerOpen}
        mode="date"
        date={new Date(date)}
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

  row2:         { flexDirection: 'row', gap: 10 },

  input:        { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  textarea:     { height: 80, textAlignVertical: 'top' },

  dateBox:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dateText:     { fontSize: 14, color: '#1A1A1A' },

  dropdown:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dropdownText: { fontSize: 14, color: '#1A1A1A', flex: 1 },
  dropdownMenu: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemActive: { backgroundColor: '#FFF5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },
  dropdownItemTextActive: { color: '#E63946', fontWeight: '700' },

  selectedClient: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F7FF', borderRadius: 8, padding: 10 },
  selectedClientText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA' },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },

  switchRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  switchLabel:  { fontSize: 14, fontWeight: '600', color: '#333' },

  btnRow:       { flexDirection: 'row', gap: 10 },
  cancelBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 13, backgroundColor: '#F0F0F0' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#555' },
  saveBtn:      { flex: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 13, backgroundColor: '#E63946' },
  saveBtnText:  { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default AddDietPlanIssued;

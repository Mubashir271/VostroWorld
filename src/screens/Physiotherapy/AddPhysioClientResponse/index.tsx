import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getPhysioAppointmentPhysios, addPhysioClientResponse } from '../../../api/physio';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const personLabel = (p: any) =>
  p?.name || p?.full_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || '—';

const displayTimestamp = (d: Date) => {
  const date = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  let h = d.getHours();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  const time = `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${period}`;
  return `${date}, ${time}`;
};

const AddPhysioClientResponse = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const [physios, setPhysios] = useState<any[]>([]);
  const [physio, setPhysio] = useState<any>(null);
  const [physioDropOpen, setPhysioDropOpen] = useState(false);

  // Timestamp is auto-filled at open time and read-only, matching the web admin.
  const [timestamp] = useState(() => new Date());

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [mostHelpfulPart, setMostHelpfulPart] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState('');
  const [unclearOrConfusing, setUnclearOrConfusing] = useState('');
  const [changeOneThing, setChangeOneThing] = useState('');
  const [suggestions, setSuggestions] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPhysioAppointmentPhysios({ branch_id: branchId })
      .then(res => setPhysios(res.data?.data ?? []))
      .catch(() => setPhysios([]));
  }, [branchId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Name.');
      return;
    }
    setSaving(true);
    try {
      await addPhysioClientResponse({
        branch_id: branchId,
        physiotherapist_id: physio?.id,
        timestamp: timestamp.toISOString(),
        name: name.trim(),
        age: age.trim() || undefined,
        most_helpful_part: mostHelpfulPart.trim() || undefined,
        confidence_level: confidenceLevel.trim() || undefined,
        unclear_or_confusing: unclearOrConfusing.trim() || undefined,
        change_one_thing: changeOneThing.trim() || undefined,
        suggestions: suggestions.trim() || undefined,
      });
      Alert.alert('Success', 'Response created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not create the response. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Response"
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

          {/* Timestamp (read-only) */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Timestamp</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{displayTimestamp(timestamp)}</Text>
            </View>
          </View>

          {/* Name / Age */}
          <View style={styles.row}>
            <View style={[styles.field, styles.flex2]}>
              <Text style={styles.fieldLabel}>Name <Text style={styles.req}>*</Text></Text>
              <TextInput style={styles.input} placeholder="Enter name" placeholderTextColor="#aaa" value={name} onChangeText={setName} />
            </View>
            <View style={[styles.field, styles.flex1]}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#aaa" value={age} onChangeText={setAge} keyboardType="number-pad" />
            </View>
          </View>

          {/* Q1 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>What was the MOST helpful part of your consultation today?</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholderTextColor="#aaa" value={mostHelpfulPart} onChangeText={setMostHelpfulPart} multiline />
          </View>

          {/* Q2 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>After the consultation, how confident do you feel about managing your condition?</Text>
            <TextInput style={styles.input} placeholderTextColor="#aaa" value={confidenceLevel} onChangeText={setConfidenceLevel} />
          </View>

          {/* Q3 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Did anything feel unclear, rushed, or confusing during your visit?</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholderTextColor="#aaa" value={unclearOrConfusing} onChangeText={setUnclearOrConfusing} multiline />
          </View>

          {/* Q4 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>If you could change ONE thing about your consultation, what would it be?</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholderTextColor="#aaa" value={changeOneThing} onChangeText={setChangeOneThing} multiline />
          </View>

          {/* Suggestions */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Suggestions</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholderTextColor="#aaa" value={suggestions} onChangeText={setSuggestions} multiline />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },

  field:        { marginBottom: 14 },
  row:          { flexDirection: 'row', gap: 10 },
  flex1:        { flex: 1 },
  flex2:        { flex: 2 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  req:          { color: '#E63946' },

  input:        { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  textarea:     { height: 80, textAlignVertical: 'top' },

  readonlyBox:  { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F5F5F5' },
  readonlyText: { fontSize: 14, color: '#555' },

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

export default AddPhysioClientResponse;

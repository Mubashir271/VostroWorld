import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getClientHub, addNutritionAssessment } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const PMH_FIELDS = [
  { key: 'diabetes', label: 'Diabetes type 1 or 2' },
  { key: 'hypertension_cvd', label: 'Hypertension or CVD' },
  { key: 'polycystic_ovarian_syndrome', label: 'Polycystic ovarian syndrome' },
  { key: 'anemia', label: 'Anemia' },
  { key: 'ibs', label: 'IBS' },
  { key: 'h_pylori', label: 'H. Pylori' },
];

const STRESS_LEVELS = ['Minimal', 'Moderate', 'Unbearable'];
const ACTIVITY_LEVELS = ['Office Job (Sedentary)', 'Light exercise', 'Moderate exercise', 'Heavy exercise', 'Athlete'];

const clientLabel = (c: any) => c?.full_name || `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || '—';

const Field = ({ label, value, onChangeText, required, multiline, keyboardType }: any) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label} {required && <Text style={styles.req}>*</Text>}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textarea]}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      keyboardType={keyboardType}
      placeholderTextColor="#aaa"
    />
  </View>
);

const YesNo = ({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) => (
  <View style={styles.yesNoRow}>
    <Text style={styles.yesNoLabel}>{label}</Text>
    <View style={styles.yesNoBtns}>
      <TouchableOpacity style={[styles.yesNoBtn, value === true && styles.yesNoBtnActive]} onPress={() => onChange(true)}>
        <Text style={[styles.yesNoBtnText, value === true && styles.yesNoBtnTextActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.yesNoBtn, value === false && styles.yesNoBtnActive]} onPress={() => onChange(false)}>
        <Text style={[styles.yesNoBtnText, value === false && styles.yesNoBtnTextActive]}>No</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const RadioGroup = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
  <View style={{ gap: 8 }}>
    {options.map(opt => (
      <TouchableOpacity key={opt} style={styles.radioRow} onPress={() => onChange(opt)}>
        <Icon name={value === opt ? 'radiobox-marked' : 'radiobox-blank'} size={18} color={value === opt ? '#E63946' : '#999'} />
        <Text style={styles.radioLabel}>{opt}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const AddNutritionAssessments = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';
  const branchName = profile?.branchName ?? `Branch ${branchId}`;

  const [client, setClient] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [clientName, setClientName] = useState('');
  const [dailyWaterIntake, setDailyWaterIntake] = useState('');
  const [dislikedFoods, setDislikedFoods] = useState('');
  const [allergicFoods, setAllergicFoods] = useState('');
  const [preferredFoods, setPreferredFoods] = useState('');

  const [pmh, setPmh] = useState<Record<string, boolean | null>>({});
  const [stressLevel, setStressLevel] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [comments, setComments] = useState('');
  const [musclePain, setMusclePain] = useState('');
  const [anyOtherIssue, setAnyOtherIssue] = useState('');

  const [saving, setSaving] = useState(false);

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
    setClientDropOpen(false);
    setClientResults([]);
    setClientSearch('');
  };

  const clearClient = () => {
    setClient(null);
    setClientName('');
  };

  const handleAdd = async () => {
    if (!clientName.trim() || !dailyWaterIntake.trim() || !dislikedFoods.trim() || !allergicFoods.trim() || !preferredFoods.trim() || !activityLevel || !musclePain.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required (*) fields.');
      return;
    }
    setSaving(true);
    try {
      await addNutritionAssessment({
        branch_id: branchId,
        client_id: client?.id,
        client_name: clientName.trim(),
        daily_water_intake: dailyWaterIntake.trim(),
        disliked_foods: dislikedFoods.trim(),
        allergic_foods: allergicFoods.trim(),
        preferred_foods: preferredFoods.trim(),
        diabetes: !!pmh.diabetes,
        hypertension_cvd: !!pmh.hypertension_cvd,
        polycystic_ovarian_syndrome: !!pmh.polycystic_ovarian_syndrome,
        anemia: !!pmh.anemia,
        ibs: !!pmh.ibs,
        h_pylori: !!pmh.h_pylori,
        stress_level: stressLevel || undefined,
        activity_level: activityLevel,
        comments: comments.trim() || undefined,
        muscle_pain: musclePain.trim(),
        any_other_issue: anyOtherIssue.trim() || undefined,
      });
      Alert.alert('Success', 'Nutrition assessment saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save the assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Nutrition Assessments"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Branch Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Branch Name <Text style={styles.req}>*</Text></Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{branchName}</Text>
              <Icon name="chevron-down" size={18} color="#aaa" />
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
          <Field label="Client Name" value={clientName} onChangeText={setClientName} required />

          {/* Daily Water Intake */}
          <Field label="Daily Water Intake" value={dailyWaterIntake} onChangeText={setDailyWaterIntake} required />

          {/* Food you Don't Prefer */}
          <Field label="Food you Don't Prefer" value={dislikedFoods} onChangeText={setDislikedFoods} required multiline />

          {/* Food Allergies if any */}
          <Field label="Food Allergies if any" value={allergicFoods} onChangeText={setAllergicFoods} required multiline />

          {/* Foods you Prefer */}
          <Field label="Foods you Prefer" value={preferredFoods} onChangeText={setPreferredFoods} required multiline />
        </View>

        {/* P.M.H */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>P.M.H (Past Medical History)</Text>
          {PMH_FIELDS.map(f => (
            <YesNo
              key={f.key}
              label={f.label}
              value={pmh[f.key] ?? null}
              onChange={(v) => setPmh(prev => ({ ...prev, [f.key]: v }))}
            />
          ))}
        </View>

        {/* Stress & Activity */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Do you take stress</Text>
          <RadioGroup options={STRESS_LEVELS} value={stressLevel} onChange={setStressLevel} />

          <View style={{ height: 14 }} />
          <Text style={styles.fieldLabel}>Activity Level <Text style={styles.req}>*</Text></Text>
          <RadioGroup options={ACTIVITY_LEVELS} value={activityLevel} onChange={setActivityLevel} />
        </View>

        {/* Other Details */}
        <View style={styles.card}>
          <Field label="Comments" value={comments} onChangeText={setComments} multiline />
          <Field label="Joint mobility issue or muscle pain" value={musclePain} onChangeText={setMusclePain} required multiline />
          <Field label="Any other issue (DISEASE OR SURGERY)" value={anyOtherIssue} onChangeText={setAnyOtherIssue} multiline />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.addBtnText}>Add</Text>}
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  card:         { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 },

  field:        { marginBottom: 14 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  req:          { color: '#E63946' },

  input:        { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  textarea:     { height: 80, textAlignVertical: 'top' },

  readonlyBox:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F5F5F5' },
  readonlyText: { fontSize: 14, color: '#555' },

  selectedClient: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F7FF', borderRadius: 8, padding: 10 },
  selectedClientText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA' },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },
  dropdownMenu: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemText: { fontSize: 13, color: '#333' },

  yesNoRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  yesNoLabel:   { fontSize: 13, color: '#333', flex: 1 },
  yesNoBtns:    { flexDirection: 'row', gap: 6 },
  yesNoBtn:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0' },
  yesNoBtnActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  yesNoBtnText: { fontSize: 12, fontWeight: '700', color: '#555' },
  yesNoBtnTextActive: { color: '#FFF' },

  radioRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioLabel:   { fontSize: 13, color: '#333' },

  addBtn:       { backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  addBtnText:   { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default AddNutritionAssessments;

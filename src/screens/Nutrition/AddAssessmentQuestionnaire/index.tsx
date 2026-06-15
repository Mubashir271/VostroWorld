import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getClientHub, addAssessmentForm, updateAssessmentForm } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

const PLAN_OBJECTIVES = ['Weight Loss', 'Weight Gain', 'Muscle Gain', 'Body Toning', 'General Health Improvement'];
const STRESS_LEVELS = ['Minimal', 'Moderate', 'Unbearable'];
const ACTIVITY_LEVELS = ['Office Job (Sedentary)', 'Light exercise', 'Moderate exercise', 'Heavy exercise', 'Athlete'];
const PMH_FIELDS = [
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hypertension_cvd', label: 'Hypertension / CVD' },
  { key: 'polycystic_ovarian_syndrome', label: 'Polycystic Ovarian Syndrome' },
  { key: 'anemia', label: 'Anemia' },
  { key: 'ibs', label: 'IBS' },
  { key: 'h_pylori', label: 'H. Pylori' },
];
const BACKGROUND_FIELDS = [
  { key: 'tried_diet_plans', label: 'Tried Diet Plans Before' },
  { key: 'gym_member', label: 'Gym Member' },
  { key: 'following_diet', label: 'Currently Following a Diet' },
  { key: 'undergoing_training', label: 'Undergoing Training' },
];
const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
  { key: 'munching', label: 'Munching' },
];

const emptyEntry = () => ({
  assessment_date: '', weight: '', bmi: '', chest: '', belly: '', hips: '', arms: '', thighs: '', fat: '', vf: '',
});

const emptyDietary = () => {
  const obj: any = {};
  MEALS.forEach(m => { obj[`${m.key}_time`] = ''; obj[`${m.key}_spec`] = ''; });
  return obj;
};

const clientLabel = (c: any) => c?.full_name || `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || '—';

const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
  <View style={styles.sectionHeader}>
    <Icon name={icon} size={18} color="#E63946" />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const Field = ({ label, value, onChangeText, keyboardType, multiline }: any) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textarea]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      multiline={multiline}
    />
  </View>
);

const YesNo = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <View style={styles.yesNoRow}>
    <Text style={styles.yesNoLabel}>{label}</Text>
    <View style={styles.yesNoBtns}>
      <TouchableOpacity style={[styles.yesNoBtn, value && styles.yesNoBtnActive]} onPress={() => onChange(true)}>
        <Text style={[styles.yesNoBtnText, value && styles.yesNoBtnTextActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.yesNoBtn, !value && styles.yesNoBtnActive]} onPress={() => onChange(false)}>
        <Text style={[styles.yesNoBtnText, !value && styles.yesNoBtnTextActive]}>No</Text>
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

const Checkbox = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
  <TouchableOpacity style={styles.checkboxRow} onPress={onToggle}>
    <Icon name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={checked ? '#43A047' : '#999'} />
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

const AddAssessmentQuestionnaire = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId ?? 1;

  const passedClient = route.params?.client;
  const editingForm = route.params?.form;

  const [client, setClient] = useState<any>(passedClient ?? (editingForm?.client ?? null));
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('');

  const [goals, setGoals] = useState<Record<string, boolean>>({});
  const [bodyEntries, setBodyEntries] = useState<any[]>([emptyEntry()]);

  const [planObjectives, setPlanObjectives] = useState<string[]>([]);
  const [background, setBackground] = useState<Record<string, boolean>>({});
  const [medicineSupplements, setMedicineSupplements] = useState('');

  const [dietary, setDietary] = useState<any>(emptyDietary());

  const [dailyWaterIntake, setDailyWaterIntake] = useState('');
  const [dislikedFoods, setDislikedFoods] = useState('');
  const [allergicFoods, setAllergicFoods] = useState('');
  const [preferredFoods, setPreferredFoods] = useState('');

  const [pmh, setPmh] = useState<Record<string, boolean>>({});
  const [musclePain, setMusclePain] = useState('');
  const [anyOtherIssue, setAnyOtherIssue] = useState('');

  const [stressLevel, setStressLevel] = useState('');
  const [activityLevel, setActivityLevel] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingForm) return;
    setName(editingForm.name ?? '');
    setAge(editingForm.age ? String(editingForm.age) : '');
    setHeight(editingForm.height ? String(editingForm.height) : '');
    setGender(editingForm.gender ?? '');
    setGoals({
      goal_fat_loss: !!editingForm.goal_fat_loss,
      goal_muscle_strength: !!editingForm.goal_muscle_strength,
      goal_disease_management: !!editingForm.goal_disease_management,
    });
    if (Array.isArray(editingForm.body_entries) && editingForm.body_entries.length) {
      setBodyEntries(editingForm.body_entries.map((e: any) => ({
        assessment_date: e.assessment_date ?? '', weight: String(e.weight ?? ''), bmi: String(e.bmi ?? ''),
        chest: String(e.chest ?? ''), belly: String(e.belly ?? ''), hips: String(e.hips ?? ''),
        arms: String(e.arms ?? ''), thighs: String(e.thighs ?? ''), fat: String(e.fat ?? ''), vf: String(e.vf ?? ''),
      })));
    }
    setPlanObjectives(Array.isArray(editingForm.plan_objectives) ? editingForm.plan_objectives : []);
    setBackground({
      tried_diet_plans: !!editingForm.tried_diet_plans,
      gym_member: !!editingForm.gym_member,
      following_diet: !!editingForm.following_diet,
      undergoing_training: !!editingForm.undergoing_training,
    });
    setMedicineSupplements(editingForm.medicine_supplements ?? '');
    if (editingForm.daily_dietary_intake) {
      const d: any = emptyDietary();
      MEALS.forEach(m => {
        d[`${m.key}_time`] = editingForm.daily_dietary_intake[`${m.key}_time`] ?? '';
        d[`${m.key}_spec`] = editingForm.daily_dietary_intake[`${m.key}_spec`] ?? '';
      });
      setDietary(d);
    }
    setDailyWaterIntake(editingForm.daily_water_intake ?? '');
    setDislikedFoods(editingForm.disliked_foods ?? '');
    setAllergicFoods(editingForm.allergic_foods ?? '');
    setPreferredFoods(editingForm.preferred_foods ?? '');
    setPmh({
      diabetes: !!editingForm.diabetes,
      hypertension_cvd: !!editingForm.hypertension_cvd,
      polycystic_ovarian_syndrome: !!editingForm.polycystic_ovarian_syndrome,
      anemia: !!editingForm.anemia,
      ibs: !!editingForm.ibs,
      h_pylori: !!editingForm.h_pylori,
    });
    setMusclePain(editingForm.muscle_pain ?? '');
    setAnyOtherIssue(editingForm.any_other_issue ?? '');
    setStressLevel(editingForm.stress_level ?? '');
    setActivityLevel(editingForm.activity_level ?? '');
  }, [editingForm]);

  useEffect(() => {
    if (!passedClient) return;
    setName(passedClient.full_name ?? '');
    setGender(passedClient.gender ?? '');
  }, [passedClient]);

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
    setName(c.full_name ?? name);
    setGender(c.gender ?? gender);
    setClientDropOpen(false);
    setClientResults([]);
    setClientSearch('');
  };

  const updateEntry = (idx: number, key: string, value: string) => {
    setBodyEntries(prev => prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
  };

  const addEntry = () => setBodyEntries(prev => [...prev, emptyEntry()]);
  const removeEntry = (idx: number) => setBodyEntries(prev => prev.filter((_, i) => i !== idx));

  const toggleObjective = (opt: string) =>
    setPlanObjectives(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);

  const save = async () => {
    if (!client && !editingForm) {
      Alert.alert('Select Client', 'Please select a client for this questionnaire.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        branch_id: branchId,
        client_id: client?.id ?? editingForm?.client_id,
        name, age: age ? Number(age) : undefined, height: height ? Number(height) : undefined, gender,
        goal_fat_loss: !!goals.goal_fat_loss,
        goal_muscle_strength: !!goals.goal_muscle_strength,
        goal_disease_management: !!goals.goal_disease_management,
        body_entries: bodyEntries
          .filter(e => e.assessment_date || e.weight)
          .map(e => ({
            assessment_date: e.assessment_date || undefined,
            weight: e.weight ? Number(e.weight) : undefined,
            bmi: e.bmi ? Number(e.bmi) : undefined,
            chest: e.chest ? Number(e.chest) : undefined,
            belly: e.belly ? Number(e.belly) : undefined,
            hips: e.hips ? Number(e.hips) : undefined,
            arms: e.arms ? Number(e.arms) : undefined,
            thighs: e.thighs ? Number(e.thighs) : undefined,
            fat: e.fat ? Number(e.fat) : undefined,
            vf: e.vf ? Number(e.vf) : undefined,
          })),
        plan_objectives: planObjectives,
        tried_diet_plans: !!background.tried_diet_plans,
        gym_member: !!background.gym_member,
        following_diet: !!background.following_diet,
        undergoing_training: !!background.undergoing_training,
        medicine_supplements: medicineSupplements || undefined,
        daily_dietary_intake: dietary,
        daily_water_intake: dailyWaterIntake || undefined,
        disliked_foods: dislikedFoods || undefined,
        allergic_foods: allergicFoods || undefined,
        preferred_foods: preferredFoods || undefined,
        diabetes: !!pmh.diabetes,
        hypertension_cvd: !!pmh.hypertension_cvd,
        polycystic_ovarian_syndrome: !!pmh.polycystic_ovarian_syndrome,
        anemia: !!pmh.anemia,
        ibs: !!pmh.ibs,
        h_pylori: !!pmh.h_pylori,
        muscle_pain: musclePain || undefined,
        any_other_issue: anyOtherIssue || undefined,
        stress_level: stressLevel || undefined,
        activity_level: activityLevel || undefined,
      };

      if (editingForm) {
        await updateAssessmentForm(editingForm.id, payload);
      } else {
        await addAssessmentForm(payload);
      }
      Alert.alert('Success', `Questionnaire ${editingForm ? 'updated' : 'saved'} successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save the questionnaire. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={editingForm ? 'Edit Questionnaire' : 'New Assessment Questionnaire'}
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {/* Select Client */}
        <View style={styles.card}>
          <SectionHeader title="Select Client" icon="account-search-outline" />
          {client ? (
            <View style={styles.selectedClient}>
              <Icon name="account-circle-outline" size={22} color="#1E88E5" />
              <Text style={styles.selectedClientText}>{clientLabel(client)}</Text>
              {!editingForm && (
                <TouchableOpacity onPress={() => setClient(null)}>
                  <Icon name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
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

        {/* Personal Information */}
        <View style={styles.card}>
          <SectionHeader title="Personal Information" icon="account-outline" />
          <Field label="Name" value={name} onChangeText={setName} />
          <View style={styles.row3}>
            <View style={{ flex: 1 }}><Field label="Age" value={age} onChangeText={setAge} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Field label="Gender" value={gender} onChangeText={setGender} /></View>
          </View>
        </View>

        {/* Goals */}
        <View style={styles.card}>
          <SectionHeader title="Goals" icon="target" />
          <Checkbox label="Fat Loss" checked={!!goals.goal_fat_loss} onToggle={() => setGoals(g => ({ ...g, goal_fat_loss: !g.goal_fat_loss }))} />
          <Checkbox label="Muscle Strength" checked={!!goals.goal_muscle_strength} onToggle={() => setGoals(g => ({ ...g, goal_muscle_strength: !g.goal_muscle_strength }))} />
          <Checkbox label="Disease Management" checked={!!goals.goal_disease_management} onToggle={() => setGoals(g => ({ ...g, goal_disease_management: !g.goal_disease_management }))} />
        </View>

        {/* Body Assessment */}
        <View style={styles.card}>
          <SectionHeader title="Body Assessment" icon="human" />
          {bodyEntries.map((entry, idx) => (
            <View key={idx} style={styles.entryBox}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>Assessment {idx + 1}</Text>
                {bodyEntries.length > 1 && (
                  <TouchableOpacity onPress={() => removeEntry(idx)}>
                    <Icon name="trash-can-outline" size={16} color="#E63946" />
                  </TouchableOpacity>
                )}
              </View>
              <Field label="Date (YYYY-MM-DD)" value={entry.assessment_date} onChangeText={(v: string) => updateEntry(idx, 'assessment_date', v)} />
              <View style={styles.row3}>
                <View style={{ flex: 1 }}><Field label="Weight (kg)" value={entry.weight} onChangeText={(v: string) => updateEntry(idx, 'weight', v)} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Field label="BMI" value={entry.bmi} onChangeText={(v: string) => updateEntry(idx, 'bmi', v)} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Field label="Fat %" value={entry.fat} onChangeText={(v: string) => updateEntry(idx, 'fat', v)} keyboardType="numeric" /></View>
              </View>
              <View style={styles.row3}>
                <View style={{ flex: 1 }}><Field label="Chest" value={entry.chest} onChangeText={(v: string) => updateEntry(idx, 'chest', v)} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Field label="Belly" value={entry.belly} onChangeText={(v: string) => updateEntry(idx, 'belly', v)} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Field label="Hips" value={entry.hips} onChangeText={(v: string) => updateEntry(idx, 'hips', v)} keyboardType="numeric" /></View>
              </View>
              <View style={styles.row3}>
                <View style={{ flex: 1 }}><Field label="Arms" value={entry.arms} onChangeText={(v: string) => updateEntry(idx, 'arms', v)} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Field label="Thighs" value={entry.thighs} onChangeText={(v: string) => updateEntry(idx, 'thighs', v)} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Field label="VF" value={entry.vf} onChangeText={(v: string) => updateEntry(idx, 'vf', v)} keyboardType="numeric" /></View>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addEntryBtn} onPress={addEntry}>
            <Icon name="plus" size={16} color="#E63946" />
            <Text style={styles.addEntryText}>Add Assessment</Text>
          </TouchableOpacity>
        </View>

        {/* Plan & Background */}
        <View style={styles.card}>
          <SectionHeader title="Plan & Background" icon="clipboard-list-outline" />
          <Text style={styles.fieldLabel}>Plan Objectives</Text>
          {PLAN_OBJECTIVES.map(opt => (
            <Checkbox key={opt} label={opt} checked={planObjectives.includes(opt)} onToggle={() => toggleObjective(opt)} />
          ))}
          <View style={{ height: 8 }} />
          {BACKGROUND_FIELDS.map(f => (
            <YesNo
              key={f.key}
              label={f.label}
              value={!!background[f.key]}
              onChange={(v) => setBackground(prev => ({ ...prev, [f.key]: v }))}
            />
          ))}
          <Field label="Medicines / Supplements" value={medicineSupplements} onChangeText={setMedicineSupplements} multiline />
        </View>

        {/* Daily Dietary Intake */}
        <View style={styles.card}>
          <SectionHeader title="Daily Dietary Intake" icon="food-fork-drink" />
          {MEALS.map(m => (
            <View key={m.key} style={styles.mealRow}>
              <Text style={styles.mealLabel}>{m.label}</Text>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}><Field label="Time" value={dietary[`${m.key}_time`]} onChangeText={(v: string) => setDietary((d: any) => ({ ...d, [`${m.key}_time`]: v }))} /></View>
                <View style={{ flex: 2 }}><Field label="What do you eat" value={dietary[`${m.key}_spec`]} onChangeText={(v: string) => setDietary((d: any) => ({ ...d, [`${m.key}_spec`]: v }))} /></View>
              </View>
            </View>
          ))}
        </View>

        {/* Food Preferences */}
        <View style={styles.card}>
          <SectionHeader title="Food Preferences" icon="silverware-fork-knife" />
          <Field label="Daily Water Intake" value={dailyWaterIntake} onChangeText={setDailyWaterIntake} />
          <Field label="Disliked Foods" value={dislikedFoods} onChangeText={setDislikedFoods} multiline />
          <Field label="Allergic Foods" value={allergicFoods} onChangeText={setAllergicFoods} multiline />
          <Field label="Preferred Foods" value={preferredFoods} onChangeText={setPreferredFoods} multiline />
        </View>

        {/* P.M.H */}
        <View style={styles.card}>
          <SectionHeader title="P.M.H (Past Medical History)" icon="medical-bag" />
          {PMH_FIELDS.map(f => (
            <YesNo
              key={f.key}
              label={f.label}
              value={!!pmh[f.key]}
              onChange={(v) => setPmh(prev => ({ ...prev, [f.key]: v }))}
            />
          ))}
          <Field label="Muscle Pain" value={musclePain} onChangeText={setMusclePain} multiline />
          <Field label="Any Other Issue" value={anyOtherIssue} onChangeText={setAnyOtherIssue} multiline />
        </View>

        {/* Lifestyle & Stress */}
        <View style={styles.card}>
          <SectionHeader title="Lifestyle & Stress" icon="meditation" />
          <Text style={styles.fieldLabel}>Stress Level</Text>
          <RadioGroup options={STRESS_LEVELS} value={stressLevel} onChange={setStressLevel} />
          <View style={{ height: 12 }} />
          <Text style={styles.fieldLabel}>Activity Level</Text>
          <RadioGroup options={ACTIVITY_LEVELS} value={activityLevel} onChange={setActivityLevel} />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>{editingForm ? 'Update Questionnaire' : 'Save Questionnaire'}</Text>}
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  card:         { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },

  fieldLabel:   { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  textarea:     { height: 64, textAlignVertical: 'top' },

  row3:         { flexDirection: 'row', gap: 8 },
  row2:         { flexDirection: 'row', gap: 8 },

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

  checkboxRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checkboxLabel: { fontSize: 13, color: '#333' },

  entryBox:     { borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#FAFAFA' },
  entryHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryTitle:   { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  addEntryBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#E63946', borderRadius: 8, paddingVertical: 10, borderStyle: 'dashed' },
  addEntryText: { fontSize: 13, fontWeight: '700', color: '#E63946' },

  mealRow:      { marginBottom: 8 },
  mealLabel:    { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },

  saveBtn:      { backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  saveBtnText:  { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default AddAssessmentQuestionnaire;

// src/screens/Nutrition/AddAssessmentQuestionnaire/index.tsx
//
// Nutritionist Assessment Questionnaire — add / edit. Field types, option ids
// and the save payload follow the web's form (main.f794ea60.js, read from the
// 2026-10-06 HAR, plus the PUT it sent for form 329):
//  • age, height, gender and the four "lifestyle" answers are free text
//    ("24 years", "155 cm", "Personal Training"), not numbers or booleans;
//  • P.M.H answers are the strings "Yes" / "No" / "" (tap again to clear);
//  • plan_objectives holds ids: fat_loss, muscle_strength, disease_management;
//  • goal_fat_loss / goal_muscle_strength / goal_disease_management are
//    free-text notes, shown only when a record already has one;
//  • every body entry is sent (at least 3), blank values as "", a blank date
//    as null; nutritionist_id is the logged-in staff id;
//  • picking a client who already has a questionnaire opens that one rather
//    than starting a duplicate (GET …/by-client/{id}).

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../redux/store';
import { getClientHub, addAssessmentForm, updateAssessmentForm, getAssessmentFormByClient } from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { downloadQuestionnairePdf } from '../../../utils/questionnairePdf';
import QuestionnaireSheet from './QuestionnaireSheet';

const PLAN_OBJECTIVES = [
  { id: 'fat_loss', label: 'Fat loss/weight loss' },
  { id: 'muscle_strength', label: 'Muscle and strength gain' },
  { id: 'disease_management', label: 'Disease management' },
];
const GOAL_NOTES = [
  { key: 'goal_fat_loss', label: 'Fat Loss Note' },
  { key: 'goal_muscle_strength', label: 'Muscle Gain Note' },
  { key: 'goal_disease_management', label: 'Disease Management Note' },
];
const MIN_ENTRIES = 3;
const STRESS_LEVELS = ['Minimal', 'Moderate', 'Unbearable'];
const ACTIVITY_LEVELS = ['Office Job (Sedentary)', 'Light exercise', 'Moderate exercise', 'Heavy exercise', 'Athlete'];
const PMH_FIELDS = [
  { key: 'diabetes', label: 'Diabetes type 1 or 2' },
  { key: 'hypertension_cvd', label: 'Hypertension or CVD' },
  { key: 'polycystic_ovarian_syndrome', label: 'Polycystic ovarian syndrome' },
  { key: 'anemia', label: 'Anemia' },
  { key: 'ibs', label: 'IBS' },
  { key: 'h_pylori', label: 'H. Pylori' },
];
const BACKGROUND_FIELDS = [
  { key: 'tried_diet_plans', label: 'Have you tried any diet plans before?' },
  { key: 'gym_member', label: 'Gym member or not' },
  { key: 'following_diet', label: 'Already following any diet' },
  { key: 'undergoing_training', label: 'Undergoing any type of training' },
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

const str = (v: any) => (v === null || v === undefined ? '' : String(v));

// "2026-10-06T00:00:00Z" / "2026-10-06" → "2026-10-06", as the web normalises.
const isoDate = (v: any) => {
  const t = str(v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : t;
};

const padEntries = (list: any[]) => {
  const out = [...list];
  while (out.length < MIN_ENTRIES) out.push(emptyEntry());
  return out;
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

// "Yes" / "No" / "" — tapping the selected answer again clears it, as on the web.
const YesNo = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <View style={styles.yesNoRow}>
    <Text style={styles.yesNoLabel}>{label}</Text>
    <View style={styles.yesNoBtns}>
      {['Yes', 'No'].map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.yesNoBtn, value === opt && styles.yesNoBtnActive]}
          onPress={() => onChange(value === opt ? '' : opt)}
        >
          <Text style={[styles.yesNoBtnText, value === opt && styles.yesNoBtnTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
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
  const branchId = profile?.branchId || '';

  const passedClient = route.params?.client;
  // The record being edited — from the list, or found for the picked client.
  const [editingForm, setEditingForm] = useState<any>(route.params?.form ?? null);

  const [client, setClient] = useState<any>(passedClient ?? (editingForm?.client ?? null));
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('');

  const [goals, setGoals] = useState<Record<string, string>>({});
  const [bodyEntries, setBodyEntries] = useState<any[]>(padEntries([]));

  const [planObjectives, setPlanObjectives] = useState<string[]>([]);
  const [background, setBackground] = useState<Record<string, string>>({});
  const [medicineSupplements, setMedicineSupplements] = useState('');

  const [dietary, setDietary] = useState<any>(emptyDietary());

  const [dailyWaterIntake, setDailyWaterIntake] = useState('');
  const [dislikedFoods, setDislikedFoods] = useState('');
  const [allergicFoods, setAllergicFoods] = useState('');
  const [preferredFoods, setPreferredFoods] = useState('');

  const [pmh, setPmh] = useState<Record<string, string>>({});
  const [musclePain, setMusclePain] = useState('');
  const [anyOtherIssue, setAnyOtherIssue] = useState('');

  const [stressLevel, setStressLevel] = useState('');
  const [activityLevel, setActivityLevel] = useState('');

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  // A saved questionnaire opens as the printed form, like the web's
  // Edit/View page; Edit switches to the input form.
  const [mode, setMode] = useState<'view' | 'edit'>(route.params?.form ? 'view' : 'edit');

  useEffect(() => {
    if (!editingForm) return;
    if (editingForm.client) setClient(editingForm.client);
    setName(str(editingForm.name));
    setAge(str(editingForm.age));
    setHeight(str(editingForm.height));
    setGender(str(editingForm.gender));
    setGoals(Object.fromEntries(GOAL_NOTES.map(g => [g.key, str(editingForm[g.key])])));
    setBodyEntries(padEntries((Array.isArray(editingForm.body_entries) ? editingForm.body_entries : []).map((e: any) => ({
      assessment_date: isoDate(e.assessment_date), weight: str(e.weight), bmi: str(e.bmi),
      chest: str(e.chest), belly: str(e.belly), hips: str(e.hips),
      arms: str(e.arms), thighs: str(e.thighs), fat: str(e.fat), vf: str(e.vf),
    }))));
    setPlanObjectives(Array.isArray(editingForm.plan_objectives) ? editingForm.plan_objectives : []);
    setBackground(Object.fromEntries(BACKGROUND_FIELDS.map(f => [f.key, str(editingForm[f.key])])));
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
    setPmh(Object.fromEntries(PMH_FIELDS.map(f => [f.key, str(editingForm[f.key])])));
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

  // Like the web: a client who already has a questionnaire gets that one
  // loaded for editing; otherwise their profile seeds a new one.
  const selectClient = async (c: any) => {
    setClient(c);
    setClientDropOpen(false);
    setClientResults([]);
    setClientSearch('');
    try {
      const res = await getAssessmentFormByClient(c.id, { branch_id: branchId });
      const existing = res?.data?.data;
      if (res?.data?.status && existing?.id) {
        setEditingForm(existing);
        setMode('view');
        return;
      }
    } catch {
      // 404 = no questionnaire yet; fall through to a fresh one.
    }
    setName(c.full_name ?? clientLabel(c));
    setGender(c.gender ?? gender);
  };

  const updateEntry = (idx: number, key: string, value: string) => {
    setBodyEntries(prev => prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
  };

  const addEntry = () => setBodyEntries(prev => [...prev, emptyEntry()]);
  const removeEntry = (idx: number) => setBodyEntries(prev => prev.filter((_, i) => i !== idx));

  const toggleObjective = (opt: string) =>
    setPlanObjectives(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);

  // The questionnaire as API fields — the save payload (mirroring the web's
  // payload builder field for field), and what the form view and PDF print.
  const buildRecord = (): Record<string, any> => ({
    branch_id: branchId || editingForm?.branch_id || client?.branch_id || null,
    nutritionist_id: profile?.id,
    client_id: client?.id ?? editingForm?.client_id ?? null,
    name, age, height, gender,
    goal_fat_loss: goals.goal_fat_loss ?? '',
    goal_muscle_strength: goals.goal_muscle_strength ?? '',
    goal_disease_management: goals.goal_disease_management ?? '',
    plan_objectives: planObjectives,
    ...Object.fromEntries(BACKGROUND_FIELDS.map(f => [f.key, background[f.key] ?? ''])),
    medicine_supplements: medicineSupplements,
    daily_dietary_intake: dietary,
    daily_water_intake: dailyWaterIntake,
    disliked_foods: dislikedFoods,
    allergic_foods: allergicFoods,
    preferred_foods: preferredFoods,
    ...Object.fromEntries(PMH_FIELDS.map(f => [f.key, pmh[f.key] ?? ''])),
    muscle_pain: musclePain,
    any_other_issue: anyOtherIssue,
    stress_level: stressLevel,
    activity_level: activityLevel,
    body_entries: bodyEntries.map(e => ({
      assessment_date: e.assessment_date || null,
      weight: e.weight, bmi: e.bmi, chest: e.chest, belly: e.belly,
      hips: e.hips, arms: e.arms, thighs: e.thighs, fat: e.fat, vf: e.vf,
    })),
  });

  const downloadPdf = async () => {
    setExporting(true);
    try {
      await downloadQuestionnairePdf(buildRecord(), navigation);
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Could not generate the PDF.');
    } finally {
      setExporting(false);
    }
  };

  const save = async () => {
    if (!client && !editingForm) {
      Alert.alert('Select Client', 'Please select a client for this questionnaire.');
      return;
    }
    setSaving(true);
    try {
      const payload = buildRecord();

      // Like the web, a successful save shows the saved form rather than
      // leaving the screen.
      const res = editingForm
        ? await updateAssessmentForm(editingForm.id, payload)
        : await addAssessmentForm(payload);
      const saved = res?.data?.data;
      if (saved?.id) setEditingForm(saved);
      setMode('view');
      Alert.alert('Success', `Questionnaire ${editingForm ? 'updated' : 'saved'} successfully.`);
    } catch {
      Alert.alert('Error', 'Could not save the questionnaire. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={!editingForm ? 'New Assessment Questionnaire' : mode === 'view' ? 'Questionnaire' : 'Edit Questionnaire'}
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

        {/* Actions — the web's Download PDF and an Edit / Form view switch. */}
        <View style={styles.actionRow}>
          {editingForm ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setMode(m => (m === 'view' ? 'edit' : 'view'))}
              activeOpacity={0.8}
            >
              <Icon name={mode === 'view' ? 'pencil-outline' : 'file-document-outline'} size={15} color="#1A1A1A" />
              <Text style={styles.actionBtnText}>{mode === 'view' ? 'Edit' : 'Form view'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.actionBtn, styles.pdfBtn]}
            onPress={downloadPdf}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting
              ? <ActivityIndicator size="small" color="#FFF" />
              : (
                <>
                  <Icon name="file-pdf-box" size={15} color="#FFF" />
                  <Text style={[styles.actionBtnText, styles.pdfBtnText]}>Download PDF</Text>
                </>
              )}
          </TouchableOpacity>
        </View>

        {mode === 'view' ? (
          <QuestionnaireSheet r={buildRecord()} />
        ) : (
          <>
          {/* Personal Information */}
          <View style={styles.card}>
            <SectionHeader title="Personal Information" icon="account-outline" />
            <Field label="Name" value={name} onChangeText={setName} />
            <View style={styles.row3}>
              <View style={{ flex: 1 }}><Field label="Age" value={age} onChangeText={setAge} /></View>
              <View style={{ flex: 1 }}><Field label="Height" value={height} onChangeText={setHeight} /></View>
              <View style={{ flex: 1 }}><Field label="Gender" value={gender} onChangeText={setGender} /></View>
            </View>
          </View>

          {/* Objective of the plan */}
          <View style={styles.card}>
            <SectionHeader title="Objective of the Plan" icon="target" />
            {PLAN_OBJECTIVES.map(opt => (
              <Checkbox key={opt.id} label={opt.label} checked={planObjectives.includes(opt.id)} onToggle={() => toggleObjective(opt.id)} />
            ))}
            {/* Older records carry free-text goal notes; the web shows them only when present. */}
            {GOAL_NOTES.some(g => goals[g.key]) ? (
              <View style={{ marginTop: 8 }}>
                {GOAL_NOTES.map(g => (
                  <Field key={g.key} label={g.label} value={goals[g.key] ?? ''} onChangeText={(v: string) => setGoals(prev => ({ ...prev, [g.key]: v }))} />
                ))}
              </View>
            ) : null}
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

          {/* Lifestyle & fitness profile — free-text answers, as on the web */}
          <View style={styles.card}>
            <SectionHeader title="Lifestyle & Fitness Profile" icon="clipboard-list-outline" />
            {BACKGROUND_FIELDS.map(f => (
              <Field
                key={f.key}
                label={f.label}
                value={background[f.key] ?? ''}
                onChangeText={(v: string) => setBackground(prev => ({ ...prev, [f.key]: v }))}
              />
            ))}
            <Field label="Currently using any medicine or supplements" value={medicineSupplements} onChangeText={setMedicineSupplements} multiline />
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
                value={pmh[f.key] ?? ''}
                onChange={(v) => setPmh(prev => ({ ...prev, [f.key]: v }))}
              />
            ))}
            <Field label="Joint mobility issue or muscle pain" value={musclePain} onChangeText={setMusclePain} multiline />
            <Field label="Any other issue (disease or surgery)" value={anyOtherIssue} onChangeText={setAnyOtherIssue} multiline />
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
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  actionRow:    { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 12 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 90, justifyContent: 'center' },
  actionBtnText:{ fontSize: 12.5, fontWeight: '700', color: '#1A1A1A' },
  pdfBtn:       { backgroundColor: '#2E7D32', borderColor: '#2E7D32', minWidth: 130 },
  pdfBtnText:   { color: '#FFF' },
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

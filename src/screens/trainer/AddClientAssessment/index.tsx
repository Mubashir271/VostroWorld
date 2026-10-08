// src/screens/trainer/AddClientAssessment/index.tsx
//
// Client Assessment Form — the app's version of the web admin's
// /postAssessment/{client_id} page, opened from the PT dashboard's
// "Add Assessment" button on an Active Clients row.
//
// Sections, labels, option lists and which fields are required were read out
// of the web bundle (main.d2c153f2.js, 2026-09-29) — see api/postAssessment.ts.
// The web's selects become chip rows here and its input-group units become a
// suffix label; the styling follows AddPreAssessment (cards on #F9F9FB,
// #E63946 accent), not the web's Bootstrap grid.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootState } from '../../../redux/store';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import {
  addClientAssessment, getClientBasics, AssessmentForm,
  TRAINING_GOALS, YES_NO, GENDERS,
  MEDICAL_FIELDS, LIFESTYLE_FIELDS, POSTURE_FIELDS, NUMERIC_FIELDS, toApiRecord,
} from '../../../api/postAssessment';
import { downloadAssessmentPdf } from '../../../utils/assessmentPdf';

// Local "YYYY-MM-DD" — the web defaults the date to today via moment().
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const REQUIRED_NUMERIC = Object.keys(NUMERIC_FIELDS).filter(k => NUMERIC_FIELDS[k].required);

// ── Screen ────────────────────────────────────────────────────────────────────

const AddClientAssessment = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clientId: number = Number(route.params?.clientId);
  const clientName: string = route.params?.clientName ?? '';

  const profile = useSelector((s: RootState) => s.user.profile);
  const branchId = profile?.branchId;

  const [form, setForm] = useState<AssessmentForm>(() => ({ date: toYMD(new Date()) }));
  const [showDate, setShowDate] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const set =(key: string, v: string) => setForm(f => ({ ...f, [key]: v }));

  // Prefill gender / contact / emergency contact the way the web does, without
  // overwriting anything the trainer has already typed.
  useEffect(() => {
    if (branchId == null || !Number.isFinite(clientId) || clientId <= 0) return;
    let alive = true;
    getClientBasics(branchId, clientId)
      .then(c => {
        if (!alive || !c) return;
        setForm(f => ({
          ...f,
          gender: f.gender || (c.gender && c.gender !== 'N/A' ? c.gender : ''),
          contact_no: f.contact_no || c.phone || '',
          emergency_contact_no: f.emergency_contact_no || c.emergency_contact_no || '',
        }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [branchId, clientId]);

  // Required numerics must be a number > 0 (the web's yup `moreThan(0)`).
  const invalid = useMemo(() => {
    const bad = new Set<string>();
    REQUIRED_NUMERIC.forEach(k => {
      const n = Number(form[k]);
      if (!form[k] || !Number.isFinite(n) || n <= 0) bad.add(k);
    });
    if (!form.date) bad.add('date');
    return bad;
  }, [form]);

  const submit = async () => {
    setTriedSubmit(true);
    if (!Number.isFinite(clientId) || clientId <= 0) {
      Alert.alert('Missing client', 'No client selected for this assessment.');
      return;
    }
    if (branchId == null) {
      Alert.alert('Missing branch', 'Your profile has no branch assigned.');
      return;
    }
    // if (invalid.size > 0) {
    //   Alert.alert(
    //     'Incomplete',
    //     `Please fill every required (*) field — ${invalid.size} still ${invalid.size === 1 ? 'needs' : 'need'} a value.`,
    //   );
    //   return;
    // }

    setSaving(true);
    try {
      await addClientAssessment({ ...form, branch_id: String(branchId) }, clientId);
      Alert.alert('Saved', 'Assessment added successfully.');
      navigation.goBack();
    } catch (e: any) {
      // Laravel validation errors arrive as {message: {field: [msg]}}; the web
      // shows the first one.
      const m = e?.response?.data?.message;
      const msg = typeof m === 'string' ? m : (m && (Object.values(m) as any[])?.[0]?.[0]) || 'Could not save this assessment.';
      Alert.alert('Failed', String(msg));
    } finally {
      setSaving(false);
    }
  };

  // The web's "Download Form (PDF)": prints whatever is filled in so far, so a
  // trainer can also take a blank, client-prefilled sheet onto the floor.
  const downloadPdf = async () => {
    setExporting(true);
    try {
      await downloadAssessmentPdf({ ...toApiRecord(form, clientId), client_name: clientName }, navigation);
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Could not generate the PDF.');
    } finally {
      setExporting(false);
    }
  };

  const num = (key: string) => (
    <NumberField
      key={key}
      label={NUMERIC_FIELDS[key].label}
      unit={NUMERIC_FIELDS[key].unit}
      required={NUMERIC_FIELDS[key].required}
      value={form[key] ?? ''}
      onChange={v => set(key, v)}
      error={triedSubmit && invalid.has(key)}
    />
  );

  const txt = (key: string, label: string, opts: { placeholder?: string; multiline?: boolean } = {}) => (
    <Labelled key={key} label={label}>
      <TextInput
        style={[styles.input, opts.multiline && styles.textArea]}
        value={form[key] ?? ''}
        onChangeText={v => set(key, v)}
        placeholder={opts.placeholder ?? label}
        placeholderTextColor="#BBB"
        multiline={opts.multiline}
      />
    </Labelled>
  );

  const chips = (key: string, label: string, options: string[]) => (
    <Labelled key={key} label={label}>
      <ChipRow options={options} value={form[key] ?? ''} onChange={v => set(key, v)} />
    </Labelled>
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Client Assessment"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!!clientName && (
            <View style={styles.clientBar}>
              <Text style={styles.clientBarText}>Client: <Text style={styles.clientBarName}>{clientName}</Text></Text>
            </View>
          )}

          <Text style={styles.requiredNote}>
            Fields marked <Text style={styles.star}>*</Text> are required.
          </Text>

          <Card title="Assessment Details">
            <Labelled label="Branch Name" required>
              <View style={[styles.input, styles.readOnly]}>
                <Text style={styles.readOnlyText}>{profile?.branchName || `Branch #${branchId ?? '—'}`}</Text>
              </View>
            </Labelled>
            <Labelled label="Assessment Date" required>
              <TouchableOpacity
                style={[styles.input, styles.dateBtn, triedSubmit && invalid.has('date') && styles.inputError]}
                onPress={() => setShowDate(true)}
              >
                <Text style={styles.readOnlyText}>{form.date}</Text>
                <Icon name="calendar" size={16} color="#777" />
              </TouchableOpacity>
            </Labelled>
            {txt('trainer_name', 'Trainer Name', { placeholder: 'Defaults to the logged-in trainer' })}
          </Card>

          <Card title="Section 1 — Client Information">
            {num('Age')}
            {chips('gender', 'Gender', GENDERS)}
            {txt('contact_no', 'Contact')}
            {txt('emergency_contact_no', 'Emergency Contact No')}
            {chips('training_goal', 'Training Goal', TRAINING_GOALS)}
            {form.training_goal === 'Other' && txt('training_goal_other', 'Other Goal')}
          </Card>

          <Card title="Section 2 — Medical & Health Screening" note='Mark "Yes" if applicable'>
            {MEDICAL_FIELDS.map(f => (
              <View key={f.key} style={styles.ynRow}>
                <Text style={styles.ynLabel}>{f.label}</Text>
                <ChipRow options={YES_NO} value={form[f.key] ?? ''} onChange={v => set(f.key, v)} />
              </View>
            ))}
            {txt('med_other_condition', 'Any Other Condition')}
          </Card>

          <Card title="Section 3 — Body Stats">
            {['Height', 'Weight', 'Fat', 'Vfat', 'BMI'].map(num)}
          </Card>

          <Card title="Section 4 — Measurements (CM)">
            {['Chest', 'upper_belly', 'Waist', 'lower_belly', 'Glutes', 'Thigh', 'Arm'].map(num)}
          </Card>

          <Card title="Section 5 — Lifestyle & Habits">
            {LIFESTYLE_FIELDS.map(f => (f.options ? chips(f.key, f.label, f.options) : txt(f.key, f.label)))}
          </Card>

          {/* <Card title="Section 6 — Cardiovascular Assessments">
            {txt('vo2_max', 'VO2 Max Assessment')}
            {txt('hr_recovery_step_test', 'Heart Rate Recovery Step Test')}
            {num('Mhr')}
            {num('Rhr')}
          </Card> */}

          {/* <Card title="Section 7 — Strength Assessments">
            {['max_push_ups', 'max_push_ups_one_min', 'one_rm_squat', 'one_rm_bench_press'].map(num)}
          </Card> */}

          {/* <Card title="Section 8 — Mobility & Flexibility Assessments">
            {num('fit_and_reach')}
            {num('Whr')}
          </Card> */}

          <Card title="Section 6 — Postural Assessment">
            {POSTURE_FIELDS.map(f => txt(f.key, f.label, { placeholder: 'Observations' }))}
            {txt('clinical_recommendation', 'Clinical Recommendation', { multiline: true })}
          </Card>

          <Card title="Section 7 — Training Objectives">
            {txt('primary_goal', 'Primary Goal')}
            {txt('secondary_goal', 'Secondary Goal')}
          </Card>

          <Card title="Section 8 — Trainer Final Notes">
            {txt('trainer_notes', 'Trainer Final Notes', { multiline: true })}
          </Card>

          <TouchableOpacity style={[styles.addBtn, saving && styles.addBtnOff]} onPress={submit} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.addBtnText}>ADD RESULTS</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.pdfBtn} onPress={downloadPdf} disabled={exporting}>
            {exporting
              ? <ActivityIndicator color="#1A1A1A" />
              : (
                <>
                  <Icon name="file-pdf-box" size={18} color="#1A1A1A" />
                  <Text style={styles.pdfBtnText}>Download Form (PDF)</Text>
                </>
              )}
          </TouchableOpacity>

          {triedSubmit && invalid.size > 0 && (
            <Text style={styles.hint}>
              {invalid.size} required field{invalid.size === 1 ? '' : 's'} still empty
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {showDate && (
        <DateTimePicker
          value={form.date ? new Date(`${form.date}T00:00:00`) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event: any, d?: Date) => {
            if (Platform.OS !== 'ios') setShowDate(false);
            if (event?.type === 'dismissed' || !d) return;
            set('date', toYMD(d));
          }}
        />
      )}
      {showDate && Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDate(false)}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Pieces ────────────────────────────────────────────────────────────────────

const Card = ({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{title}</Text>
      {note ? <Text style={styles.cardNote}>{note}</Text> : null}
    </View>
    <View style={styles.cardBody}>{children}</View>
  </View>
);

const Labelled = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <View style={styles.labelled}>
    <Text style={styles.fieldLabel}>
      {label}{required ? <Text style={styles.star}> *</Text> : null}
    </Text>
    {children}
  </View>
);

const NumberField = ({
  label, unit, required, value, onChange, error,
}: {
  label: string; unit?: string; required?: boolean;
  value: string; onChange: (v: string) => void; error?: boolean;
}) => (
  <Labelled label={label} required={required}>
    <View style={[styles.unitWrap, error && styles.inputError]}>
      <TextInput
        style={styles.unitInput}
        value={value}
        onChangeText={v => onChange(v.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        placeholder={label}
        placeholderTextColor="#BBB"
      />
      {unit ? <View style={styles.unitTag}><Text style={styles.unitText}>{unit}</Text></View> : null}
    </View>
  </Labelled>
);

// Tapping the selected chip again clears it, like choosing "Select…" on the web.
const ChipRow = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
  <View style={styles.chipWrap}>
    {options.map(o => {
      const on = value === o;
      return (
        <TouchableOpacity key={o} style={[styles.chip, on && styles.chipOn]} onPress={() => onChange(on ? '' : o)}>
          <Text style={[styles.chipText, on && styles.chipTextOn]}>{o}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9F9FB' },
  body:   { padding: 16, paddingBottom: 40 },

  clientBar:     { backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  clientBarText: { color: '#DDD', fontSize: 13 },
  clientBarName: { color: '#FFF', fontWeight: '700' },

  requiredNote: { fontSize: 12, color: '#777', marginBottom: 12 },
  star:         { color: '#E63946', fontWeight: '700' },

  card: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardNote:   { fontSize: 11.5, color: '#999', marginTop: 2 },
  cardBody:   { padding: 16, gap: 14 },

  labelled:   { gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555' },

  input: {
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#1A1A1A',
  },
  textArea:     { minHeight: 80, textAlignVertical: 'top' },
  inputError:   { borderColor: '#E63946' },
  readOnly:     { backgroundColor: '#F5F5F5' },
  readOnlyText: { fontSize: 13, color: '#1A1A1A' },
  dateBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  unitWrap:  { flexDirection: 'row', borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 8, overflow: 'hidden' },
  unitInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#1A1A1A' },
  unitTag:   { justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#F5F5F5', borderLeftWidth: 1, borderLeftColor: '#E8E8E8' },
  unitText:  { fontSize: 12, color: '#666', fontWeight: '600' },

  ynRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ynLabel: { flex: 1, fontSize: 13, color: '#333' },

  chipWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:       { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#FAFAFA' },
  chipOn:     { backgroundColor: '#E63946', borderColor: '#E63946' },
  chipText:   { fontSize: 12, color: '#666', fontWeight: '600' },
  chipTextOn: { color: '#FFF' },

  addBtn:     { backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  addBtnOff:  { opacity: 0.55 },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 10, paddingVertical: 13, marginTop: 10,
  },
  pdfBtnText: { color: '#1A1A1A', fontSize: 14, fontWeight: '700' },
  hint:       { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 10 },

  doneBtn:  { alignItems: 'center', paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  doneText: { color: '#E63946', fontSize: 15, fontWeight: '700' },
});

export default AddClientAssessment;

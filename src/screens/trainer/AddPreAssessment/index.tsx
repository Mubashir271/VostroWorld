// src/screens/trainer/AddPreAssessment/index.tsx
//
// Add Assessment — the app's version of the web admin's /add-pre-assessment
// page, reached from a trainer's client profile via Tools → Add Assessment.
//
// The questions, their order, and which payload field each one maps to were
// read out of the web bundle (main.dcb585c0.js in the 2026-09-17 HAR) by
// matching each radio's state setter to its position in the
// `clientPreAssessment(...)` call — not inferred from the wording. The web
// sends the literal strings "yes"/"no" and requires every radio to be
// answered before it will submit.
//
// Layout follows the web's sections, but the styling is the app's own
// (cards on #F9F9FB, #E63946 accent) rather than the web's Bootstrap tables.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootState } from '../../../redux/store';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import {
  addPreAssessment, preAssessmentExists, toApiTime,
  FITNESS_GOALS, YesNo, PreAssessmentPayload,
} from '../../../api/preAssessment';

// ── Question sets ─────────────────────────────────────────────────────────────
// `key` is the API field; the text is the web's, typos included, so the two
// screens read identically side by side.

const PAR_Q: { key: keyof PreAssessmentPayload; q: string }[] = [
  { key: 'doctor_recommended_activity', q: 'Has your doctor ever said you have a heart condition and that you should only do physical activity recommended by a doctor?' },
  { key: 'chest_pain_during_activity',  q: 'Do you feel pain in your chest when you do physical activity?' },
  { key: 'chest_pain_past_month',       q: 'In the past month, have you had chest pain when you were not doing physical activity?' },
  { key: 'balance_issues',              q: 'Do you lose balance because of dizziness or do you ever lose consciousness?' },
  { key: 'bone_joint_problem',          q: 'Do you have a bone or joint problem (for example back, knee, or hip) that could be made worse by a change in your physical activity?' },
  { key: 'medical_supervision',         q: 'Are you aware of any reason against excercise without medical supervision?' },
  { key: 'pregnant',                    q: 'Women only: Are you pregnant or nursing?' },
  { key: 'medication_prescribed',       q: 'Is your doctor currently prescribing medication for your blood pressure or heart condition?' },
  { key: 'taking_medicine',             q: 'Are you taking any prescribed medications that could effect you during excercise (Women; excluded birth control)?' },
];

const HABITS: { key: keyof PreAssessmentPayload; q: string }[] = [
  { key: 'smoking_habit',         q: 'Do you smoke or use tobacco? ?' },
  { key: 'health_club_member',    q: 'Are you a member of a health club?' },
  { key: 'have_personal_trainer', q: 'Do you use a personal trainer?' },
];

const OBJECTIVES: { key: keyof PreAssessmentPayload; q: string }[] = [
  { key: 'tried_diet_plan',           q: 'Have you tried any diet plans before?' },
  { key: 'gym_member',                q: 'Gym member or not' },
  { key: 'following_diet',            q: 'Already following any diet:' },
  { key: 'have_training',             q: 'Undergoing any type of training' },
  { key: 'medication_supplement_use', q: 'Currently using any medicine or supplements:' },
];

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snack',     label: 'Snack' },
  { key: 'munching',  label: 'Munching' },
] as const;

const EXERCISE_DAYS = ['1', '2', '3', '4', '5'];

const NORMAL_RANGES = [
  ['Fat% Male', '10% - 16%'],
  ['Fat% Female', '14% - 22%'],
  ['BMI Male', '18 - 25'],
  ['BMI Female', '18 - 25'],
  ['Resting HR', '60Bpm to 80Bpm'],
];

const ALL_RADIOS = [...PAR_Q, ...HABITS, ...OBJECTIVES];

// ── Screen ────────────────────────────────────────────────────────────────────

const AddPreAssessment = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clientId: number = Number(route.params?.clientId);
  // '—' is the profile screen's placeholder, not a name — don't show it here.
  const rawName: string = route.params?.clientName ?? '';
  const clientName = rawName === '—' ? '' : rawName;

  const profile = useSelector((s: RootState) => s.user.profile);
  const branchId = profile?.branchId;

  const [answers, setAnswers] = useState<Record<string, YesNo>>({});
  const [exerciseDays, setExerciseDays] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [text, setText] = useState<Record<string, string>>({ other_reason: 'no' });
  const [times, setTimes] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<string | null>(null);

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  // The web checks this on mount: an already-assessed client goes straight to
  // the view page rather than being offered a second empty form.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!Number.isFinite(clientId) || clientId <= 0) { setChecking(false); return; }
      try {
        const res = await preAssessmentExists(clientId);
        if (alive && res?.status === 200) {
          navigation.replace('ViewAssessment', { clientId, clientName });
          return;
        }
      } catch {
        // 404 = not assessed yet, which is the normal path into this form.
      }
      if (alive) setChecking(false);
    })();
    return () => { alive = false; };
  }, [clientId, clientName, navigation]);

  const setAnswer = useCallback((key: string, v: YesNo) => {
    setAnswers(a => ({ ...a, [key]: v }));
  }, []);

  const toggleGoal = useCallback((g: string) => {
    setGoals(cur => (cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]));
  }, []);

  const unanswered = useMemo(
    () => ALL_RADIOS.filter(r => !answers[r.key as string]).length + (exerciseDays ? 0 : 1),
    [answers, exerciseDays],
  );

  const onPickTime = (event: any, date?: Date) => {
    const key = picker;
    if (Platform.OS !== 'ios') setPicker(null);
    if (event?.type === 'dismissed' || !date || !key) return;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    setTimes(t => ({ ...t, [key]: `${hh}:${mm}` }));
  };

  const submit = async () => {
    if (!Number.isFinite(clientId) || clientId <= 0) {
      Alert.alert('Missing client', 'No client selected for this assessment.');
      return;
    }
    if (branchId == null) {
      Alert.alert('Missing branch', 'Your profile has no branch assigned.');
      return;
    }
    if (unanswered > 0) {
      Alert.alert(
        'Incomplete',
        `Please answer every question before saving — ${unanswered} still ${unanswered === 1 ? 'needs' : 'need'} an answer.`,
      );
      return;
    }

    const payload = {
      client_id: clientId,
      branch_id: branchId,
      exercise_days: exerciseDays,
      other_reason: text.other_reason ?? '',
      water_intake: text.water_intake ?? '',
      favorite_foods: text.favorite_foods ?? '',
      allergic_foods: text.allergic_foods ?? '',
      disliked_foods: text.disliked_foods ?? '',
      fitness_goals: goals.join(','),
    } as PreAssessmentPayload;

    ALL_RADIOS.forEach(r => { (payload as any)[r.key] = answers[r.key as string] ?? ''; });
    MEALS.forEach(m => {
      (payload as any)[m.key] = text[m.key] ?? '';
      (payload as any)[`${m.key}_time`] = toApiTime(times[m.key] ?? '');
    });

    setSaving(true);
    try {
      await addPreAssessment(payload);
      Alert.alert('Saved', 'Assessment added successfully.');
      navigation.replace('ViewAssessment', { clientId, clientName });
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message || 'Could not save this assessment.');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.screen}>
        <AppHeader
          title="Add Assessment"
          leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
          onLeftPress={() => navigation.goBack()}
          backgroundColor="#FFE5E5"
        />
        <ActivityIndicator size="large" color="#E63946" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Add Assessment"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!!clientName && (
          <View style={styles.clientBar}>
            <Text style={styles.clientBarText}>Client: <Text style={styles.clientBarName}>{clientName}</Text></Text>
          </View>
        )}

        {/* Normal Ranges */}
        <Card title="Normal Ranges">
          <View style={styles.rangeWrap}>
            {NORMAL_RANGES.map(([label, value]) => (
              <View key={label} style={styles.rangeChip}>
                <Text style={styles.rangeLabel}>{label}</Text>
                <Text style={styles.rangeValue}>{value}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card title="Physical Activity Readiness">
          {PAR_Q.map(r => (
            <YesNoRow key={r.key as string} q={r.q} value={answers[r.key as string]} onChange={v => setAnswer(r.key as string, v)} />
          ))}
        </Card>

        <Card title="Healthy Habbits">
          {HABITS.map(r => (
            <YesNoRow key={r.key as string} q={r.q} value={answers[r.key as string]} onChange={v => setAnswer(r.key as string, v)} />
          ))}

          <Text style={styles.qText}>How many times do you excercise in a typical week?</Text>
          <View style={styles.dayRow}>
            {EXERCISE_DAYS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, exerciseDays === d && styles.dayChipOn]}
                onPress={() => setExerciseDays(d)}
              >
                <Text style={[styles.dayChipText, exerciseDays === d && styles.dayChipTextOn]}>
                  {d} {d === '1' ? 'Day' : 'Days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.qText}>Do you know of any other reason why you should not take part in physical activity?</Text>
          <TextInput
            style={styles.textArea}
            value={text.other_reason}
            onChangeText={v => setText(t => ({ ...t, other_reason: v }))}
            multiline
            placeholder="Any other reason"
            placeholderTextColor="#BBB"
          />
        </Card>

        <Card title="The Objective Of The Plan">
          {OBJECTIVES.map(r => (
            <YesNoRow key={r.key as string} q={r.q} value={answers[r.key as string]} onChange={v => setAnswer(r.key as string, v)} />
          ))}
        </Card>

        <Card title="Your Daily Dietary Intake">
          {MEALS.map(m => (
            <View key={m.key} style={styles.mealRow}>
              <Text style={styles.mealLabel}>{m.label}</Text>
              <TouchableOpacity style={styles.timeBtn} onPress={() => setPicker(m.key)}>
                <Icon name="clock-outline" size={14} color="#777" />
                <Text style={[styles.timeText, !times[m.key] && styles.timePlaceholder]}>
                  {times[m.key] ? toApiTime(times[m.key]) : '12:30 PM'}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.specInput}
                value={text[m.key] ?? ''}
                onChangeText={v => setText(t => ({ ...t, [m.key]: v }))}
                placeholder="Specification"
                placeholderTextColor="#BBB"
              />
            </View>
          ))}

          <Labelled label="Daily Water Intake">
            <TextInput style={styles.input} value={text.water_intake ?? ''} onChangeText={v => setText(t => ({ ...t, water_intake: v }))} />
          </Labelled>
          <Labelled label="Food Allergies if any">
            <TextInput style={styles.input} value={text.allergic_foods ?? ''} onChangeText={v => setText(t => ({ ...t, allergic_foods: v }))} />
          </Labelled>
          <Labelled label="Food you don't prefer">
            <TextInput style={styles.input} value={text.disliked_foods ?? ''} onChangeText={v => setText(t => ({ ...t, disliked_foods: v }))} />
          </Labelled>
          <Labelled label="Foods you prefer">
            <TextInput style={styles.input} value={text.favorite_foods ?? ''} onChangeText={v => setText(t => ({ ...t, favorite_foods: v }))} />
          </Labelled>
        </Card>

        <Card title="Goal Setting">
          <View style={styles.goalWrap}>
            {FITNESS_GOALS.map(g => {
              const on = goals.includes(g);
              return (
                <TouchableOpacity key={g} style={[styles.goalChip, on && styles.goalChipOn]} onPress={() => toggleGoal(g)}>
                  <Text style={[styles.goalText, on && styles.goalTextOn]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <TouchableOpacity
          style={[styles.addBtn, (saving || unanswered > 0) && styles.addBtnOff]}
          onPress={submit}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.addBtnText}>ADD</Text>}
        </TouchableOpacity>

        {unanswered > 0 && (
          <Text style={styles.hint}>
            {unanswered} question{unanswered === 1 ? '' : 's'} still unanswered
          </Text>
        )}
      </ScrollView>

      {picker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickTime}
        />
      )}
      {picker && Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.doneBtn} onPress={() => setPicker(null)}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Pieces ────────────────────────────────────────────────────────────────────

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}><Text style={styles.cardTitle}>{title}</Text></View>
    <View style={styles.cardBody}>{children}</View>
  </View>
);

const YesNoRow = ({ q, value, onChange }: { q: string; value?: YesNo; onChange: (v: YesNo) => void }) => (
  <View style={styles.qRow}>
    <Text style={styles.qText}>{q}</Text>
    <View style={styles.qBtns}>
      {(['yes', 'no'] as YesNo[]).map(v => (
        <TouchableOpacity key={v} style={[styles.qBtn, value === v && styles.qBtnOn]} onPress={() => onChange(v)}>
          <Text style={[styles.qBtnText, value === v && styles.qBtnTextOn]}>{v === 'yes' ? 'Yes' : 'No'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const Labelled = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.labelled}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9F9FB' },
  body:   { padding: 16, paddingBottom: 40 },
  loader: { paddingVertical: 60 },

  clientBar:     { backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  clientBarText: { color: '#DDD', fontSize: 13 },
  clientBarName: { color: '#FFF', fontWeight: '700' },

  card: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardBody:   { padding: 16, gap: 14 },

  rangeWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rangeChip:  { backgroundColor: '#FFF3F4', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  rangeLabel: { fontSize: 11, color: '#777', fontWeight: '600' },
  rangeValue: { fontSize: 13, color: '#E63946', fontWeight: '700' },

  qRow:  { gap: 8 },
  qText: { fontSize: 13, color: '#333', lineHeight: 19 },
  qBtns: { flexDirection: 'row', gap: 10 },
  qBtn: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20,
    paddingHorizontal: 22, paddingVertical: 6, backgroundColor: '#FAFAFA',
  },
  qBtnOn:      { backgroundColor: '#E63946', borderColor: '#E63946' },
  qBtnText:    { fontSize: 13, color: '#666', fontWeight: '600' },
  qBtnTextOn:  { color: '#FFF' },

  dayRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip:       { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#FAFAFA' },
  dayChipOn:     { backgroundColor: '#E63946', borderColor: '#E63946' },
  dayChipText:   { fontSize: 12, color: '#666', fontWeight: '600' },
  dayChipTextOn: { color: '#FFF' },

  textArea: {
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 8, padding: 12,
    minHeight: 90, textAlignVertical: 'top', fontSize: 13, color: '#1A1A1A',
  },
  input: {
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#1A1A1A',
  },
  labelled:   { gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555' },

  mealRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealLabel: { fontSize: 13, color: '#333', width: 76, fontWeight: '600' },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 9,
  },
  timeText:        { fontSize: 12, color: '#1A1A1A' },
  timePlaceholder: { color: '#BBB' },
  specInput: {
    flex: 1, borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 9, fontSize: 12, color: '#1A1A1A',
  },

  goalWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip:   { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  goalChipOn: { backgroundColor: '#E63946', borderColor: '#E63946' },
  goalText:   { fontSize: 12, color: '#555', fontWeight: '600' },
  goalTextOn: { color: '#FFF' },

  addBtn: { backgroundColor: '#E63946', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  addBtnOff:  { opacity: 0.55 },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  hint: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 10 },

  doneBtn:  { alignItems: 'center', paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  doneText: { color: '#E63946', fontSize: 15, fontWeight: '700' },
});

export default AddPreAssessment;

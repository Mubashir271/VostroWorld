// src/screens/trainer/ViewAssessment/index.tsx
//
// View Assessments — the read-back of a client's pre-assessment, reached from
// the trainer's client profile via Tools → View Assessments, and where the web
// lands after a successful save (/viewAssessment/{client_id}).
//
// GET /v1/pre-assessment/get?client_id= answered `{status, data: [], message}`
// for an unassessed client in the 2026-09-17 HAR, so the row shape below is
// derived from the documented add-payload field names rather than from a
// populated response — unknown keys simply render as '—'.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { getPreAssessment } from '../../../api/preAssessment';
import { getClientById } from '../../../api/employeeDashboard';

const PAR_Q: [string, string][] = [
  ['doctor_recommended_activity', 'Heart condition — activity only as recommended by a doctor'],
  ['chest_pain_during_activity',  'Chest pain during physical activity'],
  ['chest_pain_past_month',       'Chest pain in the past month while at rest'],
  ['balance_issues',              'Loses balance from dizziness / loses consciousness'],
  ['bone_joint_problem',          'Bone or joint problem'],
  ['medical_supervision',         'Reason against exercise without medical supervision'],
  ['pregnant',                    'Pregnant or nursing'],
  ['medication_prescribed',       'Prescribed medication for blood pressure / heart'],
  ['taking_medicine',             'Taking prescribed medication affecting exercise'],
];

const HABITS: [string, string][] = [
  ['smoking_habit',         'Smokes or uses tobacco'],
  ['health_club_member',    'Member of a health club'],
  ['have_personal_trainer', 'Uses a personal trainer'],
];

const OBJECTIVES: [string, string][] = [
  ['tried_diet_plan',           'Tried a diet plan before'],
  ['gym_member',                'Gym member'],
  ['following_diet',            'Already following a diet'],
  ['have_training',             'Undergoing training'],
  ['medication_supplement_use', 'Using medicine or supplements'],
];

const MEALS: [string, string][] = [
  ['breakfast', 'Breakfast'],
  ['lunch',     'Lunch'],
  ['dinner',    'Dinner'],
  ['snack',     'Snack'],
  ['munching',  'Munching'],
];

const val = (v: any) => {
  const s = String(v ?? '').trim();
  return s && s !== 'null' ? s : '—';
};

// The API stores the radio answers as the literal strings "yes"/"no" (that is
// what the web posts). Display them capitalised.
const yesNo = (v: any) => {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'yes') return 'Yes';
  if (s === 'no') return 'No';
  return val(v);
};

const ViewAssessment = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clientId: number = Number(route.params?.clientId);
  const passedName: string = route.params?.clientName ?? '';

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // This screen is also entered via replace() straight after a save, so it
  // resolves the client's name itself rather than trusting every caller to
  // pass one. '—' counts as missing: it is the placeholder, not a name.
  const [name, setName] = useState(passedName !== '—' ? passedName : '');

  useEffect(() => {
    if (name || !Number.isFinite(clientId) || clientId <= 0) return;
    let alive = true;
    (async () => {
      try {
        const res = await getClientById(clientId);
        const c = res?.data?.[0] ?? res?.data ?? null;
        const full = `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim();
        if (alive && full) setName(full);
      } catch {
        // Leave the bar hidden rather than showing a dash.
      }
    })();
    return () => { alive = false; };
  }, [clientId, name]);

  const load = useCallback(async () => {
    if (!Number.isFinite(clientId) || clientId <= 0) {
      setError('No client selected.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await getPreAssessment(clientId);
      const list = res?.data?.data ?? res?.data ?? [];
      const first = Array.isArray(list) ? list[0] : list;
      setRow(first ?? null);
      if (!first) setError('No assessment recorded for this client yet.');
    } catch (e: any) {
      setRow(null);
      setError(e?.response?.status === 404
        ? 'No assessment recorded for this client yet.'
        : 'Failed to load this assessment.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const goals = String(row?.fitness_goals ?? '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Assessment"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <ScrollView contentContainerStyle={styles.body}>
        {!!name && (
          <View style={styles.clientBar}>
            <Text style={styles.clientBarText}>Client: <Text style={styles.clientBarName}>{name}</Text></Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={styles.loader} />
        ) : !row ? (
          <View style={styles.emptyBox}>
            <Icon name="clipboard-text-outline" size={40} color="#DDD" />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.replace('AddPreAssessment', { clientId, clientName: name })}
            >
              <Text style={styles.addBtnText}>Add Assessment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Card title="Physical Activity Readiness">
              {PAR_Q.map(([k, label]) => <Row key={k} label={label} value={yesNo(row[k])} />)}
            </Card>

            <Card title="Healthy Habbits">
              {HABITS.map(([k, label]) => <Row key={k} label={label} value={yesNo(row[k])} />)}
              <Row label="Exercise days per week" value={val(row.exercise_days)} />
              <Row label="Any other reason" value={val(row.other_reason)} />
            </Card>

            <Card title="The Objective Of The Plan">
              {OBJECTIVES.map(([k, label]) => <Row key={k} label={label} value={yesNo(row[k])} />)}
            </Card>

            <Card title="Your Daily Dietary Intake">
              {MEALS.map(([k, label]) => (
                <Row key={k} label={label} value={`${val(row[`${k}_time`])}  ·  ${val(row[k])}`} />
              ))}
              <Row label="Daily Water Intake" value={val(row.water_intake)} />
              <Row label="Food Allergies" value={val(row.allergic_foods)} />
              <Row label="Food not preferred" value={val(row.disliked_foods)} />
              <Row label="Foods preferred" value={val(row.favorite_foods)} />
            </Card>

            <Card title="Goal Setting">
              {goals.length === 0 ? (
                <Text style={styles.noGoals}>No goals recorded.</Text>
              ) : (
                <View style={styles.goalWrap}>
                  {goals.map(g => (
                    <View key={g} style={styles.goalChip}><Text style={styles.goalText}>{g}</Text></View>
                  ))}
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}><Text style={styles.cardTitle}>{title}</Text></View>
    <View style={styles.cardBody}>{children}</View>
  </View>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
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
  cardBody:   { paddingHorizontal: 16, paddingVertical: 6 },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  rowLabel: { flex: 1, fontSize: 12, color: '#666', lineHeight: 17 },
  rowValue: { fontSize: 13, color: '#1A1A1A', fontWeight: '600', maxWidth: '45%', textAlign: 'right' },

  goalWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
  goalChip: { backgroundColor: '#FFF3F4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  goalText: { fontSize: 12, color: '#E63946', fontWeight: '600' },
  noGoals:  { fontSize: 13, color: '#999', paddingVertical: 12 },

  emptyBox:  { alignItems: 'center', gap: 14, paddingVertical: 70 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center' },
  addBtn:    { backgroundColor: '#E63946', borderRadius: 8, paddingHorizontal: 22, paddingVertical: 11 },
  addBtnText:{ color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default ViewAssessment;

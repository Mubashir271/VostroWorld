// src/screens/trainer/ViewClientAssessment/index.tsx
//
// View Assessment — the app's version of the web admin's
// /viewAssessmentInfo/{client_id} page, opened from the PT dashboard's "View"
// button on a client who already has a Client Assessment Form on file.
//
// Like the web, it lists every assessment returned by
// GET /v1/post-assessment/get (newest data as the server orders it), one card
// per record, laid out in the form's 11 sections. Labels and the few combined
// values (Body FAT / V-FAT, push-ups / sit-ups) follow the web's view.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import {
  getClientAssessments, MEDICAL_FIELDS, LIFESTYLE_FIELDS, POSTURE_FIELDS,
} from '../../../api/postAssessment';
import { downloadAssessmentPdf } from '../../../utils/assessmentPdf';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const has = (v: any) => v !== null && v !== undefined && String(v).trim() !== '';
const str = (v: any) => (has(v) ? String(v).trim() : '');

// "2026-09-29" → "29 Sep 2026", parsed by hand so it can't shift a day in a
// behind-UTC zone.
const fmtDate = (s?: string) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : String(s);
};

const withUnit = (v: any, unit: string) => (has(v) ? `${str(v)} ${unit}` : '');
const joinParts = (parts: string[]) => parts.filter(Boolean).join('  ·  ');

// ── Screen ────────────────────────────────────────────────────────────────────

const ViewClientAssessment = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clientId: number = Number(route.params?.clientId);
  const clientName: string = route.params?.clientName ?? '';

  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setRows(await getClientAssessments(clientId));
    } catch (e: any) {
      const m = e?.response?.data?.message;
      setError(typeof m === 'string' && m.length < 200 ? m : 'Could not load this client\'s assessments.');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.screen}>
      <AppHeader
        title="View Assessment"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      {loading ? (
        <ActivityIndicator size="large" color="#E63946" style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
        >
          {!!clientName && (
            <View style={styles.clientBar}>
              <Text style={styles.clientBarText}>Client: <Text style={styles.clientBarName}>{clientName}</Text></Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color="#C62828" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : rows.length === 0 ? (
            <Text style={styles.empty}>No Assessment Found</Text>
          ) : (
            rows.map((r, i) => <AssessmentCard key={r.id ?? i} r={r} />)
          )}
        </ScrollView>
      )}
    </View>
  );
};

// ── One assessment ────────────────────────────────────────────────────────────

const AssessmentCard = ({ r }: { r: Record<string, any> }) => {
  const name = `${str(r.fname)} ${str(r.lname)}`.trim() || 'Client';
  const goal = r.training_goal === 'Other' && has(r.training_goal_other)
    ? `Other — ${str(r.training_goal_other)}` : str(r.training_goal);
  const [exporting, setExporting] = useState(false);

  // The web's per-assessment "Download Form" button.
  const downloadPdf = async () => {
    setExporting(true);
    try {
      await downloadAssessmentPdf({ ...r, client_name: name });
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Could not generate the PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.record}>
      <View style={styles.recordHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recordTitle} numberOfLines={1}>{name}</Text>
          {has(r.date) ? <Text style={styles.recordDate}>{fmtDate(r.date)}</Text> : null}
        </View>
        <TouchableOpacity style={styles.pdfBtn} onPress={downloadPdf} disabled={exporting} activeOpacity={0.8}>
          {exporting
            ? <ActivityIndicator size="small" color="#E63946" />
            : (
              <>
                <Icon name="file-pdf-box" size={14} color="#E63946" />
                <Text style={styles.pdfBtnText}>Download Form</Text>
              </>
            )}
        </TouchableOpacity>
      </View>

      <Section title="Assessment Details">
        <Row label="Assessment Date" value={fmtDate(r.date)} />
        <Row label="Trainer Name" value={r.trainer_name} />
      </Section>

      <Section title="Section 1 — Client Information">
        <Row label="Age" value={r.age} />
        <Row label="Gender" value={r.gender} />
        <Row label="Contact" value={r.contact_no} />
        <Row label="Emergency Contact No" value={r.emergency_contact_no} />
        <Row label="Training Goal" value={goal} />
      </Section>

      <Section title="Section 2 — Medical & Health Screening">
        {MEDICAL_FIELDS.map(f => (
          <Row key={f.key} label={f.label} value={r[f.key]} flag={str(r[f.key]).toLowerCase() === 'yes'} />
        ))}
        <Row label="Any Other Condition" value={r.med_other_condition} />
      </Section>

      <Section title="Section 3 — Body Stats">
        <Row label="Height" value={withUnit(r.height, 'in')} />
        <Row label="Weight" value={withUnit(r.weight, 'kg')} />
        <Row label="Body FAT / V-FAT" value={joinParts([withUnit(r.fat, '%'), withUnit(r.v_fat, '%')])} />
        <Row label="BMI" value={withUnit(r.body_mass_index, 'kg/m2')} />
      </Section>

      <Section title="Section 4 — Measurements">
        <Row label="Chest" value={withUnit(r.chest, 'in')} />
        <Row label="Upper Belly (2in above navel)" value={withUnit(r.upper_belly, 'in')} />
        <Row label="Mid Belly / Waist (at navel)" value={withUnit(has(r.mid_belly) ? r.mid_belly : r.waist, 'in')} />
        <Row label="Lower Belly (2in below navel)" value={withUnit(r.lower_belly, 'in')} />
        <Row label="Hips / Glutes" value={withUnit(has(r.hips) ? r.hips : r.gluts, 'in')} />
        <Row label="Thighs" value={withUnit(r.thigh, 'in')} />
        <Row label="Arms" value={withUnit(r.arm, 'in')} />
      </Section>

      <Section title="Section 5 — Lifestyle & Habits">
        {LIFESTYLE_FIELDS.map(f => <Row key={f.key} label={f.label} value={r[f.key]} />)}
      </Section>

      <Section title="Section 6 — Cardiovascular Assessments">
        <Row label="VO2 Max Assessment" value={r.vo2_max} />
        <Row label="Heart Rate Recovery Step Test" value={r.hr_recovery_step_test} />
        <Row label="Maximum Heart Rate (MHR)" value={withUnit(r.mhr, 'BPM')} />
        <Row label="Resting Heart Rate (RHR)" value={withUnit(r.rhr, 'BPM')} />
      </Section>

      <Section title="Section 7 — Strength Assessments">
        <Row label="Max Push Ups" value={withUnit(r.max_push_ups, 'reps')} />
        <Row label="Max Sit Ups" value={withUnit(r.max_push_ups_one_min, 'reps')} />
        <Row label="1RM Squat" value={withUnit(r.one_rm_squats, 'kg')} />
        <Row label="1RM Bench Press" value={withUnit(r.one_rm_bench_press, 'kg')} />
      </Section>

      <Section title="Section 8 — Mobility & Flexibility">
        <Row label="Sit And Reach" value={r.fit_and_reach} />
        <Row label="Waist-to-Hip Ratio (WHR)" value={r.whr} />
      </Section>

      <Section title="Section 9 — Postural Assessment">
        {POSTURE_FIELDS.map(f => <Row key={f.key} label={f.label} value={r[f.key]} />)}
        <Row label="Clinical Recommendation" value={r.clinical_recommendation} stacked />
      </Section>

      <Section title="Section 10 — Training Objectives">
        <Row label="Primary Goal" value={r.primary_goal} />
        <Row label="Secondary Goal" value={r.secondary_goal} />
      </Section>

      <Section title="Section 11 — Trainer Final Notes" last>
        <Text style={[styles.notes, !has(r.trainer_notes) && styles.dash]}>{str(r.trainer_notes) || '—'}</Text>
      </Section>
    </View>
  );
};

const Section = ({ title, last, children }: { title: string; last?: boolean; children: React.ReactNode }) => (
  <View style={[styles.section, last && { borderBottomWidth: 0 }]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Row = ({ label, value, flag, stacked }: { label: string; value: any; flag?: boolean; stacked?: boolean }) => {
  const v = str(value);
  return (
    <View style={stacked ? styles.rowStacked : styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[stacked ? styles.rowValueStacked : styles.rowValue, !v && styles.dash, flag && styles.flag]}>
        {v || '—'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9F9FB' },
  body:   { padding: 16, paddingBottom: 40 },
  loader: { paddingVertical: 60 },

  clientBar:     { backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  clientBarText: { color: '#DDD', fontSize: 13 },
  clientBarName: { color: '#FFF', fontWeight: '700' },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 11 },
  errorText: { flex: 1, fontSize: 12.5, color: '#C62828' },
  empty:     { fontSize: 14, fontWeight: '700', color: '#E63946', textAlign: 'center', paddingVertical: 30 },

  record: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  recordHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#FFF5F5',
    borderBottomWidth: 1, borderBottomColor: '#FFE0E0',
  },
  recordTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  recordDate:  { fontSize: 11.5, color: '#888', marginTop: 2, fontWeight: '600' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 110, justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  pdfBtnText: { fontSize: 11.5, fontWeight: '700', color: '#E63946' },

  section:      { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#E63946', marginBottom: 2 },

  row:             { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowStacked:      { gap: 4 },
  rowLabel:        { flex: 1, fontSize: 12.5, color: '#777' },
  rowValue:        { flexShrink: 1, maxWidth: '55%', textAlign: 'right', fontSize: 12.5, fontWeight: '700', color: '#1A1A1A' },
  rowValueStacked: { fontSize: 12.5, fontWeight: '600', color: '#1A1A1A', lineHeight: 18 },
  dash:            { color: '#CCC', fontWeight: '500' },
  flag:            { color: '#C62828' },
  notes:           { fontSize: 12.5, color: '#1A1A1A', lineHeight: 18 },
});

export default ViewClientAssessment;

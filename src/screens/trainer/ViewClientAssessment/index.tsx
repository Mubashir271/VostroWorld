// src/screens/trainer/ViewClientAssessment/index.tsx
//
// View Assessment — the app's version of the web admin's
// /viewAssessmentInfo/{client_id} page, opened from the PT dashboard's "View"
// button on a client who already has a Client Assessment Form on file.
//
// Like the web, it lists every assessment returned by
// GET /v1/post-assessment/get (in the server's order), each one shown as the
// printed Client Assessment Form itself — the same two pages and 8 sections
// the "Download Form" PDF produces (see utils/assessmentPdf.ts), drawn with
// native views so no WebView is needed.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';
import { VOSTRO_LOGO_DATA_URI } from '../../../assets/img/vostroLogoDataUri';
import {
  getClientAssessments, deleteClientAssessment, MEDICAL_FIELDS, POSTURE_FIELDS, TRAINING_GOALS,
} from '../../../api/postAssessment';
import { downloadAssessmentPdf } from '../../../utils/assessmentPdf';

// Per-assessment delete (PUT post-assessment/delete/{id}) is wired up but
// hidden for now; flip to true to show the trash button again.
const SHOW_DELETE = false;

const MONTHS =['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const has = (v: any) => v !== null && v !== undefined && String(v).trim() !== '';
const str = (v: any) => (has(v) ? String(v).trim() : '');

// "2026-04-08" → "08 Apr 2026" (inside the form) / "08-04-2026" (card header),
// parsed by hand so it can't shift a day in a behind-UTC zone.
const parts = (s?: string) => String(s ?? '').slice(0, 10).split('-').map(Number);
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (s?: string) => {
  const [y, m, d] = parts(s);
  return y && m && d ? `${pad(d)} ${MONTHS[m - 1]} ${y}` : str(s);
};
const fmtDmy = (s?: string) => {
  const [y, m, d] = parts(s);
  return y && m && d ? `${pad(d)}-${pad(m)}-${y}` : str(s);
};
const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

// ── Screen ────────────────────────────────────────────────────────────────────

const ViewClientAssessment = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clientId: number = Number(route.params?.clientId);

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
          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color="#C62828" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : rows.length === 0 ? (
            <Text style={styles.empty}>No Assessment Found</Text>
          ) : (
            rows.map((r, i) => <AssessmentCard key={r.id ?? i} r={r} onDeleted={() => load(true)} />)
          )}
        </ScrollView>
      )}
    </View>
  );
};

// ── One assessment: header bar + the printed form ─────────────────────────────

const AssessmentCard = ({ r, onDeleted }: { r: Record<string, any>; onDeleted: () => void }) => {
  const navigation = useNavigation<any>();
  const name = `${str(r.fname)} ${str(r.lname)}`.trim() || 'Client';
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Deletes this one form by its row id (r.id), never by client id.
  const confirmDelete = () => {
    if (!has(r.id)) return;
    Alert.alert(
      'Delete assessment?',
      `This removes ${titleCase(name)}'s assessment dated ${fmtDmy(r.date) || '—'}. Other assessments are not affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteClientAssessment(r.id);
              onDeleted();
            } catch (e: any) {
              const m = e?.response?.data?.message;
              Alert.alert('Delete failed', typeof m === 'string' && m.length < 200 ? m : 'Could not delete this assessment.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  // The web's per-assessment "Download Form" button.
  const downloadPdf = async () => {
    setExporting(true);
    try {
      await downloadAssessmentPdf({ ...r, client_name: name }, navigation);
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Could not generate the PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.record}>
      <View style={styles.recordHead}>
        <Text style={styles.recordTitle} numberOfLines={1}>
          {titleCase(name)}{has(r.date) ? ` · ${fmtDmy(r.date)}` : ''}
        </Text>
        <TouchableOpacity style={styles.pdfBtn} onPress={downloadPdf} disabled={exporting} activeOpacity={0.8}>
          {exporting
            ? <ActivityIndicator size="small" color="#1A1A1A" />
            : (
              <>
                <Icon name="file-pdf-box" size={13} color="#1A1A1A" />
                <Text style={styles.pdfBtnText}>Download Form</Text>
              </>
            )}
        </TouchableOpacity>
        {SHOW_DELETE && (
          <TouchableOpacity
            style={styles.delBtn}
            onPress={confirmDelete}
            disabled={deleting || !has(r.id)}
            activeOpacity={0.8}
          >
            {deleting
              ? <ActivityIndicator size="small" color="#C62828" />
              : <Icon name="trash-can-outline" size={16} color="#C62828" />}
          </TouchableOpacity>
        )}
      </View>
      <AssessmentForm r={{ ...r, client_name: name }} />
    </View>
  );
};

// ── The printed form (mirrors utils/assessmentPdf.ts) ─────────────────────────

const AssessmentForm = ({ r }: { r: Record<string, any> }) => {
  const fatPair = [has(r.fat) ? `Body FAT ${str(r.fat)}%` : '', has(r.v_fat) ? `V-FAT ${str(r.v_fat)}` : '']
    .filter(Boolean).join(' | ');
  const goal = str(r.training_goal).toLowerCase();

  return (
    <View style={f.sheet}>
      {/* Page 1 */}
      <FormHeader />
      <View style={f.row}>
        <Field label="Assessment Date" value={fmtDate(r.date)} accent />
        <Field label="Trainer Name" value={r.trainer_name} />
      </View>

      <Bar title="Section 1 - Client Information" />
      <View style={f.row}>
        <Field label="Name" value={r.client_name} flex={2} />
        <Field label="Age" value={r.age} />
        <Field label="Gender" value={r.gender} />
      </View>
      <View style={f.row}>
        <Field label="Contact" value={r.contact_no} />
        <Field label="Emergency Contact No" value={r.emergency_contact_no} flex={1.4} />
      </View>
      <View style={f.box}>
        <Text style={f.fl}>Training Goal:</Text>
        <Text style={f.goalLine}>
          {TRAINING_GOALS.map((g, i) => {
            const on = !!goal && g.toLowerCase() === goal;
            const label = g === 'Other'
              ? `Other:${on && has(r.training_goal_other) ? ` ${str(r.training_goal_other)}` : ''}`
              : g;
            return (
              <Text key={g}>
                {i > 0 ? ' / ' : ''}
                <Text style={on ? f.goalOn : undefined}>{label}</Text>
              </Text>
            );
          })}
        </Text>
      </View>

      <Bar title="Section 2 - Medical & Health Screening" note='Write "YES" if applicable' />
      <Table
        head={['Medical Condition', 'Yes/No']}
        narrow
        rows={[
          ...MEDICAL_FIELDS.map(m => [m.label, r[m.key]] as [string, any]),
          ['Any Other Condition', r.med_other_condition],
        ]}
      />

      <Bar title="Section 3 - Body Stats" />
      <Table
        head={['Measurement', 'Result']}
        rows={[
          ['Height (cm)', r.height],
          ['Weight', r.weight],
          ['Fat %age: Body FAT/V-FAT', fatPair],
          ['BMI', r.body_mass_index],
        ]}
      />

      <Bar title="Section 4 - Measurements (CM)" />
      <Table
        head={['Body Part', 'Measurement']}
        rows={[
          ['Chest', r.chest],
          ['Upper Belly (5 cm above navel)', r.upper_belly],
          ['Mid Belly (At navel level)', has(r.mid_belly) ? r.mid_belly : r.waist],
          ['Lower Belly (5 cm below navel)', r.lower_belly],
          ['Hips', has(r.hips) ? r.hips : r.gluts],
          ['Thighs', r.thigh],
          ['Arms', r.arm],
        ]}
      />
      <Footer page={1} />

      {/* Page 2 */}
      <View style={f.pageGap} />
      <FormHeader />
      <Bar title="Section 5 - Lifestyle & Habits" />
      <Table
        head={['Question', 'Response']}
        rows={[
          ['Occupation', r.occupation],
          ['Activity Level', r.activity_level, 'Sedentary / Moderate / Active'],
          ['Sleep Hours', r.sleep_hours],
          ['Water Intake', r.water_intake],
          ['Diet Type', r.diet_type, 'Balanced / High Carb / High Fat / Poor'],
          ['Smoking / Any other Substance', r.smoking_substance, 'YES/NO'],
          ['Stress Level', r.stress_level, 'Low / Moderate / High'],
        ]}
      />

      <Bar title="Section 6 - Postural Assessment (Optional)" />
      <Table
        head={['Postural Assessment Area', 'Observations']}
        rows={POSTURE_FIELDS.map(p => [p.label, r[p.key]] as [string, any])}
      />
      <View style={f.box}>
        <Text style={f.fl}>Clinical Recommendation:</Text>
        {has(r.clinical_recommendation) ? <Text style={f.txt}>{str(r.clinical_recommendation)}</Text> : null}
      </View>

      <Bar title="Section 7 - Training Objectives" />
      <View style={f.row}>
        <Field label="Primary Goal" value={r.primary_goal} />
        <Field label="Secondary Goal" value={r.secondary_goal} />
      </View>

      <Bar title="Section 8 - Trainer Final Notes" />
      <View style={[f.box, f.notes]}>
        {has(r.trainer_notes) ? <Text style={f.txt}>{str(r.trainer_notes)}</Text> : null}
      </View>
      <Footer page={2} />
    </View>
  );
};

const FormHeader = () => (
  <View style={f.head}>
    <Image source={{ uri: VOSTRO_LOGO_DATA_URI }} style={f.logo} resizeMode="contain" />
    <View style={f.ttl}>
      <Text style={f.t1}>CLIENT ASSESSMENT FORM</Text>
      <Text style={f.t2}>FITNESS & PERFORMANCE EVALUATION</Text>
    </View>
  </View>
);

const Field = ({ label, value, accent, flex = 1 }: { label: string; value: any; accent?: boolean; flex?: number }) => (
  <View style={[f.field, { flex }, accent && f.fieldAccent]}>
    <Text style={f.fl} numberOfLines={1}>{label.toUpperCase()}:</Text>
    <Text style={f.fv}>{str(value) || ' '}</Text>
  </View>
);

const Bar = ({ title, note }: { title: string; note?: string }) => (
  <View style={f.bar}>
    <Text style={f.barText}>{title.toUpperCase()}</Text>
    {note ? <Text style={f.barNote}>{note}</Text> : null}
  </View>
);

// Rows are [label, value, hint?]; an empty value prints its grey hint, as the web does.
const Table = ({ head, rows, narrow }: { head: [string, string]; rows: [string, any, string?][]; narrow?: boolean }) => (
  <View style={f.table}>
    <View style={f.tr}>
      <Text style={[f.th, f.c1]}>{head[0].toUpperCase()}</Text>
      <Text style={[f.th, narrow ? f.c2n : f.c2, narrow && f.center]}>{head[1].toUpperCase()}</Text>
    </View>
    {rows.map(([label, v, hint]) => (
      <View key={label} style={f.tr}>
        <Text style={[f.td, f.c1]}>{label}</Text>
        <Text style={[f.td, f.tv, narrow ? f.c2n : f.c2, narrow && f.center, !has(v) && f.hint]}>
          {has(v) ? str(v) : (hint ?? '')}
        </Text>
      </View>
    ))}
  </View>
);

const Footer = ({ page }: { page: number }) => (
  <View style={f.foot}>
    <Text style={f.footText}>VOSTRO WORLD • CLIENT ASSESSMENT FORM</Text>
    <Text style={f.footText}>PAGE {page} OF 2</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9F9FB' },
  body:   { padding: 12, paddingBottom: 40 },
  loader: { paddingVertical: 60 },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 11 },
  errorText: { flex: 1, fontSize: 12.5, color: '#C62828' },
  empty:     { fontSize: 14, fontWeight: '700', color: '#E63946', textAlign: 'center', paddingVertical: 30 },

  record: {
    backgroundColor: '#FFF', marginBottom: 16, borderWidth: 1, borderColor: '#E3E3E3',
  },
  recordHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#F7F7F7',
    borderBottomWidth: 1, borderBottomColor: '#F2B8B8',
  },
  recordTitle: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#1A1A1A' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 104, justifyContent: 'center',
    borderWidth: 1, borderColor: '#1A1A1A', backgroundColor: '#FFF', borderRadius: 3,
    paddingHorizontal: 7, paddingVertical: 4,
  },
  pdfBtnText: { fontSize: 11, color: '#1A1A1A' },
  delBtn: {
    width: 30, height: 26, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFF', borderRadius: 3,
  },
});

// Printed-form styles — the colours of the web printout / assessmentPdf.ts.
const DARK = '#3c4650';
const f = StyleSheet.create({
  sheet: { padding: 12, backgroundColor: '#FFF' },
  pageGap: { height: 22 },

  head: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1.5, borderBottomColor: DARK, paddingBottom: 5, marginBottom: 8,
  },
  logo: { width: 96, height: 27 },
  ttl:  { alignItems: 'flex-end', flexShrink: 1 },
  t1:   { color: '#d71f26', fontWeight: '800', fontSize: 11.5 },
  t2:   { color: DARK, fontWeight: '700', fontSize: 7.5, letterSpacing: 0.6, marginTop: 1 },

  row:   { flexDirection: 'row', gap: 5, marginBottom: 5 },
  field: { borderWidth: 1, borderColor: '#dde1e5', paddingHorizontal: 5, paddingVertical: 4 },
  fieldAccent: { borderLeftWidth: 3, borderLeftColor: '#d71f26' },
  fl: { fontWeight: '800', color: DARK, fontSize: 8, letterSpacing: 0.3 },
  fv: { marginTop: 2, fontSize: 9, color: '#222', borderBottomWidth: 1, borderBottomColor: '#ccd2d8', minHeight: 13 },

  box:   { borderWidth: 1, borderColor: '#dde1e5', paddingHorizontal: 5, paddingVertical: 4, marginBottom: 5 },
  notes: { minHeight: 44 },
  txt:   { fontSize: 9, color: '#222', marginTop: 2 },
  goalLine: { fontSize: 9, color: '#222', marginTop: 1 },
  goalOn:   { color: '#d71f26', fontWeight: '800', textDecorationLine: 'underline' },

  bar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: DARK, borderLeftWidth: 3, borderLeftColor: '#d71f26',
    paddingHorizontal: 6, paddingVertical: 4, marginTop: 4, marginBottom: 4,
  },
  barText: { color: '#FFF', fontWeight: '800', fontSize: 8.5, letterSpacing: 0.3, flexShrink: 1 },
  barNote: { color: '#FFF', fontStyle: 'italic', fontSize: 7.5, marginLeft: 6 },

  table: { borderWidth: 1, borderColor: '#e3e7eb', marginBottom: 5 },
  tr:    { flexDirection: 'row' },
  th:    { backgroundColor: '#56626d', color: '#FFF', fontWeight: '700', fontSize: 8, letterSpacing: 0.3, paddingHorizontal: 5, paddingVertical: 3 },
  td:    { backgroundColor: '#f4f6f8', fontSize: 8.5, color: '#222', paddingHorizontal: 5, paddingVertical: 3, borderTopWidth: 1, borderTopColor: '#e3e7eb' },
  tv:    { backgroundColor: '#FFF', borderLeftWidth: 1, borderLeftColor: '#e3e7eb' },
  c1:    { flex: 1 },
  c2:    { width: '42%' },
  c2n:   { width: '22%' },
  center:{ textAlign: 'center' },
  hint:  { color: '#8a939c' },

  foot: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1.5, borderTopColor: DARK, paddingTop: 3, marginTop: 6,
  },
  footText: { fontWeight: '800', color: DARK, fontSize: 7.5 },
});

export default ViewClientAssessment;

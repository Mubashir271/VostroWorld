// src/screens/Nutrition/AddAssessmentQuestionnaire/QuestionnaireSheet.tsx
//
// The questionnaire drawn as the printed form — the web's Edit/View page and
// its PDF (utils/questionnairePdf.ts) — with native views, so no WebView is
// needed. Read-only; editing happens in the form screen's Edit mode.

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { VOSTRO_LOGO_DATA_URI } from '../../../assets/img/vostroLogoDataUri';
import {
  Q_OBJECTIVES, Q_MEALS, Q_PMH, Q_STRESS, Q_ACTIVITY, Q_BODY_COLS, Q_DISCLAIMER, qDate,
} from '../../../utils/questionnairePdf';

const has = (v: any) => v !== null && v !== undefined && String(v).trim() !== '';
const str = (v: any) => (has(v) ? String(v).trim() : '');

const DARK = '#3c4650';
const RED = '#d71f26';

const Header = () => (
  <View style={f.head}>
    <Image source={{ uri: VOSTRO_LOGO_DATA_URI }} style={f.logo} resizeMode="contain" />
    <View style={f.ttl}>
      <Text style={f.t1}>QUESTIONNAIRE</Text>
      <Text style={f.t2}>HEALTH | FITNESS | WELLNESS</Text>
    </View>
  </View>
);

const Bar = ({ title, note }: { title: string; note?: string }) => (
  <View style={f.bar}>
    <Text style={f.barText}>{title}</Text>
    {note ? <Text style={f.barNote}>{note}</Text> : null}
  </View>
);

const Field = ({ label, value, flex = 1 }: { label: string; value: any; flex?: number }) => (
  <View style={[f.field, { flex }]}>
    <Text style={f.fl}>{label.toUpperCase()}</Text>
    <Text style={f.fv}>{str(value) || ' '}</Text>
  </View>
);

const Tick = ({ on, label }: { on: boolean; label: string }) => (
  <View style={f.tick}>
    <View style={[f.box, on && f.boxOn]}>{on ? <Text style={f.boxMark}>✓</Text> : null}</View>
    <Text style={f.tickLabel}>{label}</Text>
  </View>
);

const Footer = ({ page }: { page: number }) => (
  <View style={f.foot}>
    <Text style={f.footText}>VOSTRO WORLD • CLIENT ASSESSMENT FORM</Text>
    <Text style={f.footText}>PAGE {page} OF 2</Text>
  </View>
);

const Sign = ({ title }: { title: string }) => (
  <View style={[f.field, f.sign]}>
    <Text style={f.fl}>{title.toUpperCase()}</Text>
    <Text style={f.signText}>Signature ____________</Text>
    <Text style={f.signText}>Date: ___ / ___ / _____</Text>
  </View>
);

/** `r` carries the questionnaire's API field names. */
const QuestionnaireSheet = ({ r }: { r: Record<string, any> }) => {
  const objectives: string[] = Array.isArray(r.plan_objectives) ? r.plan_objectives : [];
  const dietary = r.daily_dietary_intake || {};
  const entries: any[] = Array.isArray(r.body_entries) ? r.body_entries : [];

  return (
    <View>
      {/* Page 1 */}
      <View style={f.sheet}>
        <Header />
        <View style={f.note}><Text style={f.noteText}>{Q_DISCLAIMER}</Text></View>

        <Bar title="CLIENT INFORMATION" />
        <View style={f.row}>
          <Field label="Name" value={r.name} flex={2} />
          <Field label="Age" value={r.age} />
          <Field label="Gender" value={r.gender} />
        </View>
        <View style={f.row}><Field label="Height" value={r.height} /></View>
        <View style={f.panel}>
          <Text style={f.panelTitle}>The objective of the plan: (please tick against the goal)</Text>
          <View style={f.ticks}>
            {Q_OBJECTIVES.map(o => <Tick key={o.id} on={objectives.includes(o.id)} label={o.label} />)}
          </View>
        </View>

        <Bar title="BODY ASSESSMENT" />
        <View style={f.table}>
          <View style={f.tr}>
            {Q_BODY_COLS.map(([k, l]) => (
              <Text key={k} style={[f.th, f.bodyCell, k === 'assessment_date' && f.dateCell]} numberOfLines={1}>{l}</Text>
            ))}
          </View>
          {entries.map((e, i) => (
            <View key={i} style={f.tr}>
              {Q_BODY_COLS.map(([k]) => (
                <Text key={k} style={[f.td, f.bodyCell, f.center, k === 'assessment_date' && f.dateCell]} numberOfLines={1}>
                  {k === 'assessment_date' ? qDate(e[k]) : str(e[k])}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Bar title="LIFESTYLE & FITNESS PROFILE" />
        <View style={f.row}>
          <Field label="Have you tried any diet plans before?" value={r.tried_diet_plans} />
          <Field label="Gym member or not:" value={r.gym_member} />
        </View>
        <View style={f.row}>
          <Field label="Already following any diet:" value={r.following_diet} />
          <Field label="Undergoing any type of training:" value={r.undergoing_training} />
        </View>
        <View style={f.row}>
          <Field label="Currently using any medicine or supplements:" value={r.medicine_supplements} />
        </View>
        <Footer page={1} />
      </View>

      {/* Page 2 */}
      <View style={[f.sheet, f.pageGap]}>
        <Header />
        <Bar title="YOUR DAILY DIETARY INTAKE" />
        <View style={f.table}>
          <View style={f.tr}>
            <Text style={[f.th, f.center, { width: '26%' }]}>TIME</Text>
            <Text style={[f.th, f.center, { width: '24%' }]}>MEALS</Text>
            <Text style={[f.th, f.center, f.flex]}>SPECIFICATION</Text>
          </View>
          {Q_MEALS.map(m => {
            const k = m.toLowerCase();
            return (
              <View key={m} style={f.tr}>
                <Text style={[f.td, f.center, { width: '26%' }]}>{str(dietary[`${k}_time`])}</Text>
                <Text style={[f.td, f.bold, { width: '24%' }]}>{m}</Text>
                <Text style={[f.td, f.center, f.flex]}>{str(dietary[`${k}_spec`])}</Text>
              </View>
            );
          })}
        </View>
        <View style={f.row}>
          <Field label="Daily water intake:" value={r.daily_water_intake} />
          <Field label="Food allergies if any:" value={r.allergic_foods} />
        </View>
        <View style={f.row}>
          <Field label="Food you don't prefer:" value={r.disliked_foods} />
          <Field label="Foods you prefer:" value={r.preferred_foods} />
        </View>

        <Bar title="P.M.H (IF ANY)" note="only to be filled by the consultant" />
        <View style={f.table}>
          <View style={f.tr}>
            <Text style={[f.th, f.center, f.flex]}>MEDICAL CONDITION / EVALUATION</Text>
            <Text style={[f.th, f.center, f.statusCol]}>STATUS</Text>
          </View>
          {Q_PMH.map(p => (
            <View key={p.key} style={f.tr}>
              <Text style={[f.td, f.bold, f.flex]}>{p.label}</Text>
              <View style={[f.td, f.statusCol, f.statusCell]}>
                <Tick on={r[p.key] === 'Yes'} label="Yes" />
                <Tick on={r[p.key] === 'No'} label="No" />
              </View>
            </View>
          ))}
          <View style={f.tr}>
            <Text style={[f.td, f.bold, f.flex]}>Joint mobility issue or muscle pain:</Text>
            <Text style={[f.td, f.statusCol]}>{str(r.muscle_pain)}</Text>
          </View>
          <View style={f.tr}>
            <Text style={[f.td, f.bold, f.flex]}>Any other issue (DISEASE OR SURGERY):</Text>
            <Text style={[f.td, f.statusCol]}>{str(r.any_other_issue)}</Text>
          </View>
        </View>

        <View style={f.panel}>
          <Text style={f.panelTitle}>
            Do you take stress (health-related, Job-related, financial, marriage, family related, interpersonal, and spiritual)?
          </Text>
          <View style={f.ticks}>
            {Q_STRESS.map(o => <Tick key={o.value} on={r.stress_level === o.value} label={o.label} />)}
          </View>
        </View>
        <View style={f.panel}>
          <Text style={f.panelTitle}>Activity Level</Text>
          <View style={f.ticks}>
            {Q_ACTIVITY.map(o => <Tick key={o.value} on={r.activity_level === o.value} label={o.label} />)}
          </View>
        </View>
        <View style={f.row}>
          <Sign title="Client Acknowledgment" />
          <Sign title="Consultant Approval" />
        </View>
        <Footer page={2} />
      </View>
    </View>
  );
};

const f = StyleSheet.create({
  sheet: { backgroundColor: '#FFF', padding: 12, borderWidth: 1, borderColor: '#E3E3E3' },
  pageGap: { marginTop: 14 },

  head: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1.5, borderBottomColor: DARK, paddingBottom: 5, marginBottom: 8,
  },
  logo: { width: 96, height: 27 },
  ttl:  { alignItems: 'flex-end', flexShrink: 1 },
  t1:   { color: RED, fontWeight: '800', fontSize: 12 },
  t2:   { color: DARK, fontWeight: '700', fontSize: 7.5, letterSpacing: 0.8, marginTop: 1 },

  note:     { borderLeftWidth: 3, borderLeftColor: RED, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 6 },
  noteText: { fontSize: 8, color: '#222', lineHeight: 11 },

  bar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: DARK, borderLeftWidth: 3, borderLeftColor: RED,
    paddingHorizontal: 6, paddingVertical: 4, marginTop: 4, marginBottom: 4,
  },
  barText: { color: '#FFF', fontWeight: '800', fontSize: 8.5, letterSpacing: 0.3, flexShrink: 1 },
  barNote: { color: '#FFF', fontStyle: 'italic', fontSize: 7.5, marginLeft: 6 },

  row:   { flexDirection: 'row', gap: 5, marginBottom: 5 },
  field: { flex: 1, borderWidth: 1, borderColor: '#dde1e5', paddingHorizontal: 5, paddingVertical: 4 },
  fl:    { fontWeight: '800', color: DARK, fontSize: 7.5, letterSpacing: 0.3 },
  fv:    { marginTop: 2, fontSize: 9, color: '#222', borderBottomWidth: 1, borderBottomColor: '#ccd2d8', minHeight: 13 },

  panel:      { borderWidth: 1, borderColor: '#dde1e5', paddingHorizontal: 5, paddingVertical: 4, marginBottom: 5 },
  panelTitle: { fontSize: 8.5, fontWeight: '700', color: '#222', marginBottom: 3 },
  ticks:      { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 3 },
  tick:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  box:        { width: 9, height: 9, borderWidth: 1, borderColor: RED, alignItems: 'center', justifyContent: 'center' },
  boxOn:      { backgroundColor: '#FFF' },
  boxMark:    { fontSize: 7, lineHeight: 8, color: RED, fontWeight: '800' },
  tickLabel:  { fontSize: 8.5, color: '#222' },

  table: { marginBottom: 5 },
  tr:    { flexDirection: 'row', gap: 2, marginBottom: 2 },
  th:    { backgroundColor: '#56626d', color: '#FFF', fontWeight: '700', fontSize: 7.5, paddingHorizontal: 3, paddingVertical: 3 },
  td:    { borderWidth: 1, borderColor: '#e3e7eb', fontSize: 8.5, color: '#222', paddingHorizontal: 3, paddingVertical: 3, minHeight: 18 },
  bodyCell:   { flex: 1, textAlign: 'center' },
  dateCell:   { flex: 1.8 },
  statusCol:  { width: '36%' },
  statusCell: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  flex:   { flex: 1 },
  center: { textAlign: 'center' },
  bold:   { fontWeight: '700' },

  sign:     { minHeight: 50 },
  signText: { fontSize: 8, color: '#444', marginTop: 4 },

  foot: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1.5, borderTopColor: DARK, paddingTop: 3, marginTop: 6,
  },
  footText: { fontWeight: '800', color: DARK, fontSize: 7.5 },
});

export default QuestionnaireSheet;

// src/utils/questionnairePdf.ts
//
// "Download PDF" for the Nutritionist Assessment Questionnaire — the app's
// version of the web's printout (Nutritionist_Questionnaire_<name>.pdf).
//
// Like utils/assessmentPdf.ts this is a printed document, so it copies the
// web printout's look (red title, dark section bars, ticked boxes, signature
// blocks) rather than the app's screen styling. The web's own printout spills
// a few lines onto a third page; this one is laid out to fit two A4 pages.

import { scaleCssPx } from './printScale';
import { generatePDF } from 'react-native-html-to-pdf';
import { openPdf } from './openPdf';
import { VOSTRO_LOGO_DATA_URI } from '../assets/img/vostroLogoDataUri';

/** Shared with the on-screen form view so both print the same rows. */
export const Q_OBJECTIVES = [
  { id: 'fat_loss', label: 'Fat loss/weight loss' },
  { id: 'muscle_strength', label: 'Muscle and strength gain' },
  { id: 'disease_management', label: 'Disease management' },
];
export const Q_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Munching'];
export const Q_PMH = [
  { key: 'diabetes', label: 'Diabetes type 1 or 2' },
  { key: 'hypertension_cvd', label: 'Hypertension or CVD' },
  { key: 'polycystic_ovarian_syndrome', label: 'Polycystic ovarian syndrome' },
  { key: 'anemia', label: 'Anemia' },
  { key: 'ibs', label: 'IBS' },
  { key: 'h_pylori', label: 'H. Pylori' },
];
export const Q_STRESS = [
  { value: 'Minimal', label: 'a) Minimal' },
  { value: 'Moderate', label: 'b) Moderate' },
  { value: 'Unbearable', label: 'c) Unbearable' },
];
export const Q_ACTIVITY = [
  { value: 'Office Job (Sedentary)', label: 'a) Office Job (Sedentary)' },
  { value: 'Light exercise', label: 'b) Light exercise' },
  { value: 'Moderate exercise', label: 'c) Moderate exercise' },
  { value: 'Heavy exercise', label: 'd) Heavy exercise' },
  { value: 'Athlete', label: 'e) Athlete' },
];
export const Q_BODY_COLS = [
  ['assessment_date', 'Date'], ['weight', 'Weight'], ['bmi', 'BMI'], ['chest', 'Chest'],
  ['belly', 'Belly'], ['hips', 'Hips'], ['arms', 'Arms'], ['thighs', 'Thighs'], ['fat', 'Fat'], ['vf', 'VF'],
] as const;
export const Q_DISCLAIMER =
  'THIS DOCUMENT IS ONLY TO BE USED UNDER NUTRITIONAL INFORMATION ON AND THUS CANNOT BE USED FOR ANY OTHER PURPOSE. THE CLIENT IS INFORMED ABOUT EVERYTHING AND IS IN AWARENESS OF OUR PROTOCOLS.';

const has = (v: any) => v !== null && v !== undefined && String(v).trim() !== '';
const esc = (v: any) =>
  (has(v) ? String(v).trim() : '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "2026-10-06" → "06/10/2026"; anything else is printed as given. */
export const qDate = (v: any) => {
  const t = has(v) ? String(v).trim() : '';
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : t;
};

const tick = (on: boolean, label: string) =>
  `<span class="tick"><span class="box ${on ? 'on' : ''}">${on ? '&#10003;' : ''}</span>${label}</span>`;

const field = (label: string, v: any) =>
  `<div class="field"><div class="fl">${label}</div><div class="fv">${esc(v) || '&nbsp;'}</div></div>`;

const bar = (title: string, note = '') =>
  `<div class="bar"><span>${title}</span>${note ? `<em>${note}</em>` : ''}</div>`;

const footer = (page: number) =>
  `<div class="foot"><span>VOSTRO WORLD • CLIENT ASSESSMENT FORM</span><span>PAGE ${page} OF 2</span></div>`;

const header = `
  <div class="head">
    <img src="${VOSTRO_LOGO_DATA_URI}" />
    <div class="ttl"><div class="t1">QUESTIONNAIRE</div><div class="t2">HEALTH | FITNESS | WELLNESS</div></div>
  </div>`;

const sign = (title: string) => `
  <div class="field sign">
    <div class="fl">${title}</div>
    <div class="signrow"><span>Signature</span><span class="line"></span><span>Date: ____ / ____ / ________</span></div>
  </div>`;

/** `r` carries the questionnaire's API field names (a saved record or the form's current values). */
export const buildQuestionnaireHtml = (r: Record<string, any>): string => {
  const objectives: string[] = Array.isArray(r.plan_objectives) ? r.plan_objectives : [];
  const dietary = r.daily_dietary_intake || {};
  const entries: any[] = Array.isArray(r.body_entries) ? r.body_entries : [];

  return `<!doctype html><html><head><meta charset="utf-8" />
<style>${scaleCssPx(`
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #222; font-size: 11px; }
  /* Designed at A4's 96-dpi size; px scaled to the iOS print width (utils/printScale). */
  .page { width: 794px; height: 1116px; padding: 30px 40px 26px; position: relative; overflow: hidden; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3c4650; padding-bottom: 8px; margin-bottom: 12px; }
  .head img { height: 46px; }
  .ttl { text-align: right; }
  .t1 { color: #d71f26; font-weight: 800; font-size: 20px; letter-spacing: .3px; }
  .t2 { color: #3c4650; font-weight: 700; font-size: 12px; letter-spacing: 1.5px; margin-top: 2px; }
  .note { border-left: 3px solid #d71f26; padding: 5px 9px; font-size: 11.5px; margin-bottom: 10px; line-height: 1.4; }
  .row { display: flex; gap: 8px; margin-bottom: 8px; }
  .field { flex: 1; border: 1px solid #dde1e5; padding: 6px 8px; min-height: 44px; }
  .fl { font-weight: 800; color: #3c4650; font-size: 10.5px; letter-spacing: .4px; text-transform: uppercase; }
  .fv { margin-top: 4px; font-size: 12px; border-bottom: 1px solid #ccd2d8; min-height: 16px; }
  .panel { border: 1px solid #dde1e5; padding: 7px 9px; margin-bottom: 8px; }
  .panel p { margin: 0 0 5px; font-weight: 700; font-size: 11.5px; }
  .tick { display: inline-flex; align-items: center; gap: 4px; margin-right: 14px; font-size: 11.5px; }
  .box { display: inline-block; width: 11px; height: 11px; border: 1.3px solid #d71f26; font-size: 9px; line-height: 9px; text-align: center; color: #d71f26; font-weight: 800; }
  .bar { background: #3c4650; color: #fff; font-weight: 800; font-size: 12px; letter-spacing: .4px; padding: 6px 9px; margin: 10px 0 6px; display: flex; justify-content: space-between; border-left: 4px solid #d71f26; }
  .bar em { font-weight: 400; font-style: italic; letter-spacing: 0; }
  table { width: 100%; border-collapse: separate; border-spacing: 2px; margin-bottom: 6px; }
  th { background: #56626d; color: #fff; padding: 5px 6px; font-size: 11px; letter-spacing: .3px; }
  td { border: 1px solid #e3e7eb; padding: 4px 6px; font-size: 11.5px; height: 22px; }
  .body td { text-align: center; }
  .diet td.c { text-align: center; }
  .diet td.m, .pmh td.m { font-weight: 700; }
  .pmh td.s { text-align: center; width: 36%; }
  .sign { min-height: 60px; }
  .signrow { display: flex; align-items: flex-end; gap: 6px; margin-top: 18px; font-size: 11px; }
  .signrow .line { flex: 1; border-bottom: 1px solid #555; height: 1px; }
  .foot { position: absolute; left: 40px; right: 40px; bottom: 20px; border-top: 2px solid #3c4650; padding-top: 5px; display: flex; justify-content: space-between; font-weight: 800; color: #3c4650; font-size: 11px; }
`)}</style></head><body>

<div class="page">
  ${header}
  <div class="note">${Q_DISCLAIMER}</div>
  ${bar('CLIENT INFORMATION')}
  <div class="row"><div style="flex:2;display:flex">${field('Name', r.name)}</div>${field('Age', r.age)}${field('Gender', r.gender)}</div>
  <div class="row">${field('Height', r.height)}</div>
  <div class="panel"><p>The objective of the plan: (please tick against the goal)</p>
    ${Q_OBJECTIVES.map(o => tick(objectives.includes(o.id), o.label)).join('')}
  </div>

  ${bar('BODY ASSESSMENT')}
  <table class="body">
    <tr>${Q_BODY_COLS.map(([, l]) => `<th>${l}</th>`).join('')}</tr>
    ${entries.map(e => `<tr>${Q_BODY_COLS.map(([k]) => `<td>${k === 'assessment_date' ? esc(qDate(e[k])) : esc(e[k])}</td>`).join('')}</tr>`).join('')}
  </table>

  ${bar('LIFESTYLE &amp; FITNESS PROFILE')}
  <div class="row">${field('Have you tried any diet plans before?', r.tried_diet_plans)}${field('Gym member or not:', r.gym_member)}</div>
  <div class="row">${field('Already following any diet:', r.following_diet)}${field('Undergoing any type of training:', r.undergoing_training)}</div>
  <div class="row">${field('Currently using any medicine or supplements:', r.medicine_supplements)}</div>
  ${footer(1)}
</div>

<div class="page">
  ${header}
  ${bar('YOUR DAILY DIETARY INTAKE')}
  <table class="diet">
    <tr><th style="width:24%">TIME</th><th style="width:20%">MEALS</th><th>SPECIFICATION</th></tr>
    ${Q_MEALS.map(m => {
      const k = m.toLowerCase();
      return `<tr><td class="c">${esc(dietary[`${k}_time`])}</td><td class="m">${m}</td><td class="c">${esc(dietary[`${k}_spec`])}</td></tr>`;
    }).join('')}
  </table>
  <div class="row">${field('Daily water intake:', r.daily_water_intake)}${field('Food allergies if any:', r.allergic_foods)}</div>
  <div class="row">${field("Food you don't prefer:", r.disliked_foods)}${field('Foods you prefer:', r.preferred_foods)}</div>

  ${bar('P.M.H (IF ANY)', 'only to be filled by the consultant')}
  <table class="pmh">
    <tr><th>MEDICAL CONDITION / EVALUATION</th><th>STATUS</th></tr>
    ${Q_PMH.map(p => `<tr><td class="m">${p.label}</td><td class="s">${tick(r[p.key] === 'Yes', 'Yes')}${tick(r[p.key] === 'No', 'No')}</td></tr>`).join('')}
    <tr><td class="m">Joint mobility issue or muscle pain:</td><td>${esc(r.muscle_pain)}</td></tr>
    <tr><td class="m">Any other issue (DISEASE OR SURGERY):</td><td>${esc(r.any_other_issue)}</td></tr>
  </table>

  <div class="panel"><p>Do you take stress (health-related, Job-related, financial, marriage, family related, interpersonal, and spiritual)?</p>
    ${Q_STRESS.map(o => tick(r.stress_level === o.value, o.label)).join('')}
  </div>
  <div class="panel"><p>Activity Level</p>
    ${Q_ACTIVITY.map(o => tick(r.activity_level === o.value, o.label)).join('')}
  </div>
  <div class="row">${sign('Client Acknowledgment')}${sign('Consultant Approval')}</div>
  ${footer(2)}
</div>
</body></html>`;
};

/**
 * Render to Nutritionist_Questionnaire_<name>.pdf (the web's file name) and
 * open it — in-app viewer on iOS, share sheet on Android (utils/openPdf).
 */
export const downloadQuestionnairePdf = async (r: Record<string, any>, navigation: any) => {
  const safe = String(r.name || `client_${r.client_id ?? ''}`).trim().replace(/[^\w-]+/g, '_');
  const { filePath } = await generatePDF({
    html: buildQuestionnaireHtml(r),
    fileName: `Nutritionist_Questionnaire_${safe}`,
    width: 595,   // A4 in points
    height: 842,
    padding: 0,
    shouldPrintBackgrounds: true,
  });
  await openPdf(filePath, `Nutritionist_Questionnaire_${safe}`, 'Questionnaire', navigation);
};

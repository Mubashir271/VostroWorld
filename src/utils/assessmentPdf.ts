// src/utils/assessmentPdf.ts
//
// "Download Form" for the Client Assessment Form — the app's version of the
// web's html2canvas + jsPDF printout (Client_Assessment_Form_<name>.pdf).
//
// This is a printed document, so it deliberately copies the web printout's
// look (two A4 pages, dark section bars, red title, empty cells for blank
// fields, grey option hints) rather than the app's screen styling. The HTML
// is rendered to a PDF natively by react-native-html-to-pdf and handed to the
// share sheet, which is how a phone saves or sends a file.

import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { VOSTRO_LOGO_DATA_URI } from '../assets/img/vostroLogoDataUri';
import {
  MEDICAL_FIELDS, POSTURE_FIELDS, TRAINING_GOALS,
} from '../api/postAssessment';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const has = (v: any) => v !== null && v !== undefined && String(v).trim() !== '';
const esc = (v: any) =>
  (has(v) ? String(v).trim() : '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (s?: string) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : String(s);
};

// A value cell; when empty, the web prints the option list as a grey hint.
const cell = (v: any, hint = '') =>
  has(v) ? esc(v) : (hint ? `<span class="hint">${hint}</span>` : '');

const field = (label: string, v: any, cls = '') =>
  `<div class="field ${cls}"><div class="fl">${label}:</div><div class="fv">${esc(v) || '&nbsp;'}</div></div>`;

const bar = (title: string, note = '') =>
  `<div class="bar"><span>${title}</span>${note ? `<em>${note}</em>` : ''}</div>`;

const table = (h1: string, h2: string, rows: [string, string][], narrow = false) => `
  <table class="${narrow ? 'narrow' : ''}">
    <tr><th>${h1}</th><th>${h2}</th></tr>
    ${rows.map(([l, v]) => `<tr><td>${l}</td><td class="v">${v}</td></tr>`).join('')}
  </table>`;

const footer = (page: number) =>
  `<div class="foot"><span>VOSTRO WORLD • CLIENT ASSESSMENT FORM</span><span>PAGE ${page} OF 2</span></div>`;

const header = `
  <div class="head">
    <img src="${VOSTRO_LOGO_DATA_URI}" />
    <div class="ttl"><div class="t1">CLIENT ASSESSMENT FORM</div><div class="t2">FITNESS &amp; PERFORMANCE EVALUATION</div></div>
  </div>`;

/**
 * `r` uses API column names (a saved record, or `toApiRecord(form)` for an
 * unsaved one) plus `client_name`.
 */
export const buildAssessmentHtml = (r: Record<string, any>): string => {
  const fatPair = [has(r.fat) ? `Body FAT ${esc(r.fat)}%` : '', has(r.v_fat) ? `V-FAT ${esc(r.v_fat)}` : '']
    .filter(Boolean).join('  |  ');
  const goal = String(r.training_goal ?? '').toLowerCase();
  const goals = TRAINING_GOALS.map(g => {
    const on = goal && g.toLowerCase() === goal;
    const label = g === 'Other' ? `Other:${on && has(r.training_goal_other) ? ` ${esc(r.training_goal_other)}` : ''}` : g;
    return on ? `<b class="on">${label}</b>` : label;
  }).join(' / ');
  const pushUps = [has(r.max_push_ups) ? `Push Ups: ${esc(r.max_push_ups)}` : '', has(r.max_push_ups_one_min) ? `Sit Ups: ${esc(r.max_push_ups_one_min)}` : '']
    .filter(Boolean).join('  |  ');
  const squat = [has(r.one_rm_squats) ? `1RM Squat: ${esc(r.one_rm_squats)} kg` : '', has(r.one_rm_bench_press) ? `1RM Bench: ${esc(r.one_rm_bench_press)} kg` : '']
    .filter(Boolean).join('  |  ');

  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #222; font-size: 11px; }
  /* Laid out at A4's 96-dpi size (794×1123 px), then zoomed to the PDF's
     595×842 pt page. A few px short of full height so rounding never spills
     a blank third page. */
  .page { width: 794px; height: 1116px; zoom: 0.75; padding: 34px 44px 28px; position: relative; overflow: hidden; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3c4650; padding-bottom: 8px; margin-bottom: 14px; }
  .head img { height: 46px; }
  .ttl { text-align: right; }
  .t1 { color: #d71f26; font-weight: 800; font-size: 19px; letter-spacing: .3px; }
  .t2 { color: #3c4650; font-weight: 700; font-size: 12px; letter-spacing: 1px; margin-top: 2px; }
  .row { display: flex; gap: 8px; margin-bottom: 8px; }
  .field { flex: 1; border: 1px solid #dde1e5; border-left: 3px solid #d71f26; padding: 6px 8px; min-height: 40px; }
  .field.plain { border-left-color: #dde1e5; }
  .fl { font-weight: 800; color: #3c4650; font-size: 10.5px; letter-spacing: .4px; text-transform: uppercase; }
  .fv { margin-top: 3px; font-size: 12px; border-bottom: 1px solid #ccd2d8; min-height: 16px; }
  .bar { background: #3c4650; color: #fff; font-weight: 800; font-size: 12px; letter-spacing: .4px; padding: 6px 9px; margin: 10px 0 6px; display: flex; justify-content: space-between; text-transform: uppercase; }
  .bar em { font-weight: 400; font-style: italic; text-transform: none; letter-spacing: 0; }
  table { width: 100%; border-collapse: separate; border-spacing: 0 2px; }
  th { background: #56626d; color: #fff; text-align: left; padding: 5px 8px; font-size: 11px; letter-spacing: .4px; text-transform: uppercase; }
  td { background: #f4f6f8; padding: 5px 8px; font-size: 11.5px; }
  td.v { width: 36%; background: #fff; border: 1px solid #e3e7eb; }
  table.narrow td.v { width: 18%; text-align: center; font-weight: 700; }
  .hint { color: #8a939c; }
  .goal { border: 1px solid #dde1e5; padding: 6px 8px; margin-bottom: 8px; }
  .goal b.on { color: #d71f26; text-decoration: underline; }
  .box { border: 1px solid #dde1e5; padding: 7px 9px; min-height: 42px; font-size: 11.5px; }
  .notes { min-height: 70px; }
  .foot { position: absolute; left: 44px; right: 44px; bottom: 22px; border-top: 2px solid #3c4650; padding-top: 5px; display: flex; justify-content: space-between; font-weight: 800; color: #3c4650; font-size: 11px; }
</style></head><body>

<div class="page">
  ${header}
  <div class="row">${field('Assessment Date', fmtDate(r.date))}${field('Trainer Name', r.trainer_name)}</div>
  ${bar('Section 1 - Client Information')}
  <div class="row">${field('Name', r.client_name, 'plain')}${field('Age', r.age, 'plain')}${field('Gender', r.gender, 'plain')}</div>
  <div class="row">${field('Contact', r.contact_no, 'plain')}${field('Emergency Contact No', r.emergency_contact_no, 'plain')}</div>
  <div class="goal"><div class="fl">Training Goal:</div><div>${goals}</div></div>

  ${bar('Section 2 - Medical &amp; Health Screening', 'Write "YES" if applicable')}
  ${table('Medical Condition', 'Yes/No', [
    ...MEDICAL_FIELDS.map(f => [f.label, cell(r[f.key])] as [string, string]),
    ['Any Other Condition', cell(r.med_other_condition)],
  ], true)}

  ${bar('Section 3 - Body Stats')}
  ${table('Measurement', 'Result', [
    ['Height', cell(r.height)],
    ['Weight', cell(r.weight)],
    ['Fat %age: Body FAT/V-FAT', cell(fatPair)],
    ['BMI', cell(r.body_mass_index)],
  ])}

  ${bar('Section 4 - Measurements (Inches/CM)')}
  ${table('Body Part', 'Measurement', [
    ['Chest', cell(r.chest)],
    ['Upper Belly (2 inches above navel)', cell(r.upper_belly)],
    ['Mid Belly (At navel level)', cell(has(r.mid_belly) ? r.mid_belly : r.waist)],
    ['Lower Belly (2 inches below navel)', cell(r.lower_belly)],
    ['Hips', cell(has(r.hips) ? r.hips : r.gluts)],
    ['Thighs', cell(r.thigh)],
    ['Arms', cell(r.arm)],
  ])}
  ${footer(1)}
</div>

<div class="page">
  ${header}
  ${bar('Section 5 - Lifestyle &amp; Habits')}
  ${table('Question', 'Response', [
    ['Occupation', cell(r.occupation)],
    ['Activity Level', cell(r.activity_level, 'Sedentary / Moderate / Active')],
    ['Sleep Hours', cell(r.sleep_hours)],
    ['Water Intake', cell(r.water_intake)],
    ['Diet Type', cell(r.diet_type, 'Balanced / High Carb / High Fat / Poor')],
    ['Smoking / Any other Substance', cell(r.smoking_substance, 'YES/NO')],
    ['Stress Level', cell(r.stress_level, 'Low / Moderate / High')],
  ])}

  ${bar('Section 6 - Cardiovascular Assessments')}
  ${table('Cardiovascular Assessments', 'Result', [
    ['VO2 Max Assessment', cell(r.vo2_max)],
    ['Heart Rate Recovery Step Test', cell(r.hr_recovery_step_test)],
    ['Maximum Heart Rate (MHR)', cell(r.mhr)],
    ['Resting Heart Rate (RHR)', cell(r.rhr)],
  ])}

  ${bar('Section 7 - Strength Assessments')}
  ${table('Strength Assessments', 'Result', [
    ['Upper Body Strength / Push-Up Test', cell(pushUps)],
    ['Lower Body Strength / Squat Test', cell(squat)],
  ])}

  ${bar('Section 8 - Mobility &amp; Flexibility Assessments')}
  ${table('Mobility &amp; Flexibility Assessments', 'Result', [
    ['Sit and Reach Test / Flexibility Assessment / Mobility Screening', cell(r.fit_and_reach)],
    ['Waist-to-Hip Ratio (WHR)', cell(r.whr)],
  ])}

  ${bar('Section 9 - Postural Assessment')}
  ${table('Postural Assessment Area', 'Observations', POSTURE_FIELDS.map(f => [f.label, cell(r[f.key])] as [string, string]))}
  <div class="box"><div class="fl">Clinical Recommendation:</div>${esc(r.clinical_recommendation)}</div>

  ${bar('Section 10 - Training Objectives')}
  <div class="row">${field('Primary Goal', r.primary_goal, 'plain')}${field('Secondary Goal', r.secondary_goal, 'plain')}</div>

  ${bar('Section 11 - Trainer Final Notes')}
  <div class="box notes">${esc(r.trainer_notes)}</div>
  ${footer(2)}
</div>
</body></html>`;
};

/**
 * Render the form to Client_Assessment_Form_<name>.pdf (the web's file name)
 * and open the share sheet. Cancelling the sheet is not an error.
 */
export const downloadAssessmentPdf = async (r: Record<string, any>) => {
  const safe = String(r.client_name || `client_${r.client_id ?? ''}`).replace(/[^\w-]+/g, '_');
  const { filePath } = await generatePDF({
    html: buildAssessmentHtml(r),
    fileName: `Client_Assessment_Form_${safe}`,
    width: 595,   // A4 in points
    height: 842,
    padding: 0,
    shouldPrintBackgrounds: true,
  });
  await Share.open({
    url: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
    type: 'application/pdf',
    filename: `Client_Assessment_Form_${safe}`,
    failOnCancel: false,
  });
};

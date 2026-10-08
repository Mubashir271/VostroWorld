// src/api/postAssessment.ts
//
// Client Assessment Form — the web admin's /postAssessment/{client_id} page,
// reached from the PT dashboard's "Add Assessment" button.
//
// Field names, option lists and the payload mapping were read out of the web
// bundle (static/js/main.d2c153f2.js, 2026-09-29): `addPostAssessment(values,
// clientId)` builds exactly the body below, and the form's selects send their
// option labels verbatim ("Yes", "Fat Loss", "Sedentary", …).

import api from './service';

export const TRAINING_GOALS = ['Fat Loss', 'Muscle Gain', 'Strength', 'Rehab', 'General Fitness', 'Other'];
export const YES_NO = ['Yes', 'No'];
export const GENDERS = ['Male', 'Female', 'Other'];

// Section 2 — each is a Yes/No select.
export const MEDICAL_FIELDS = [
  { key: 'med_blood_pressure',       label: 'Blood Pressure (Low/High)' },
  { key: 'med_heart_disease',        label: 'Heart Disease / Issues' },
  { key: 'med_diabetes',             label: 'Diabetes (Self or Family)' },
  { key: 'med_high_cholesterol',     label: 'High Cholesterol' },
  { key: 'med_breathing_asthma',     label: 'Breathing Difficulties / Asthma' },
  { key: 'med_leg_cramps',           label: 'Frequent Leg Cramps' },
  { key: 'med_swollen_ankles',       label: 'Swollen Ankles' },
  { key: 'med_spinal_joint_pain',    label: 'Spinal / Joint Pain' },
  { key: 'med_recent_surgery',       label: 'Recent Surgery' },
  { key: 'med_pregnancy_postpartum', label: 'Pregnancy/Postpartum' },
  { key: 'med_c_section',            label: 'C-Section Delivery (Females)' },
];

// Section 5 — `options` makes it a select, otherwise free text.
export const LIFESTYLE_FIELDS: { key: string; label: string; options?: string[] }[] = [
  { key: 'occupation',        label: 'Occupation' },
  { key: 'activity_level',    label: 'Activity Level', options: ['Sedentary', 'Moderate', 'Active'] },
  { key: 'sleep_hours',       label: 'Sleep Hours' },
  { key: 'water_intake',      label: 'Water Intake' },
  { key: 'diet_type',         label: 'Diet Type', options: ['Balanced', 'High Carb', 'High Fat', 'Poor'] },
  { key: 'smoking_substance', label: 'Smoking / Any other Substance', options: YES_NO },
  { key: 'stress_level',      label: 'Stress Level', options: ['Low', 'Moderate', 'High'] },
];

// Section 9 — free-text observations.
export const POSTURE_FIELDS = [
  { key: 'posture_head_neck',            label: 'Head & Neck Alignment' },
  { key: 'posture_shoulder_level',       label: 'Shoulder Level' },
  { key: 'posture_pelvic_alignment',     label: 'Pelvic Alignment' },
  { key: 'posture_knee_position',        label: 'Knee Position' },
  { key: 'posture_foot_ankle',           label: 'Foot/Ankle Alignment' },
  { key: 'posture_gait_pattern',         label: 'Gait Pattern' },
  { key: 'posture_balance_coordination', label: 'Balance & Coordination' },
];

/**
 * The form's numeric fields, keyed by the web's Formik names. `required`
 * mirrors the web's yup schema: those must be a number > 0.
 */
export const NUMERIC_FIELDS: Record<string, { label: string; unit?: string; required?: boolean }> = {
  Age:                  { label: 'Age', required: true },
  Height:               { label: 'Height', unit: 'cm', required: true },
  Weight:               { label: 'Weight', unit: 'Kg', required: true },
  Fat:                  { label: 'Body FAT', unit: '%', required: true },
  Vfat:                 { label: 'V-FAT', unit: '%', required: true },
  BMI:                  { label: 'BMI', unit: 'kg/m2', required: true },
  Chest:                { label: 'Chest', unit: 'cm', required: true },
  upper_belly:          { label: 'Upper Belly (5 cm above navel)', unit: 'cm' },
  Waist:                { label: 'Mid Belly / Waist (at navel)', unit: 'cm', required: true },
  lower_belly:          { label: 'Lower Belly (5 cm below navel)', unit: 'cm' },
  Glutes:               { label: 'Hips / Glutes', unit: 'cm', required: true },
  Thigh:                { label: 'Thighs', unit: 'cm', required: true },
  Arm:                  { label: 'Arms', unit: 'cm', required: true },
  Mhr:                  { label: 'Maximum Heart Rate (MHR)', unit: 'BPM', required: true },
  Rhr:                  { label: 'Resting Heart Rate (RHR)', unit: 'BPM', required: true },
  max_push_ups:         { label: 'Max Push Ups', unit: 'Reps' },
  max_push_ups_one_min: { label: 'Max Sit Ups', unit: 'Reps' },
  one_rm_squat:         { label: '1RM Squat', unit: 'Kg' },
  one_rm_bench_press:   { label: '1RM Bench Press', unit: 'Kg' },
  fit_and_reach:        { label: 'Sit And Reach' },
  Whr:                  { label: 'Waist-to-Hip Ratio (WHR)', required: true },
};

/** Form values keyed by the web's Formik names (see NUMERIC_FIELDS etc.). */
export type AssessmentForm = Record<string, string>;

/**
 * POST /v1/post-assessment/add. Mirrors the web's `addPostAssessment`: the
 * Formik names are renamed to API columns here (Glutes → gluts and hips,
 * Waist → waist and mid_belly, Vfat → v_fat, one_rm_squat → one_rm_squats).
 */
export const addClientAssessment = (v: AssessmentForm, clientId: number) =>
  api.post('/v1/post-assessment/add', toApiRecord(v, clientId));

/**
 * Form values → API column names. Also used to print the Add form to PDF, so
 * the printout reads a saved record and an unsaved form the same way.
 */
export const toApiRecord = (v: AssessmentForm, clientId: number): Record<string, any> => ({
  client_id: clientId,
  branch_id: v.branch_id,
  date: v.date,
  age: v.Age,
  height: v.Height,
  weight: v.Weight,
  chest: v.Chest,
  arm: v.Arm,
  waist: v.Waist,
  gluts: v.Glutes,
  thigh: v.Thigh,
  body_mass_index: v.BMI,
  fat: v.Fat,
  rhr: v.Rhr,
  mhr: v.Mhr,
  whr: v.Whr,
  v_fat: v.Vfat,
  max_push_ups: v.max_push_ups,
  max_push_ups_one_min: v.max_push_ups_one_min,
  one_rm_squats: v.one_rm_squat,
  one_rm_bench_press: v.one_rm_bench_press,
  fit_and_reach: v.fit_and_reach,
  trainer_name: v.trainer_name,
  gender: v.gender,
  contact_no: v.contact_no,
  emergency_contact_no: v.emergency_contact_no,
  training_goal: v.training_goal,
  training_goal_other: v.training_goal_other,
  ...Object.fromEntries(MEDICAL_FIELDS.map(f => [f.key, v[f.key]])),
  med_other_condition: v.med_other_condition,
  upper_belly: v.upper_belly,
  mid_belly: v.Waist,
  lower_belly: v.lower_belly,
  hips: v.Glutes,
  ...Object.fromEntries(LIFESTYLE_FIELDS.map(f => [f.key, v[f.key]])),
  vo2_max: v.vo2_max,
  hr_recovery_step_test: v.hr_recovery_step_test,
  ...Object.fromEntries(POSTURE_FIELDS.map(f => [f.key, v[f.key]])),
  clinical_recommendation: v.clinical_recommendation,
  primary_goal: v.primary_goal,
  secondary_goal: v.secondary_goal,
  trainer_notes: v.trainer_notes,
});

/**
 * GET /v1/post-assessment/get?client_id= — every Client Assessment Form on
 * file for this client, as the web's /viewAssessmentInfo/{id} page loads them.
 * Rows carry API column names (height, gluts/hips, v_fat, …) plus the
 * client's `fname` / `lname`.
 */
export const getClientAssessments = async (clientId: number): Promise<Record<string, any>[]> => {
  const res = await api.get('/v1/post-assessment/get', { params: { client_id: clientId } });
  const rows = res?.data?.data;
  return Array.isArray(rows) ? rows : [];
};

/**
 * PUT /v1/post-assessment/delete/{id} — removes one Client Assessment Form.
 * `id` is the assessment row's own id (e.g. 442), NOT the client id; the
 * route answered "Supported methods: PUT" to a GET probe on 2026-10-06, the
 * same PUT delete/{id} shape as the HR and finance deletes.
 */
export const deleteClientAssessment = async (id: number | string) => {
  const res = await api.put(`/v1/post-assessment/delete/${id}`, {});
  return res.data;
};

/**
 * GET /v1/clients/client-name?branch_id=&id= — the web prefills gender,
 * phone and emergency contact from this when the form mounts.
 */
export const getClientBasics = async (branchId: number | string, clientId: number) => {
  const res = await api.get('/v1/clients/client-name', { params: { branch_id: branchId, id: clientId } });
  return res?.data?.data?.[0] ?? null;
};

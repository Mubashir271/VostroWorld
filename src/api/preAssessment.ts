// src/api/preAssessment.ts
//
// Trainer client pre-assessment — the web admin's /trainer-client/{id} →
// Tools → Add Assessment flow.
//
// Every field name and value below was read out of the web app's own bundle
// (static/js/main.dcb585c0.js, captured in the 2026-09-17 HAR), not guessed:
// `clientPreAssessment()` builds exactly this payload, and the yes/no radios
// send the literal strings "yes" / "no".

import api from './service';

export type YesNo = 'yes' | 'no' | '';

// The 11 Goal Setting chips, in the web's own order. `fitness_goals` is sent
// as these labels comma-joined — the web collects them with
// jQuery('.you_want.active').map(el => el.value).get().join(',').
export const FITNESS_GOALS = [
  'Reduce Body FA%',
  'Agility',
  'Body Tone',
  'Balance',
  'Improve Strength And Endurance',
  'Core Strength',
  'Reshaping',
  'Muscle Gain',
  'Weight Gain',
  'Weight Lose',
  'Flexibility',
] as const;

export interface PreAssessmentPayload {
  client_id: number;
  branch_id: number | string;

  // Physical Activity Readiness (PAR-Q)
  doctor_recommended_activity: YesNo;
  chest_pain_during_activity: YesNo;
  chest_pain_past_month: YesNo;
  balance_issues: YesNo;
  bone_joint_problem: YesNo;
  medical_supervision: YesNo;
  pregnant: YesNo;
  medication_prescribed: YesNo;
  taking_medicine: YesNo;

  // Healthy Habits
  smoking_habit: YesNo;
  health_club_member: YesNo;
  have_personal_trainer: YesNo;
  exercise_days: string;   // "1".."5"
  other_reason: string;    // free text; the web defaults this to "no"

  // The Objective Of The Plan
  tried_diet_plan: YesNo;
  gym_member: YesNo;
  following_diet: YesNo;
  have_training: YesNo;
  medication_supplement_use: YesNo;

  // Your Daily Dietary Intake — *_time are "hh:mm AM/PM" (see toApiTime)
  breakfast: string;  breakfast_time: string;
  lunch: string;      lunch_time: string;
  dinner: string;     dinner_time: string;
  snack: string;      snack_time: string;
  munching: string;   munching_time: string;

  water_intake: string;
  favorite_foods: string;
  allergic_foods: string;
  disliked_foods: string;

  fitness_goals: string;
}

/**
 * "13:05" → "01:05 PM". Mirrors the bundle's inline formatter; an empty or
 * malformed value is passed through as '' rather than "NaN:NaN AM".
 */
export const toApiTime = (hhmm: string): string => {
  const [h, m] = String(hhmm ?? '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const hour12 = h % 12 || 12;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
};

/** POST /v1/pre-assessment/add — the web treats 201 as success. */
export const addPreAssessment = (payload: PreAssessmentPayload) =>
  api.post('/v1/pre-assessment/add', payload);

/** GET /v1/pre-assessment/get?client_id= — this client's assessment. */
export const getPreAssessment = (clientId: number) =>
  api.get('/v1/pre-assessment/get', { params: { client_id: clientId } });

/**
 * GET /v1/pre-assessment/exists/{client_id} — 200 means the client has already
 * been assessed. The web calls this when Add Assessment mounts and sends the
 * trainer to the view page instead of showing an empty form again.
 */
export const preAssessmentExists = (clientId: number) =>
  api.get(`/v1/pre-assessment/exists/${clientId}`);

import api from './service';

// ── Dashboard ────────────────────────────────────────────────────────────────

export const getPhysioDashboard = (params: { branch_id: number; week_start?: string }) =>
  api.get('/v1/physio/dashboard', { params });

// ── Appointments ─────────────────────────────────────────────────────────────

export const getPhysioAppointments = (params: {
  branch_id: number;
  limit?: number;
  page?: number;
  search?: string;
  source?: string;
  start_date?: string;
  end_date?: string;
}) => api.get('/v1/physio/appointments', { params });

export const getPhysioAppointmentPhysios = (params: { branch_id: number }) =>
  api.get('/v1/physio/appointments/physios', { params });

// ── Prescriptions ─────────────────────────────────────────────────────────────

export const getPhysioPrescriptions = (params: {
  branch_id: number;
  limit?: number;
  page?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
}) => api.get('/v1/physio/prescriptions', { params });

// Field names below mirror the web admin's "Add Prescription" form labels
// (snake_cased) — not yet confirmed against a live payload, re-verify once
// a prescription has been successfully created from the app.
export const addPhysioPrescription = (payload: {
  branch_id: number;
  physiotherapist_id?: number;
  client_id?: number;
  prescription_date: string;
  client_name?: string;
  age?: string;
  gender?: string;
  region?: string;
  diagnosis?: string;
  chief_complaint?: string;
  pain_site?: string;
  pain_type?: string;
  pain_score?: string;
  aggravating_factor?: string;
  relieving_factor?: string;
  radiating?: string;
  session_recommended?: string;
  functional_limitation?: string;
  treatment_plan?: string;
  goals?: string;
  recommendations?: string;
  notes?: string;
}) => api.post('/v1/physio/prescriptions', payload);

// ── GX ────────────────────────────────────────────────────────────────────────

// No pagination — the web admin loads the full client list in one call and
// filters server-side via `search`.
export const getPhysioGX = (params: { branch_id: number; search?: string }) =>
  api.get('/v1/physio/gx', { params });

// ── Daily Client Referrals ───────────────────────────────────────────────────

export const getPhysioDailyReferrals = (params: {
  branch_id: number;
  limit?: number;
  page?: number;
  search?: string;
  date?: string;
}) => api.get('/v1/physio/daily-referrals', { params });

export const getPhysioDailyReferralTrainers = (params: { branch_id: number }) =>
  api.get('/v1/physio/daily-referrals/trainers', { params });

// Field names below mirror the web admin's "Add Daily Referral" form labels
// (snake_cased) — not yet confirmed against a live payload (the captured HAR
// only has the GET calls, no submit), re-verify once a referral has been
// successfully created from the app.
export const addPhysioDailyReferral = (payload: {
  branch_id: number;
  physiotherapist_id?: number;
  referral_date: string;
  patient_name?: string;
  trainer_id?: number;
  referred_count?: string;
  session_recommended?: string;
  client_referral?: string;
  notes?: string;
}) => api.post('/v1/physio/daily-referrals', payload);

// ── Patient Details ──────────────────────────────────────────────────────────

// Read-only report (Search by name/UID/phone + a "Filter" dropdown, Excel/PDF
// export on the web admin — no Add flow). The HAR capture only had the page
// load, not the actual data fetch, so the endpoint path, `filter` values and
// response fields are inferred from the module naming convention and the
// search placeholder; re-verify once real rows are returned.
export const getPhysioPatientDetails = (params: {
  branch_id: number;
  limit?: number;
  page?: number;
  search?: string;
  filter?: string;
}) => api.get('/v1/physio/patient-details', { params });

// ── Client Responses ─────────────────────────────────────────────────────────

// Web admin: Search (name / helpful part / suggestions) + From/To date range.
// The endpoint path and list response fields are inferred (no data fetch was
// captured); re-verify once real rows exist.
export const getPhysioClientResponses = (params: {
  branch_id: number;
  limit?: number;
  page?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
}) => api.get('/v1/physio/client-responses', { params });

// "Add Response" form (screenshot-confirmed fields): Physiotherapist,
// Timestamp (auto-filled, not user-editable), Name, Age, then 5 free-text
// consultation-feedback questions. Field names below are snake_cased from
// the question text — the endpoint path and exact payload keys are still
// unconfirmed (no submit was captured), re-verify once a response has been
// successfully created from the app.
export const addPhysioClientResponse = (payload: {
  branch_id: number;
  physiotherapist_id?: number;
  timestamp?: string;
  name?: string;
  age?: string;
  most_helpful_part?: string;
  confidence_level?: string;
  unclear_or_confusing?: string;
  change_one_thing?: string;
  suggestions?: string;
}) => api.post('/v1/physio/client-responses', payload);

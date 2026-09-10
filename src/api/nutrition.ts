import api from './service';

// ── Nutritionists ─────────────────────────────────────────────────────────────
// `/v1/nutritionists/get` does NOT exist (404 on dev 2026-09-10). Nutritionists
// are staff with role 10 — the appointments module already exposes them.
export const getNutritionists = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/appointments/nutritionists', { params });

// ── Nutrition Packages ────────────────────────────────────────────────────────
// There is no `/v1/nutrition-packages/*` namespace — confirmed on dev
// 2026-09-10 that BOTH `/get` and `/store` 404. Nutrition packages are ordinary
// packages carrying category 5 (see the Category Code Reference), so they use
// the same `/v1/packages/*` routes as cafe products (category 10) and GX slots
// (category 15). The old read 404'd silently, which is why the list was empty.

const NUTRITION_CATEGORY = '5';

export const getNutritionPackages = (params: {
  branch_id: number | string;
  search?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/packages/get', {
  params: {
    branch_id: params.branch_id,
    key: 'category',
    value: NUTRITION_CATEGORY,
    status: 1,
    limit: params.limit ?? 200,
    ...(params.page ? { page: params.page } : {}),
    ...(params.search ? { search: params.search } : {}),
  },
});

// Confirmed live on dev 2026-09-10 (201). `user_id` is the nutritionist.
export const addNutritionPackage = (payload: {
  branch_id: number | string;
  package_name: string;
  price: number;
  duration: number;
  user_id?: number;
  session_count?: number;
  description?: string;
}) => api.post('/v1/packages/add', { ...payload, category: NUTRITION_CATEGORY });

// ── Meal Plans ────────────────────────────────────────────────────────────────

export const getMealPlans = (params: {
  branch_id: number | string;
  client_name?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/fitness/meal-plane/listing', { params });

// `/v1/meal-plans/store` does NOT exist (404 on dev 2026-09-10). The real
// create route is `/v1/fitness/meal-plane/store` — the same `meal-plane`
// prefix the listing already uses — and it requires `client_id`, not just a
// client name.
export const addMealPlan = (payload: {
  branch_id: number | string;
  client_id: number;
  start_date: string;
  end_date: string;
  client_name?: string;
  meals?: any;
}) => api.post('/v1/fitness/meal-plane/store', payload);

// ── Meal Plan Intake Form (the "View / Edit Diet Plan" 6-page document) ─────
// HAR-confirmed live 2026-08-06: tapping the eye icon on the web's "View
// Meals Plan" table opens a 6-page editor (Client & Do's/Don'ts, Pre
// breakfast, Breakfast, Lunch, Dinner, Closing notes) keyed by the meal
// plan's `plan_id`/uuid — a separate resource from the weekly notes+photo
// grid that AddMealsPlan/getMealPlans work with.
export interface MealOption {
  text: string;
  imageUrl: string | null;
}

export interface MealPlanIntakeFormData {
  name: string;
  age_gender: string;
  height: string;
  weight: string;
  bmi: string;
  body_fat_pct: string;
  lifestyle: string;
  assessment_date: string;
  medical_history: string;
  food_allergy: string;
  goals: string;
  recommendations: string;
  carbs_grams: string;
  proteins_grams: string;
  fats_grams: string;
  calories_required: string;
  dos_list: string[];
  donts_list: string[];
  closing_notes: string;
  pre_breakfast_label: string;
  pre_breakfast_time: string;
  pre_breakfast_options: MealOption[];
  breakfast_label: string;
  breakfast_time: string;
  breakfast_options: MealOption[];
  lunch_label: string;
  lunch_time: string;
  lunch_options: MealOption[];
  dinner_label: string;
  dinner_time: string;
  dinner_options: MealOption[];
}

export const getMealPlanIntakeForm = (params: { uuid: string }) =>
  api.get('/v1/fitness/meal-plane/intake-form', { params });

// Sent as multipart/form-data on the web (HAR-confirmed) even though both
// fields are plain strings — `form_data` is the JSON-encoded document.
// Photos are referenced by URL only (see uploadNutritionGalleryImage for
// getting a URL for a newly uploaded photo); no raw file part is sent here.
export const saveMealPlanIntakeForm = (payload: {
  plan_uuid: string;
  form_data: MealPlanIntakeFormData;
}) => {
  const formData = new FormData();
  formData.append('plan_uuid', payload.plan_uuid);
  formData.append('form_data', JSON.stringify(payload.form_data));
  return api.post('/v1/fitness/meal-plane/intake-form', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Nutrition Assessments ─────────────────────────────────────────────────────

export const getNutritionAssessments = (params: {
  branch_id: number | string;
  client_id?: number;
  limit?: number;
  page?: number;
}) => api.get('/v1/fitness/nutrition-assessments/index', { params });

export const addNutritionAssessment = (payload: any) =>
  api.post('/v1/fitness/nutrition-assessments/store', payload);

// ── Nutrition Appointments ────────────────────────────────────────────────────

export const getNutritionAppointments = (params: {
  branch_id: number | string;
  search?: string;
  conversion?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/appointments', { params });

export const getAppointmentConversionOptions = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/appointments/conversion-options', { params });

export const getAppointmentsStatistics = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/appointments/statistics', { params });

export const getAppointmentNutritionists = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/appointments/nutritionists', { params });

export const getAppointmentTrainers = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/appointments/trainers', { params });

/**
 * Create a nutrition appointment.
 *
 * Only `branch_id` and `appointment_date` are required (verified live on dev
 * 2026-09-10 by dropping each field in turn).
 *
 * ⚠️ `appointment_time` must be 24-hour `H:i` — "14:30", not "02:30 PM".
 *
 * ⚠️ The referral source is **two different fields**.
 * `/nutrition/appointments/trainers` returns real trainers *plus* two sentinel
 * entries — `{id: "special:g13_branch"}` and `{id: "special:outsider"}` — both
 * flagged `is_special: true`. Those ids are not staff ids: sending one as
 * `trainer_id` fails with `422 The selected trainer id is invalid`. They belong
 * in `trainer_label` instead, with `trainer_id` left unset. A real trainer uses
 * `trainer_id` and leaves `trainer_label` unset.
 */
export const addNutritionAppointment = (payload: {
  branch_id: number | string;
  appointment_date: string;
  appointment_time?: string;
  nutritionist_id?: number;
  /** Real staff id only — never a `special:*` sentinel. */
  trainer_id?: number;
  /** Free-text referral source, e.g. "G13 Branch" / "Outsider". */
  trainer_label?: string;
  client_id?: number;
  client_name?: string;
  contact?: string;
  conversion?: string;
  consultation?: string;
  client_remarks?: string;
}) => api.post('/v1/nutrition/appointments', payload);

// ── Diet Plans ────────────────────────────────────────────────────────────────

export const getDietPlans = (params: {
  branch_id: number | string;
  search?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/diet-plans', { params });

export const getDietPlansStatistics = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/diet-plans/statistics', { params });

export const getDietPlanGoalOptions = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/diet-plans/goal-options', { params });

export const addDietPlanIssued = (payload: {
  branch_id: number | string;
  client_id: number;
  date: string;
  goal?: string;
  trainer_id?: number;
  nutritionist_id?: number;
  diet_plan_issued?: boolean;
  remarks?: string;
}) => api.post('/v1/nutrition/diet-plans', payload);

// ── Health Camps ──────────────────────────────────────────────────────────────

export const getHealthCamps = (params: {
  branch_id: number | string;
  search?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/health-camps', { params });

export const getHealthCampsStatistics = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/health-camps/statistics', { params });

// ── Referral Sheet ────────────────────────────────────────────────────────────

export const getReferrals = (params: { branch_id: number | string; nutritionist_id?: number; week_start?: string; week_end?: string }) =>
  api.get('/v1/nutrition/referrals', { params });

export const addReferral = (payload: {
  branch_id: number | string;
  week_start: string;
  week_end: string;
  trainer_id?: number;
  referrals?: number;
  is_general_trainer?: boolean;
  active_clients?: number;
  transformations?: number;
  asked_for_google_review?: boolean;
  asked_for_video_shoot?: boolean;
  remarks?: string;
}) => api.post('/v1/nutrition/referrals', payload);

export const updateReferral = (id: number, payload: Partial<{
  referrals: number;
  active_clients: number;
  transformations: number;
  asked_for_google_review: boolean;
  asked_for_video_shoot: boolean;
  remarks: string;
}>) => api.put(`/v1/nutrition/referrals/${id}`, payload);

export const deleteReferral = (id: number) =>
  api.delete(`/v1/nutrition/referrals/${id}`);

export const getReferralTrainers = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/referrals/trainers', { params });

export const getReferralsStatistics = (params: { branch_id: number | string }) =>
  api.get('/v1/nutrition/referrals/statistics', { params });

// ── Nutritionist Assessment Questionnaire ───────────────────────────────────

export const getAssessmentForms = (params: {
  branch_id: number | string;
  search?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/nutritionist-assessment-forms', { params });

export const getAssessmentFormByClient = (clientId: number, params: { branch_id: number | string }) =>
  api.get(`/v1/nutrition/nutritionist-assessment-forms/by-client/${clientId}`, { params });

export const addAssessmentForm = (payload: any) =>
  api.post('/v1/nutrition/nutritionist-assessment-forms', payload);

export const updateAssessmentForm = (id: number, payload: any) =>
  api.put(`/v1/nutrition/nutritionist-assessment-forms/${id}`, payload);

// ── Client Hub (Clients Details) ────────────────────────────────────────────

export const getClientHub = (params: {
  branch_id: number | string;
  client_id?: number;
  search?: string;
  filter?: 'all' | 'has_any' | 'missing_any' | 'meal_plan' | 'nutrition_assessment' | 'questionnaire' | 'diet_plan' | 'appointments';
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/client-hub', { params });

// ── Image Gallery (Nutritionist login only) ─────────────────────────────────

// No pagination — the web admin (nutritionist login) loads up to 200 images
// in one call and filters server-side via `search`, confirmed live 2026-07-23.
export const getNutritionGallery = (params: {
  branch_id: number | string;
  search?: string;
  limit?: number;
}) => api.get('/v1/nutrition/gallery', { params });

// Upload/delete were not captured live (the HAR only had the list+search
// calls) — endpoint path, method and the multipart field name ('image')
// are inferred from this app's other file-upload endpoints (see
// employeeDashboard.ts's staff-documents upload); re-verify once an image
// has been successfully uploaded from the app.
export const uploadNutritionGalleryImage = (payload: {
  branch_id: number | string;
  title: string;
  image: { uri: string; name: string; type: string };
}) => {
  const formData = new FormData();
  formData.append('branch_id', String(payload.branch_id));
  formData.append('title', payload.title);
  // Confirmed live on dev 2026-09-10: the field is **`images[]`**, and it must
  // be an array — a single `image` part fails with "The images field is
  // required", and `images` (not bracketed) with "The images must be an array".
  // Response: `{ message: "N image(s) uploaded successfully", data: [{ image_url, ... }] }`.
  formData.append('images[]', payload.image as any);
  return api.post('/v1/nutrition/gallery', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteNutritionGalleryImage = (id: number) =>
  api.delete(`/v1/nutrition/gallery/${id}`);

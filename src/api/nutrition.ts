import api from './service';

// ── Nutritionists ─────────────────────────────────────────────────────────────

export const getNutritionists = (params: { branch_id: number }) =>
  api.get('/v1/nutritionists/get', { params });

// ── Nutrition Packages ────────────────────────────────────────────────────────

export const getNutritionPackages = (params: {
  branch_id: number;
  search?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition-packages/get', { params });

export const addNutritionPackage = (payload: {
  branch_id: number;
  nutritionist_id: number;
  nutrition_type: string;
  package_name: string;
  price: number;
  number_of_sessions: number;
  duration: number;
}) => api.post('/v1/nutrition-packages/store', payload);

// ── Meal Plans ────────────────────────────────────────────────────────────────

export const getMealPlans = (params: {
  branch_id: number;
  client_name?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/fitness/meal-plane/listing', { params });

export const addMealPlan = (payload: {
  branch_id: number;
  client_name: string;
  start_date: string;
  end_date: string;
  meals: any;
}) => api.post('/v1/meal-plans/store', payload);

// ── Nutrition Assessments ─────────────────────────────────────────────────────

export const getNutritionAssessments = (params: {
  branch_id: number;
  client_id?: number;
  limit?: number;
  page?: number;
}) => api.get('/v1/fitness/nutrition-assessments/index', { params });

export const addNutritionAssessment = (payload: any) =>
  api.post('/v1/fitness/nutrition-assessments/store', payload);

// ── Nutrition Appointments ────────────────────────────────────────────────────

export const getNutritionAppointments = (params: {
  branch_id: number;
  search?: string;
  conversion?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/appointments', { params });

export const getAppointmentConversionOptions = (params: { branch_id: number }) =>
  api.get('/v1/nutrition/appointments/conversion-options', { params });

export const getAppointmentsStatistics = (params: { branch_id: number }) =>
  api.get('/v1/nutrition/appointments/statistics', { params });

export const getAppointmentNutritionists = (params: { branch_id: number }) =>
  api.get('/v1/nutrition/appointments/nutritionists', { params });

export const getAppointmentTrainers = (params: { branch_id: number }) =>
  api.get('/v1/nutrition/appointments/trainers', { params });

export const addNutritionAppointment = (payload: {
  branch_id: number;
  appointment_date: string;
  appointment_time?: string;
  nutritionist_id?: number;
  trainer_id?: number;
  client_id?: number;
  client_name?: string;
  contact?: string;
  conversion?: string;
  consultation?: string;
  client_remarks?: string;
}) => api.post('/v1/nutrition/appointments', payload);

// ── Diet Plans ────────────────────────────────────────────────────────────────

export const getDietPlans = (params: {
  branch_id: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/diet-plans', { params });

export const getDietPlansStatistics = (params: { branch_id: number }) =>
  api.get('/v1/nutrition/diet-plans/statistics', { params });

export const getDietPlanGoalOptions = (params: { branch_id: number }) =>
  api.get('/v1/nutrition/diet-plans/goal-options', { params });

export const addDietPlanIssued = (payload: {
  branch_id: number;
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
  branch_id: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/health-camps', { params });

export const getHealthCampsStatistics = (params: { branch_id: number }) =>
  api.get('/v1/nutrition/health-camps/statistics', { params });

// ── Referral Sheet ────────────────────────────────────────────────────────────

export const getReferrals = (params: { branch_id: number; week_start?: string; week_end?: string }) =>
  api.get('/v1/nutrition/referrals', { params });

export const addReferral = (payload: {
  branch_id: number;
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

export const getReferralTrainers = (params: { branch_id: number }) =>
  api.get('/v1/nutrition/referrals/trainers', { params });

export const getReferralsStatistics = (params: { branch_id: number }) =>
  api.get('/v1/nutrition/referrals/statistics', { params });

// ── Nutritionist Assessment Questionnaire ───────────────────────────────────

export const getAssessmentForms = (params: {
  branch_id: number;
  search?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/nutritionist-assessment-forms', { params });

export const getAssessmentFormByClient = (clientId: number, params: { branch_id: number }) =>
  api.get(`/v1/nutrition/nutritionist-assessment-forms/by-client/${clientId}`, { params });

export const addAssessmentForm = (payload: any) =>
  api.post('/v1/nutrition/nutritionist-assessment-forms', payload);

export const updateAssessmentForm = (id: number, payload: any) =>
  api.put(`/v1/nutrition/nutritionist-assessment-forms/${id}`, payload);

// ── Client Hub (Clients Details) ────────────────────────────────────────────

export const getClientHub = (params: {
  branch_id: number;
  client_id?: number;
  search?: string;
  filter?: 'all' | 'has_any' | 'missing_any' | 'meal_plan' | 'nutrition_assessment' | 'questionnaire' | 'diet_plan' | 'appointments';
  limit?: number;
  page?: number;
}) => api.get('/v1/nutrition/client-hub', { params });

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
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/meal-plans/get', { params });

export const addMealPlan = (payload: {
  branch_id: number;
  client_name: string;
  start_date: string;
  end_date: string;
  meals: any;
}) => api.post('/v1/meal-plans/store', payload);

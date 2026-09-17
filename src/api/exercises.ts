// src/api/exercises.ts
//
// Fitness › Manage Exercises. Until 2026-09-17 the ManageExercises screen had
// no API layer at all: it seeded from four hardcoded SAMPLE_EXERCISES, mutated
// local state, and popped "Exercise added successfully!" without sending
// anything. This module is the real backend for that screen.
//
// Endpoints recovered from the web admin bundle and confirmed against a HAR of
// /manage-exercises captured 2026-09-17.

import api from './service';

/** Row shape of GET /v1/fitness/exercise/index (confirmed live 2026-09-17). */
export interface ExerciseRow {
  id: number;
  name: string;
  description?: string | null;
  status?: string;
  branch_id?: number;
  branch_name?: string;
  // ⚠️ The read shape names these *_type_id; the write shape below calls the
  // same two values category_id / sub_category_id. Do not assume symmetry.
  training_type_id?: number;
  training_type?: string;
  exercise_type_id?: number;
  exercise_type?: string;
}

export interface ExercisePayload {
  branch_id: number | string;
  name: string;
  description?: string;
  /** The TRAINING type id (e.g. 115 "Weight Training"). */
  category_id: number | string;
  /** The EXERCISE type id (e.g. 204 "Chest"). */
  sub_category_id?: number | string;
}

export const getExercises = async (params: {
  branch_id?: number | string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/fitness/exercise/index', { params });
  return res.data;
};

/**
 * POST /v1/fitness/exercise/store
 *
 * Field names come from the web bundle's `addExercise()`, which maps its form
 * counter-intuitively: `category_id` receives the training type and
 * `sub_category_id` the exercise type. Wiring those the other way round is the
 * easy mistake here.
 *
 * Not yet exercised against a live backend — the 2026-09-17 HAR captured only
 * GETs on this page.
 */
export const addExercise = (payload: ExercisePayload) =>
  api.post('/v1/fitness/exercise/store', payload);

export const updateExercise = (id: number, payload: ExercisePayload) =>
  api.put(`/v1/fitness/exercise/update/${id}`, payload);

/** Soft delete — the web PUTs to actions/{id}/2 with an empty body. */
export const deleteExercise = (id: number) =>
  api.put(`/v1/fitness/exercise/actions/${id}/2`, {});

/**
 * Training types for the first dropdown. `type=Exercise` is what scopes this
 * to exercise categories rather than cafe/finance ones — confirmed live
 * 2026-09-17, which returned 3 rows ({id: 115, name: "Weight Training"}).
 */
export const getExerciseCategories = async (branchId: number | string) => {
  const res = await api.get('/v1/finance/categories/fetch-categories-names', {
    params: { status: '1', branch_id: branchId, type: 'Exercise' },
  });
  return res.data;
};

/**
 * Exercise types for the dependent second dropdown.
 *
 * Answers 404 {"status": false, "message": "No record found"} for a category
 * with no sub-categories — that is "empty", not an error, and callers should
 * treat it as an empty list rather than surfacing a failure.
 */
export const getExerciseSubCategories = async (
  categoryId: number | string,
  branchId: number | string,
) => {
  const res = await api.get('/v1/finance/sub-categories/fetch-subcategories-names', {
    params: { category_id: categoryId, branch_id: branchId, status: '1' },
  });
  return res.data;
};

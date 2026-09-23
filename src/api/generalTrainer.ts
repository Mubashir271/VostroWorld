// src/api/generalTrainer.ts
//
// The General Trainer portal (role '17') — what backs the web's /gt-dashboard.
//
// Routes, methods and payloads were read out of the web bundle in the
// 2026-09-23 HAR (its api module defines gtDashboardSummary,
// gtClientAssessments, gtStoreBefitReferral and gtUpdateBefitConversion), and
// the two GETs were then confirmed live against production the same day with
// uk8668686@gmail.com. The two writes are transcribed from the bundle's own
// call sites and have NOT been fired — no write is made against production.
//
// A General Trainer's job here is assessments and BeFit referrals: they
// assess clients, push suitable ones to a personal trainer, and then record
// whether that client actually signed up.

import api from './service';

// ── Types ────────────────────────────────────────────────────────────────────

/** A row of the assessment timeline. Confirmed live (50 rows over a wide range). */
export interface GTAssessment {
  id: number;
  client_id: number;
  client_name: string;
  date: string;            // YYYY-MM-DD
  weight: number;
  body_mass_index: number;
  fat: number;
  category: string;        // "N/A" when unset
  recorded_at: string;     // "YYYY-MM-DD HH:mm:ss"
  added_by: string;
  client_assessment_count: number;
}

/**
 * A BeFit referral.
 *
 * Shape comes from the bundle's own table render, not from live data: this
 * account has zero referrals even over a 2024–2026 range, so nothing could be
 * observed. The columns it reads are referral_date, client_id, client_name,
 * trainer_name, notes, converted_to_pt and converted_at.
 */
export interface GTReferral {
  id: number;
  client_id: number;
  client_name: string;
  trainer_name: string;
  referral_date: string;   // YYYY-MM-DD
  notes: string | null;
  converted_to_pt: ConversionStatus | null; // null renders as "Pending"
  converted_at: string | null;
}

/** The web's conversion <select> offers exactly these three. */
export type ConversionStatus = 'Pending' | 'Yes' | 'No';
export const CONVERSION_STATUSES: ConversionStatus[] = ['Pending', 'Yes', 'No'];

export interface GTSummaryResponse {
  message: string;
  data: {
    filters: { start_date: string; end_date: string };
    assessment_count: number;
    assessments: GTAssessment[];
    referrals: GTReferral[];
    referral_stats: {
      total: number;
      converted: number;
      pending: number;
      not_converted: number;
    };
    /** Personal trainers available as a referral target. */
    trainers: { id: number; name: string }[];
  };
}

// ── API ──────────────────────────────────────────────────────────────────────

/**
 * The whole GT dashboard in one call. Unlike the PT summary, this one is
 * date-ranged — every tile and both lists are scoped to start_date..end_date.
 */
export const getGTSummary = async (params: {
  branch_id?: number | string;
  start_date: string;
  end_date: string;
}): Promise<GTSummaryResponse> => {
  const res = await api.get('/v1/fitness/general-trainer/summary', { params });
  return res.data;
};

/**
 * One client's full assessment history, for the timeline panel — not limited
 * to the dashboard's date range, which is why the web's empty state says
 * "Pick a client above to see their full history".
 *
 * The bundle reads `res.data.data`, so the rows sit one level in.
 */
export const getGTClientAssessments = async (
  clientId: number | string,
): Promise<GTAssessment[]> => {
  const res = await api.get('/v1/fitness/general-trainer/client-assessments', {
    params: { client_id: clientId },
  });
  const d = res?.data?.data;
  return Array.isArray(d) ? d : [];
};

/**
 * Push a client to a personal trainer.
 *
 * `notes` is sent as null rather than "" when blank — the bundle does
 * `notes: notes || null`. Untested against production.
 */
export const storeBefitReferral = async (payload: {
  branch_id: number | string;
  client_id: number;
  trainer_id: number;
  referral_date: string; // YYYY-MM-DD
  notes?: string | null;
}) => {
  const res = await api.post('/v1/fitness/general-trainer/befit-referrals', {
    ...payload,
    notes: payload.notes || null,
  });
  return res.data;
};

/**
 * Record whether a referred client signed up.
 *
 * `converted_at` is the date the decision was made, and is explicitly null
 * when the status goes back to Pending — the bundle sends
 * `"Pending" === status ? null : today`. Untested against production.
 */
export const updateBefitConversion = async (
  referralId: number,
  status: ConversionStatus,
  today: string,
) => {
  const res = await api.put(
    `/v1/fitness/general-trainer/befit-referrals/${referralId}/conversion`,
    {
      converted_to_pt: status,
      converted_at: status === 'Pending' ? null : today,
    },
  );
  return res.data;
};

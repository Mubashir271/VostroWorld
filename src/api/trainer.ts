import api from './service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TrainerClient {
  order_id: number;
  client_id: number;
  client_name: string;
  package_name: string;
  package_type: string;
  total_sessions: number;
  sessions_delivered: number;
  sessions_remaining: number;
  no_show_count: number;
  // Both null until a session is recorded for check_date — the slot is chosen
  // at marking time, never pre-assigned.
  today_session_status: string | null;
  today_time_slot: string | null;
  // Live API returns a boolean (confirmed prod 2026-09-14), not 0/1.
  is_client_present: boolean;
}

export interface ClientsResponse {
  message: string;
  data: TrainerClient[];
  total: number;
  is_trainer_present: boolean;
  check_date: string;
}

export interface MarkAttendancePayload {
  branch_id: number | string;
  client_id: number;
  order_id: number;
  package_id: number;
  date: string; // YYYY-MM-DD
  staff_status: 'Delivered' | 'No Show' | 'Cancel';
  client_status: 'Delivered' | 'No Show' | 'Cancel';
  time_slot: string | null; // e.g. "09:00-10:00"; null for a No Show
  staff_note?: string;
  client_note?: string;
  type?: string; // default "PT"
}

export interface CommissionResponse {
  message: string;
  period: { start_date: string; end_date: string };
  commission: { grand_total: number };
  session_stats: {
    delivered: number;
    client_no_show: number;
    trainer_no_show: number;
    cancels: number;
    total_records: number;
  };
  trainer: { name: string; commission_percent: number };
}

export interface RosterItem {
  id: number;
  Trainer_name: string;
  appointments: { id: number; client_name: string; package_name: string }[];
}

// ── PT Dashboard summary ─────────────────────────────────────────────────────
// One call backs the whole web /pt-dashboard page. Field names and nesting are
// taken from the live response (prod, 2026-09-23, adeela@vostroworld.com) and
// cross-checked against the web's own HAR, not inferred: every tile on the web
// page maps to exactly one value below, so nothing here is computed app-side.
//
// Worth knowing before reusing these numbers elsewhere:
//   - `sessions_cycle.remaining` (475) counts remaining sessions across the
//     trainer's active packages; the commission endpoint's
//     `total_remaining_contract_sessions` (467) is a different figure. The web
//     shows this one.
//   - `has_pre_assessment` and `has_post_assessment` came back equal for all
//     20 live clients — they appear to be derived from a single assessment
//     record — so the UI must not assume "pre without post" is reachable.

export interface PTSummaryClient {
  client_id: number;
  name: string;
  package_name: string;
  end_date: string;      // YYYY-MM-DD
  sessions_delivered: number;
  sessions_remaining: number;
  total_sessions: number;
  has_pre_assessment: boolean;
  has_post_assessment: boolean;
  is_present_today: boolean;
}

export interface PTSummaryExpiring {
  client_id: number;
  name: string;
  package_name: string;
  end_date: string;      // YYYY-MM-DD
  days_left: number;
  sessions_remaining: number;
}

export interface PTSummaryCheckin {
  client_id: number;
  name: string;
  check_in_time: string; // already formatted "07:03:47 AM"
}

export interface PTSummaryResponse {
  message: string;
  data: {
    active_clients: number;
    retention: { expired_this_month: number; renewed: number; rate: number };
    sales: { today: number; month: number };
    expiring_soon: PTSummaryExpiring[];
    checkins_today: { present_count: number; clients: PTSummaryCheckin[] };
    sessions_cycle: {
      period: { start: string; end: string };
      conducted: number;
      total_entitled: number;
      remaining: number;
    };
    clients: PTSummaryClient[];
  };
}

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * 5.1 — My Clients (main PT dashboard)
 */
export const getTrainerClients = async (params?: {
  branch_id?: number | string;
  include_expired?: 0 | 1;
  check_date?: string; // YYYY-MM-DD
}): Promise<ClientsResponse> => {
  const res = await api.get('/v1/fitness/commission-portal/trainer/clients', {
    params,
  });
  return res.data;
};

/**
 * 5.2 — Mark Attendance (Delivered / No Show / Cancel)
 */
export const markTrainerAttendance = async (
  payload: MarkAttendancePayload,
): Promise<{ message: string; id: number }> => {
  const res = await api.post(
    '/v1/fitness/commission-portal/trainer/mark',
    payload,
  );
  return res.data;
};

/**
 * 5.3 — Taken Slots (helper before marking)
 */
export const getTakenSlots = async (date?: string): Promise<{
  taken_slots: string[];
  date: string;
}> => {
  const res = await api.get('/v1/fitness/commission-portal/trainer/taken-slots', {
    params: date ? { date } : undefined,
  });
  return res.data;
};

/**
 * 5.4 — My Commission
 */
export const getTrainerCommission = async (params?: {
  branch_id?: number | string;
  start_date?: string;
  end_date?: string;
}): Promise<CommissionResponse> => {
  const res = await api.get('/v1/fitness/commission-portal/trainer/commission', {
    params,
  });
  return res.data;
};

/**
 * 5.5 — My Session History
 */
export const getTrainerHistory = async (params?: {
  limit?: number;
  start_date?: string;
  end_date?: string;
  order_id?: number;
}): Promise<any> => {
  const res = await api.get('/v1/fitness/commission-portal/trainer/history', {
    params,
  });
  return res.data;
};

/**
 * 5.7 — PT Dashboard summary (backs the whole /pt-dashboard page)
 */
export const getTrainerSummary = async (params?: {
  branch_id?: number | string;
}): Promise<PTSummaryResponse> => {
  const res = await api.get('/v1/fitness/commission-portal/trainer/summary', {
    params,
  });
  return res.data;
};

/**
 * 5.8 — SOPs (the PT Dashboard's SOPs panel)
 *
 * Same endpoint `SOPsScreen` reads; it is called here with a small `limit`
 * because the dashboard shows only the first few and links out for the rest.
 */
export interface TrainerSOP {
  id: number;
  title: string;
  sop_for: string;
  content: string;
}

export const getTrainerSOPs = async (params?: {
  branch_id?: number | string;
  limit?: number;
  page?: number;
}): Promise<TrainerSOP[]> => {
  const res = await api.get('/v1/fitness/sops/index', {
    params: { status: 1, limit: 5, page: 1, ...params },
  });
  return res?.data?.data ?? [];
};

// ── Fitness Plans ────────────────────────────────────────────────────────────
// Backs the web's /fitness-plan "Fitness Plans List" page. Endpoint, params
// and row shape come from the 2026-09-23 HAR of that page and were confirmed
// live against prod the same day (trainer 10413, branch 1).
//
// Server-paginated: the web sends `limit=25` and pages through `total_pages`,
// so the app must do the same rather than pulling everything and slicing.

export interface FitnessPlanRow {
  id: number;
  start_date: string;  // YYYY-MM-DD
  end_date: string;    // YYYY-MM-DD
  client_id: number;
  client: string;
  trainer_id: number;
  trainer: string;
  branch_id: number;
  branch: string;
  note: string;
  status: string;
}

export interface FitnessPlanListing {
  status: boolean;
  data: FitnessPlanRow[];
  total_record: number;
  // The API returns this as a string ("25"), not a number.
  per_page: string | number;
  current_page: number;
  total_pages: number;
}

export const getFitnessPlans = async (params: {
  page?: number;
  branch_id?: number | string;
  trainer_id?: number | string;
  client_id?: number | string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<FitnessPlanListing> => {
  const res = await api.get('/v1/fitness/plan/listing', {
    params: { page: 1, limit: 25, ...params },
  });
  return res.data;
};

/**
 * Clients the trainer can filter plans by — the web fills its Client Name
 * control from this, not from a free-text search.
 */
export interface TrainerPackageClient {
  client_name: string;
  client_id: number;
  client_email: string;
  order_id: number;
  package_name: string;
}

export const getTrainerPackageClients = async (
  trainerId: number | string,
): Promise<TrainerPackageClient[]> => {
  const res = await api.get(`/v1/orders-detail/fetch-trainer-packages/${trainerId}`, {
    params: { category: '' },
  });
  return res?.data?.data ?? [];
};

/**
 * 5.6 — Roster
 */
export const getTrainerRoster = async (params?: {
  branch_id?: number | string;
  trainer_id?: number;
  package_status?: number;
  limit?: number;
  page?: number;
}): Promise<{
  status: boolean;
  message: string;
  totalRecord: number;
  totalPages: number;
  data: { current_page: number; data: RosterItem[] };
}> => {
  const res = await api.get('/v1/fitness/commission-portal/trainer/roster', {
    params,
  });
  return res.data;
};

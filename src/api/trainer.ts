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
  today_session_status: string;
  today_time_slot: string;
  is_client_present: number;
}

export interface ClientsResponse {
  message: string;
  data: TrainerClient[];
  total: number;
  is_trainer_present: boolean;
  check_date: string;
}

export interface MarkAttendancePayload {
  branch_id: number;
  client_id: number;
  order_id: number;
  package_id: number;
  date: string; // YYYY-MM-DD
  staff_status: 'Delivered' | 'No Show' | 'Cancel';
  client_status: 'Delivered' | 'No Show' | 'Cancel';
  time_slot: string; // e.g. "09:00-10:00"
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

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * 5.1 — My Clients (main PT dashboard)
 */
export const getTrainerClients = async (params?: {
  branch_id?: number;
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
  branch_id?: number;
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
 * 5.6 — Roster
 */
export const getTrainerRoster = async (params?: {
  branch_id?: number;
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

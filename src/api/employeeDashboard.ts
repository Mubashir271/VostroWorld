import api from './service';

// ── 6.2 Attendance ────────────────────────────────────────────────────────────

export const getAttendanceList = async (params: {
  branch_id: number;
  member_id: number;
  category?: number; // 2 = staff
  start_date?: string;
  end_date?: string;
  attendance_status?: string;
  late_filter?: 1 | 0;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/attendance/index', {
    params: { category: 2, ...params },
  });
  return res.data;
};

export const getAttendanceSummary = async (branch_id: number) => {
  const res = await api.get('/v1/attendance/summery', { params: { branch_id } });
  return res.data; // { on_time, late, absent, leave }
};

// ── 6.3 Duty Hours ────────────────────────────────────────────────────────────

export const getDutyHours = async (params: {
  branch_id: number;
  staff_id: number;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/staff-timing/index', { params });
  return res.data;
};

export const getDutyHourRequests = async (params: {
  branch_id: number;
  user_id?: number;
  approval_status?: 'Pending' | 'Approved' | 'Rejected';
  day?: string;
  limit?: number;
}) => {
  const res = await api.get('/hr/employee-duty-hour-requests/index', {
    params,
  });
  return res.data;
};

export const createDutyHourRequest = async (payload: {
  branch_id: number;
  user_id: number;
  staff_timing_id: number;
  day: string;
  requested_start_time: string; // "HH:mm"
  requested_end_time: string;
  reason: string;
}) => {
  const res = await api.post(
    '/hr/employee-duty-hour-requests/store',
    payload,
  );
  return res.data;
};

export const updateDutyHourRequest = async (
  id: number,
  payload: {
    day?: string;
    requested_start_time?: string;
    requested_end_time?: string;
    reason?: string;
  },
) => {
  const res = await api.put(
    `/hr/employee-duty-hour-requests/update/${id}`,
    payload,
  );
  return res.data;
};

// ── 6.4 Salary ────────────────────────────────────────────────────────────────

export const getSalarySlips = async (params: {
  branch_id: number;
  user_id: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
}) => {
  const res = await api.get('/salary', { params });
  return res.data;
};

// All staff salary list (admin)
export const getSalaryList = async (params: {
  branch_id: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/salary', { params });
  return res.data;
};

// Single employee salary slip (pass user_id to filter)
export const getMySalarySlip = async (params: {
  branch_id: number;
  user_id: number;
}) => {
  const res = await api.get('/v1/salary', { params });
  return res.data;
};

// ── 6.8 Staff Loans (admin list) ─────────────────────────────────────────────

export const getStaffLoansList = async (params: {
  branch_id: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/staff-loans/get', { params });
  return res.data;
};

// ── 6.9 Staff Finance — Fines & Advances ─────────────────────────────────────

export const getStaffFinanceList = async (params: {
  branch_id: number;
  category?: string; // 'Fine' | 'Advance' | 'Reward' | etc.
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/users-finance/get', { params });
  return res.data;
};

// ── 6.10 Cafe Orders ─────────────────────────────────────────────────────────

export const getCafeOrders = async (params: {
  branch_id: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/orders/get', { params });
  return res.data;
};

// ── 6.11 Members / Clients ───────────────────────────────────────────────────

export const getClientsList = async (params: {
  branch_id: number;
  status?: string;
  search?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/clients/get', { params });
  return res.data;
};

// ── 6.5 Leaves ────────────────────────────────────────────────────────────────

export const getLeaveQuota = async (params: {
  branch_id: number;
  user_id: number;
  leave_type?: string;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/hr/leaves-quota/index', { params });
  return res.data;
};

export const getLeaveApplications = async (params: {
  branch_id: number;
  user_id: number;
  leave_type?: string;
  leave_status?: string;
  application_status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/hr/leave-application/index', { params });
  return res.data;
};

/** Step 1 of 3: check no overlapping leave exists */
export const checkLeaveExists = async (payload: {
  user_id: number;
  from: string;
  to: string;
  leave_type: string;
  number_of_leaves: number;
}) => {
  // 200 = no conflict, 409 = overlap
  const res = await api.post('/hr/leave-application/is-exist', payload);
  return res.data;
};

/** Step 2 of 3: check probation eligibility */
export const checkLeaveEligibility = async (payload: {
  user_id: number;
  date: string;
}) => {
  // 200 = eligible, 409 = probation
  const res = await api.post('/v1/attendance/check-leave-eligibility', payload);
  return res.data;
};

/** Step 3 of 3: check quota availability */
export const checkLeaveAvailability = async (payload: {
  user_id: number;
  leave_type: string;
  number_of_leaves: number;
}) => {
  // 200 = available, 409 = quota exceeded
  const res = await api.post(
    '/hr/leave-application/check-leave-availability',
    payload,
  );
  return res.data;
};

/** Final submit — call only after all 3 checks pass */
export const submitLeaveApplication = async (payload: {
  branch_id: number;
  user_id: number;
  leave_status: string;
  leave_type: string;
  category: 'Full' | 'Half';
  from: string;
  to: string;
  number_of_leaves: number;
  reason: string;
}) => {
  const res = await api.post('/hr/leave-application/store', payload);
  return res.data;
};

// ── 6.6 Profile Entries (Qualification / Experience) ─────────────────────────

export const getProfileEntries = async (params: {
  branch_id: number;
  user_id: number;
  entry_type?: 'Qualification' | 'Experience';
  status?: number;
  limit?: number;
}) => {
  const res = await api.get('/hr/employee-profile-entries/index', { params });
  return res.data;
};

export const createProfileEntry = async (payload: {
  branch_id: number;
  user_id: number;
  entry_type: string;
  title: string;
  organization: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}) => {
  const res = await api.post('/hr/employee-profile-entries/store', payload);
  return res.data;
};

export const updateProfileEntry = async (id: number, payload: Partial<{
  title: string;
  organization: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
}>) => {
  const res = await api.put(`/hr/employee-profile-entries/update/${id}`, payload);
  return res.data;
};

// ── 6.7 Documents ─────────────────────────────────────────────────────────────

export const getStaffDocuments = async (params: {
  branch_id: number;
  user_id: number;
  approval_status?: 'Pending' | 'Approved' | 'Rejected';
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/hr/staff-documents/index', { params });
  return res.data;
};

export const addStaffDocument = async (payload: {
  branch_id: number;
  user_id: number;
  document_type: string;
  document_category: string;
  issue_date: string;
  subject?: string;
  description?: string;
  document_code?: string;
  document_file?: any; // File object for multipart
}) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) formData.append(key, value);
  });

  const res = await api.post('/hr/staff-documents/store', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ── 6.1 Promotions / Announcements ───────────────────────────────────────────

export const getPromotions = async (params: {
  branch_id: number;
  user_id: number;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/hr/promotion/index', { params });
  return res.data;
};

export const getAnnouncements = async (params: {
  branch_id: number;
  active_only?: 1 | 0;
  priority?: 'High' | 'Medium' | 'Low';
  search?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/announcements/index', { params });
  return res.data;
};

// ── HR Dashboard ──────────────────────────────────────────────────────────────

export const getHRDashboard = async (params: {
  branch_id?: number;
  date?: string;
}) => {
  const res = await api.get('/v1/hr/dashboard', { params });
  return res.data;
};

export const getStaffList = async (params: {
  branch_id: number;
  department?: string;
  designation?: string;
  search?: string;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/staff/get', { params });
  return res.data;
};

export const getStaffDetail = async (staffId: number, branch_id: number) => {
  const res = await api.get(`/v1/staff/detail/${staffId}`, { params: { branch_id } });
  return res.data;
};

// ── Finance ───────────────────────────────────────────────────────────────────

export const getFinanceDashboard = async (params: {
  branch_id: number;
  filter?: 'today' | 'week' | 'month' | 'quarter';
}) => {
  const res = await api.get('/v1/finance/dashboard', { params });
  return res.data;
};

export const getExpensesList = async (params: {
  branch_id: number;
  category?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/expenses/get', { params });
  return res.data;
};

export const addExpense = async (payload: {
  branch_id: number;
  category: string;
  amount: number;
  description?: string;
  expense_date: string;
}) => {
  const res = await api.post('/v1/expenses/store', payload);
  return res.data;
};

export const getCashInHand = async (params: {
  branch_id: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/cash-in-hand/get', { params });
  return res.data;
};

// ── Sales / Clients ───────────────────────────────────────────────────────────

export const getFreezingList = async (params: {
  branch_id: number;
  status?: string;
  search?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/freezing/get', { params });
  return res.data;
};

export const getApprovalsList = async (params: {
  branch_id: number;
  status?: string;
  type?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/approvals/get', { params });
  return res.data;
};

export const updateApproval = async (id: number, payload: {
  status: 'Approved' | 'Rejected';
  note?: string;
}) => {
  const res = await api.put(`/v1/approvals/update/${id}`, payload);
  return res.data;
};

// ── Fitness / GX ─────────────────────────────────────────────────────────────

export const getGXClasses = async (params: {
  branch_id: number;
  trainer_id?: number;
  slot?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/gx/classes/get', { params });
  return res.data;
};

export const getGXBookings = async (params: {
  branch_id: number;
  class_id?: number;
  status?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/gx/bookings/get', { params });
  return res.data;
};

export const getPTRosterAdmin = async (params: {
  branch_id: number;
  trainer_id?: number;
  package_status?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/fitness/commission-portal/trainer/roster', { params });
  return res.data;
};

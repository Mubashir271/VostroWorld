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
  const res = await api.get('/v1/staff-timing/index', { params });
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
  start_date?: string;
  end_date?: string;
  user_id?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/salary', { params });
  return res.data;
};

// HR commissions report
export const getHRCommissions = async (params: {
  branch_id: number;
  start_date?: string;
  end_date?: string;
  user_id?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/fitness/commission-portal/hr/commissions', { params });
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

// ── 6.4b Salary Components ────────────────────────────────────────────────────

// Confirmed live: GET /v1/hr/salary-components/index (not .../salary-components/get).
// Response rows use `type: 'addition'|'deduction'` (lowercase) and `return_month`
// (not `salary_month`) for the display fields — see SalaryComponent screen mapping.
export const getSalaryComponents = async (params: {
  branch_id: number;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/hr/salary-components/index', { params });
  return res.data;
};

// Confirmed live: POST /v1/hr/salary-components/store exists. Payload field
// names/casing below are unconfirmed (not probed live to avoid writing test data).
export const addSalaryComponent = async (payload: {
  branch_id: number;
  user_id: number;
  component_name: string;
  type: string; // 'Addition' | 'Deduction'
  amount: number;
  date: string;
  salary_month: string; // 'YYYY-MM'
  description?: string;
}) => {
  const res = await api.post('/v1/hr/salary-components/store', payload);
  return res.data;
};

// Update/delete routes follow the same /v1/hr/salary-components/* prefix as
// index/store but are unconfirmed live (not probed to avoid writing test data).
export const updateSalaryComponent = async (id: number, payload: {
  component_name?: string;
  type?: string;
  amount?: number;
  date?: string;
  salary_month?: string;
  description?: string;
}) => {
  const res = await api.put(`/v1/hr/salary-components/update/${id}`, payload);
  return res.data;
};

export const deleteSalaryComponent = async (id: number) => {
  const res = await api.put(`/v1/hr/salary-components/delete/${id}`, {});
  return res.data;
};

// ── 6.5b Leave Quota (HR admin — all staff) ───────────────────────────────────

export const getAllLeaveQuota = async (params: {
  branch_id: number;
  user_id?: number;
  leave_type?: string;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/hr/leaves-quota/index', { params });
  return res.data;
};

export const addLeaveQuota = async (payload: {
  branch_id: number;
  user_id: number;
  leave_type: string;
  number_of_leaves: number;
}) => {
  const res = await api.post('/v1/hr/leaves-quota/store', payload);
  return res.data;
};

export const updateLeaveQuota = async (id: number, payload: {
  leave_type?: string;
  number_of_leaves?: number;
}) => {
  const res = await api.put(`/v1/hr/leaves-quota/update/${id}`, payload);
  return res.data;
};

export const deleteLeaveQuota = async (id: number) => {
  const res = await api.put(`/v1/hr/leaves-quota/delete/${id}`, {});
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

// Confirmed live: POST /v1/staff-loans/add exists (route name is `add`, not
// `store`). Payload fields are unconfirmed (not probed to avoid writing test data).
export const addStaffLoan = async (payload: {
  branch_id: number;
  staff_id: number;
  amount: number;
  term: number;
  installment: number;
  payment_method: string;
  transaction_type: string;
  reason?: string;
  return_start_date: string;
}) => {
  const res = await api.post('/v1/staff-loans/add', payload);
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
  gender?: string;
  start_date?: string;
  end_date?: string;
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
  const res = await api.get('/v1/hr/leaves-quota/index', { params });
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
  const res = await api.get('/v1/hr/leave-application/index', { params });
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
  const res = await api.post('/v1/hr/leave-application/is-exist', payload);
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
    '/v1/hr/leave-application/check-leave-availability',
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
  const res = await api.post('/v1/hr/leave-application/store', payload);
  return res.data;
};

// ── 6.6 Profile Entries (Qualification / Experience) ─────────────────────────
// Unused by any screen currently. Live-checked 2026-06-24: neither
// `/v1/hr/employee-profile-entries/*` nor a few likely alternate route names
// resolve (404) — this module may not exist on the backend yet despite being
// listed in API_REFERENCE.md §7.6. Kept with the standard /v1/hr/ prefix for
// consistency; treat as unconfirmed until the real route is found.

export const getProfileEntries = async (params: {
  branch_id: number;
  user_id: number;
  entry_type?: 'Qualification' | 'Experience';
  status?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/hr/employee-profile-entries/index', { params });
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
  const res = await api.post('/v1/hr/employee-profile-entries/store', payload);
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
  const res = await api.put(`/v1/hr/employee-profile-entries/update/${id}`, payload);
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
  const res = await api.get('/v1/hr/staff-documents/index', { params });
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

  const res = await api.post('/v1/hr/staff-documents/store', formData, {
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
  const res = await api.get('/v1/hr/promotion/index', { params });
  return res.data;
};

// Confirmed live 2026-06-25: required fields are `branch_id`, `user_id`
// (not `employee_id`), `date`, `promotion_type` — found via an empty-body
// 422 probe. A follow-up probe with just those 4 fields (no department/
// designation/salary) attempted a REAL INSERT for all 4 promotion_type
// values and failed every time on a foreign-key violation on
// `previous_department` (SQL confirmed via the error's own insert
// statement) — so `previous_department` is apparently required by the DB
// schema even for Salary-only promotions, and the active-promotions table
// always shows all 6 department/designation/salary columns regardless of
// promotion_type, suggesting the web form silently carries the staff's
// current dept/designation/salary even when those fields aren't shown for
// the selected type. All 4 attempts failed atomically (confirmed no rows
// created), but actually supplying real values to find out has a real
// chance of succeeding and inserting a live row — not done. The
// `previous_department`/`new_department`/`previous_designation`/
// `new_designation` names below are a best-effort guess matching the
// failed INSERT's own column name (`previous_department`), not confirmed.
// Wired but gated off (`ADD_ENABLED = false`) in StaffPromotion.
export const addPromotion = async (payload: {
  branch_id: number;
  user_id: number;
  promotion_type: 'Department' | 'Position' | 'Salary' | 'All';
  date: string;
  previous_department?: number;
  new_department?: number;
  previous_designation?: number;
  new_designation?: number;
  previous_salary?: number;
  new_salary?: number;
  details?: string;
}) => {
  const res = await api.post('/v1/hr/promotion/store', payload);
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

// ── Employee Dashboard Stats (parallel fetch for trainer home screen) ─────────

export const getEmployeeDashboardStats = async (params: {
  branch_id: number;
  user_id: number;
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [salary, dutyRequests, dutySlots, leaveQuota, documents, attendance] =
    await Promise.all([
      getMySalarySlip(params),
      api.get('/v1/hr/employee-duty-hour-requests/index', {
        params: { ...params, limit: 100 },
      }),
      api.get('/v1/staff-timing/index', {
        params: { branch_id: params.branch_id, staff_id: params.user_id, status: 1, limit: 999999 },
      }),
      api.get('/v1/hr/leaves-quota/index', {
        params: { ...params, status: 1, limit: 100 },
      }),
      api.get('/v1/hr/staff-documents/index', {
        params: { ...params, approval_status: 'Approved', status: 1, limit: 100 },
      }),
      getAttendanceList({
        branch_id: params.branch_id,
        member_id: params.user_id,
        start_date: today,
        end_date: today,
        limit: 1,
      }),
    ]);

  const currentSalary = salary?.data?.[0]?.salary || 0;

  const allDutyRequests: any[] = dutyRequests?.data?.data?.data ?? dutyRequests?.data?.data ?? [];
  const pendingRequests = allDutyRequests.filter((r: any) => r.approval_status === 'Pending').length;

  const dutySlotList: any[] = dutySlots?.data?.data?.data ?? dutySlots?.data?.data ?? [];
  const dutySlotsCount = dutySlotList.length;

  const quotaList: any[] = leaveQuota?.data?.data ?? leaveQuota?.data ?? [];
  const leaveBalance = quotaList.reduce(
    (sum: number, q: any) => sum + Math.max(0, (q.number_of_leaves || 0) - (q.leaves_taken || 0)),
    0,
  );

  const docList: any[] = documents?.data?.data ?? documents?.data ?? [];
  const approvedDocs = docList.length;

  const todayAttendance = attendance?.data?.data?.[0] ?? null;

  return { currentSalary, pendingRequests, dutySlotsCount, leaveBalance, approvedDocs, todayAttendance };
};

// ── HR Dashboard ──────────────────────────────────────────────────────────────

export const getHRDashboard = async (params: {
  branch_id?: number;
  date?: string;
}) => {
  try {
    const res = await api.get('/v1/hr/dashboard', { params });
    return res.data;
  } catch {
    // /v1/hr/dashboard is still "under progress" on the backend (confirmed
    // 404 live 2026-06-24) — callers fall back to combining other endpoints.
    return null;
  }
};

// `/v1/staff/get` 404s and will not be added (confirmed live 2026-06-24) —
// the backend's equivalent staff list is `/v1/auth/get`. Its records use
// `first_name`/`last_name`/`branch_name`/`joining` instead of the
// `name`/`branch`/`join_date` fields the screens were originally built
// against, so they're normalized onto each record here to keep callers
// (ViewStaff, SalaryComponent, LeaveQuota) unchanged.
export const getStaffList = async (params: {
  branch_id: number;
  department?: string;
  designation?: string;
  search?: string;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/auth/get', { params });
  const list = res.data?.data?.data;
  if (Array.isArray(list)) {
    list.forEach((s: any) => {
      s.name = [s.first_name, s.last_name].filter(Boolean).join(' ');
      s.branch = s.branch_name;
      s.join_date = s.joining;
    });
  }
  return res.data;
};

// `/v1/staff/detail/{id}` 404s — use `/v1/auth/get/{id}` instead (confirmed
// live 2026-06-24). Returns `{ status, data: [record] }` (single-element array).
export const getStaffDetail = async (staffId: number, branch_id: number) => {
  const res = await api.get(`/v1/auth/get/${staffId}`, { params: { branch_id } });
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
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/expense/get', { params });
  return res.data;
};

export const getExpenseCategories = async () => {
  const res = await api.get('/v1/finance/categories/fetch-categories-names');
  return res.data?.data ?? [];
};

export const getExpenseSubCategories = async () => {
  const res = await api.get('/v1/finance/sub-categories/fetch-subcategories-names');
  return res.data?.data ?? [];
};

export const getExpensePaymentMethods = async () => {
  const res = await api.get('/v1/related_things/get-names-list', { params: { type: 'PaymentMethod' } });
  return res.data?.data ?? [];
};

export const addExpenseRows = async (rows: Array<{
  branch_id: number;
  occurrence_date: string;
  amount: number;
  category_id?: number;
  sub_category_id?: number;
  transaction_type?: string;
  payment_type_id?: number;
  bank_account_id?: number;
  cheque_number?: string;
  description?: string;
}>) => {
  const res = await api.post('/v1/expense/store', rows);
  return res.data;
};

export const getCashInHand = async (params: {
  branch_id: number;
  from_date: string;
  to_date: string;
}) => {
  const res = await api.get('/v1/finance/cash-in-hand/getCashInHandRecords', { params });
  return res.data;
};

export const addCashInHandEntry = async (payload: {
  branch_id: number;
  date: string;
  bank?: number;
  charity?: number;
  gst?: number;
  cash_in_hand?: number;
  description?: string;
}) => {
  const res = await api.post('/v1/finance/cash-in-hand/add', payload);
  return res.data;
};

export const updateCashInHandEntry = async (id: number, payload: {
  branch_id?: number;
  date?: string;
  bank?: number;
  charity?: number;
  gst?: number;
  cash_in_hand?: number;
  description?: string;
}) => {
  const res = await api.put(`/v1/finance/cash-in-hand/update/${id}`, payload);
  return res.data;
};

// ── Liabilities ──────────────────────────────────────────────────────────────

export const addLiability = async (payload: {
  branch_id: number;
  category: string;
  sub_category?: string;
  creditor_name?: string;
  creditor_contact?: string;
  amount: number;
  description?: string;
  due_date?: string;
}) => {
  const res = await api.post('/v1/finance/liabilities/add', payload);
  return res.data;
};

export const getLiabilityLedger = async (params: {
  branch_id: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/liability-ledger/get', { params });
  return res.data;
};

export const getLiabilityBalance = async (branch_id: number) => {
  const res = await api.get('/v1/finance/liability-ledger/current-balance', { params: { branch_id } });
  return res.data;
};

export const payLiability = async (payload: {
  branch_id: number;
  amount: number;
  type: string;
  resource: string;
  date: string;
  description?: string;
}) => {
  const res = await api.post('/v1/finance/liability-installments/pay', payload);
  return res.data;
};

export const deleteLiabilityEntry = async (id: number) => {
  const res = await api.put(`/v1/finance/liabilities/delete/${id}`, {});
  return res.data;
};

export const updateLiabilityEntry = async (id: number, payload: {
  category?: string;
  sub_category?: string;
  creditor_name?: string;
  creditor_contact?: string;
  amount?: number;
  description?: string;
  due_date?: string;
}) => {
  const res = await api.put(`/v1/finance/liabilities/update/${id}`, payload);
  return res.data;
};

// ── Keene Ledger ─────────────────────────────────────────────────────────────

export const getKeeneLedger = async (params: {
  branch_id: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/keene-ledger/get', { params });
  return res.data;
};

export const addKeeneEntry = async (payload: {
  branch_id: number;
  amount: number;
  type: string;
  date: string;
  description?: string;
}) => {
  const res = await api.post('/v1/finance/keene-ledger/add', payload);
  return res.data;
};

export const deleteKeeneEntry = async (id: number) => {
  const res = await api.put(`/v1/finance/keene-ledger/delete/${id}`, {});
  return res.data;
};

// ── G-13 Cash Ledger ──────────────────────────────────────────────────────────

export const getG13Ledger = async (params: {
  branch_id: number;
  start_date?: string;
  end_date?: string;
  transaction_type?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/g-thirteen/get', { params });
  return res.data;
};

export const addG13Entry = async (payload: {
  branch_id: number;
  amount: number;
  type: string;
  transaction_type: string;
  date: string;
  description?: string;
  bank_details?: string;
}) => {
  const res = await api.post('/v1/finance/g-thirteen/add', payload);
  return res.data;
};

export const deleteG13Entry = async (id: number) => {
  const res = await api.put(`/v1/finance/g-thirteen/delete/${id}`, {});
  return res.data;
};

// ── Petty Cash Ledger ─────────────────────────────────────────────────────────

export const getPettyCashLedger = async (params: {
  branch_id: number;
  start_date?: string;
  end_date?: string;
  transaction_type?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/petty-cash-ledger/get', { params });
  return res.data;
};

export const addPettyCashEntry = async (payload: {
  branch_id: number;
  amount: number;
  type: string;
  transaction_type: string;
  date: string;
  description?: string;
}) => {
  const res = await api.post('/v1/finance/petty-cash-ledger/add', payload);
  return res.data;
};

export const deletePettyCashEntry = async (id: number) => {
  const res = await api.put(`/v1/finance/petty-cash-ledger/delete/${id}`, {});
  return res.data;
};

// ── Charity Ledger ────────────────────────────────────────────────────────────

export const getCharityLedger = async (params: {
  branch_id: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/charity/get', { params });
  return res.data;
};

export const getCharityBalance = async (branch_id: number) => {
  const res = await api.get('/v1/finance/charity/current-balance', { params: { branch_id } });
  return res.data;
};

export const addCharityEntry = async (payload: {
  branch_id: number;
  date: string;
  type: 'Credit' | 'Debit' | 'Transfer';
  amount: number;
  person?: 'Faisal' | 'Waqas';
  from_person?: 'Faisal' | 'Waqas';
  to_person?: 'Faisal' | 'Waqas';
  notes?: string;
}) => {
  const res = await api.post('/v1/finance/charity/add', payload);
  return res.data;
};

export const deleteCharityEntry = async (id: number) => {
  const res = await api.put(`/v1/finance/charity/delete/${id}`, {});
  return res.data;
};

// ── Office Cash Ledger ────────────────────────────────────────────────────────

export const getOfficeCashLedger = async (params: {
  branch_id: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/office-cash-flow/get', { params });
  return res.data;
};

// `/current-balance` is confirmed broken server-side (always returns 0);
// `/office-cash-balance` returns the real running total.
export const getOfficeCashBalance = async (branch_id: number) => {
  const res = await api.get('/v1/finance/office-cash-flow/office-cash-balance', { params: { branch_id } });
  return res.data;
};

export const addOfficeCashEntry = async (payload: {
  branch_id: number;
  amount: number;
  type: 'Credit' | 'Debit';
  resource?: string;
  bank_account_id?: number;
  date?: string;
  description?: string;
  is_petty_cash?: 0 | 1;
}) => {
  const res = await api.post('/v1/finance/office-cash-flow/add', payload);
  return res.data;
};

export const deleteOfficeCashEntry = async (id: number) => {
  const res = await api.put(`/v1/finance/office-cash-flow/delete/${id}`, {});
  return res.data;
};

// ── Bank Ledger ───────────────────────────────────────────────────────────────
// Confirmed live 2026-06-25 — all 4 routes below were missing the `/v1/`
// prefix (hard 404), same systemic bug as the rest of Legacy Finance.
// `current-balance` is additionally broken server-side — always returns
// `{"balance":"0"}` regardless of branch (same failure mode as
// office-cash-flow's `current-balance`, with no working sibling endpoint
// found for bank ledger). Use the `opening_balance` block returned by
// `getBankLedger` to seed a client-side running balance instead, same pattern
// as Office Cash Flow.

export const getBankLedger = async (params: {
  branch_id: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/bank-ledger/get', { params });
  return res.data;
};

// Broken — always returns balance "0". Kept for completeness; do not rely on it.
export const getBankLedgerBalance = async (branch_id: number) => {
  const res = await api.get('/v1/finance/bank-ledger/current-balance', { params: { branch_id } });
  return res.data;
};

// Required fields confirmed live via an empty-body validation probe (safe,
// read-only-equivalent — no insert occurs on a 422): `branch_id`, `amount`,
// `type`. `resource`/`bank_account_id` remain unconfirmed beyond that — wired
// but gated off in AddBankCash/ViewBankLedger until confirmed live.
export const addBankCashEntry = async (payload: {
  branch_id: number;
  amount: number;
  type: string;
  resource: string;
  bank_account_id?: number;
  date: string;
  description?: string;
}) => {
  const res = await api.post('/v1/finance/bank-ledger/add', payload);
  return res.data;
};

export const deleteBankCashEntry = async (id: number) => {
  const res = await api.put(`/v1/finance/bank-ledger/delete/${id}`, {});
  return res.data;
};

// ── Bank Details ──────────────────────────────────────────────────────────────
// Confirmed live 2026-06-25 — real route is `/v1/finance/banking-details/get`
// (was missing both the `/v1/` prefix and the `/get` suffix). List shape:
// {id, branch_id, branch_name, bank_name, account_no, account_title, date, status}.

export const getBankDetails = async (branch_id: number) => {
  const res = await api.get('/v1/finance/banking-details/get', { params: { branch_id } });
  return res.data;
};

// Confirmed live 2026-06-25 via the web admin's "Add Bank Details" form
// (Branch/Bank Name/Account Title/Account Number) cross-checked against an
// empty-body validation probe. The web form's "Bank Name"/"Account Number"
// labels map to API fields `name`/`account_no` (not `bank_name`/
// `account_number` — those are the GET response's field names instead).
// Required per the probe: `branch_id`, `name`, `account_no`. `account_title`
// is shown as required in the web UI but wasn't flagged by the validator —
// send it anyway to match the web form. Still gated off pending a live test
// of the actual insert (only the empty-body 422 has been verified so far).
export const addBankDetail = async (payload: {
  branch_id: number;
  name: string;
  account_no: string;
  account_title?: string;
}) => {
  const res = await api.post('/v1/finance/banking-details/add', payload);
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

// `/v1/gx/classes/get` 404s (confirmed live 2026-06-24) — the real GX class
// listing is `/v1/fitness/gx-class/index`. Its records are simpler than what
// GXClasses/GXPackages were built against: `{ id, package_id, name, day,
// status, package: { id, slot_name, description, branch_id, branch_name } }`
// — no trainer_name/booking_space/duration/total_sessions/time_slot fields.
export const getGXClasses = async (params: {
  branch_id: number;
  trainer_id?: number;
  slot?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/fitness/gx-class/index', { params });
  return res.data;
};

export const getGXClass = async (id: number) => {
  const res = await api.get(`/v1/fitness/gx-class/show/${id}`);
  return res.data;
};

// Confirmed live 2026-06-24 via empty-body validation (no insert risk):
// required fields are exactly `package_id`, `day`, `name` — no `branch_id`
// (the branch comes from the linked package). `package_id` is a GX-category
// (15) package id from `getPackages({ category: 15 })`, i.e. the "Slot" in
// the web admin's "Add GX Class" form.
export const addGXClass = async (payload: {
  package_id: number;
  name: string;
  day: string;
}) => {
  const res = await api.post('/v1/fitness/gx-class/store', payload);
  return res.data;
};

// Route confirmed to exist (PUT) but payload not live-tested — assumed to
// mirror the store contract.
export const updateGXClass = async (id: number, payload: Partial<{
  package_id: number;
  name: string;
  day: string;
}>) => {
  const res = await api.put(`/v1/fitness/gx-class/update/${id}`, payload);
  return res.data;
};

// Soft delete/deactivate — confirmed live 2026-06-24 (GET-405 check only, no
// data touched). Follows the same `actions/{id}/{status}` convention as
// staff-documents/related_things.
export const setGXClassStatus = async (id: number, active: boolean) => {
  const res = await api.put(`/v1/fitness/gx-class/actions/${id}/${active ? 1 : 0}`, {});
  return res.data;
};

// No confirmed replacement found for `/v1/gx/bookings/get` (404 live,
// 2026-06-24) — unused by any screen currently.
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

// ── GX Time Slots ────────────────────────────────────────────────────────────
// Confirmed live 2026-06-24. Shape: { id, branch_id, branch_name, start_time,
// end_time, date } with start_time/end_time as "HH:mm AM/PM" strings.

export const getTimeSlots = async (params: {
  branch_id: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/fitness/time-slot/get', { params });
  return res.data;
};

export const addTimeSlot = async (payload: {
  branch_id: number;
  start_time: string;
  end_time: string;
  date?: string;
}) => {
  const res = await api.post('/v1/fitness/time-slot/add', payload);
  return res.data;
};

export const updateTimeSlot = async (id: number, payload: Partial<{
  start_time: string;
  end_time: string;
  date: string;
}>) => {
  const res = await api.put(`/v1/fitness/time-slot/update/${id}`, payload);
  return res.data;
};

export const checkTimeSlotExists = async (payload: {
  branch_id: number;
  start_time: string;
  end_time: string;
  date?: string;
}) => {
  const res = await api.post('/v1/fitness/time-slot/is-exist', payload);
  return res.data;
};

// Already used (called directly via `api.get`) in PTAttendance — wrapped here
// for reuse. Confirmed live, requires the `/v1/` prefix.
export const getGXTrainers = async (params: { branch_id: number }) => {
  const res = await api.get('/v1/fitness/commission-portal/hr/trainers', { params });
  return res.data;
};

// HR-side session list — already used via raw `api.get` calls in
// PTAttendance; wrapped here for reuse by TrainerDiary. Confirmed live
// 2026-06-25 that `start_date`/`end_date` filters work (PTAttendance never
// needed them). Shape per row: {id, date, day, staff_status, client_status,
// staff_note, client_note, type, order_id, client_name, client_id,
// trainer_name, trainer_id, package_name, package_type, package_start_date,
// package_end_date, branch_name}.
export const getHRSessions = async (params: {
  branch_id: number;
  trainer_id?: number;
  status?: 'Active' | 'Inactive';
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/fitness/commission-portal/hr/sessions', { params });
  return res.data;
};

// ── GX Slot (package, category 15) ───────────────────────────────────────────
// NOT confirmed safe — see PROJECT_STATUS.md "2026-06-24 — repeat incident".
// `POST /v1/packages/add` accepted a minimal payload (branch_id, package_name,
// category) and inserted a row, then crashed in `handleTimeSlot()` on a
// missing `time_id` key. This payload includes a best-guess `time_id` (the
// id from `getTimeSlots`) to dodge that specific crash, but the full
// contract — and whether `days`/`booking_days` need a separate call to
// `/v1/fitness/time-slot-assignment/add` — is unconfirmed. Do not call this
// until the real payload is confirmed (e.g. captured from the web admin's
// Network tab); the AddGXSlots screen gates the submit button accordingly.
export const addGXSlot = async (payload: {
  branch_id: number;
  package_name: string;
  category: '15';
  user_id?: number;
  booking_capacity?: number;
  session_count?: number;
  time_id?: number;
  price?: number;
  duration?: number;
}) => {
  const res = await api.post('/v1/packages/add', payload);
  return res.data;
};

// ── Related Things (Departments / Designations / etc.) ──────────────────────
// Confirmed live 2026-06-24 — `/v1/related_things/get` exists and supports a
// `type` filter (e.g. "Department"), unlike API_REFERENCE.md's previous
// assumption that only `get-names-list[-new]` worked. Shape: { id, name,
// department_id, department, description, type, status }.

export const getRelatedThings = async (params: {
  type?: string; // e.g. 'Department'
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/related_things/get', { params });
  return res.data;
};

export const addRelatedThing = async (payload: {
  name: string;
  type: string;
  department_id?: number;
  description?: string;
}) => {
  const res = await api.post('/v1/related_things/add', payload);
  return res.data;
};

export const updateRelatedThing = async (id: number, payload: Partial<{
  name: string;
  department_id: number;
  description: string;
}>) => {
  const res = await api.put(`/v1/related_things/update/${id}`, payload);
  return res.data;
};

export const deleteRelatedThing = async (id: number) => {
  const res = await api.put(`/v1/related_things/delete/${id}`, {});
  return res.data;
};

export const setRelatedThingStatus = async (id: number, active: boolean) => {
  const res = await api.put(`/v1/related_things/${active ? 'active' : 'inactive'}/${id}`, {});
  return res.data;
};

// ── Staff Registration (Add Staff) ───────────────────────────────────────────
// Confirmed live 2026-06-24: POST /v1/auth/register exists, no auth token
// required, requires at minimum branch_id/first_name/last_name/gender. The
// full field contract is NOT confirmed — sending an incomplete-but-valid-
// looking payload triggered a backend 500 (`trim(): Argument #1 ($string)
// must be of type string, DateTime given` in Controller.php), so this is not
// yet wired to a screen. Treat as fragile until the backend bug is fixed and
// the full required-field list is confirmed.
export const registerStaff = async (payload: {
  branch_id: number;
  first_name: string;
  last_name: string;
  gender: 'Male' | 'Female';
  [key: string]: any;
}) => {
  const res = await api.post('/v1/auth/register', payload);
  return res.data;
};

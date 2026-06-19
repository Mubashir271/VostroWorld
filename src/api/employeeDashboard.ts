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

export const getSalaryComponents = async (params: {
  branch_id: number;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/salary-components/get', { params });
  return res.data;
};

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
  const res = await api.post('/v1/salary-components/store', payload);
  return res.data;
};

export const updateSalaryComponent = async (id: number, payload: {
  component_name?: string;
  type?: string;
  amount?: number;
  date?: string;
  salary_month?: string;
  description?: string;
}) => {
  const res = await api.put(`/v1/salary-components/update/${id}`, payload);
  return res.data;
};

export const deleteSalaryComponent = async (id: number) => {
  const res = await api.put(`/v1/salary-components/delete/${id}`, {});
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
    // fallback: try without v1 prefix
    try {
      const res = await api.get('/hr/dashboard', { params });
      return res.data;
    } catch {
      return null;
    }
  }
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

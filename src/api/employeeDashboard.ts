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

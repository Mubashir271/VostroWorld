import api from './service';

/**
 * Drops params that are empty/null and coerces the numeric-validated ones to
 * integers.
 *
 * Several HR endpoints validate `branch_id`/`staff_id`/`user_id` as integers
 * and answer 422 ("The branch id must be an integer.") for an empty string.
 * The web admin sends `branch_id=` for its "All Branches" option and therefore
 * shows a permanent "Loans, Promotions could not be loaded" warning on its own
 * HR report — confirmed in the 2026-09-17 HAR. Omitting the key entirely means
 * "no filter", which is what All Branches actually means.
 */
const INT_KEYS = ['branch_id', 'staff_id', 'user_id', 'member_id', 'department_id', 'designation_id'];

export const intParams = <T extends Record<string, any>>(params: T): Partial<T> => {
  const out: Record<string, any> = {};
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (INT_KEYS.includes(k)) {
      const n = Number(v);
      if (!Number.isFinite(n)) return;
      out[k] = n;
      return;
    }
    out[k] = v;
  });
  return out as Partial<T>;
};

// ── 6.2 Attendance ────────────────────────────────────────────────────────────

export const getAttendanceList = async (params: {
  branch_id: number | string;
  member_id: number;
  category?: number; // 2 = staff
  start_date?: string;
  end_date?: string;
  attendance_status?: string;
  late_filter?: 1 | 0;
  limit?: number;
  page?: number;
}) => {
  // category 2 + type=Staff — the pair the web sends (HAR 2026-09-07).
  const res = await api.get('/v1/attendance/index', {
    params: { category: 2, type: 'Staff', ...params },
  });
  return res.data;
};

export const getAttendanceSummary = async (branch_id: number | string) => {
  const res = await api.get('/v1/attendance/summery', { params: { branch_id } });
  return res.data; // { on_time, late, absent, leave }
};

// ── 6.3 Duty Hours ────────────────────────────────────────────────────────────

export const getDutyHours = async (params: {
  branch_id: number | string;
  staff_id: number;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/staff-timing/index', { params });
  return res.data;
};

export const getDutyHourRequests = async (params: {
  branch_id: number | string;
  user_id?: number;
  approval_status?: 'Pending' | 'Approved' | 'Rejected';
  day?: string;
  limit?: number;
}) => {
  const res = await api.get('/v1/hr/employee-duty-hour-requests/index', {
    params,
  });
  return res.data;
};

export const createDutyHourRequest = async (payload: {
  branch_id: number | string;
  user_id: number;
  staff_timing_id: number;
  day: string;
  requested_start_time: string; // "HH:mm"
  requested_end_time: string;
  reason: string;
}) => {
  // `/v1/` prefix: every other call in this file carries it, the live GET at
  // /v1/hr/employee-duty-hour-requests/index answers 200, and API_REFERENCE's
  // tables drop the prefix by convention throughout. Without it this posted to
  // /public/api/hr/... and 404'd. Fixed 2026-09-23.
  const res = await api.post(
    '/v1/hr/employee-duty-hour-requests/store',
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
    `/v1/hr/employee-duty-hour-requests/update/${id}`,
    payload,
  );
  return res.data;
};

// ── 6.4 Salary ────────────────────────────────────────────────────────────────

export const getSalarySlips = async (params: {
  branch_id: number | string;
  user_id: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
}) => {
  const res = await api.get('/v1/salary', { params });
  return res.data;
};

// All staff salary list (admin)
export const getSalaryList = async (params: {
  branch_id: number | string;
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
  branch_id: number | string;
  start_date?: string;
  end_date?: string;
  user_id?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/commissions', { params });
  return res.data;
};

// Single employee salary slip (pass user_id to filter)
export const getMySalarySlip = async (params: {
  branch_id: number | string;
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
  branch_id: number | string;
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
// Confirmed live on dev 2026-09-10 (201, read-back verified). The previous
// payload used `user_id` and `salary_month`; the API requires **`staff_id`**
// and **`return_month`** (a full date), and rejected the old shape with a 422.
export const addSalaryComponent = async (payload: {
  branch_id: number | string;
  staff_id: number;
  component_name: string;
  type: string; // lowercase 'addition' | 'deduction'
  amount: number;
  date: string;
  return_month: string; // YYYY-MM-DD
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
  branch_id: number | string;
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
  branch_id: number | string;
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
  branch_id: number | string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/staff-loans/get', { params });
  return res.data;
};

// Confirmed live: POST /v1/staff-loans/add exists (route name is `add`, not
// `store`). Payload fields are unconfirmed (not probed to avoid writing test data).
export const addStaffLoan = async (payload: {
  branch_id: number | string;
  staff_id: number;
  amount: number;
  term: number;
  /**
   * Server-computed as `amount / term` — whatever is sent here is ignored
   * (verified on dev 2026-09-10: sent 1, stored 1000 for 6000/6 and 1250 for
   * 5000/4). Kept optional so a caller can display an estimate without
   * implying it is authoritative.
   */
  installment?: number;
  /** id from `/related_things/get-names-list?type=PaymentMethod` (Cash=31). */
  payment_type_id?: number;
  transaction_type?: string;
  reason?: string;
  return_start_date?: string;
}) => {
  const res = await api.post('/v1/staff-loans/add', payload);
  return res.data;
};

// ── 6.9 Staff Finance — Fines & Advances ─────────────────────────────────────

export const getStaffFinanceList = async (params: {
  branch_id: number | string;
  category?: string; // 'Fine' | 'Advance' | 'Reward' | etc.
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/users-finance/get', { params });
  return res.data;
};

// ── 6.10 Cafe Orders ─────────────────────────────────────────────────────────

export const getCafeOrders = async (params: {
  branch_id: number | string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/orders/get', { params });
  return res.data;
};

// ── 6.11 Members / Clients ───────────────────────────────────────────────────

export const getClientsList = async (params: {
  branch_id: number | string;
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

// Single client, for the client profile screen. HAR-confirmed 2026-08-20:
// returns the same row shape as the list endpoint, but wrapped in a
// one-element `data` ARRAY (not an object), plus `active_packages`.
export const getClientById = async (id: number) => {
  const res = await api.get(`/v1/clients/get/${id}`);
  return res.data;
};

// ── Client search (Sell Package flow) ───────────────────────────────────────
// HAR-confirmed 2026-09-02 from the web's Sell Package page. The search key is
// a *different query param* per mode rather than a `type` field — the web maps
// its dropdown value 1/2/3 onto `id` / `membership_no` / `name`. All three
// verified live against branch 15.
export const CLIENT_SEARCH_MODES = [
  { value: 'name', label: 'By Name' },
  { value: 'id', label: 'By Client ID' },
  { value: 'membership_no', label: 'By Membership No' },
] as const;

export type ClientSearchMode = 'name' | 'id' | 'membership_no';

export type ClientSearchRow = {
  id: number;
  branch_id: number;
  uid: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

// ── Sell Package (web admin's /package-sell flow) ────────────────────────────
// All four confirmed against a HAR of the web admin's Sell Package page
// (2026-09-10) and re-verified live on dev.

/**
 * "Select Service" options for one client. The client id is a **path**
 * segment, not a query param, and the result is scoped to that client — a
 * client who already holds a membership is not offered Registration again.
 * Shape: `{ "<tag>": "<category code>" }`, e.g. `{ registration: "6" }`.
 * Answers 404 with the standard "No record found" body when a client has no
 * eligible services.
 */
export const getClientServiceOptions = async (clientId: number | string) => {
  const res = await api.get(`/v1/cart/list-package-categories/${clientId}`);
  return res.data;
};

/**
 * "Membership Type" options — the packages inside a chosen service category.
 * The web uses `names-list` here, not `/packages/get`; it returns a flat
 * `{id, name}` array.
 */
export const getPackageNamesForCategory = async (params: {
  branch_id: number | string;
  category: number | string;
  status?: 0 | 1;
  user_id?: number | string;
}) => {
  const res = await api.get('/v1/packages/names-list', {
    params: { status: 1, ...params },
  });
  return res.data;
};

/**
 * Price + start/end dates for a chosen package.
 *
 * ⚠️ The package id goes in **`id`**. Passing `package_id` is accepted but
 * returns `price: 0` with default dates — a silent wrong answer rather than an
 * error. Confirmed on dev: `id=2` returns 45000, `package_id=2` returns 0.
 */
export const getPackageInfo = async (params: {
  id: number | string;
  startDate: string;
  quantity?: number;
}) => {
  const res = await api.get('/v1/packages/fetch-package-info', {
    params: { quantity: 1, ...params },
  });
  return res.data;
};

/** "Add Package" — puts the configured package in the client's cart. */
export const addPackageToCart = async (payload: {
  branch_id: number | string;
  client_id: number;
  package_id: number;
  category: string;
  sale_type: string;
  price: number;
  discount: number;
  discount_type: 'Amount' | 'Percentage';
  net_price: number;
  sale_date: string;
  quantity?: number;
  start_date?: string;
  end_date?: string;
  approved_by?: string;
  referenced_by?: string;
  sales_notes?: string;
}) => {
  const res = await api.post('/v1/cart/add', { quantity: 1, ...payload });
  return res.data;
};

export const searchClients = async (params: {
  mode: ClientSearchMode;
  value: string;
  branch_id: number | string;
  status?: number | string;
  limit?: number;
  page?: number;
}) => {
  const { mode, value, branch_id, status = 1, limit = 25, page = 1 } = params;
  const res = await api.get(`/v1/clients/search-clients?${mode}=${encodeURIComponent(value)}`, {
    params: { branch_id, status, limit, page },
  });
  const body = res.data ?? {};
  return {
    rows: (body.data?.data ?? []) as ClientSearchRow[],
    totalRecord: Number(body.totalRecord ?? 0),
    totalPages: Number(body.totalPages ?? 1),
    currentPage: Number(body.data?.current_page ?? page),
  };
};

// Update a client (multipart). Route + field names confirmed 2026-09-02 from
// the web bundle's `UpdateClientProfile`. Two upload modes exist:
//   image_upload_from = "gallery" → a real file, plus a `fileName` field
//   image_upload_from = "webcam"  → a base64 blob from a webcam capture
// A picked image from the phone is a file, so this always uses "gallery".
//
// The web submits its whole profile form on every save, so this sends the
// unchanged fields back alongside the new image rather than a file-only
// payload — a partial multipart update has never been tested against this
// endpoint and could blank whatever it omits. `password` /
// `must_change_password` are deliberately never sent: they drive the member
// portal login, and an empty value could reset it.
export type ClientImageUpload = { uri: string; type?: string; name?: string };

export const updateClientProfile = async (
  id: number,
  fields: Record<string, string | number | null | undefined>,
  image?: ClientImageUpload,
) => {
  const form = new FormData();

  Object.entries(fields).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    // The API uses these as "unset" sentinels; echoing them back can fail
    // validation, so drop them instead.
    if (!s || s === 'N/A' || s === '0000-00-00') return;
    form.append(k, s);
  });

  if (image?.uri) {
    const name = image.name || `client_${id}_${Date.now()}.jpg`;
    form.append('file', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name,
    } as any);
    form.append('fileName', name);
    form.append('image_upload_from', 'gallery');
  }

  const res = await api.post(`/v1/clients/update/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Row shape of `getClientNames` (defined further down — /v1/clients/client-name).
// It powers the web's autocomplete datalist on the Sell Package page: every
// client name for the branch in one shot (3284 rows for branch 15), so fetch
// once per branch and filter locally rather than per keystroke.
export type ClientNameRow = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  uid: string;
  joining_date: string;
};

// ── 6.5 Leaves ────────────────────────────────────────────────────────────────

export const getLeaveQuota = async (params: {
  branch_id: number | string;
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
  branch_id: number | string;
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
  branch_id: number | string;
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
  branch_id: number | string;
  user_id: number;
  entry_type?: 'Qualification' | 'Experience';
  status?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/hr/employee-profile-entries/index', { params });
  return res.data;
};

export const createProfileEntry = async (payload: {
  branch_id: number | string;
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
  // The web's "Archive" action on a saved record. Rows come back with
  // `status: "1"` and the list is fetched with `status=1`, so archiving is a
  // soft delete via status 0 — not a DELETE route. Unverified: no write has
  // been made against production to confirm it.
  status: number;
}>) => {
  const res = await api.put(`/v1/hr/employee-profile-entries/update/${id}`, payload);
  return res.data;
};

// ── 6.7 Documents ─────────────────────────────────────────────────────────────

export const getStaffDocuments = async (params: {
  branch_id: number | string;
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
  branch_id: number | string;
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

// The web's Employee Dashboard "Update Contact Details" form. Confirmed from
// the 2026-09-09 HAR's bundle: UpdateStaffProfile posts multipart FormData to
// /auth/update/{id}, and appends only values that are neither undefined, null
// nor "" — sending an empty string would blank the field server-side. A picked
// image goes in as `file` alongside `image_upload_from: 'gallery'`.
export const updateStaffProfile = async (
  userId: number,
  fields: Partial<{
    // "Change Information" modal
    first_name: string;
    last_name: string;
    // "Update Contact Details" panel
    cnic: string;
    email: string;
    phone: string;
    password: string;
    address: string;
  }>,
  image?: { uri: string; type?: string; fileName?: string } | null,
) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      formData.append(key, String(value).trim());
    }
  });
  if (image?.uri) {
    formData.append('file', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || 'profile.jpg',
    } as any);
    formData.append('image_upload_from', 'gallery');
  }

  const res = await api.post(`/v1/auth/update/${userId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ── 6.1 Promotions / Announcements ───────────────────────────────────────────

export const getPromotions = async (params: {
  branch_id: number | string;
  user_id: number;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  // Same integer validation as staff-loans — see the note there.
  const res = await api.get('/v1/hr/promotion/index', { params: intParams(params) });
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
  branch_id: number | string;
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
  branch_id: number | string;
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
  branch_id: number | string;
  user_id: number;
}) => {
  const today = new Date().toISOString().split('T')[0];

  const results = await Promise.allSettled([
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

  // Each sub-fetch is independent — confirmed live 2026-07-23 that
  // /v1/attendance/index 404s with "No record found" on any day the
  // employee hasn't checked in yet. Promise.all used to fail the whole
  // batch on that single rejection, zeroing out salary/duty-slots/leave
  // balance/etc even though those calls had already succeeded.
  const [salary, dutyRequests, dutySlots, leaveQuota, documents, attendance] = results.map(
    (r) => (r.status === 'fulfilled' ? r.value : null),
  );

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
  branch_id?: number | string;
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
  branch_id?: number | string;
  department?: string;
  department_id?: number;
  designation?: string;
  gender?: string;
  search?: string;
  status?: number;
  limit?: number;
  page?: number;
  /**
   * 'staff' for the employee roster, 'login' for accounts that can sign in.
   * The web's Employee Master sends it explicitly and counts the two
   * separately for its "Total Active Staff" and "Total Logins" tiles
   * (HAR, 21 Sep 2026). Omitted, the server keeps its own default.
   */
  account_type?: 'staff' | 'login';
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

// Confirmed live 2026-06-29 from the web admin's View Staff page network
// capture (HAR) — these three back its Branch/Department/Designation
// filter dropdowns. All return a flat `{id, name}` array, distinct from
// `getRelatedThings`'s `/related_things/get` (fuller records, paginated).
export const getBranchesNameList = async () => {
  const res = await api.get('/v1/branches/branches-name-list', { params: { status: 1 } });
  return res.data;
};

export const getDepartmentNames = async () => {
  const res = await api.get('/v1/related_things/get-names-list', { params: { type: 'Department' } });
  return res.data;
};

export const getDesignationNames = async () => {
  const res = await api.get('/v1/related_things/get-names-list', { params: { type: 'Designations' } });
  return res.data;
};

// `/v1/staff/detail/{id}` 404s — use `/v1/auth/get/{id}` instead (confirmed
// live 2026-06-24). Returns `{ status, data: [record] }` (single-element array).
export const getStaffDetail = async (staffId: number, branch_id: number) => {
  const res = await api.get(`/v1/auth/get/${staffId}`, { params: { branch_id } });
  return res.data;
};

// ── Finance ───────────────────────────────────────────────────────────────────

// `/v1/finance/dashboard` does not exist — it 404s (checked live 21 Sep 2026).
// The legacy Finance dashboard is built from the five `/v1/finance/...` calls
// in api/financeLegacy.ts instead. The old helper lived here and its failure
// was swallowed, which is how that screen came to render sample figures.

export const getExpensesList = async (params: {
  branch_id: number | string;
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

// Confirmed live on dev 2026-09-10 (201, read-back verified). The body is a
// top-level **array** of rows. Each row must carry `originalIndex` — its
// position in the array — or the backend 500s with `Undefined array key
// "originalIndex"` before validating anything. Per-row required fields:
// category_id, sub_category_id, transaction_type, amount, payment_type_id,
// occurrence_date, is_liability. The response reports per-row outcomes under
// `results.Success` / `results.Failed`, so a 201 does not mean every row saved.
export const addExpenseRows = async (rows: Array<{
  branch_id: number | string;
  occurrence_date: string;
  amount: number;
  category_id: number;
  sub_category_id: number;
  transaction_type: string;
  payment_type_id: number;
  is_liability: 0 | 1;
  bank_account_id?: number;
  cheque_number?: string;
  description?: string;
}>) => {
  const res = await api.post(
    '/v1/expense/store',
    rows.map((r, originalIndex) => ({ originalIndex, ...r })),
  );
  return res.data;
};

export const getCashInHand = async (params: {
  branch_id: number | string;
  from_date: string;
  to_date: string;
}) => {
  const res = await api.get('/v1/finance/cash-in-hand/getCashInHandRecords', { params });
  return res.data;
};

// Confirmed live 2026-06-30 via a captured HAR of the web admin's "Daily
// Expense Report" page — single endpoint, all branches in one call. Each
// `data[]` row is one saved daily-entry record (cash snapshot may be null on
// rows added as a follow-up expense entry against an existing date/branch,
// not a new snapshot); `items[]` are that record's individual expense lines
// with payment/approval fields (paid_amount, is_paid, approved_amount,
// is_approved). No write (add/update/pay/approve/delete) calls were
// observed in the capture — do not assume routes for those without
// confirming them the same way.
export const getVostroExpenseReport = async (params: { date: string }) => {
  const res = await api.get('/v1/finance/vostro-expense/report', { params });
  return res.data;
};

// Confirmed live 2026-06-30 via a captured HAR of the web admin's "Paid
// Expense Report" page. The two category params are sent as fixed string
// literals by the web app on every call (not user-configurable in the UI) —
// reproduced verbatim, including the inconsistent underscore/hyphen
// (`cash_from_bank` vs `cash_in-hand`). Response is per-branch summary
// numbers only (cash_from_bank, cash_in_hand, total_cash, total_expense,
// balance_cash_in_safe, total_bank_payment) — `branch_name` came back null
// in the capture, and `cash_expenses`/`bank_expenses` were empty arrays
// (item shape unconfirmed), so this screen doesn't attempt to render them.
export const getPaidExpenseReport = async (params: { date: string }) => {
  const res = await api.get('/v1/expense/paid-report', {
    params: {
      date: params.date,
      cash_from_bank_category: 'cash_from_bank',
      cash_in_hand_category: 'cash_in-hand',
    },
  });
  return res.data;
};

// Confirmed live on dev 2026-09-10. ⚠️ The write field names are NOT the
// column names: the API takes `<column>_amount` and silently ignores anything
// else, so the previous `bank`/`charity`/`gst`/`cash_in_hand` payload wrote a
// row of zeros while still answering 201. Verified mapping (sent -> stored):
//   bank_amount -> bank                 charity_amount -> charity
//   gst_amount -> gst                   cash_in_hand_amount -> cash_in_hand
//   cash_in_safe_amount -> cash_in_safe sale_counter_amount -> sale_counter
//   cafe_amount -> cafe                 other_amount -> other
//   expense_amount -> expense
// `cash_in_bank` and `charity_balance` are the two exceptions — those are
// written under their own names.
export const addCashInHandEntry = async (payload: {
  branch_id: number | string;
  date: string;
  bank_amount?: number;
  charity_amount?: number;
  gst_amount?: number;
  cash_in_hand_amount?: number;
  cash_in_safe_amount?: number;
  sale_counter_amount?: number;
  cafe_amount?: number;
  other_amount?: number;
  expense_amount?: number;
  cash_in_bank?: number;
  charity_balance?: number;
  description?: string;
}) => {
  const res = await api.post('/v1/finance/cash-in-hand/add', payload);
  return res.data;
};

export const updateCashInHandEntry = async (id: number, payload: {
  branch_id?: number | string;
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

// Confirmed live on dev 2026-09-10 (201, read-back verified via
// `/v1/finance/liabilities/get`). The previous payload used four wrong field
// names — `category`, `sub_category`, `amount`, `due_date` — and was rejected
// outright with a 400. Required: branch_id, category_id, sub_category_id,
// amount_owned, maturity_date.
export const addLiability = async (payload: {
  branch_id: number | string;
  category_id: number;
  sub_category_id: number;
  amount_owned: number;
  maturity_date: string;
  creditor_name?: string;
  creditor_contact?: string;
  description?: string;
}) => {
  const res = await api.post('/v1/finance/liabilities/add', payload);
  return res.data;
};

// The liability *records* (what you pay against), as opposed to
// `liability-ledger` which is the transaction feed. Route confirmed live on
// dev 2026-09-10; the app previously had no helper for it, which is why
// PayLiabilities had no way to supply the required `liability_id`.
export const getLiabilities = async (params: {
  branch_id: number | string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/liabilities/get', { params });
  return res.data;
};

export const getLiabilityLedger = async (params: {
  branch_id: number | string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/liability-ledger/get', { params });
  return res.data;
};

export const getLiabilityBalance = async (branch_id: number | string) => {
  const res = await api.get('/v1/finance/liability-ledger/current-balance', { params: { branch_id } });
  return res.data;
};

// Confirmed live on dev 2026-09-10. `liability_id` is **required** and was
// missing entirely from the previous payload, so every payment was rejected.
export const payLiability = async (payload: {
  branch_id: number | string;
  liability_id: number;
  amount: number;
  resource: string;
  date: string;
  type?: string;
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
  branch_id: number | string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/keene-ledger/get', { params });
  return res.data;
};

export const addKeeneEntry = async (payload: {
  branch_id: number | string;
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
  branch_id: number | string;
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
  branch_id: number | string;
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
  branch_id: number | string;
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
  branch_id: number | string;
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
  branch_id: number | string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/charity/get', { params });
  return res.data;
};

export const getCharityBalance = async (branch_id: number | string) => {
  const res = await api.get('/v1/finance/charity/current-balance', { params: { branch_id } });
  return res.data;
};

export const addCharityEntry = async (payload: {
  branch_id: number | string;
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
  branch_id: number | string;
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
export const getOfficeCashBalance = async (branch_id: number | string) => {
  const res = await api.get('/v1/finance/office-cash-flow/office-cash-balance', { params: { branch_id } });
  return res.data;
};

export const addOfficeCashEntry = async (payload: {
  branch_id: number | string;
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
  branch_id: number | string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/finance/bank-ledger/get', { params });
  return res.data;
};

// Broken — always returns balance "0". Kept for completeness; do not rely on it.
export const getBankLedgerBalance = async (branch_id: number | string) => {
  const res = await api.get('/v1/finance/bank-ledger/current-balance', { params: { branch_id } });
  return res.data;
};

// Required fields confirmed live via an empty-body validation probe (safe,
// read-only-equivalent — no insert occurs on a 422): `branch_id`, `amount`,
// `type`. `resource`/`bank_account_id` remain unconfirmed beyond that — wired
// but gated off in AddBankCash/ViewBankLedger until confirmed live.
export const addBankCashEntry = async (payload: {
  branch_id: number | string;
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

export const getBankDetails = async (branch_id: number | string) => {
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
  branch_id: number | string;
  name: string;
  account_no: string;
  account_title?: string;
}) => {
  const res = await api.post('/v1/finance/banking-details/add', payload);
  return res.data;
};

// ── Sales / Clients ───────────────────────────────────────────────────────────

export const getFreezingList = async (params: {
  branch_id: number | string;
  status?: string;
  search?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/freezing/get', { params });
  return res.data;
};

// Web admin's Approvals page (HAR 2026-09-18, super admin): GET
// /v1/approval/get — singular; the old `/approvals/get` guess does not exist.
// It returns every matching row in one response (no pagination) and the web
// sends one filter at a time: `status` (Pending | Approved | Denied) or `type`
// (Date | PaymentMethod | DeleteRecode | Package), never both.
export type ApprovalRow = {
  id: number;
  order_id: number;
  branch_id: number;
  branches_name: string;
  client_name: string | null;
  package_name: string | null;
  type: string;
  old_date: string | null;
  new_date: string | null;
  old_payment_method_name: string | null;
  new_payment_method_name: string | null;
  old_value_text: string | null;
  new_value_text: string | null;
  status: string;
};

export const getApprovalsList = async (params: {
  branch_id: number | string;
  status?: string;
  type?: string;
}) => {
  try {
    const res = await api.get('/v1/approval/get', { params });
    return (res.data?.data ?? []) as ApprovalRow[];
  } catch (err: any) {
    if (err?.response?.status === 404) return [] as ApprovalRow[];
    throw err;
  }
};

// ── Fitness / GX ─────────────────────────────────────────────────────────────

// `/v1/gx/classes/get` 404s and `/v1/fitness/gx-class/index` returns a
// stripped-down shape with no trainer_name/booking_space/duration/
// total_sessions/time_slot. The web admin's GX Slots List actually calls
// `/v1/packages/gx` (HAR-confirmed 2026-08-06), which returns the full
// shape: { id, name, session_count, duration, booking_capacity, branch_id,
// branch_name, trainer_id, trainer_name, order_details, time_slot: [{
// start_time, end_time, booking_days: [{day, status}] }] }.
export const getGXClasses = async (params: {
  branch_id: number | string;
  trainer_id?: number | string;
  package_id?: number | string;
  category?: number | string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/packages/gx', { params });
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
  branch_id: number | string;
  class_id?: number;
  status?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/gx/bookings/get', { params });
  return res.data;
};

export const getPTRosterAdmin = async (params: {
  branch_id: number | string;
  trainer_id?: number;
  package_status?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/fitness/commission-portal/trainer/roster', { params });
  return res.data;
};

// Weekly trainer schedule grid (Trainer Appointments) — confirmed live
// 2026-06-25. `trainer_id` param appears to be ignored (always returns every
// trainer); `start_date`/`end_date` are required for `schedule` to populate
// (omitting them returns every slot as `schedule: []`, even for trainers
// with real bookings). Shape per trainer: {trainer_id, name, branch_id,
// branch_name, time_slots:[{time_slot_assignment_id, time: "HH:mm AM/PM TO
// HH:mm AM/PM", schedule: [] | {schedule_id, pt_start_date, pt_end_date,
// <DayName>?: {order_id, package_start_date, package_end_date, client_name,
// session_count, package_name, status}}]}. `schedule` is an empty array when
// free, or an object keyed by whichever day names (Monday..Sunday) are booked.
export const getTrainerSchedule = async (params: {
  branch_id: number | string;
  trainer_id?: number;
  start_date: string;
  end_date: string;
}) => {
  const res = await api.get('/v1/fitness/trainer-schedule/index', { params });
  return res.data;
};

// Confirmed live 2026-06-30 via a captured HAR of the web admin's "GX
// Appointments" page. PROJECT_STATUS.md previously ruled out the plain
// `trainer-schedule/index` endpoint for GX (empty schedules for real GX
// trainers) — this `-gx` suffixed sibling is the actual route, same weekly
// Time×Day grid shape as `getTrainerSchedule`, but paginated **by trainer**
// server-side (web defaults to 25/page) rather than returning every trainer
// in one call. `user_id` filters to a single trainer when set.
export const getGXAppointments = async (params: {
  branch_id: number | string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/fitness/trainer-schedule/index-gx', { params });
  return res.data;
};

// Confirmed live 2026-07-01 via HAR of web admin's "SPT Appointments" page.
// Same Time×Day grid shape as `getGXAppointments` but on the `index-small-pt`
// endpoint. Trainer dropdown uses `is_gx_trainer=` (empty — all PTs, not just
// GX-flagged), unlike GX Appointments which sends `is_gx_trainer=1`.
export const getSPTAppointments = async (params: {
  branch_id: number | string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/fitness/trainer-schedule/index-small-pt', { params });
  return res.data;
};

export const getSPTAppointmentTrainers = async (params: { branch_id: number | string }) => {
  const res = await api.get('/v1/auth/get-name', {
    params: { ...params, designation_id: 1, is_gx_trainer: '' },
  });
  return res.data;
};

// Trainer dropdown for the GX Appointments page — confirmed live 2026-06-30,
// same capture. Shape: {status, data:[{id, first_name, last_name, branch_id,
// designation}], message}. `designation_id=1` + `is_gx_trainer=1` are sent
// as fixed query params by the web app (not user-configurable).
export const getGXAppointmentTrainers = async (params: { branch_id: number | string }) => {
  const res = await api.get('/v1/auth/get-name', {
    params: { ...params, designation_id: 1, is_gx_trainer: 1 },
  });
  return res.data;
};

// Confirmed live 2026-06-30 via a captured HAR of the web admin's "New
// Befit Clients" (Befit List) page. `category=16` + `status=1` are sent as
// fixed params by the web app — 16 isn't in API_REFERENCE.md's documented
// Category Code Reference (1-15), so this is the first confirmation Befit's
// code is 16. `trainer_reservation` takes `''` (All) / `Pending` / `Reserved`
// (all three confirmed live). Every call in the capture 404'd with the
// standard `{status:false, message:"No record found"}` empty-result shape
// (genuinely no Befit data on this branch yet, not a broken route) — no
// non-empty response was ever captured, so the row shape below is inferred
// from the table's column headers, not confirmed. Re-verify field names
// against a real row once Befit data exists.
export const getBefitClients = async (params: {
  branch_id: number | string;
  page?: number;
  limit?: number;
  trainer_id?: number;
  trainer_reservation?: string;
  client_id?: number;
}) => {
  const res = await api.get('/v1/orders-detail/list-trainer-packages', {
    params: { ...params, category: 16, status: 1 },
  });
  return res.data;
};

// Confirmed live 2026-06-30 via a captured HAR of the web admin's "New
// Befit Bookings" page. Despite living under `trainer-schedule/`, this is
// NOT the weekly Time×Day grid shape `getTrainerSchedule`/`getGXAppointments`
// return — confirmed from the web UI screenshot it's a flat row table (Sr#,
// Branch Name, Trainer Name, Customer Name, Package Name, PT Package, Start
// Date, End Date, Action), paginated by row. `type=Befit` is a fixed param
// (the same route presumably also takes `type=SPT`, unconfirmed). Every
// captured call 404'd with the standard empty-result shape — no non-empty
// response was captured, so row field names are inferred from the column
// headers, not confirmed.
export const getBefitBookings = async (params: {
  branch_id: number | string;
  user_id?: number;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/fitness/trainer-schedule/new-appointments', {
    params: { ...params, type: 'Befit' },
  });
  return res.data;
};

// Trainer dropdown for Befit Bookings — confirmed live 2026-06-30, same
// capture. Unlike GX Appointments' dropdown, `is_gx_trainer` is sent empty
// (not `1`) — returns every Personal Trainer (`designation_id=1`), not just
// GX-flagged ones.
export const getBefitBookingTrainers = async (params: { branch_id: number | string }) => {
  const res = await api.get('/v1/auth/get-name', {
    params: { ...params, designation_id: 1, is_gx_trainer: '' },
  });
  return res.data;
};

// ── Befit Attendance ─────────────────────────────────────────────────────────
// Confirmed live 2026-07-01 via HAR of web admin's "Befit Attendance" page.
// Trainer list uses /v1/auth/fetch-name-list/{branch_id}?category=mix (note:
// different from get-name). Package list per trainer uses
// /v1/fitness/trainer-schedule/fetch-befit/{trainer_id}?category=16.
// GET attendance uses /v1/fitness/session-attendance/get with type=Befit,
// status=0 (Active) or status=1 (Inactive).
// POST endpoint is NOT CONFIRMED — inferred as /v1/fitness/session-attendance/store
// from the Laravel REST convention; gate the Add button until confirmed live.

export const getBefitAttendanceTrainers = async (branchId: number | string) => {
  const res = await api.get(`/v1/auth/fetch-name-list/${branchId}`, {
    params: { category: 'mix' },
  });
  return res.data;
};

export const getBefitTrainerPackages = async (trainerId: number) => {
  const res = await api.get(`/v1/fitness/trainer-schedule/fetch-befit/${trainerId}`, {
    params: { category: 16 },
  });
  return res.data;
};

export const getBefitAttendance = async (params: {
  branch_id: number | string;
  status: 0 | 1;
  page?: number;
  limit?: number;
  trainer_id?: number;
  package_id?: number;
}) => {
  const res = await api.get('/v1/fitness/session-attendance/get', {
    params: { ...params, type: 'Befit' },
  });
  return res.data;
};

// Confirmed live on dev 2026-09-10 (HTTP 201). Corrections vs the earlier
// guess: the route is `add`, not `store` (`store` 404s), and the payload keys
// were wrong — `session_attendance` has no `time`, `trainer_attendance` or
// `client_attendance` columns. The real optional status columns are
// `staff_status`/`client_status`; `type` and `day` are derived server-side
// from the order, so passing `type` has no effect. A repeat submit for the
// same client/order/date answers 403 "This record is Already Exists!..",
// and an expired package answers 422 "Session limit reached."
export const addBefitAttendance = async (payload: {
  branch_id: number | string;
  client_id: number;
  order_id: number;
  trainer_id: number;
  date: string;
  staff_status?: string;
  client_status?: string;
}) => {
  const res = await api.post('/v1/fitness/session-attendance/add', payload);
  return res.data;
};

// ── GX Time Slots ────────────────────────────────────────────────────────────
// Confirmed live 2026-06-24. Shape: { id, branch_id, branch_name, start_time,
// end_time, date } with start_time/end_time as "HH:mm AM/PM" strings.

export const getTimeSlots = async (params: {
  branch_id: number | string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/fitness/time-slot/get', { params });
  return res.data;
};

export const addTimeSlot = async (payload: {
  branch_id: number | string;
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
  branch_id: number | string;
  start_time: string;
  end_time: string;
  date?: string;
}) => {
  const res = await api.post('/v1/fitness/time-slot/is-exist', payload);
  return res.data;
};

// Already used (called directly via `api.get`) in PTAttendance — wrapped here
// for reuse. Confirmed live, requires the `/v1/` prefix.
export const getGXTrainers = async (params: { branch_id: number | string }) => {
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
  branch_id: number | string;
  trainer_id?: number;
  client_id?: number;
  status?: 'Active' | 'Inactive';
  staff_status?: string;
  client_status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/fitness/commission-portal/hr/sessions', { params });
  return res.data;
};

// Confirmed live via HAR of the web admin's "HR Session Portal" page
// (hr-session-portal), 2026-07-06. Create/update/delete already used
// (raw `api` calls) in PTAttendance for the same endpoint; wrapped here for
// reuse by the HR Session & Commission Portal screen.
export const createHRSession = async (payload: {
  branch_id: number | string;
  trainer_id: number;
  client_id: number;
  order_id: number;
  package_id: number;
  date: string;
  time_slot?: string;
  staff_status: string;
  client_status: string;
}) => {
  const res = await api.post('/v1/fitness/commission-portal/hr/sessions', payload);
  return res.data;
};

export const updateHRSession = async (id: number, payload: {
  staff_status?: string;
  client_status?: string;
  status?: 'Active' | 'Inactive';
}) => {
  const res = await api.put(`/v1/fitness/commission-portal/hr/sessions/${id}`, payload);
  return res.data;
};

export const deleteHRSession = async (id: number) => {
  const res = await api.delete(`/v1/fitness/commission-portal/hr/sessions/${id}`);
  return res.data;
};

// Per-trainer commission breakdown for the HR Session & Commission Portal's
// "Commissions" tab. Confirmed live via HAR 2026-07-06. Response shape per
// trainer: {id, name, uid, branch, joining, department, designation,
// last_month_paid, commission: {commission_per, gross_commission,
// pt_commission, gx_commission, small_pt_commission, paid_commission,
// outstanding_commission, payment_progress, payout_status, payout_date,
// total_delivered_sessions, total_payable_no_show_sessions,
// total_package_sessions, total_remaining_contract_sessions,
// total_client_no_show_sessions, total_trainer_no_show_sessions,
// total_client_cancel_sessions, total_trainer_cancel_sessions,
// formula_guide, details:[...]}}.
export const getHRPortalCommissions = async (params: {
  branch_id: number | string;
  trainer_id?: number;
  start_date: string;
  end_date: string;
  limit?: number;
}) => {
  const res = await api.get('/v1/fitness/commission-portal/hr/commissions', { params });
  return res.data;
};

// Per-trainer client roster for the Session Report tab's Active/Old Client
// filters. Confirmed live via HAR 2026-07-06. `include_expired=1` returns
// every order (active + expired); filter client-side by `order_status` /
// `sessions_remaining` to split Active vs Old.
export const getHRPortalClients = async (params: {
  trainer_id: number;
  branch_id?: number | string;
  include_expired?: 0 | 1;
}) => {
  const res = await api.get('/v1/fitness/commission-portal/hr/clients', { params });
  return res.data;
};

// REMOVED 2026-09-10 — the backend has no commission-payout capability.
// `/fitness/commission-portal/hr/commissions/pay` 404s on dev, as do
// `/commissions/payout`, `/commission/pay` and `/hr/pay`. The premise was
// wrong too: this helper was inferred from supposed `payout_status` /
// `payout_date` / `paid_commission` fields, but the live commissions response
// carries none of them — it is a pure computed report (commission derived
// from delivered sessions via `formula_guide`), with no payout state to
// record against. Recording payouts needs a new backend endpoint; do not
// re-add a client helper until one exists.

// Same endpoint as `getHRSessions`, but loops through every page instead of
// trusting a single `limit` guess — confirmed live 2026-06-29 that the web
// admin's own attendance reports paginate at 25/page (8 pages for a single
// trainer/month), so a wide date range across all trainers can easily
// exceed any one-shot `limit`. Fetches page 1 at a large page size, reads
// `last_page` off the response, then fetches the rest in parallel.
export const getHRSessionsAll = async (params: {
  branch_id: number | string;
  trainer_id?: number;
  status?: 'Active' | 'Inactive';
  start_date?: string;
  end_date?: string;
}) => {
  const limit = 500;
  const first = await getHRSessions({ ...params, limit, page: 1 });
  const rows: any[] = first?.data?.data ?? [];
  const lastPage: number = first?.data?.last_page ?? 1;
  if (lastPage > 1) {
    const rest = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, i) => getHRSessions({ ...params, limit, page: i + 2 })),
    );
    rest.forEach(p => rows.push(...(p?.data?.data ?? [])));
  }
  return rows;
};

// ── PT Attendance (HR › Manage Staff › Pt Attendance) ──────────────────────
// Mirrors the web admin's /pt-attendance page, taken from its bundle and
// checked read-only on prod 2026-09-14 with the HR login. The web does NOT use
// commission-portal/hr/sessions here: that endpoint ignores `status` (Active
// and Inactive both return all ~59k rows), which is why the old screen, which
// downloaded every page of both, never rendered.
//
// List:   GET  /fitness/session-attendance/get  (status '1' active / '0'
//         inactive, trainer_id, order_id, limit, page — server paginated)
// Add:    GET  exists → POST /fitness/session-attendance/add
// Update: GET  exists/{id} → POST /fitness/session-attendance/update/{id}
// Status: PUT  /fitness/session-attendance/actions/{id}/{0 inactive|1 active|2 delete}

export type SessionAttendanceRow = {
  id: number;
  client_id: number;
  branch_id: number;
  order_id: number;
  trainer_id: number;
  trainer_schedule_id: number | null;
  package_id: number | null;
  type: string | null;
  staff_status: string;
  client_status: string;
  status: string;
  date: string;
  // Present on the GX report rows (2026-09-18 HAR).
  day?: string;
  validate_status?: string; // '1' Verify, '0' Unverify
  time_slot?: { id: number; start_time: string; end_time: string } | null;
  branch?: { id: number; name: string } | null;
  trainer?: { id: number; trainer_name: string } | null;
  order?: { id: number; name: string; client_id: number; client_name: string } | null;
};

export const getSessionAttendancePage = async (params: {
  branch_id: number | string;
  status?: '1' | '0';
  trainer_id?: number | string;
  order_id?: number | string;
  limit: number;
  page: number;
}) => {
  const { page, ...rest } = params;
  try {
    const res = await api.get(`/v1/fitness/session-attendance/get?page=${page}`, {
      params: { type: '', ...rest },
    });
    const body = res.data ?? {};
    return {
      rows: (body.data?.data ?? []) as SessionAttendanceRow[],
      total: Number(body.totalRecord ?? body.data?.total ?? 0),
      totalPages: Number(body.totalPages ?? body.data?.last_page ?? 1),
    };
  } catch (err: any) {
    if (err?.response?.status === 404) return { rows: [], total: 0, totalPages: 1 };
    throw err;
  }
};

// GX Attendance Report — the web page's exact request, from the 2026-09-18 HAR
// of the nutritionist login: session-attendance/get with type=GX, the date
// range and every filter sent (blank when unset), server paginated. Same row
// shape as the PT list above; 404 is this API's "no records".
export const getGXAttendanceReportPage = async (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  trainer_id?: number | string;
  client_status?: string;
  staff_status?: string;
  limit: number;
  page: number;
}) => {
  try {
    const res = await api.get('/v1/fitness/session-attendance/get', {
      params: {
        branch_id: params.branch_id,
        start_date: params.start_date,
        end_date: params.end_date,
        trainer_id: params.trainer_id ?? '',
        order_id: '',
        client_status: params.client_status ?? '',
        client_id: '',
        staff_status: params.staff_status ?? '',
        type: 'GX',
        package_id: '',
        page: params.page,
        limit: params.limit,
      },
    });
    const body = res.data ?? {};
    return {
      rows: (body.data?.data ?? []) as SessionAttendanceRow[],
      total: Number(body.totalRecord ?? body.data?.total ?? 0),
      totalPages: Number(body.totalPages ?? body.data?.last_page ?? 1),
    };
  } catch (err: any) {
    if (err?.response?.status === 404) return { rows: [] as SessionAttendanceRow[], total: 0, totalPages: 1 };
    throw err;
  }
};

/** GX trainer dropdown — the web's `auth/get-name?designation_id=1&is_gx_trainer=1`. */
export const getGXTrainerNames = async (branchId: number | string) => {
  const res = await api.get('/v1/auth/get-name', {
    params: { designation_id: 1, branch_id: branchId, is_gx_trainer: 1 },
  });
  return (res.data?.data ?? []) as { id: number; first_name: string; last_name: string }[];
};

/** Trainer dropdown — `{ id, first_name, last_name }[]`; no branch returns all. */
export const getTrainerNameList = async (branchId: number | string) => {
  // Never send a trailing slash: `/fetch-name-list/` 301-redirects, iOS drops
  // the Authorization header on the redirect, the retry 401s and the response
  // interceptor logs the user out — which is what happened to HR (branch '')
  // on opening PT Attendance. Verified on prod 2026-09-14.
  const path = branchId ? `/v1/auth/fetch-name-list/${branchId}` : '/v1/auth/fetch-name-list';
  const res = await api.get(path, { params: { category: 'mix' } });
  return (res.data?.data ?? []) as { id: number; first_name: string; last_name: string }[];
};

/** A trainer's packages — one entry per client order. */
export type TrainerPackageOrder = {
  order_id: number;
  package_name: string;
  client_id: number;
  client_name: string;
  client_email: string | null;
};

export const getTrainerPackageOrders = async (trainerId: number | string) => {
  try {
    const res = await api.get(`/v1/orders-detail/fetch-trainer-packages/${trainerId}`, { params: { category: '' } });
    return (res.data?.data ?? []) as TrainerPackageOrder[];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
};

/** false when every session on the order is used (server answers 409). */
export const isSessionAttendanceOpen = async (orderId: number | string) => {
  try {
    await api.get(`/v1/fitness/session-attendance/is-attendance-is-complete/${orderId}`);
    return true;
  } catch (err: any) {
    if (err?.response?.status === 409) return false;
    throw err;
  }
};

/** Schedule times for an order + trainer; 404 (none scheduled) → []. */
export const getTrainerScheduleForOrder = async (orderId: number | string, trainerId: number | string) => {
  try {
    const res = await api.get(`/v1/fitness/session-attendance/get-trainer-schedule/${orderId}/${trainerId}`);
    return (res.data?.data ?? []).map((s: any) => ({
      id: String(s.trainer_schedules_id),
      label: `${s.start_time} To ${s.end_time}`,
    })) as { id: string; label: string }[];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
};

/**
 * Duplicate check the web runs before saving. Pass `excludeId` when updating
 * (the web calls /exists/{id}). Resolves false on 409 "Attendance already exist".
 */
export const isSessionAttendanceFree = async (
  params: { trainer_id: number | string; order_id: number | string; date: string },
  excludeId?: number,
) => {
  try {
    const path = excludeId
      ? `/v1/fitness/session-attendance/exists/${excludeId}`
      : '/v1/fitness/session-attendance/exists';
    await api.get(path, { params });
    return true;
  } catch (err: any) {
    if (err?.response?.status === 409) return false;
    throw err;
  }
};

export type SessionAttendancePayload = {
  branch_id: number | string;
  trainer_id: number | string;
  order_id: number | string;
  client_id: number | string;
  staff_status: string;
  client_status: string;
  client_name: string;
  email: string;
  date: string;
  trainer_schedule_id: number | string;
};

// Body is field-for-field what the web posts (type / package_id left blank —
// the server derives both from the order).
const sessionAttendanceBody = (p: SessionAttendancePayload) => ({
  branch_id: p.branch_id,
  trainer_id: p.trainer_id,
  order_id: p.order_id,
  client_id: p.client_id,
  staff_status: p.staff_status,
  client_status: p.client_status,
  client_name: p.client_name,
  email: p.email,
  date: p.date,
  trainer_schedule_id: p.trainer_schedule_id,
  type: '',
  package_id: '',
});

export const addSessionAttendance = (p: SessionAttendancePayload) =>
  api.post('/v1/fitness/session-attendance/add', sessionAttendanceBody(p));

export const updateSessionAttendance = (id: number, p: SessionAttendancePayload) =>
  api.post(`/v1/fitness/session-attendance/update/${id}`, sessionAttendanceBody(p));

export const getSessionAttendanceInfo = async (branchId: number | string, id: number) => {
  const res = await api.get(`/v1/fitness/session-attendance/get/${id}`, { params: { branch_id: branchId } });
  return ((res.data?.data?.data ?? [])[0] ?? null) as SessionAttendanceRow | null;
};

/** 0 = inactive, 1 = active, 2 = delete — the web's three row actions. */
export const setSessionAttendanceStatus = (id: number, action: 0 | 1 | 2) =>
  api.put(`/v1/fitness/session-attendance/actions/${id}/${action}`, {});

// ── SPT Attendance ────────────────────────────────────────────────────────────
// Confirmed live 2026-07-01 via HAR of web admin's "SPT Attendance" page.
// Main data: GET /v1/packages/gx?category=4 — returns packages with
//   order_details (booked clients) and time_slot arrays.
//   Row shape: { id, name, trainer_id, trainer_name, branch_name, start_time,
//   end_time, session_count, order_details: [], time_slot: [] }
// Trainers: GET /v1/auth/get-name?designation_id=1&is_gx_trainer= (all PTs)
// Packages per trainer: GET /v1/packages/names-list?category=4&status=1&user_id=
// Mark Attendance POST: NOT CONFIRMED — not captured in HAR (no bookings exist).

// GX Attendance — confirmed live 2026-07-01 via HAR. Uses same /v1/packages/gx
// endpoint as SPTAttendance but without a category filter (category param is
// empty). Trainers use is_gx_trainer=1; slots use category=15 (getSPTSlots).
export const getGXAttendancePackages = async (params: {
  branch_id: number | string;
  trainer_id?: number | string;
  package_id?: number | string;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/packages/gx', { params });
  return res.data;
};

export const getSPTAttendancePackages = async (params: {
  branch_id: number | string;
  trainer_id?: number | string;
  package_id?: number | string;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/packages/gx', {
    params: { ...params, category: 4 },
  });
  return res.data;
};

export const getSPTAttendancePackageNames = async (params: {
  branch_id: number | string;
  user_id?: number | string;
}) => {
  const res = await api.get('/v1/packages/names-list', {
    params: { ...params, category: 4, status: 1 },
  });
  return res.data;
};

// ── SPT Classes (packages, category 4) ───────────────────────────────────────
// Confirmed live 2026-07-01 via HAR of web admin's "SPT List" page.
// `key=category&value=4` filters to Small Group PT packages.
// Row shape: { id, branch_id, branches_name, package_name, user_id,
//   user_first_name, user_last_name, price, duration, category, status,
//   session_count, start_time, end_time, time_slot: [], classes: [] }
// time_slot=[] means no slot assigned (shows "Pending" in red).
// classes=[] means no days assigned (shows "Pending" in red).
// Delete endpoint: NOT CONFIRMED — inferred as PUT /v1/packages/delete/{id}
// from the REST convention used elsewhere in this codebase.

export const getSPTPackages = async (params: {
  branch_id: number | string;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/packages/get', {
    params: { ...params, key: 'category', value: 4 },
  });
  return res.data;
};

// NOT CONFIRMED — inferred from REST convention.
export const deleteSPTPackage = async (id: number) => {
  const res = await api.put(`/v1/packages/delete/${id}`, {});
  return res.data;
};

// ── SPT Bookings ──────────────────────────────────────────────────────────────
// Confirmed live 2026-07-01 via HAR of web admin's "SPT Bookings" page.
// Trainers dropdown: GET /v1/auth/get-name?designation_id=1&is_gx_trainer=1
//   (same filter as GX; only GX-flagged PTs appear in SPT Bookings)
// Slots dropdown per trainer: GET /v1/packages/names-list?category=15&status=1
//   (category 15 = GX Slot packages, not category 4; this is how the web admin
//   works — SPT bookings reference GX-style time slots)
// Clients search: GET /v1/clients/client-name?branch_id= (no branch filter)
// Bookings list: GET /v1/orders-detail/training-indexing?category=4&status=1
//   All calls returned "No record found" (no SPT data on this branch yet),
//   so row field names are inferred from column headers — re-verify once real
//   rows exist.

export const getSPTBookingTrainers = async (params: { branch_id: number | string }) => {
  const res = await api.get('/v1/auth/get-name', {
    params: { ...params, designation_id: 1, is_gx_trainer: 1 },
  });
  return res.data;
};

export const getSPTSlots = async (params: { branch_id: number | string; user_id?: number }) => {
  const res = await api.get('/v1/packages/names-list', {
    params: { ...params, category: 15, status: 1 },
  });
  return res.data;
};

export const getClientNames = async (params: { branch_id?: number | string }) => {
  const res = await api.get('/v1/clients/client-name', { params });
  return res.data;
};

export const getSPTBookings = async (params: {
  branch_id: number | string;
  page?: number;
  limit?: number;
  user_id?: number | string;
  package_id?: number | string;
  client_id?: number | string;
}) => {
  const res = await api.get('/v1/orders-detail/training-indexing', {
    params: { ...params, status: 1, category: 4 },
  });
  return res.data;
};

// ── GX Slot (package, category 15) ───────────────────────────────────────────
// Confirmed live on dev 2026-09-10 (HTTP 201). History: a minimal payload
// (branch_id, package_name, category) inserts a row and then 500s inside
// `handleTimeSlot()` — see PROJECT_STATUS.md "2026-06-24 — repeat incident".
// The missing pieces turned out to be `time_id` AND `day`: without `day` the
// backend throws `Undefined array key "day"` *after* inserting. Both are
// required in practice even though validation only names branch_id /
// package_name / category. No separate `/fitness/time-slot-assignment/add`
// call is needed.
export const addGXSlot = async (payload: {
  branch_id: number | string;
  package_name: string;
  category: '15';
  time_id: number;
  day: string; // e.g. 'Monday'
  user_id?: number;
  booking_capacity?: number;
  session_count?: number;
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

// ── Switch Booking Time ───────────────────────────────────────────────────────
// Confirmed live 2026-07-01 via HAR — GET index endpoint verified.
// Form POST endpoint and "Available Bookings" / "Available Time Slots" dropdowns
// were NOT captured (user never submitted the form).
export const getSwitchedTimeSlots = async (params: {
  branch_id: number | string;
  trainer_id?: number | string;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/fitness/time-slot-switching/index', { params });
  return res.data;
};

export const deleteSwitchedTimeSlot = async (id: number) => {
  const res = await api.put(`/v1/fitness/time-slot-switching/delete/${id}`, {}); // NOT CONFIRMED
  return res.data;
};

// Confirmed live on dev 2026-09-10 (HTTP 201). `schedule_id` and
// `new_time_slot_id` are **required**, not optional as previously typed —
// `schedule_id` is the `detail.id` of an existing row from
// `/fitness/time-slot-switching/index`. `trainer_id` is not a valid field.
export const addSwitchedTimeSlot = async (payload: {
  branch_id: number | string;
  schedule_id: number;
  new_time_slot_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
}) => {
  const res = await api.post('/v1/fitness/time-slot-switching/store', payload);
  return res.data;
};

// ── Detailed HR Report ────────────────────────────────────────────────────────
// All endpoints confirmed live 2026-07-01 via HAR of the web admin's
// Detailed HR Report page. `/v1/commissions` is a different path from the
// existing getHRCommissions which uses the commission-portal sub-path.
// staff-loans/get returns 422 when staff_id is empty (server bug, same as in
// HAR); hr/promotion/index returns 500 (separate backend issue). Both are
// handled gracefully in the screen (shown as empty sections).

export const getHRStaffAttendance = async (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  user_id?: number | string;
  department_id?: number | string;
  designation_id?: number | string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/attendance/index', {
    params: { ...params, category: 2, type: 'Staff' },
  });
  return res.data;
};

export const getHRCommissionsReport = async (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  user_id?: number | string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/commissions', { params });
  return res.data;
};

export const getHRLeaveApplications = async (params: {
  branch_id: number | string;
  user_id?: number | string;
  status?: number;
  from_date?: string;
  to_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/hr/leave-application/index', { params });
  return res.data;
};

export const getHRStaffFines = async (params: {
  branch_id: number | string;
  user_id?: number | string;
  category: 'Fine' | 'Advance';
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/users-finance/get', { params });
  return res.data;
};

// ── Staff Advances (Add form + dropdowns) ────────────────────────────────────
// Confirmed live 2026-07-03 via HAR of the web admin's "Manage Staff Advances"
// page. The list GET (`getHRStaffFines` above, `category=Advance`) returned
// the standard empty-result 404 shape (`{status:false, message:"No record
// found"}`) — same pattern as Befit/SPT — meaning it's a genuinely confirmed
// route with no Advance rows on this branch yet, not a dead endpoint.
// No "Add Advance" submit was captured (Amount was left empty, form never
// actually submitted) — the write endpoint below is inferred from the
// `users-finance/get` naming convention, NOT confirmed. Transaction dropdown
// values only 3 of N confirmed from the screenshot (Bank Account, Sales
// Counter, Personal) — reused the fuller enum already confirmed live for
// G13 Cash Ledger (`Bank Account`, `G13`, `Mr Arif`, `Mr Waqas Credit Card`,
// `Office Counter`, `Personal`, `Sales Counter`) since these transaction-type
// enums have matched 1:1 across every other finance ledger in this codebase,
// but that reuse itself is a guess for this specific page. "Return Month"
// dropdown's exact value format (month name vs number) was never captured —
// sending full month names as a best guess.

export const getStaffNamesForBranch = async (params: { branch_id: number | string }) => {
  const res = await api.get('/v1/auth/get-name', { params });
  return res.data;
};

export const getBankingDetailsListing = async (params: { branch_id: number | string }) => {
  const res = await api.get('/v1/finance/banking-details/listing', { params });
  return res.data;
};

// Confirmed live on dev 2026-09-10 (201) and verified by read-back.
// Validation requires user_id, amount, category, occurrence_date, branch_id.
// Two traps the 201 alone does not reveal:
//   - `return_month` is NOT in the validation list, but the column is NOT
//     NULL, so omitting it 500s. It is also a **DATE** column, not a
//     "YYYY-MM" string: sending "2026-10" silently stores `0000-00-00`.
//     Always send a full `YYYY-MM-DD`.
//   - the column is `payment_type_id` (an id from `/related_things/
//     get-names-list?type=PaymentMethod`, e.g. Cash=31), **not**
//     `payment_method`. A `payment_method` string is silently dropped; with
//     `payment_type_id` set, the read-back echoes `payment_method: "Cash"`.
export const addStaffAdvance = async (payload: {
  branch_id: number | string;
  user_id: number;
  amount: number;
  return_month: string; // YYYY-MM-DD
  occurrence_date: string;
  category: 'Advance';
  transaction_type?: string;
  payment_type_id?: number;
  bank_id?: number;
  reason?: string;
}) => {
  const res = await api.post('/v1/users-finance/add', payload);
  return res.data;
};

// Staff Profile's "Add Reward" / "Add Fine" — same endpoint and validation as
// addStaffAdvance above, with `category` Reward | Fine. The web form's
// "Deduction Date" (fines) is `return_month`; the Reward form has no such
// field, so the reward date is sent there to satisfy the NOT NULL column.
// Not submitted against prod — the payload follows the confirmed Advance one.
export const addStaffFinanceEntry = async (payload: {
  branch_id: number | string;
  user_id: number;
  amount: number;
  category: 'Reward' | 'Fine';
  occurrence_date: string;
  return_month: string; // YYYY-MM-DD
  reason: string;
}) => {
  const res = await api.post('/v1/users-finance/add', payload);
  return res.data;
};

export const getHRStaffLoans = async (params: {
  branch_id: number | string;
  staff_id?: number | string;
  start_date?: string;
  end_date?: string;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  // `branch_id`/`staff_id` are validated as integers, so an empty string is a
  // 422 ("The branch id must be an integer."). The web admin sends `branch_id=`
  // for "All Branches" and so permanently shows "Loans could not be loaded" on
  // its HR report — confirmed in the 2026-09-17 HAR. Dropping blank keys instead
  // makes the all-branches case work.
  const res = await api.get('/v1/staff-loans/get', { params: intParams(params) });
  return res.data;
};

export const getHRStaffPromotions = async (params: {
  branch_id: number | string;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  // Same integer validation as staff-loans — see the note there.
  const res = await api.get('/v1/hr/promotion/index', { params: intParams(params) });
  return res.data;
};

// ── Daily Office Closing ─────────────────────────────────────────────────────
// Confirmed live 2026-07-01 via HAR — endpoint returns all transactions for
// the branch in the given date range, grouped client-side by transaction_type.
// Row shape: { id, branch_id, branch_name, transaction_type, category_id,
// category_name, sub_category_id, sub_category_name, payment_type,
// cheque_number, amount, description, occurrence_date, status }
// Known transaction_types from HAR: 'Bank Account', 'Sales Counter', 'Office Counter'.
export const getDailyOfficeClosing = async (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) => {
  const res = await api.get('/v1/finance/transactions/fetch-expense-detail', { params });
  return res.data;
};

// ── Assets ────────────────────────────────────────────────────────────────────
// The whole module is **singular** `asset`, on read as well as write.
// Confirmed live on dev 2026-09-10: `/v1/finance/assets/get` (plural) 404s —
// which the Assets screen silently swallowed as "no records", so the list has
// always rendered empty. `/v1/finance/asset/get` returns real rows.
// Row shape: { id, name, category_name, sub_category_name, purchase_cost,
// quantity, total_cost, current_value, acquisition_date, vendor_name,
// vendor_contact, description }.
export const getAssets = async (params: {
  branch_id: number | string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/finance/asset/get', { params });
  return res.data;
};

// Confirmed live on dev 2026-09-10 (HTTP 201). Note the route is **singular**
// `asset/add` while the read side is plural `assets/get` — the earlier
// `assets/add` guess 404s. Required: branch_id, category_id, sub_category_id,
// name, acquisition_date (all four rejected as missing on an empty body).
export const addAsset = async (payload: {
  branch_id: number | string;
  category_id: number;
  sub_category_id: number;
  name: string;
  acquisition_date: string;
  purchase_cost: number;
  quantity?: number;
  total_cost?: number;
  current_value?: number;
  vendor_name?: string;
  vendor_contact?: string;
  description?: string;
}) => {
  const res = await api.post('/v1/finance/asset/add', payload);
  return res.data;
};

// ── Staff Registration (Add Staff) ───────────────────────────────────────────
// Confirmed live 2026-06-24: POST /v1/auth/register exists, no auth token
// required.
//
// 2026-07-03: a HAR of the web admin's "Add Staff" page (Downloads/
// vostro-new.com.har) only captured the page load — the visible "required"
// errors are client-side validation, no submit ever fired. But the page's
// dropdowns confirmed `getBranchesNameList`/`getDepartmentNames`/
// `getDesignationNames` are the right sources (already wired below), and
// `GET /v1/auth/get/{id}`'s response shape (branch_id, department_id,
// designation_id, first_name, last_name, email, official_email, phone,
// gender, cnic, address, city, country, salary, role, joining, father_name,
// dob, appointment_date, probation_duration, monthly_medical,
// emergency_contact_no, blood_group, image) is a strong hint at the field
// names `register` expects, since Laravel resource controllers typically
// mirror field names between store/show — but this is inferred, not
// confirmed. The form's "Card Number" field has no matching field in the
// GET shape, so it's likely unrelated to this record (possibly the
// AssignCards/ViewCards module instead) — omitted from the payload below.
// The AddStaff screen keeps ADD_ENABLED = false until a real submit is
// captured.
// ✅ CONFIRMED WORKING on dev 2026-09-10 (HTTP 201, `{status, message:"User
// successfully registered", id}`), and a read-back via `/auth/get/{id}`
// confirmed all 20 submitted fields stored correctly with an auto-generated
// `uid` (e.g. SF11-2609-22).
//
// The long-standing "backend bug" was a misdiagnosis. The controller reads
// `$request['key']` directly with **no defaults**, so any key it touches must
// be present or PHP throws. Two different symptoms come from the same cause:
//   - a missing scalar key  -> 500 `Undefined array key "<name>"`
//   - a missing `appointment_date` -> 500 `trim(): ... DateTime given`
//     (it falls back to a DateTime, which `trim()` then rejects)
// Earlier probes sent `date`/`joining_date`/`birthday`; the real field names
// are `joining`/`dob`/`appointment_date`, taken from `/auth/get/{id}`.
//
// Verified by dropping one key at a time from a working payload:
//   REQUIRED: branch_id, first_name, gender (validation) +
//             department_id, designation_id, salary, joining,
//             appointment_date (raw array access -> 500 if absent)
//   OPTIONAL: last_name, dob, confirmation_date, employment_end_date, and
//             every other field below.
// The 8 required ones are typed as required here precisely because passing
// `undefined` drops the key from the JSON body and reproduces the 500.
export const registerStaff = async (payload: {
  branch_id: number | string;
  first_name: string;
  gender: 'Male' | 'Female' | 'Others';
  department_id: number;
  designation_id: number;
  salary: number;
  joining: string;
  appointment_date: string;
  last_name?: string;
  father_name?: string;
  email?: string;
  official_email?: string;
  password?: string;
  cnic?: string;
  dob?: string;
  phone?: string;
  emergency_contact_no?: string;
  blood_group?: string;
  city?: string;
  address?: string;
  role?: string;
  probation_duration?: number;
  monthly_medical?: number;
  [key: string]: any;
}) => {
  const res = await api.post('/v1/auth/register', payload);
  return res.data;
};

// ── HR: Employee Profile Entries ─────────────────────────────────────────────
// Backs the web HR report's Qualifications / Certifications, Experience and
// Education tables — one endpoint for all three, discriminated by `entry_type`
// ("Qualification" | "Experience" | "Education"). Confirmed live in the
// 2026-09-17 HAR: 213 rows for the all-staff call, each carrying `title`,
// `organization`, `location`, `start_date`, `end_date`, `description`, plus a
// nested `employee` ({id, uid, first_name, last_name, image}) and `branch`.
// Response uses the Nutrition-style envelope: { message, data[], pagination }.
export const getHREmployeeProfileEntries = async (params: {
  branch_id?: number | string;
  user_id?: number | string;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/hr/employee-profile-entries/index', { params: intParams(params) });
  return res.data;
};

// ── HR: Staff Documents (warning letters) ────────────────────────────────────
// Backs the web HR report's Disciplinary Action Register. Answered 404
// "No record found" for every call in the 2026-09-17 HAR, so the section
// renders empty until warning-letter data exists — that is not a client bug.
export const getHRStaffDocuments = async (params: {
  branch_id?: number | string;
  user_id?: number | string;
  document_type?: string;
  start_date?: string;
  end_date?: string;
  status?: number;
  limit?: number;
  page?: number;
}) => {
  const res = await api.get('/v1/hr/staff-documents/index', { params: intParams(params) });
  return res.data;
};

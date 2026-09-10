import api from './service';

// MIS Dashboard
export const getMISDashboard = (branchId: number) =>
  api.get(`/v1/MISReport/get?bId=${branchId}`);

// ── Quick Dates ─────────────────────────────────────────────────────────────
// The report pages' Quick Dates buttons are server-computed, not worked out in
// the browser: clicking one calls GET /v1/get-dates/<key> and the page feeds
// the answer straight into start_date/end_date.
//
// Do not reimplement these locally — the server does not mean what the label
// says. HAR-confirmed 2026-09-07: `lastQuarter` answered
// {"StartDate":"2025-10-01","EndDate":"2025-12-31"} — Q4 2025, when the
// previous calendar quarter on that date was Q2 2026. Computing it here would
// quietly disagree with the web.
export type QuickDateRange = { StartDate: string; EndDate: string };

export const getQuickDates = async (key: string): Promise<QuickDateRange | null> => {
  const res = await api.get(`/v1/get-dates/${key}`);
  const body = res.data ?? {};
  return body.StartDate && body.EndDate
    ? { StartDate: String(body.StartDate), EndDate: String(body.EndDate) }
    : null;
};

// ── Transaction Report ──────────────────────────────────────────────────────
// GET /v1/transaction-report?branch_id&start_date&end_date — HAR-confirmed
// 2026-09-07. Takes no page/limit: it returns the whole range in one response,
// orders grouped by date, so the web's page-size selector and First/Last Page
// controls are client-side over the flattened list.
//
//   { status, total_price, total_discount, total_net_price,
//     data: [ { date, data: [ order, … ] } ] }
//
// Those three totals are exact sums over every order in the range, not the
// visible page (verified: 210 orders across 6 days summed to the reported
// 2,609,552 / 18,910 / 2,720,246). There is no total for GST or Pending —
// the web derives both, and so does the screen: sum(tax) and
// sum(payment_history[].pending). net_price = price - discount + tax.
export type TransactionItem = {
  id: number;
  order_id: number;
  package_id: string;
  package_name: string;
  price: number;
  discount: number;
  net_price: number;
  tax: number;
  category: string;
  note: string;
};

export type TransactionPayment = {
  id: number;
  order_id: number;
  cheque_number: string;
  received: number;
  payment_method_id: number;
  payment_type: string;
  pending: number;
};

export type TransactionOrder = {
  id: number;
  branch_id: number;
  branch_name: string;
  client_id: number;
  client_name: string;
  price: number;
  discount: number;
  net_price: number;
  tax: number;
  date: string;
  note: string;
  created_at: string;
  sold_by: string;
  payment_history: TransactionPayment[];
  items: TransactionItem[];
};

export type TransactionReportResult = {
  orders: TransactionOrder[];
  totalPrice: number;
  totalDiscount: number;
  totalNetPrice: number;
  totalGst: number;
  totalPending: number;
};

// An order can carry more than one payment (3 of 210 did), so Pending sums the
// history and Payment Type joins the distinct types rather than taking [0].
export const orderPending = (o: TransactionOrder) =>
  (o.payment_history ?? []).reduce((n, p) => n + (Number(p.pending) || 0), 0);

export const orderPaymentType = (o: TransactionOrder) =>
  [...new Set((o.payment_history ?? []).map(p => p.payment_type).filter(Boolean))].join(', ') || '—';

export const getTransactionReport = async (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}): Promise<TransactionReportResult> => {
  try {
    const res = await api.get('/v1/transaction-report', { params });
    const body = res.data ?? {};
    const groups = Array.isArray(body.data) ? body.data : [];
    const orders: TransactionOrder[] = groups.flatMap((g: any) =>
      (g?.data ?? []).map((o: any) => ({ ...o, date: o.date ?? g.date })),
    );
    return {
      orders,
      totalPrice: Number(body.total_price ?? 0),
      totalDiscount: Number(body.total_discount ?? 0),
      totalNetPrice: Number(body.total_net_price ?? 0),
      totalGst: orders.reduce((n, o) => n + (Number(o.tax) || 0), 0),
      totalPending: orders.reduce((n, o) => n + orderPending(o), 0),
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return { orders: [], totalPrice: 0, totalDiscount: 0, totalNetPrice: 0, totalGst: 0, totalPending: 0 };
    }
    throw err;
  }
};

// Cafe Report
export const getCafeReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/transaction-report-cafe', { params });

// Transaction Slip
export const getTransactionSlip = (order_id: number) =>
  api.get(`/v1/transaction-slip?order_id=${order_id}`);

// Summary Report. `category` narrows to one order category (10 = Cafe) — the
// Daily Sales & Expense report uses it to pull cafe sales per date.
export const getTransactionSummary = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  category?: number | string;
}) =>
  api.get('/v1/transaction-report-summery', { params });

// Daily Sales & Expense Analysis — per-date sales for one branch, split by
// payment method. Shape: { immediate: [{ date, pending, Cash, Online,
// Credit_Card }], later: [...] }. Confirmed live 2026-08-13 against a HAR
// capture of the web admin's report, which sums the `immediate` bucket only
// (including `pending`) and discards `later`.
export const getDailySalesSummary = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/summary', { params });

// Sales Report — GET /v1/generate-sales-report. Confirmed live 2026-08-06:
// this endpoint 500s unconditionally with a genuine backend bug
// ("BadMethodCallException: Call to undefined method Package::orderDetail()"),
// reproducible for any branch/date range. Kept only because it's still
// referenced by type; not called by the rebuilt Sales Report screen below.
export const getSalesReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/generate-sales-report', { params });

// Sales Report (Detail) — GET /v1/detail. This is the endpoint the web
// admin's "Sales" report page actually calls (HAR-confirmed 2026-08-06), not
// generate-sales-report above. Returns transactions pre-grouped by day
// (`onspot`/`deposits` are arrays of per-day transaction arrays), each
// transaction carrying its own `paymentType` for the Cash/Credit
// Card/Online sub-grouping the web UI shows.
export const getSalesDetail = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  gender?: string;
  payment_method_id?: number | string;
}) =>
  api.get('/v1/detail', { params });

// Detailed Sales Report
export const getDetailedSalesReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/orders-detail/detailed-sales-report', { params });

// Sales By Services
export const getSalesByServices = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/finance/transactions/get-sales-by-service-category', {
    params: { ...params, status: '1' },
  });

// Sales & Expense Daily
export const getSalesExpenseDaily = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/finance/transactions/get-sales-and-expense-by-category', { params });

// Sales By Category & Payment Method — confirmed live 2026-06-25 (needs
// `/v1/`, same systemic prefix bug). Shape: { "<category_code>": [{Cash},
// {Cheque}, {"Credit Card"}, {Online}, {"Cafe Assistant"}, {Deposit},
// {Postpaid}, {"Salary Deduction"}] } — keys are the Category Code Reference
// (1=Gym, 2=PT, etc., see API_REFERENCE.md §5).
export const getSalesByCategoryAndPayment = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/finance/transactions/fetch-sales-by-category-and-payment', { params });

// Sales Balance (Daily Sales Counter's total) — confirmed live 2026-06-25
// (needs `/v1/`). Just a single total, not the category breakdown.
export const getSalesBalance = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/finance/transactions/get-sales-balance', { params });

// Sales By Bootcamp (session-detail-report)
export const getSalesByBootcamp = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/session-detail-report', { params });

// Staff Attendance Report
export const getStaffAttendanceReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/attendance/get', {
    params: { ...params, category: '2', type: 'Staff' },
  });

// ── Clients Attendance (the web's "Attendance Report") ──────────────────────
// HAR-confirmed 2026-09-07 against the Sales login. Every Go fires BOTH calls
// in parallel — `attendance/get` for the Detail table and `attendance/showSummery`
// for the Summary table — and the Summary/Detail radio only chooses which of
// the two results is displayed.
//
// Differences from the Footfall Report, which reads the same feed:
//   • branch_id is the user's own branch ('15'), not '' for all branches.
//   • times go as HH:mm:ss ('00:00:00'/'12:00:00'), not Footfall's HH:mm.
//   • gender goes lowercase ('male'), and does filter — a day of 131 entries
//     came back as 45 with gender=male and a 00:00–12:00 window.

export type AttendanceSummaryRow = { date: string; count: number };

export type ClientAttendanceQuery = {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  gender?: string;
  start_time?: string;
  end_time?: string;
  member_id?: number | string;
};

const attendanceParams = (params: ClientAttendanceQuery) => ({
  type: 'Member',
  category: '1',
  branch_id: params.branch_id,
  member_id: params.member_id ?? '',
  start_date: params.start_date,
  end_date: params.end_date,
  start_time: params.start_time ?? '',
  end_time: params.end_time ?? '',
  gender: params.gender ?? '',
});

export const getClientsAttendanceReport = async (
  params: ClientAttendanceQuery & { limit?: number; page?: number },
): Promise<AttendancePage> => {
  const { limit = 25, page = 1 } = params;
  try {
    const res = await api.get('/v1/attendance/get', {
      params: { ...attendanceParams(params), limit, page },
    });
    const body = res.data ?? {};
    return {
      rows: (body.data?.data ?? []) as AttendanceRecord[],
      total: Number(body.totalRecord ?? body.data?.total ?? 0),
      totalPages: Number(body.totalPages ?? body.data?.last_page ?? 1),
      currentPage: Number(body.data?.current_page ?? page),
      perPage: Number(body.data?.per_page ?? limit),
    };
  } catch (err: any) {
    // Same 404-means-empty contract as the footfall query below.
    if (err?.response?.status === 404) {
      return { rows: [], total: 0, totalPages: 1, currentPage: page, perPage: limit };
    }
    throw err;
  }
};

/** Per-date counts behind the Summary option: [{ date, count }]. */
export const getClientsAttendanceSummary = async (
  params: ClientAttendanceQuery,
): Promise<AttendanceSummaryRow[]> => {
  try {
    const res = await api.get('/v1/attendance/showSummery', { params: attendanceParams(params) });
    return (res.data?.data ?? []) as AttendanceSummaryRow[];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
};

/** Clients for the Name filter. One flat list per branch (3291 rows on F-11). */
export type ClientNameOption = {
  id: number;
  first_name: string;
  last_name: string;
  uid: string;
  phone: string;
  joining_date: string;
};

export const getClientNames = async (branchId: number | string): Promise<ClientNameOption[]> => {
  try {
    const res = await api.get('/v1/clients/client-name', { params: { branch_id: branchId } });
    return (res.data?.data ?? []) as ClientNameOption[];
  } catch {
    return [];
  }
};

// ── Footfall Report ─────────────────────────────────────────────────────────
// There is no footfall endpoint. The web admin's Footfall Report is derived
// entirely client-side from the member attendance feed — HAR-confirmed
// 2026-09-07 against the Sales login (harrison@vostroworld.com): all four tabs
// (Gender, Branch, Peak Hours, Combined) issue this one call and differ only
// in `limit`. The three paged tabs send the Limit field (default 25) and
// compute their tiles from *that page's rows*; Combined sends 1000 and
// aggregates the whole range.
//
// This used to call /v1/attendance/showSummery, which belongs to the Clients
// Attendance report above (its Summary option), not here. That endpoint answers
// [{ date, count }] — one row per day — so the screen read the array length as
// the total: "Total Footfall: 1" on a day whose own row said 108 visitors.
export const FOOTFALL_COMBINED_LIMIT = 1000;

export type AttendanceRecord = {
  id: number;
  attendee_id: number;
  attendee_type: string;
  checkin_time_12h: string | null;
  checkout_time_12h: string | null;
  checkin_time_24h: string | null;
  checkout_time_24h: string | null;
  verified_by: string | null;
  date: string;
  gender: string | null;
  attendance_status: string | null;
  attendee: {
    id: number;
    uid: string;
    first_name: string;
    last_name: string;
    image: string;
  } | null;
};

// The row carries no branch field — the web reads the branch off the client's
// uid prefix ('F11-2507-1' → 'F-11', 'G13-2404-15' → 'G-13'). Verified against
// the web's Branch tab: the same 25-row window yields F-11 14 / G-13 11.
export const attendanceBranch = (row: AttendanceRecord) => {
  const m = /^([A-Za-z]+)-?(\d+)/.exec(row.attendee?.uid ?? '');
  return m ? `${m[1].toUpperCase()}-${m[2]}` : 'Unknown';
};

export const attendanceName = (row: AttendanceRecord) =>
  [row.attendee?.first_name, row.attendee?.last_name].filter(Boolean).join(' ').trim() || '—';

export const attendanceClientId = (row: AttendanceRecord) =>
  String(row.attendee_type ?? '').includes('Client')
    ? (row.attendee?.id ?? row.attendee_id ?? null)
    : null;

// Hour-of-day (0-23) the member checked in; null when the row has no check-in
// time. Drives the Peak Hours tab and both hourly charts.
export const attendanceHour = (row: AttendanceRecord) => {
  const h = Number(String(row.checkin_time_24h ?? '').slice(0, 2));
  return Number.isFinite(h) && String(row.checkin_time_24h ?? '') !== '' ? h : null;
};

export type AttendancePage = {
  rows: AttendanceRecord[];
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
};

export type FootfallQuery = {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  gender?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  page?: number;
};

export const getFootfallReport = async (params: FootfallQuery): Promise<AttendancePage> => {
  const { limit = 25, page = 1 } = params;
  try {
    const res = await api.get('/v1/attendance/get', {
      params: {
        type: 'Member',
        category: '1',
        branch_id: params.branch_id,
        member_id: '',
        start_date: params.start_date,
        end_date: params.end_date,
        // The web sends these as empty strings rather than omitting them, so
        // mirror that. The Peak Hours / Combined time pickers send 24-hour
        // zero-padded HH:mm — HAR-confirmed 2026-09-07 (start_time=00:30,
        // end_time=15:02). The filter is applied server-side (that window cut
        // the day from 460 rows to 130), so these just pass through; note it
        // narrows on the whole visit, not just check-in — 14:xx check-ins
        // whose checkout ran past 15:02 drop out too.
        start_time: params.start_time ?? '',
        end_time: params.end_time ?? '',
        gender: params.gender ?? '',
        limit,
        page,
      },
    });
    const body = res.data ?? {};
    return {
      rows: (body.data?.data ?? []) as AttendanceRecord[],
      total: Number(body.totalRecord ?? body.data?.total ?? 0),
      totalPages: Number(body.totalPages ?? body.data?.last_page ?? 1),
      currentPage: Number(body.data?.current_page ?? page),
      perPage: Number(body.data?.per_page ?? limit),
    };
  } catch (err: any) {
    // A window with no attendance answers 404 {"status":false,"message":"No
    // record found"} instead of an empty 200 — HAR-confirmed 2026-09-07, where
    // 2026-09-06 came back 404 while every neighbouring day returned rows.
    // That is an empty result, not a failure; letting it reject is what put
    // "Something went wrong" on the screen for any range containing a quiet
    // day. Anything else still throws.
    if (err?.response?.status === 404) {
      return { rows: [], total: 0, totalPages: 1, currentPage: page, perPage: limit };
    }
    throw err;
  }
};

// Longest range the Combined tab will fan out over. The web sets no bound;
// this stops a "Last 90" style pick from firing 90 parallel requests.
export const FOOTFALL_MAX_DAYS = 31;

const dayCount = (start: string, end: string) =>
  Math.floor(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
  ) + 1;

const eachDay = (start: string, end: string) => {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last && out.length < FOOTFALL_MAX_DAYS) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};

/**
 * The Combined tab's dataset: one request per day in the range, aggregated.
 *
 * HAR-confirmed 2026-09-07 — picking 01–07 Sep fired seven single-day calls,
 * each with start_date === end_date. It has to work that way: the per-call cap
 * is 1000 rows and a single busy day already runs to ~460, so asking for a
 * week in one call would silently truncate at 1000 and undercount every tile.
 *
 * `truncatedDays` names any day that came back at the cap and is therefore
 * itself incomplete — the web has the same blind spot and shows nothing.
 */
export type FootfallCombinedResult = AttendancePage & {
  days: string[];
  cappedRange: boolean;
  truncatedDays: string[];
};

export const getFootfallCombined = async (
  params: Omit<FootfallQuery, 'limit' | 'page'>,
): Promise<FootfallCombinedResult> => {
  const days = eachDay(params.start_date, params.end_date);
  const rows: AttendanceRecord[] = [];
  const truncatedDays: string[] = [];

  // Bounded fan-out: the web fires the whole range at once, which on a month
  // would be 31 parallel requests against a 15s client timeout.
  const BATCH = 6;
  for (let i = 0; i < days.length; i += BATCH) {
    const batch = days.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(day =>
        getFootfallReport({
          ...params,
          start_date: day,
          end_date: day,
          limit: FOOTFALL_COMBINED_LIMIT,
          page: 1,
        }),
      ),
    );
    results.forEach((res, j) => {
      rows.push(...res.rows);
      if (res.rows.length >= FOOTFALL_COMBINED_LIMIT) truncatedDays.push(batch[j]);
    });
  }

  return {
    rows,
    total: rows.length,
    totalPages: 1,
    currentPage: 1,
    perPage: rows.length,
    days,
    cappedRange: dayCount(params.start_date, params.end_date) > days.length,
    truncatedDays,
  };
};

// Clients Report
export const getClientsReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  status?: string;
  limit?: number;
  page?: number;
}) =>
  api.get('/v1/clients/get', { params });
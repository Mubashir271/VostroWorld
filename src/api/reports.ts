import api from './service';

// MIS Dashboard
export const getMISDashboard = (branchId: number) =>
  api.get(`/v1/MISReport/get?bId=${branchId}`);

// Transaction Report
export const getTransactionReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/transaction-report', { params });

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

// Summary Report
export const getTransactionSummary = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/transaction-report-summery', { params });

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

// Clients Attendance
export const getClientsAttendanceReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/attendance/get', {
    params: { ...params, category: '1', type: 'Member' },
  });

// Footfall Report (attendance summary)
export const getFootfallReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/attendance/showSummery', {
    params: { ...params, category: '1', type: 'Member' },
  });

// Clients Report
export const getClientsReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  status?: string;
}) =>
  api.get('/v1/clients/get', { params });
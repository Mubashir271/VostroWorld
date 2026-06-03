import api from './service';

// MIS Dashboard
export const getMISDashboard = (branchId: number) =>
  api.get(`/v1/MISReport/get?bId=${branchId}`);

// Transaction Report
export const getTransactionReport = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/transaction-report', { params });

// Cafe Report
export const getCafeReport = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/transaction-report-cafe', { params });

// Transaction Slip
export const getTransactionSlip = (order_id: number) =>
  api.get(`/v1/transaction-slip?order_id=${order_id}`);

// Summary Report
export const getTransactionSummary = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/transaction-report-summery', { params });

// Sales Report
export const getSalesReport = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/generate-sales-report', { params });

// Detailed Sales Report
export const getDetailedSalesReport = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/orders-detail/detailed-sales-report', { params });

// Sales By Services
export const getSalesByServices = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/finance/transactions/get-sales-by-service-category', {
    params: { ...params, status: '1' },
  });

// Sales & Expense Daily
export const getSalesExpenseDaily = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/finance/transactions/get-sales-and-expense-by-category', { params });

// Sales By Bootcamp (session-detail-report)
export const getSalesByBootcamp = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/session-detail-report', { params });

// Staff Attendance Report
export const getStaffAttendanceReport = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/attendance/get', {
    params: { ...params, category: '2', type: 'Staff' },
  });

// Clients Attendance
export const getClientsAttendanceReport = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/attendance/get', {
    params: { ...params, category: '1', type: 'Member' },
  });

// Footfall Report (attendance summary)
export const getFootfallReport = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
}) =>
  api.get('/v1/attendance/showSummery', {
    params: { ...params, category: '1', type: 'Member' },
  });

// Clients Report
export const getClientsReport = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
  status?: string;
}) =>
  api.get('/v1/clients/get', { params });
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
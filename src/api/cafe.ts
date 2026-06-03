import api from './service';

// ── Cafe Categories ───────────────────────────────────────────────────────────

export const getCafeCategories = (params: { branch_id: number; limit?: number; page?: number }) =>
  api.get('/v1/cafe/categories/get', { params });

export const createCafeCategory = (payload: { branch_id: number; name: string; description?: string }) =>
  api.post('/v1/cafe/categories/store', payload);

// ── Cafe Products ─────────────────────────────────────────────────────────────

export const getCafeProducts = (params: {
  branch_id: number;
  category_id?: number;
  search?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/cafe/products/get', { params });

export const createCafeProduct = (payload: {
  branch_id: number;
  category_id: number;
  name: string;
  price: number;
  description?: string;
}) => api.post('/v1/cafe/products/store', payload);

// ── Cafe Deposits (packages/plans) ───────────────────────────────────────────

export const getCafeDeposits = (params: {
  branch_id: number;
  status?: 'active' | 'inactive';
  search?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/cafe-deposits/get', { params });

export const addCafeDeposit = (payload: {
  branch_id: number;
  name: string;
  price: number;
}) => api.post('/v1/cafe-deposits/store', payload);

export const updateCafeDeposit = (id: number, payload: {
  branch_id: number;
  name?: string;
  price?: number;
}) => api.put(`/v1/cafe-deposits/update/${id}`, payload);

export const toggleCafeDepositStatus = (id: number, payload: {
  branch_id: number;
  status: 'active' | 'inactive';
}) => api.put(`/v1/cafe-deposits/status/${id}`, payload);

// ── Add Client Cafe Deposit (assign deposit to a client) ──────────────────────

// loads all clients — filtering is done locally in the screen
export const searchClientsForDeposit = async (params: {
  branch_id: number;
  limit?: number;
}) => {
  const res = await api.get('/v1/clients/get', { params });
  return res.data;
};

export const addClientCafeDeposit = (payload: {
  branch_id: number;
  client_id: number;
  name: string;
  price: number;
}) => api.post('/v1/cafe/client-deposits/store', payload);

// ── Clients Available Balance ─────────────────────────────────────────────────

export const getCafeClientsBalance = (params: {
  branch_id: number;
  search?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/cafe/clients-balance/get', { params });

// ── Deposits History ──────────────────────────────────────────────────────────

export const getCafeDepositsHistory = (params: {
  branch_id: number;
  client_id?: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/cafe/deposits/history', { params });

// ── Management Pendings ───────────────────────────────────────────────────────

export const getCafeManagementPendings = (params: {
  branch_id: number;
  limit?: number;
  page?: number;
}) => api.get('/v1/cafe/management-pendings/get', { params });

// ── Cafe Dashboard ────────────────────────────────────────────────────────────

export const getCafeDashboard = (params: { branch_id: number }) =>
  api.get('/v1/cafe/dashboard', { params });

// ── Cafe Sales Report (detail / summary) ─────────────────────────────────────

export const getCafeSalesReport = (params: {
  branch_id: number;
  start_date: string;
  end_date: string;
  report_type?: 'summary' | 'detail';
  item_id?: number;
}) => api.get('/v1/transaction-report-cafe', { params });

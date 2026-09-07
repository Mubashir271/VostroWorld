import api from './service';

// ── Cafe Categories ───────────────────────────────────────────────────────────

// `/v1/cafe/categories/get` and `/v1/cafe/products/get` do NOT exist — both
// confirmed 404 live 2026-09-02. The real routes, taken from the web's cafe
// POS page (HAR + bundle), are the ones below. The old paths silently
// returned nothing, so the Cafe Categories and Cafe Products screens have
// been rendering empty lists.
export const getCafeCategories = (params: { branch_id: number | string; limit?: number; page?: number }) =>
  api.get('/v1/finance/categories/fetch-categories-names', {
    params: { branch_id: params.branch_id, type: 'Cafe' },
  });

export const createCafeCategory = (payload: { branch_id: number | string; name: string; description?: string }) =>
  api.post('/v1/finance/categories/add', { ...payload, type: 'Cafe' });

// ── Cafe Products ─────────────────────────────────────────────────────────────

// Cafe products are `packages` with category 10. `value=10&key=category` is
// the filter pair the web sends; `cafe_category_id` narrows to one chip.
export const getCafeProducts = (params: {
  branch_id: number | string;
  cafe_category_id?: number;
  limit?: number;
  page?: number;
}) => api.get('/v1/packages/get', {
  params: {
    branch_id: params.branch_id,
    status: 1,
    value: 10,
    key: 'category',
    limit: params.limit ?? 999,
    ...(params.cafe_category_id ? { cafe_category_id: params.cafe_category_id } : {}),
  },
});

export const createCafeProduct = (payload: {
  branch_id: number | string;
  cafe_category_id: number;
  package_name: string;
  price: number;
  description?: string;
}) => api.post('/v1/packages/add', { ...payload, category: '10' });

// ── Cafe POS (cart + checkout) ────────────────────────────────────────────────
// Route/payload shapes all confirmed 2026-09-02 from the web's /cafe page —
// HAR for the reads and the cart writes, bundle for the checkout body.

export type CafeCategory = { id: number; name: string; available_products: number };

export type CafeProduct = {
  id: number;
  package_name: string;
  cafe_category_id: number;
  cafe_category_name: string;
  image: string;
  price: number;
};

export type CafeCartRow = {
  id: number;
  client_id: number;
  package_name: string;
  package_price: number;   // unit price
  price: number;           // line total (package_price * quantity)
  quantity: number;
  discount: number;
  tax: number;
  net_price: number;
  image: string;
};

export const getCafeCart = (branchId: number | string) =>
  api.get('/v1/cart/get', { params: { branch_id: branchId, category: 10 } });

export const addToCafeCart = (payload: {
  branch_id: number | string;
  client_id: number;
  package_id: number;
  price: number;
  net_price: number;
  quantity?: number;
  discount?: number;
  sale_date?: string;
}) => api.post('/v1/cart/add', {
  discount: 0,
  quantity: 1,
  sale_date: new Date().toISOString().slice(0, 10),
  category: '10',
  ...payload,
});

// The web sends the recomputed LINE total as `price`, not the unit price.
export const updateCafeCartQty = (id: number, quantity: number, unitPrice: number) =>
  api.put(`/v1/cart/cart-update/${id}`, { quantity, price: unitPrice * quantity });

export const deleteCafeCartItem = (id: number) => api.delete(`/v1/cart/delete/${id}`);

export const getCafePaymentMethods = () =>
  api.get('/v1/related_things/get-names-list', { params: { type: 'PaymentMethod' } });

// Returns a bare number (e.g. `179`), not an object.
export const getCafeTax = (branchId: number | string, amount: number, paymentMethodId: number) =>
  api.get(`/v1/finance/setting/tax-calculator/${branchId}/${amount}/${paymentMethodId}`);

// `type=Cafe` returns exactly one row — the branch's "Walk in Customer"
// placeholder (id 2438 on branch 15). Resolved at runtime rather than
// hardcoded, since the id differs per branch.
export const getCafeWalkInClient = (branchId: number | string) =>
  api.get('/v1/clients/get', { params: { branch_id: branchId, status: 1, type: 'Cafe' } });

export const cafeCheckout = (payload: {
  branch_id: number | string;
  client_id: number;
  price: number;
  discount: number;
  net_price: number;
  payment_method_id: number;
  tax: number;
  sale_type?: string;
  note?: string;
  user_id?: number | string;
}) => api.post('/v1/orders/add', {
  sale_type: 'New',
  note: '',
  user_id: '',
  discount_type: 'Percentage',
  category: '10',
  cheque_number: '',
  pending_payment: 0,
  bypass_fbr_validation: false,
  ...payload,
  payment_received: payload.net_price,
});

// ── Cafe Deposits (packages/plans) ───────────────────────────────────────────

// The `/v1/cafe-deposits/*` family does NOT exist — all four confirmed 404
// live 2026-09-03. Cafe deposit plans are just `packages` with category 13,
// managed through the same package routes the Cafe Products screen uses.
// Status is a server-side filter here, so the screen asks for 1 and 0
// separately rather than splitting one list locally.
export const getCafeDeposits = (params: {
  branch_id: number | string;
  status?: 1 | 0;
  limit?: number;
  page?: number;
}) => api.get('/v1/packages/get', {
  params: {
    branch_id: params.branch_id,
    value: 13,
    key: 'category',
    limit: params.limit ?? 999,
    ...(params.status !== undefined ? { status: params.status } : {}),
    ...(params.page ? { page: params.page } : {}),
  },
});

export const addCafeDeposit = (payload: {
  branch_id: number | string;
  package_name: string;
  price: number;
}) => api.post('/v1/packages/add', { ...payload, category: '13', duration: '0' });

// Cafe packages update over POST on a dedicated route, not PUT on `update/`.
export const updateCafeDeposit = (id: number, payload: {
  branch_id: number | string;
  package_name?: string;
  price?: number;
}) => api.post(`/v1/packages/update-cafe/${id}`, { ...payload, category: '13' });

export const toggleCafeDepositStatus = (id: number, status: 'active' | 'inactive') =>
  api.put(`/v1/packages/${status}/${id}`, {});

// ── Add Client Cafe Deposit (assign deposit to a client) ──────────────────────

// loads all clients — filtering is done locally in the screen
export const searchClientsForDeposit = async (params: {
  branch_id: number | string;
  limit?: number;
}) => {
  const res = await api.get('/v1/clients/get', { params });
  return res.data;
};

// NOTE: `/v1/cafe/client-deposits/store` is a 404 (confirmed live 2026-09-03)
// and the real write has not been captured yet. The web books a deposit as a
// category-13 order (see the Deposits History rows: `/v1/orders/add`-shaped
// records whose single item is a category-13 package), so this needs the
// package picker + order payload, not a free-text name/price. Left on the dead
// route deliberately rather than shipping an unverified POST to production.
export const addClientCafeDeposit = (payload: {
  branch_id: number | string;
  client_id: number;
  name: string;
  price: number;
}) => api.post('/v1/cafe/client-deposits/store', payload);

// ── Clients Available Balance ─────────────────────────────────────────────────

// Paginated: `data.data` is the page array, with `totalRecord` / `totalPages`
// alongside `data`.
export const getCafeClientsBalance = (params: {
  branch_id: number | string;
  name?: string;
  limit?: number;
  page?: number;
}) => api.get('/v1/client-balance/get', { params });

// ── Deposits History ──────────────────────────────────────────────────────────

// Cafe deposits are category 13 on the shared transaction report. Rows come
// back grouped by date; `client_id` is sent even when empty, as the web does.
export const getCafeDepositsHistory = (params: {
  branch_id: number | string;
  client_id?: number | string;
  start_date: string;
  end_date: string;
}) => api.get('/v1/transaction-report', {
  params: { ...params, client_id: params.client_id ?? '', category: 13 },
});

// ── Management Pendings ───────────────────────────────────────────────────────

// Rows are grouped per staff member (not per order) and every money field
// arrives as a string.
export const getCafeManagementPendings = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) => api.get('/v1/cafe-accounts/get', { params });

// ── Cafe Sales Report (detail / summary) ─────────────────────────────────────

// Detail mode: flat array of orders, each with `payment_history[]` and
// `items[]`. `/v1/transaction-report-cafe` takes no category — it is already
// cafe-only.
export const getCafeSalesReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) => api.get('/v1/transaction-report-cafe', { params });

// Summary mode: one row per day — `{ order_count, order_date, total_price,
// total_discount, total_tax, total_net_price }`, all money fields as strings.
export const getCafeSummaryReport = (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
}) => api.get('/v1/transaction-report-summery', { params: { ...params, category: 10 } });

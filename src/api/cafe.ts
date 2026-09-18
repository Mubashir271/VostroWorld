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
// RESOLVED 2026-09-10: `/v1/cafe/client-deposits/store` does not exist (404).
// A client's cafe deposit is their **available balance**, and the working
// routes are `/v1/client-balance/add` (create the balance row, or top up an
// existing one) and `/v1/client-balance/credit` (update a row that already
// exists). Confirmed live on dev with a read-back through
// `/v1/client-balance/get`: adding 1500 moved client 8790 from 100 to 1600.
//
// ⚠️ `/client-balance/credit` answers 404 "No record found" for a client with
// no balance row yet, and its *error* path 500s on a backend typo
// (`ResponseFactory::jason`). `add` handles both cases, so prefer it.
export const addClientCafeDeposit = (payload: {
  branch_id: number | string;
  client_id: number;
  amount: number;
  date?: string;
  description?: string;
}) => api.post('/v1/client-balance/add', payload);

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

// ── Detailed Cafe Report ────────────────────────────────────────────────────
// HAR-confirmed 2026-09-07 (Sales login, branch 15). The report is the shared
// /v1/transaction-report endpoint narrowed to the cafe category, plus five
// dropdown feeds. Only branch_id / start_date / end_date / category / client_id
// go to the server; Item, Staff, Sale Type, Payment Type, Sold By and Order ID
// are applied to the returned rows, which is how the web does it.
//
// Money, verified row-by-row against the web's table on 2026-09-07:
//   Price    = order.price
//   GST      = sum(items[].tax)   ← NOT order.tax, which is rounded per order
//                                   and came out 4 short across 15 orders
//   Net      = price - discount + sum(items[].tax)   (totalled 23,093)
//   Received = order.net_price                       (totalled 23,089)
// The two genuinely differ; the web shows both columns.
//
// The response's own total_price/total_discount/total_net_price do NOT agree
// with the rows it returns (50,027 vs the 21,982 the 15 cafe orders sum to) —
// they appear not to honour the category filter. The web prints them as a
// separate "API totals for selected range" line rather than using them, and so
// does the screen.

export type CafeReportFilters = {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  client_id?: number | string;
};

export const getDetailedCafeReport = async (params: CafeReportFilters) => {
  const query: Record<string, any> = {
    branch_id: params.branch_id,
    start_date: params.start_date,
    end_date: params.end_date,
    category: '10',
  };
  if (params.client_id) query.client_id = params.client_id;

  try {
    const res = await api.get('/v1/transaction-report', { params: query });
    const body = res.data ?? {};
    const groups = Array.isArray(body.data) ? body.data : [];
    const orders = groups.flatMap((g: any) =>
      (g?.data ?? []).map((o: any) => ({ ...o, date: o.date ?? g.date })),
    );
    return {
      orders,
      apiTotalPrice: Number(body.total_price ?? 0),
      apiTotalDiscount: Number(body.total_discount ?? 0),
      apiTotalNetPrice: Number(body.total_net_price ?? 0),
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return { orders: [], apiTotalPrice: 0, apiTotalDiscount: 0, apiTotalNetPrice: 0 };
    }
    throw err;
  }
};

// GST the web actually displays: the per-item tax, summed.
export const cafeOrderGst = (o: any) =>
  (o.items ?? []).reduce((n: number, i: any) => n + (Number(i.tax) || 0), 0);

export const cafeOrderNet = (o: any) =>
  (Number(o.price) || 0) - (Number(o.discount) || 0) + cafeOrderGst(o);

// Received is the money actually taken, which is NOT order.net_price. They
// coincide only when nothing is pending — the 2026-09-07 capture had pending 0
// throughout, which hid the difference. Across August: received 658,203 +
// pending 83,897 = 742,100 = sum(order.net_price). So net_price is what is
// owed, and it splits into received + pending.
export const cafeOrderReceived = (o: any) =>
  (o.payment_history ?? []).reduce((n: number, p: any) => n + (Number(p.received) || 0), 0);

export const cafeOrderPending = (o: any) =>
  (o.payment_history ?? []).reduce((n: number, p: any) => n + (Number(p.pending) || 0), 0);

export const cafeOrderPayment = (o: any) =>
  [...new Set((o.payment_history ?? []).map((p: any) => p.payment_type).filter(Boolean))].join(', ') || '—';

// Sale Type is not a field on the order. INFERRED, not confirmed: staff and
// management cafe purchases record the buyer in `note` as "Name,userId" (an
// order in the 2026-09-07 transaction capture carried note "Waqas Ahmed,10080"
// with a 30% discount on a Postpaid payment), while ordinary sales leave it
// null. Matching that id against the two auth/get-name lists is what makes the
// Staff/Management dropdowns and the Staff/Management Discounts tiles
// meaningful. Every order in the captured day had note null, so only the
// "Regular" branch is actually verified.
export const cafeNoteUserId = (o: any) => {
  const m = /,\s*(\d+)\s*$/.exec(String(o.note ?? ''));
  return m ? Number(m[1]) : null;
};

export type CafeSaleType = 'Regular' | 'Staff' | 'Management';

export const cafeSaleType = (
  o: any,
  staffIds: Set<number>,
  managementIds: Set<number>,
): CafeSaleType => {
  const id = cafeNoteUserId(o);
  if (id === null) return 'Regular';
  if (managementIds.has(id)) return 'Management';
  if (staffIds.has(id)) return 'Staff';
  return 'Regular';
};

// ── Dropdown feeds for the Detailed Cafe Report ─────────────────────────────
export type NamedOption = { id: number; name: string };

const paged = (res: any): any[] => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export const getCafeReportBranches = async (): Promise<NamedOption[]> => {
  try {
    const res = await api.get('/v1/branches/get');
    return paged(res).map((b: any) => ({ id: Number(b.id), name: String(b.name) }));
  } catch { return []; }
};

/** Cafe products for the Item filter — packages narrowed to category 10. */
export const getCafeReportItems = async (branchId: number | string): Promise<NamedOption[]> => {
  try {
    const res = await api.get('/v1/packages/get', {
      params: { branch_id: branchId, status: '1', limit: '999', value: '10', key: 'category' },
    });
    return paged(res).map((p: any) => ({ id: Number(p.id), name: String(p.package_name) }));
  } catch { return []; }
};

export const getCafeReportClients = async (branchId: number | string): Promise<NamedOption[]> => {
  try {
    const res = await api.get('/v1/clients/get', {
      params: { branch_id: branchId, status: '1', type: 'Cafe' },
    });
    return paged(res).map((c: any) => ({
      id: Number(c.id),
      name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || String(c.uid ?? c.id),
    }));
  } catch { return []; }
};

/** management='no' backs Sold By (51 users); management='yes' backs Staff / Management (5). */
export const getCafeReportUsers = async (
  branchId: number | string,
  management: 'yes' | 'no',
): Promise<NamedOption[]> => {
  try {
    const res = await api.get('/v1/auth/get-name', { params: { branch_id: branchId, management } });
    return paged(res).map((u: any) => ({
      id: Number(u.id),
      name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || String(u.id),
    }));
  } catch { return []; }
};

// ── Cafe Sales Report ───────────────────────────────────────────────────────
// "Cafe Sales Report" (Cafe menu) and "Cafe Sales" (Reports menu) are one page
// on the web — the breadcrumb reads "Reports » Cafe Sales" while the sidebar
// highlights Cafe Sales Report — so the app points both entries at one screen.
//
// Same feed as the Detailed Cafe Report: /v1/transaction-report with
// category=10 (HAR-confirmed 2026-09-07). It carries no client/staff filters,
// only Select Item, and adds a Summary/Detail radio.
//
// Its totals row does NOT agree with its own rows, and this is the web's
// behaviour rather than a mistake to correct: the GST and Net Price *columns*
// print item-level figures (168 / 3,492 for order 60136) while the *totals*
// use the order-level fields — Total GST 1,107 = sum(order.tax) against a
// column that adds to 1,111, and Total Net 23,089 = sum(order.net_price)
// against a column adding to 23,093. The Detailed Cafe Report totals the same
// day the other way (1,111 / 23,093). Both are reproduced as they stand.
export const cafeSalesRowGst = cafeOrderGst;          // item-level, for columns
export const cafeSalesTotalGst = (o: any) => Number(o.tax) || 0;        // order-level, for totals
export const cafeSalesTotalNet = (o: any) => Number(o.net_price) || 0;  // order-level, for totals

// ── Membership packages (CRM / Clients › Memberships) ────────────────────────
// Same `packages` table, category 6. List confirmed from the web's Membership
// Packages page (HAR 2026-09-18): /packages/get?key=category&value=6 with
// status 1 (Active) / 0 (Inactive) as separate requests; rows carry
// `branches_name`, `package_name`, `price`, `status`.
// The writes reuse the package routes confirmed for cafe packages (category
// 13 above). No membership add/update was captured in a HAR, so these are the
// same routes with category '6' — not yet submitted for this category.
export type MembershipPackageRow = {
  id: number;
  branch_id: number;
  branches_name: string;
  package_name: string;
  price: number;
  status: string;
};

export const getMembershipPackages = async (branchId: number | string, status: 1 | 0) => {
  try {
    const res = await api.get('/v1/packages/get', {
      params: { page: 1, branch_id: branchId, status, limit: 999, value: 6, key: 'category' },
    });
    const d = res.data?.data;
    return (Array.isArray(d) ? d : d?.data ?? []) as MembershipPackageRow[];
  } catch (err: any) {
    if (err?.response?.status === 404) return [] as MembershipPackageRow[];
    throw err;
  }
};

export const addMembershipPackage = (payload: {
  branch_id: number | string;
  package_name: string;
  price: number;
}) => api.post('/v1/packages/add', { ...payload, category: '6', duration: '0' });

export const updateMembershipPackage = (id: number, payload: {
  branch_id: number | string;
  package_name: string;
  price: number;
}) => api.post(`/v1/packages/update-cafe/${id}`, { ...payload, category: '6' });

export const setMembershipPackageStatus = (id: number, status: 'active' | 'inactive') =>
  api.put(`/v1/packages/${status}/${id}`, {});

// ── Access cards (CRM / Clients › Access Control — View Cards) ───────────────
// GET /v1/cards/show — HAR 2026-09-18 of the web's Manage Cards page. `type`
// is the member type: 1 Client, 2 Staff, 3 Visitor; server paginated.
// `name` on a row is the BRANCH name; the member's own name is
// first_name/last_name (null on most older cards). `number` is the card
// number (0 = none), `membership_category` the Description column, `date`
// the assigning date, `status` '1' active / '0' blocked.
export type AccessCardRow = {
  id: number;
  branch_id: number;
  name: string;
  zkid: number;
  number: number;
  member_type: string;
  membership_category: string;
  status: string;
  date: string;
  member_id: number | null;
  first_name: string | null;
  last_name: string | null;
};

export const getAccessCards = async (params: {
  branch_id: number | string;
  type: 1 | 2 | 3;
  page: number;
  limit: number;
}) => {
  try {
    const res = await api.get('/v1/cards/show', { params });
    const body = res.data ?? {};
    return {
      rows: (body.data?.data ?? []) as AccessCardRow[],
      total: Number(body.totalRecord ?? body.data?.total ?? 0),
      totalPages: Number(body.totalPages ?? body.data?.last_page ?? 1),
    };
  } catch (err: any) {
    if (err?.response?.status === 404) return { rows: [] as AccessCardRow[], total: 0, totalPages: 1 };
    throw err;
  }
};

// A member's own cards — the Assign Cards page loads this when a search result
// is opened (HAR 2026-09-18): /cards/get?key=member_id&value={id}&member_type=
// 1 (client). Rows carry `number`, `description`, `status`, `date`,
// `branch_info.name`. The web also calls /auth/search/{id} (staff lookup,
// 404 for a client) alongside it; not needed for clients.
export type MemberCardRow = {
  id: number;
  branch_id: number;
  number: number;
  member_type: string;
  description: string | null;
  status: string;
  date: string;
  branch_info?: { id: number; name: string } | null;
};

export const getMemberCards = async (memberId: number, memberType: 1 | 2 | 3) => {
  try {
    const res = await api.get('/v1/cards/get', {
      params: { page: 1, member_type: memberType, value: memberId, branch_id: '', limit: 50, key: 'member_id' },
    });
    return (res.data?.data?.data ?? []) as MemberCardRow[];
  } catch (err: any) {
    if (err?.response?.status === 404) return [] as MemberCardRow[];
    throw err;
  }
};

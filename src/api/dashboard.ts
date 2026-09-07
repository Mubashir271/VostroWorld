import api from './service';

export const getMISDashboard = async (branchId: number | string) => {
    const response = await api.get(
        `/v1/MISReport/get?bId=${branchId}`
    );
    return response.data;
};

// Returns { all_clients, active_clients, inactive_clients, dormant_clients }
export const getClientsCount = async (branchId?: number) => {
    const res = await api.get('/v1/clients/count', {
        params: branchId ? { branch_id: branchId } : {},
    });
    return res.data;
};

// Returns { immediate: [{ date, pending, Credit_Card, Online, Cash }], later: [] }
export const getTodaySummary = async (branchId: number | string) => {
    const today = new Date().toISOString().split('T')[0];
    const res = await api.get('/v1/summary', {
        params: { branch_id: branchId, start_date: today, end_date: today },
    });
    return res.data;
};

export const getPackageCategories = async () => {
  const res = await api.get('/v1/package-categories');
  return res.data;
};

// ── Renewals (dashboard "RENEWALS …" panel) ─────────────────────────────────
// Powers the web dashboard's renewals tabs. Route + params + response shape
// were read out of the web bundle (main.47674643.js) and confirmed live
// 2026-09-02 with the Sales token: the summary block returned
// {total:3280, renewed:2313, expired:957, pending:10, remaining:967} for
// branch 15 / category 1, matching the web UI exactly.
//
// `category` is the dashboard tab, NOT the full package-category list above:
// 1 = GYM Packages, 2 = Trainer Packages, 7 = Gx / Classes. (The Gx tab really
// does send 7, not 15 — confirmed in the bundle's tab handlers.)
export const RENEWAL_TABS = [
  { key: '1', label: 'GYM Packages', title: 'RENEWALS GYM PACKAGES' },
  { key: '2', label: 'Trainer Packages', title: 'RENEWALS TRAINER PACKAGES' },
  { key: '7', label: 'Gx', title: 'RENEWALS GX / CLASSES' },
] as const;

// Quick Filter dropdown values, verbatim from the web bundle.
export const RENEWAL_DURATIONS = [
  { value: '', label: 'All (1 Year)' },
  { value: 'Today', label: 'Today' },
  { value: 'Yesterday', label: 'Yesterday' },
  { value: 'Coming5Days', label: 'Coming 5 Days' },
  { value: 'Coming7Days', label: 'Coming 7 Days' },
  { value: 'Previous5Days', label: 'Previous 5 Days' },
] as const;

export const RENEWAL_STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'renewed', label: 'Renewed' },
  { value: 'expired', label: 'Expired' },
  { value: 'pending', label: 'Pending' },
] as const;

export type RenewalRow = {
  id: number;
  client_id: number;
  name: string;
  package_name: string;
  orderStatus: string;
  sale_type: string;
  start_date: string;
  end_date: string;
  price: number;
  net_price: number;
  category: string;
  renewal_status: 'renewed' | 'expired' | 'pending' | string;
};

export type RenewalSummary = {
  total: number;
  renewed: number;
  expired: number;
  pending: number;
  remaining: number;
};

export const EMPTY_RENEWAL_SUMMARY: RenewalSummary = {
  total: 0, renewed: 0, expired: 0, pending: 0, remaining: 0,
};

export const getRenewals = async (params: {
  branch_id: number | string;
  category: string;
  page?: number;
  limit?: number;
  duration?: string;
  from_date?: string;
  to_date?: string;
  renewal_status?: string;
}) => {
  const { page = 1, limit = 25, duration, from_date, to_date, renewal_status } = params;
  const res = await api.get(`/v1/orders-detail/expired-packages-history?page=${page}`, {
    params: {
      branch_id: params.branch_id,
      category: params.category,
      limit,
      // The web sends these as `undefined` when unset rather than as empty
      // strings, so mirror that — an empty `renewal_status` is not the same
      // as omitting it.
      duration: duration || undefined,
      from_date: from_date || undefined,
      to_date: to_date || undefined,
      // HAR-confirmed: the web sends `renewal_status=all` explicitly rather
      // than omitting it, so mirror that rather than dropping the param.
      renewal_status: renewal_status || 'all',
    },
  });
  const body = res.data ?? {};
  return {
    rows: (body.data?.data ?? []) as RenewalRow[],
    summary: (body.summary ?? EMPTY_RENEWAL_SUMMARY) as RenewalSummary,
    totalRecord: Number(body.totalRecord ?? 0),
    totalPages: Number(body.totalPages ?? 1),
    currentPage: Number(body.data?.current_page ?? page),
    perPage: Number(body.data?.per_page ?? limit),
  };
};

// category: 1=Gym, 2=PT/Trainer, 3=Guest Pass, 4=Small Group PT, 5=Nutrition,
// 6=Registration, 7=Bootcamp, 8=Freezing, 9=General, 10=Cafe, 11=CFT/Academy,
// 12=Massage Chair, 13=Cafe Deposits, 14=Physiotherapy, 15=GX
export const getPackages = async (params: {
  branch_id: number | string;
  category: number;
  status?: number;
  limit?: number;
}) => {
  try {
    const res = await api.get('/v1/packages/get', { params });
    return res.data;
  } catch (e: any) {
    // 404 "No record found" just means an empty list for these filters.
    if (e?.response?.status === 404) {
      return { status: true, data: { data: [] } };
    }
    throw e;
  }
};

// Returns { status, data: [...flat list of all packages with category info...], message }
export const getAllPackagesWithCategories = async (branchId: number | string) => {
  try {
    const res = await api.get('/v1/packages/all-with-categories', { params: { branch_id: branchId } });
    return res.data;
  } catch (e: any) {
    if (e?.response?.status === 404) {
      return { status: true, data: [] };
    }
    throw e;
  }
};

// /v1/generate-sales-report is broken server-side (Package::orderDetail() missing).
// We call /v1/transaction-report instead and aggregate items by package to match
// the expected shape: { status, total_price, total_discount, total_net_price, data[] }
export const getPackagesSalesReport = async (params: {
  branch_id: number | string;
  start_date: string;
  end_date: string;
  category?: number;
}) => {
  const res = await api.get('/v1/transaction-report', { params });
  const raw = res.data;

  type PkgEntry = {
    id: number;
    package_name: string;
    package_category: string;
    total_price: number;
    total_discount: number;
    total_net_price: number;
    order_detail: any[];
  };

  const map: Record<number, PkgEntry> = {};

  (raw?.data ?? []).forEach((dateGroup: any) => {
    (dateGroup?.data ?? []).forEach((order: any) => {
      (order?.items ?? []).forEach((item: any) => {
        const id = item.package_id;
        if (!map[id]) {
          map[id] = {
            id,
            package_name: item.package_name,
            package_category: String(item.category),
            total_price: 0,
            total_discount: 0,
            total_net_price: 0,
            order_detail: [],
          };
        }
        map[id].total_price     += Number(item.price)     || 0;
        map[id].total_discount  += Number(item.discount)  || 0;
        map[id].total_net_price += Number(item.net_price) || 0;
        map[id].order_detail.push(item);
      });
    });
  });

  return {
    status: true,
    total_price:     raw?.total_price     ?? 0,
    total_discount:  raw?.total_discount  ?? 0,
    total_net_price: raw?.total_net_price ?? 0,
    data: Object.values(map),
  };
};
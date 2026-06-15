import api from './service';

export const getMISDashboard = async (branchId: number) => {
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
export const getTodaySummary = async (branchId: number) => {
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

// category: 1=Gym, 2=PT/Trainer, 3=Guest Pass, 4=Small Group PT, 5=Nutrition,
// 6=Registration, 7=Bootcamp, 8=Freezing, 9=General, 10=Cafe, 11=CFT/Academy,
// 12=Massage Chair, 13=Cafe Deposits, 14=Physiotherapy, 15=GX
export const getPackages = async (params: {
  branch_id: number;
  category: number;
  status?: number;
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

// /v1/generate-sales-report is broken server-side (Package::orderDetail() missing).
// We call /v1/transaction-report instead and aggregate items by package to match
// the expected shape: { status, total_price, total_discount, total_net_price, data[] }
export const getPackagesSalesReport = async (params: {
  branch_id: number;
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
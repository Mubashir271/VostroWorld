import api from './service';

// ── Legacy Finance dashboard ────────────────────────────────────────────────
// The web's "Finance dashboard (legacy)" runs on five calls, all taking
// branch_id + start_date + end_date (HAR, 21 Sep 2026):
//
//   /v1/finance/transactions/get-bank-balance-detail
//   /v1/finance/office-cash-flow/office-cash-balance
//   /v1/finance/transactions/sales-counter-balance
//   /v1/finance/transactions/get-sales-and-expense-by-category
//   /v1/finance/transactions/fetch-sales-sum-by-payment-method
//
// There is no `/v1/finance/dashboard` — that route 404s (checked live
// 21 Sep 2026), which is why the app's old screen only ever showed its
// hardcoded sample figures.
//
// The three balance endpoints disagree on casing: the bank one returns
// snake_case (`total_balance`), the other two camelCase (`totalBalance`).
// `normaliseBalance` flattens that so callers see one shape.

export interface FinanceBalance {
    total_balance: number;
    last_debit: number;
    last_credit: number;
}

const num = (v: any) => Number(v) || 0;

const normaliseBalance = (d: any): FinanceBalance => ({
    total_balance: num(d?.total_balance ?? d?.totalBalance),
    last_debit: num(d?.last_debit_amount ?? d?.lastDebitAmount),
    last_credit: num(d?.last_credit_amount ?? d?.lastCreditAmount),
});

export interface CategoryRow {
    /** Sales rows come back as a package-category id; expenses as a name. */
    category: string;
    Type?: string;
    total_quantity: string | number;
    total_price: string | number;
}

export interface PaymentMethodRow {
    payment_method: string;
    quantity: number;
    total_payment: string;
}

/**
 * Package-category ids the sales rows are keyed by. Same numbering the
 * packages endpoints use (see api/dashboard.ts); anything unmapped is shown
 * as N/A, which is what the web does too.
 */
export const SALES_CATEGORY_NAMES: Record<string, string> = {
    '1': 'Gym',
    '2': 'PT',
    '3': 'Guest Pass',
    '4': 'Small Group PT',
    '5': 'Nutrition',
    '6': 'Registration',
    '7': 'Bootcamp',
    '8': 'Freezing',
    '9': 'General',
    '10': 'Cafe',
    '11': 'CFT',
    '12': 'Massage Chair',
    '13': 'Cafe Deposits',
    '14': 'Physiotherapy',
    '15': 'GX',
};

export const salesCategoryName = (id: string) => SALES_CATEGORY_NAMES[String(id)] ?? 'N/A';

export interface LegacyFinanceParams {
    branch_id?: number | string | null;
    start_date: string;
    end_date: string;
}

const withParams = (p: LegacyFinanceParams) => ({
    params: {
        branch_id: p.branch_id ?? '',
        start_date: p.start_date,
        end_date: p.end_date,
    },
});

export const getBankBalance = async (p: LegacyFinanceParams): Promise<FinanceBalance> => {
    const res = await api.get('/v1/finance/transactions/get-bank-balance-detail', withParams(p));
    return normaliseBalance(res.data);
};

export const getOfficeBalance = async (p: LegacyFinanceParams): Promise<FinanceBalance> => {
    const res = await api.get('/v1/finance/office-cash-flow/office-cash-balance', withParams(p));
    return normaliseBalance(res.data);
};

export const getSalesCounterBalance = async (p: LegacyFinanceParams): Promise<FinanceBalance> => {
    const res = await api.get('/v1/finance/transactions/sales-counter-balance', withParams(p));
    return normaliseBalance(res.data);
};

export const getSalesAndExpenseByCategory = async (
    p: LegacyFinanceParams,
): Promise<{ sales: CategoryRow[]; expenses: CategoryRow[] }> => {
    const res = await api.get('/v1/finance/transactions/get-sales-and-expense-by-category', withParams(p));
    const d = res.data?.data ?? {};
    return {
        sales: Array.isArray(d.sales) ? d.sales : [],
        expenses: Array.isArray(d.expenses) ? d.expenses : [],
    };
};

export const getSalesByPaymentMethod = async (
    p: LegacyFinanceParams,
): Promise<PaymentMethodRow[]> => {
    const res = await api.get('/v1/finance/transactions/fetch-sales-sum-by-payment-method', withParams(p));
    return Array.isArray(res.data?.data) ? res.data.data : [];
};

/** Sales rows arrive split by New / Renew / Mix; the chart wants one bar per
 *  category, so fold the types together. */
export const foldSalesByCategory = (rows: CategoryRow[]) => {
    const map: Record<string, { label: string; amount: number; qty: number }> = {};
    rows.forEach(r => {
        const label = salesCategoryName(r.category);
        if (!map[label]) { map[label] = { label, amount: 0, qty: 0 }; }
        map[label].amount += num(r.total_price);
        map[label].qty += num(r.total_quantity);
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
};

export const foldExpensesByCategory = (rows: CategoryRow[]) => {
    const map: Record<string, { label: string; amount: number; qty: number }> = {};
    rows.forEach(r => {
        const label = r.category || 'N/A';
        if (!map[label]) { map[label] = { label, amount: 0, qty: 0 }; }
        map[label].amount += num(r.total_price);
        map[label].qty += num(r.total_quantity);
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
};

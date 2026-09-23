import api from './service';

// ── Finance V2 ──────────────────────────────────────────────────────────────
// The web's "Finance V2 Books" section. Routes confirmed 21 Sep 2026: the
// journals and profit-and-loss calls from a HAR, and trial-balance /
// balance-sheet by GET against the live API (they follow the same pattern and
// return the same line shape).
//
//   GET /v1/finance-v2/journals?branch_id&from&to&per_page&source
//   GET /v1/finance-v2/reports/profit-and-loss?from&to&branch_id
//   GET /v1/finance-v2/reports/trial-balance?from&to&branch_id
//   GET /v1/finance-v2/reports/balance-sheet?from&to&branch_id
//
// An empty branch_id means all branches, so it is omitted rather than sent
// blank.

/** One account's movement in a report. Every report uses this same row. */
export interface ReportLine {
    account_id: number;
    code: string;
    name: string;
    type: string;
    debit: number;
    credit: number;
    balance: number;
}

export interface ProfitAndLoss {
    income_lines: ReportLine[];
    expense_lines: ReportLine[];
    total_income: number;
    total_expense: number;
    net_income: number;
}

export interface TrialBalance {
    lines: ReportLine[];
    totals: { debit: number; credit: number; balanced: boolean; difference: number };
}

export interface BalanceSheet {
    assets: ReportLine[];
    liabilities: ReportLine[];
    equity: ReportLine[];
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    liabilities_and_equity: number;
    is_balanced: boolean;
}

export interface JournalLine {
    id: number;
    account_id: number;
    debit: string;
    credit: string;
    memo: string | null;
    line_order: number;
    account?: { id: number; code: string; name: string };
}

export interface JournalEntry {
    id: number;
    branch_id: number;
    entry_date: string;
    reference: string;
    description: string;
    source_type: string;
    source_id: number | null;
    status: string;
    total_debit: string;
    total_credit: string;
    voided_at: string | null;
    void_reason: string | null;
    lines?: JournalLine[];
}

const reportParams = (from: string, to: string, branchId?: number | null) => ({
    from,
    to,
    branch_id: branchId ?? undefined,
});

export const getProfitAndLoss = async (
    from: string, to: string, branchId?: number | null,
): Promise<ProfitAndLoss | null> => {
    const res = await api.get('/v1/finance-v2/reports/profit-and-loss', {
        params: reportParams(from, to, branchId),
    });
    return res.data?.data ?? null;
};

export const getTrialBalance = async (
    from: string, to: string, branchId?: number | null,
): Promise<TrialBalance | null> => {
    const res = await api.get('/v1/finance-v2/reports/trial-balance', {
        params: reportParams(from, to, branchId),
    });
    return res.data?.data ?? null;
};

export const getBalanceSheet = async (
    from: string, to: string, branchId?: number | null,
): Promise<BalanceSheet | null> => {
    const res = await api.get('/v1/finance-v2/reports/balance-sheet', {
        params: reportParams(from, to, branchId),
    });
    return res.data?.data ?? null;
};

// ── Setup wizard / Import & sync ────────────────────────────────────────────
//   GET /v1/finance-v2/setup/wizard-options?branch_id
//   GET /v1/finance-v2/reports/health-check?branch_id
//   GET /v1/finance-v2/reports/dashboard?branch_id
// Confirmed live 21 Sep 2026.

export interface HealthCheckItem {
    code: string;
    label: string;
    /** 'pass' | 'fail'. */
    status: string;
    detail: string;
}

export interface HealthCheck {
    healthy: boolean;
    failed_count: number;
    checks: HealthCheckItem[];
    checked_at: string;
}

export interface WizardOptions {
    payment_methods: { id: number; name: string; branch_id: number; status: string }[];
    legacy_expense_categories: { id: number; name: string; type: string; branch_id: number }[];
    package_categories: { id: number; name: string }[];
}

export interface FinanceV2Settings {
    company_name: string | null;
    currency: string | null;
    fiscal_year_start_month: number | null;
    books_start_date: string | null;
    setup_completed: boolean;
    setup_step: number;
}

export interface FinanceV2Dashboard {
    setup: {
        setup_completed: boolean;
        setup_step: number;
        /** { "1": "company_settings", … "7": "complete" } */
        steps: Record<string, string>;
        settings: FinanceV2Settings;
        requires_setup: boolean;
    };
    summary: Record<string, number | boolean>;
    hub: {
        company: { name: string; currency: string; books_start_date: string | null; setup_completed: boolean; setup_step: number };
        counts: { active_accounts: number; posted_journals_total: number; posted_journals_mtd: number; posted_journals_today: number };
        sync: {
            success_total: number;
            failed_total: number;
            by_module: { module: string; type: string; status: string; count: number }[];
            /** Backs the "Historical sales import" chart and the Import & sync
             *  page's Sales / orders block. */
            sales_backfill?: {
                total_eligible: number;
                synced_success: number;
                sync_failed: number;
                remaining: number;
            };
        };
        receivables: {
            total_ar: number;
            buckets: {
                current: number;
                days_31_60: number;
                days_61_90: number;
                days_91_120: number;
                over_120: number;
            };
            gl_ar_balance: number;
        };
        /** Journal counts keyed by source_type. */
        journals_by_source: Record<string, number>;
    };
}

export const getHealthCheck = async (branchId?: number | null): Promise<HealthCheck | null> => {
    const res = await api.get('/v1/finance-v2/reports/health-check', {
        params: { branch_id: branchId ?? undefined },
    });
    return res.data?.data ?? null;
};

export const getWizardOptions = async (branchId?: number | null): Promise<WizardOptions | null> => {
    const res = await api.get('/v1/finance-v2/setup/wizard-options', {
        params: { branch_id: branchId ?? undefined },
    });
    return res.data?.data ?? null;
};

export const getFinanceV2Dashboard = async (branchId?: number | null): Promise<FinanceV2Dashboard | null> => {
    const res = await api.get('/v1/finance-v2/reports/dashboard', {
        params: { branch_id: branchId ?? undefined },
    });
    return res.data?.data ?? null;
};

export const getJournals = async (params: {
    from: string;
    to: string;
    branch_id?: number | null;
    source?: string;
    per_page?: number;
}): Promise<JournalEntry[]> => {
    const res = await api.get('/v1/finance-v2/journals', {
        params: {
            from: params.from,
            to: params.to,
            branch_id: params.branch_id ?? undefined,
            source: params.source || undefined,
            per_page: params.per_page ?? 100,
        },
    });
    const body = res.data?.data;
    if (Array.isArray(body)) { return body; }
    if (Array.isArray(body?.data)) { return body.data; }
    return [];
};

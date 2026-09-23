import api from './service';

// ── Social Leads (web: Marketing › Social Media Dashboard) ───────────────────
// Confirmed live 2026-09-21 from a HAR of the web's Social Media Dashboard
// under the super admin login. Three calls back the page:
//
//   GET /v1/social-leads/stats?date=YYYY-MM-DD               — selected day
//   GET /v1/social-leads/stats?from_date=…&to_date=…         — month to date
//   GET /v1/social-leads?date=YYYY-MM-DD&per_page=12         — recent leads
//
// `branch_id` is optional on all three, and omitting it means all branches —
// unlike the nutrition statistics endpoints, which reject a missing or `all`
// branch. Super admin can therefore load this page with no branch chosen.

export interface SocialLeadStats {
    date: string;
    from_date: string | null;
    to_date: string | null;
    offer: string | null;
    branch_id: number | null;
    total_leads: number;
    whatsapp_detail: number;
    first_call_answered: number;
    interested: number;
    not_interested: number;
    visit_scheduled: number;
    visit_completed: number;
    payment_received: number;
    converted: number;
    conversion_rate: number;
    by_contact_medium: Record<string, number>;
    by_member_responsible: Record<string, number>;
    by_offer: { offer: string; total: number; converted: number }[];
}

export interface SocialLeadRow {
    id: number;
    branch_id: number;
    lead_date: string;
    customer_name: string;
    contact_number: string;
    contact_medium: string;
    offer: string;
    lead_code: string;
    comment: string | null;
    whatsapp_detail: boolean;
    first_call_answered: boolean;
    interested: boolean;
    not_interested: boolean;
    visit_scheduled: boolean;
    visit_completed: boolean;
    payment_received: boolean;
    member_responsible: string | null;
    branch?: { id: number; name: string };
    creator?: { id: number; first_name: string; last_name: string };
}

/** Day stats when `date` is given, range stats when `from_date`/`to_date` are. */
export const getSocialLeadStats = async (params: {
    branch_id?: number | null;
    date?: string;
    from_date?: string;
    to_date?: string;
}): Promise<SocialLeadStats | null> => {
    const res = await api.get('/v1/social-leads/stats', {
        // A null branch is "all branches" and must be omitted, not sent empty.
        params: { ...params, branch_id: params.branch_id ?? undefined },
    });
    return res.data?.data ?? null;
};

export const getSocialLeads = async (params: {
    branch_id?: number | null;
    date?: string;
    per_page?: number;
}): Promise<SocialLeadRow[]> => {
    const res = await api.get('/v1/social-leads', {
        params: { ...params, branch_id: params.branch_id ?? undefined },
    });
    return res.data?.data?.data ?? [];
};

// ── Social Leads list page (web: Marketing › Social Leads) ──────────────────
// The web builds one param object and sends it to both /social-leads and
// /social-leads/stats, the latter without per_page (bundle main.*.js, 21 Sep
// 2026): branch_id, offer and search are dropped when empty; `all_dates=1`
// replaces the range for the "All" button; and when from and to are equal it
// also sends `date`.

export interface SocialLeadQuery {
    branch_id?: number | null;
    offer?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
    allDates?: boolean;
}

export const buildSocialLeadParams = (q: SocialLeadQuery) => {
    const params: Record<string, any> = {
        branch_id: q.branch_id ?? undefined,
        offer: q.offer || undefined,
        search: q.search || undefined,
    };
    if (q.allDates) {
        params.all_dates = 1;
    } else {
        if (q.from_date) { params.from_date = q.from_date; }
        if (q.to_date) { params.to_date = q.to_date; }
        if (q.from_date && q.to_date && q.from_date === q.to_date) { params.date = q.from_date; }
    }
    return params;
};

export interface SocialLeadOptions {
    contact_medium: string[];
    offer: string[];
    member_responsible: string[];
    member_responsible_staff: { id: number; name: string }[];
    closed_by: string[];
}

export const getSocialLeadOptions = async (branchId?: number | null): Promise<SocialLeadOptions> => {
    const res = await api.get('/v1/social-leads/options', {
        params: { branch_id: branchId ?? undefined },
    });
    const d = res.data?.data ?? {};
    return {
        contact_medium: d.contact_medium ?? [],
        offer: d.offer ?? [],
        member_responsible: d.member_responsible ?? [],
        member_responsible_staff: d.member_responsible_staff ?? [],
        closed_by: d.closed_by ?? [],
    };
};

/** The list and its stat tiles — one query object, two calls, as the web does. */
export const getSocialLeadsPage = async (q: SocialLeadQuery) => {
    const base = buildSocialLeadParams(q);
    const [listRes, stats] = await Promise.all([
        api.get('/v1/social-leads', { params: { ...base, per_page: 100 } }),
        getSocialLeadStats(base as any).catch(() => null),
    ]);
    return {
        rows: (listRes.data?.data?.data ?? []) as SocialLeadRow[],
        stats,
    };
};

/** The eight fields the web's progress bar counts; a paid lead is always 100. */
export const PROGRESS_FIELDS = [
    'whatsapp_detail',
    'first_call_answered',
    'interested',
    'follow_up_calls',
    'visit_scheduled',
    'visit_completed',
    'second_follow_up',
    'payment_received',
] as const;

export const leadProgress = (lead: Partial<SocialLeadRow>): number => {
    if (lead?.payment_received) { return 100; }
    const done = PROGRESS_FIELDS.filter(f => (lead as any)?.[f]).length;
    return Math.round((done / PROGRESS_FIELDS.length) * 100);
};

export const leadStatus = (lead: Partial<SocialLeadRow>): string =>
    lead?.payment_received ? 'Paid'
        : lead?.visit_completed ? 'Visited'
            : lead?.not_interested ? 'Not interested'
                : lead?.interested ? 'Interested'
                    : 'Open';

/** The exact body the web's Edit lead dialog PUTs (HAR, 21 Sep 2026). */
export interface SocialLeadPayload {
    branch_id: number | string;
    lead_date: string;
    customer_name: string;
    contact_number: string;
    member_responsible: string;
    member_responsible_id: number | null;
    contact_medium: string;
    offer: string;
    whatsapp_detail: boolean;
    comment: string;
    first_call_answered: boolean;
    interested: boolean;
    not_interested: boolean;
    follow_up_calls: boolean;
    visit_scheduled: boolean;
    visit_completed: boolean;
    second_follow_up: boolean;
    payment_received: boolean;
    closed_by: string;
    follow_up_comment: string;
}

// Create sends only the intake half of the form — confirmed against the web's
// POST (HAR, 21 Sep 2026), which omits every sales follow-up field, closed_by
// and follow_up_comment even though its dialog renders them. The server fills
// those with false/null and computes implementation_rate itself. Update, by
// contrast, PUTs the whole body.
const INTAKE_FIELDS = [
    'branch_id',
    'lead_date',
    'customer_name',
    'contact_number',
    'member_responsible',
    'member_responsible_id',
    'contact_medium',
    'offer',
    'whatsapp_detail',
    'comment',
] as const;

const FOLLOW_UP_FIELDS = [
    'first_call_answered',
    'interested',
    'not_interested',
    'follow_up_calls',
    'visit_scheduled',
    'visit_completed',
    'second_follow_up',
    'payment_received',
    'closed_by',
    'follow_up_comment',
] as const;

const hasFollowUp = (p: SocialLeadPayload) =>
    FOLLOW_UP_FIELDS.some(k => {
        const v = p[k];
        return typeof v === 'boolean' ? v : !!(v && String(v).trim());
    });

/**
 * Create, then persist any follow-up the form carried.
 *
 * The POST endpoint ignores every sales follow-up field, so a lead added with
 * boxes already ticked would come back blank — on the web those ticks are
 * silently thrown away. The create response includes the new `id`, so when the
 * form has follow-up on it, we PUT it straight after; PUT does accept the full
 * body. A lead added with none skips the second call entirely.
 */
export const createSocialLead = async (payload: SocialLeadPayload) => {
    const body: Record<string, any> = {};
    INTAKE_FIELDS.forEach(k => { body[k] = payload[k]; });
    const res = await api.post('/v1/social-leads', body);

    const created = res.data?.data;
    if (created?.id && hasFollowUp(payload)) {
        const full = await api.put(`/v1/social-leads/${created.id}`, payload);
        return full.data ?? res.data;
    }
    return res.data;
};

export const updateSocialLead = async (id: number, payload: SocialLeadPayload) => {
    const res = await api.put(`/v1/social-leads/${id}`, payload);
    return res.data;
};

export const deleteSocialLead = async (id: number) => {
    const res = await api.delete(`/v1/social-leads/${id}`);
    return res.data;
};

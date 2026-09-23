import api from './service';

// ── Announcements (web: Dashboard › Announcements) ──────────────────────────
// Routes and payloads read out of the web bundle (main.*.js) and confirmed
// against the live list call (HAR, 21 Sep 2026):
//
//   GET /v1/announcements/index?branch_id&search&priority&status&active_only&limit&page
//   GET /v1/announcements/show/{id}
//   POST /v1/announcements/store
//   PUT /v1/announcements/update/{id}
//   PUT /v1/announcements/actions/{id}/{action}   0 = inactivate, 1 = activate, 2 = delete
//
// `status` is the list filter, not the row's state: "2" is All Active +
// Inactive (the default), "1" Active Only, "0" Inactive Only. A row carries
// its own `status`, where "1" means active.

export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export type Priority = typeof PRIORITIES[number];

export const STATUS_FILTERS = [
    { value: '2', label: 'All Active + Inactive' },
    { value: '1', label: 'Active Only' },
    { value: '0', label: 'Inactive Only' },
] as const;

export interface Announcement {
    id: number;
    branch_id: number | null;
    title: string;
    description: string;
    priority: Priority | string;
    announced_by: string | null;
    visible_from: string | null;
    visible_until: string | null;
    /** "1" when the announcement is active. */
    status: string;
}

export interface AnnouncementPayload {
    title: string;
    description: string;
    priority: string;
    announced_by: string;
    visible_from: string;
    visible_until: string;
}

export const getAnnouncements = async (params: {
    branch_id?: number | null;
    search?: string;
    priority?: string;
    status?: string;
    active_only?: boolean;
    limit?: number;
    page?: number;
} = {}): Promise<Announcement[]> => {
    try {
        const res = await api.get('/v1/announcements/index', {
            params: {
                branch_id: params.branch_id ?? undefined,
                search: params.search ?? '',
                priority: params.priority ?? '',
                status: params.status || '2',
                active_only: params.active_only ? 1 : 0,
                limit: params.limit || 100,
                page: params.page || 1,
            },
        });
        const body = res.data?.data;
        // The list comes back either as a bare array or paginator-wrapped.
        if (Array.isArray(body)) { return body; }
        if (Array.isArray(body?.data)) { return body.data; }
        return [];
    } catch (e: any) {
        // The API answers an empty library with 404 "No record found".
        if (e?.response?.status === 404) { return []; }
        throw e;
    }
};

export const createAnnouncement = async (
    payload: AnnouncementPayload & { branch_id?: number | null },
) => {
    const res = await api.post('/v1/announcements/store', {
        branch_id: payload.branch_id ?? undefined,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        announced_by: payload.announced_by,
        visible_from: payload.visible_from,
        visible_until: payload.visible_until,
    });
    return res.data;
};

export const updateAnnouncement = async (id: number, payload: AnnouncementPayload) => {
    const res = await api.put(`/v1/announcements/update/${id}`, {
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        announced_by: payload.announced_by,
        visible_from: payload.visible_from,
        visible_until: payload.visible_until,
    });
    return res.data;
};

/** action: '0' inactivate, '1' activate, '2' delete. */
export const announcementAction = async (id: number, action: '0' | '1' | '2') => {
    const res = await api.put(`/v1/announcements/actions/${id}/${action}`, {});
    return res.data;
};

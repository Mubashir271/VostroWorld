import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '../../api/service'

export type NotificationItem = {
    id: string
    title: string
    description: string
    type: 'approval' | 'payment' | 'alert' | 'success' | 'report' | 'membership' | 'announcement'
    timestamp: string
    actionLabel?: string
    borderColor: string
    iconBg: string
    icon: string
    read: boolean
}

interface NotificationState {
    items: NotificationItem[]
    loading: boolean
    error: string | null
}

const initialState: NotificationState = {
    items: [],
    loading: false,
    error: null,
}

// ── Thunk ──────────────────────────────────────────────────────────────────
export const fetchAnnouncements = createAsyncThunk(
    'notifications/fetchAnnouncements',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/v1/announcements/index')
            console.log('notificationssss: ', res)
            // "No record found" = valid empty state, not an error
            if (!res.data.status) {
                if (res.data.message === 'No record found') {
                    return []   // ← return empty array, not an error
                }
                return rejectWithValue(res.data.message ?? 'Failed to fetch')
            }

            return res.data.data as Array<{
                id: number
                title: string
                description: string
                status: string
                created_at: string
            }>
        } catch (err: any) {
            return rejectWithValue(err.message ?? 'Network error')
        }
    }
)

// ── Map API announcement → NotificationItem ────────────────────────────────
const mapAnnouncement = (a: {
    id: number
    title: string
    description: string
    created_at: string
}): NotificationItem => ({
    id: String(a.id),
    title: a.title,
    description: a.description,
    type: 'announcement',
    timestamp: new Date(a.created_at).toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }),
    actionLabel: 'View',
    borderColor: '#378ADD',
    iconBg: '#378ADD',
    icon: '📢',
    read: false,
})

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        markAsRead: (state, action: PayloadAction<string[]>) => {
            action.payload.forEach((id) => {
                const item = state.items.find((n) => n.id === id)
                if (item) item.read = true
            })
        },
        deleteNotifications: (state, action: PayloadAction<string[]>) => {
            state.items = state.items.filter((n) => !action.payload.includes(n.id))
        },
        // For locally-added notifications (approvals, payments, etc.)
        addLocalNotifications: (state, action: PayloadAction<NotificationItem[]>) => {
            // Merge — avoid duplicates by id
            const existingIds = new Set(state.items.map((n) => n.id))
            const newItems = action.payload.filter((n) => !existingIds.has(n.id))
            state.items = [...newItems, ...state.items]
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAnnouncements.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchAnnouncements.fulfilled, (state, action) => {
                state.loading = false
                const mapped = action.payload.map(mapAnnouncement)
                // Merge API announcements with existing local notifications
                const existingIds = new Set(state.items.map((n) => n.id))
                const newItems = mapped.filter((n) => !existingIds.has(n.id))
                state.items = [...newItems, ...state.items]
            })
            .addCase(fetchAnnouncements.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
    },
})

export const { markAsRead, deleteNotifications, addLocalNotifications } = notificationSlice.actions
export default notificationSlice.reducer
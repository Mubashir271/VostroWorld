import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/service';

interface Membership {
  client_id?: number;
  package_id?: number;
  category?: string;
  get_package_name?: { id: number; name: string };
}

export interface Member {
  id: number;
  uid: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
  image: string;
  city: string;
  status: string; // '1' = Active, '0' = Inactive
  birthday: string;
  available_balance: number;
  branches_name: string;
  membership_type: Membership[];
}

interface MembersState {
  list: Member[];
  branchId: number | string | null; // branch the cached list belongs to
  page: number;
  totalPages: number;
  hasMore: boolean;
  loaded: boolean;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: MembersState = {
  list: [],
  branchId: null,
  page: 1,
  totalPages: 1,
  hasMore: true,
  loaded: false,
  loading: false,
  loadingMore: false,
  refreshing: false,
  error: null,
};

export const fetchMembers = createAsyncThunk(
  '/v1/clients/fetchMembers',
  async (
    params: { branchId: number | string; page?: number; isRefresh?: boolean },
    { rejectWithValue },
  ) => {
    try {
      // One request for the whole branch, sorted A–Z here. Paging can't be
      // used: /clients/get ignores every sort param, and its totalPages is
      // always 1 (verified on prod 2026-09-14), so the old 30-per-page fetch
      // stopped after the first 30 of ~3,300 clients and search only ever saw
      // those 30. The full F-11 list is ~2 MB.
      // Took ~9 s from a desktop connection, so this call gets a longer
      // timeout than the client-wide 15 s.
      const res = (await api.get('/v1/clients/get', {
        params: { branch_id: params.branchId, limit: 10000, page: 1 },
        timeout: 60000,
      })).data;
      const rows = (res?.data?.data ?? []) as Member[];
      const nameOf = (m: Member) => `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim();
      const sorted = [...rows].sort((a, b) =>
        nameOf(a).localeCompare(nameOf(b), undefined, { sensitivity: 'base' }),
      );
      return {
        data: sorted,
        totalPages: 1,
        page: 1,
        branchId: params.branchId,
      };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to load members');
    }
  },
);

const membersSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembers.pending, (state, action) => {
        if (action.meta.arg.isRefresh) state.refreshing = true;
        else if ((action.meta.arg.page ?? 1) === 1) state.loading = true;
        else state.loadingMore = true;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        const { data, totalPages, page, branchId } = action.payload;
        state.list = page === 1 ? data : [...state.list, ...data];
        state.page = page;
        state.totalPages = totalPages;
        state.hasMore = page < totalPages;
        state.branchId = branchId;
        state.loaded = true;
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
        state.error = action.payload as string;
      });
  },
});

export default membersSlice.reducer;

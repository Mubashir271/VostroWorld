import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getClientsList } from '../../api/employeeDashboard';

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
      const page = params.page ?? 1;
      const res = await getClientsList({ branch_id: params.branchId, limit: 30, page });
      return {
        data: (res?.data?.data ?? []) as Member[],
        totalPages: res?.totalPages ?? 1,
        page,
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

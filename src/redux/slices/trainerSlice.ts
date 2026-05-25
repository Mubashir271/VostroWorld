import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getTrainerClients,
  markTrainerAttendance,
  getTakenSlots,
  getTrainerCommission,
  getTrainerHistory,
  getTrainerRoster,
  type ClientsResponse,
  type CommissionResponse,
  type MarkAttendancePayload,
} from '../../api/trainer';

interface TrainerState {
  clients: ClientsResponse | null;
  commission: CommissionResponse | null;
  history: any;
  roster: any;
  takenSlots: string[];
  loading: {
    clients: boolean;
    commission: boolean;
    history: boolean;
    roster: boolean;
    marking: boolean;
  };
  error: string | null;
}

const initialState: TrainerState = {
  clients: null,
  commission: null,
  history: null,
  roster: null,
  takenSlots: [],
  loading: {
    clients: false,
    commission: false,
    history: false,
    roster: false,
    marking: false,
  },
  error: null,
};

// Thunks
export const fetchTrainerClients = createAsyncThunk(
  '/v1/trainer/fetchClients',
  async (params: any, { rejectWithValue }) => {
    try {
      return await getTrainerClients(params);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to load clients');
    }
  }
);

export const fetchTakenSlots = createAsyncThunk(
  '/v1/trainer/fetchTakenSlots',
  async (date?: string) => {
    const res = await getTakenSlots(date);
    return res.taken_slots || [];
  }
);

export const submitMarkAttendance = createAsyncThunk(
  '/v1/trainer/markAttendance',
  async (payload: MarkAttendancePayload, { rejectWithValue }) => {
    try {
      return await markTrainerAttendance(payload);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to mark attendance';
      if (err?.response?.status === 403) throw new Error(message);
      if (err?.response?.status === 409) throw new Error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTrainerCommission = createAsyncThunk(
  '/v1/trainer/fetchCommission',
  async (params: any, { rejectWithValue }) => {
    try {
      return await getTrainerCommission(params);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to load commission');
    }
  }
);

export const fetchTrainerHistory = createAsyncThunk(
  '/v1/trainer/fetchHistory',
  async (params: any, { rejectWithValue }) => {
    try {
      return await getTrainerHistory(params);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to load history');
    }
  }
);

export const fetchTrainerRoster = createAsyncThunk(
  '/v1/trainer/fetchRoster',
  async (params: any, { rejectWithValue }) => {
    try {
      return await getTrainerRoster(params);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to load roster');
    }
  }
);

const trainerSlice = createSlice({
  name: 'trainer',
  initialState,
  reducers: {
    clearTrainerError: (state) => { state.error = null; },
    resetTrainerState: () => initialState,
  },
  extraReducers: (builder) => {
    // Clients
    builder
      .addCase(fetchTrainerClients.pending, (state) => { state.loading.clients = true; })
      .addCase(fetchTrainerClients.fulfilled, (state, action) => {
        state.loading.clients = false;
        state.clients = action.payload;
      })
      .addCase(fetchTrainerClients.rejected, (state, action) => {
        state.loading.clients = false;
        state.error = action.payload as string;
      });

    // Mark Attendance
    builder
      .addCase(submitMarkAttendance.pending, (state) => { state.loading.marking = true; })
      .addCase(submitMarkAttendance.fulfilled, (state) => { state.loading.marking = false; })
      .addCase(submitMarkAttendance.rejected, (state, action) => {
        state.loading.marking = false;
        state.error = action.error.message || 'Failed';
      });

    // Commission
    builder
      .addCase(fetchTrainerCommission.pending, (state) => { state.loading.commission = true; })
      .addCase(fetchTrainerCommission.fulfilled, (state, action) => {
        state.loading.commission = false;
        state.commission = action.payload;
      })
      .addCase(fetchTrainerCommission.rejected, (state, action) => {
        state.loading.commission = false;
        state.error = action.payload as string;
      });

    // History & Roster (similar pattern)
    builder
      .addCase(fetchTrainerHistory.pending, (state) => { state.loading.history = true; })
      .addCase(fetchTrainerHistory.fulfilled, (state, action) => {
        state.loading.history = false;
        state.history = action.payload;
      })
      .addCase(fetchTrainerHistory.rejected, (state, action) => {
        state.loading.history = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchTrainerRoster.pending, (state) => { state.loading.roster = true; })
      .addCase(fetchTrainerRoster.fulfilled, (state, action) => {
        state.loading.roster = false;
        state.roster = action.payload;
      })
      .addCase(fetchTrainerRoster.rejected, (state, action) => {
        state.loading.roster = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTrainerError, resetTrainerState } = trainerSlice.actions;
export default trainerSlice.reducer;
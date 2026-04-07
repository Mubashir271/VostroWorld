import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SnackbarType = 'info' | 'success' | 'error';

interface SnackbarState {
  visible: boolean;
  message: string;
  type: SnackbarType;
}

const initialState: SnackbarState = {
  visible: false,
  message: '',
  type: 'info',
};

const snackbarSlice = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    showSnackbar: (
      state,
      action: PayloadAction<{ message: string; type?: SnackbarType }>
    ) => {
      state.visible = true;
      state.message = action.payload.message;
      state.type = action.payload.type ?? 'info';
    },
    hideSnackbar: (state) => {
      state.visible = false;
      state.message = '';
      state.type = 'info';
    },
  },
});

export const { showSnackbar, hideSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;

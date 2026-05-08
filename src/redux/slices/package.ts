import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type PackageCategory = {
  code: string;
  tag: string;
};

interface PackageState {
  categories: PackageCategory[];
}

const initialState: PackageState = {
  categories: [],
};

const packageSlice = createSlice({
  name: 'packages',
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<PackageCategory[]>) => {
      state.categories = action.payload;
    },
    clearCategories: (state) => {
      state.categories = [];
    },
  },
});

export const { setCategories, clearCategories } = packageSlice.actions;
export default packageSlice.reducer;
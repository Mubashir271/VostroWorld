import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type PackageCategory = {
  code: string;
  tag: string;
};

type PackageSaleItem = {
  id: number;
  package_name: string;
  package_category: string;
  total_price: number;
  total_discount: number;
  total_net_price: number;
  order_detail: any[];
};

type PackageSummary = {
  total_price: number;
  total_discount: number;
  total_net_price: number;
};

interface PackageState {
  categories: PackageCategory[];
  packages: PackageSaleItem[];
  summary: PackageSummary;
}

const initialState: PackageState = {
  categories: [],
  packages: [],
  summary: { total_price: 0, total_discount: 0, total_net_price: 0 },
};

const packageSlice = createSlice({
  name: 'packages',
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<PackageCategory[]>) => {
      state.categories = Array.isArray(action.payload) ? action.payload : [];
    },
    clearCategories: (state) => {
      state.categories = [];
    },
    setPackages: (
      state,
      action: PayloadAction<{
        data: PackageSaleItem[];
        total_price: number;
        total_discount: number;
        total_net_price: number;
      }>,
    ) => {
      state.packages = action.payload.data;
      state.summary = {
        total_price: action.payload.total_price,
        total_discount: action.payload.total_discount,
        total_net_price: action.payload.total_net_price,
      };
    },
    clearPackages: (state) => {
      state.packages = [];
      state.summary = { total_price: 0, total_discount: 0, total_net_price: 0 };
    },
  },
});

export const { setCategories, clearCategories, setPackages, clearPackages } =
  packageSlice.actions;
export default packageSlice.reducer;

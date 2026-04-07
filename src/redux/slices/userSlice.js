import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  token: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.token = action.payload;
    },
    logoutUser: state => {
      state.token = null;
    },
  },
});

export const {setUser, logoutUser} = userSlice.actions;

export default userSlice.reducer;

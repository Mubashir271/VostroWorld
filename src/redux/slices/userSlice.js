import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: null,
  appImage: null,
  registrationData: {
    // Step 1
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    branch: '',
    dob: null,
    // Step 2
    role: '',
    dept: '',
    desg: '',
    mngr: '',
    exp: '1 Year',
    employment: 'Full-time',
    joiningDate: null,
    lang: 'English',
    // Step 3 - Credentials
    password: '',
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.token = action.payload;
    },
    logoutUser: (state) => {
      state.token = null;
      // state.registrationData = initialState.registrationData;
    },
    updateRegistrationData: (state, action) => {
      state.registrationData = {
        ...state.registrationData,
        ...action.payload,
      };
    },
    clearRegistrationData: (state) => {
      state.registrationData = initialState.registrationData;
    },
    updateAppImage: (state, action) => {
      state.appImage = action.payload;
    },
    clearAppImage: (state) => {
      state.appImage = null;
    },
  },
});

export const { setUser, logoutUser, updateRegistrationData, clearRegistrationData, updateAppImage, clearAppImage } = userSlice.actions;
export default userSlice.reducer;
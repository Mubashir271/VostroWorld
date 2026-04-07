import { configureStore } from '@reduxjs/toolkit';
import snackbarReducer from './slices/snackbarSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userReducer from './slices/userSlice'; // your existing user reducer
import { persistStore, persistReducer } from 'redux-persist';

// Persist user data
const persistConfig = { key: 'root', storage: AsyncStorage };
const persistedUserReducer = persistReducer(persistConfig, userReducer);

export const store = configureStore({
  reducer: {
    user: persistedUserReducer,
    snackbar: snackbarReducer,
  },
});

export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

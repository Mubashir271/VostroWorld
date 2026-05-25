import { configureStore } from '@reduxjs/toolkit';
import snackbarReducer from './slices/snackbarSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userReducer from './slices/userSlice'; // your existing user reducer
import packageReducer from './slices/package';
import notificationReducer from './slices/notificationSlice'
import trainerReducer from './slices/trainerSlice'
import { persistStore, persistReducer } from 'redux-persist';

// Persist user data
const persistConfig = { key: 'root', storage: AsyncStorage };
const persistedUserReducer = persistReducer(persistConfig, userReducer);

export const store = configureStore({
  reducer: {
    user: persistedUserReducer,
    snackbar: snackbarReducer,
    packages: packageReducer,
    notifications: notificationReducer,
    trainer: trainerReducer,
  },
});

export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
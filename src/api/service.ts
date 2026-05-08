// src/api/service.js
import axios from 'axios';
import { store } from '../redux/store';   // ← Import your Redux store

export const BASE_URL = 'https://api.vostro-new.com/public/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// ✅ Auto attach token from Redux
api.interceptors.request.use((config) => {
    const token = store.getState().user.token;   // Get token from Redux
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
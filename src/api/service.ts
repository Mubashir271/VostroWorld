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

api.interceptors.request.use(
  (config) => {
    const token = store.getState().user.token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 API REQUEST');
    console.log('Method :', config.method?.toUpperCase());
    console.log('URL    :', (config.baseURL ?? '') + (config.url ?? ''));
    console.log('Params :', JSON.stringify(config.params, null, 2));
    console.log('Body   :', JSON.stringify(config.data, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return config;
  },
  (error) => {
    console.log('📤❌ REQUEST ERROR:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 API RESPONSE');
    console.log('URL    :', response.config.url);
    console.log('Status :', response.status);
    console.log('Data   :', JSON.stringify(response.data, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return response;
  },
  (error) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥❌ API ERROR');
    console.log('URL    :', error.config?.url);
    console.log('Status :', error.response?.status);
    console.log('Message:', error.message);
    console.log('Data   :', JSON.stringify(error.response?.data, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return Promise.reject(error);
  }
);

export default api;
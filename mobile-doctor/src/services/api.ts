import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://aihospital.onrender.com/api';

const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('doctor_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('doctor_token');
      await SecureStore.deleteItemAsync('doctor_user');
    }
    return Promise.reject(error);
  }
);

export default api;

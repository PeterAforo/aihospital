import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '../store';
import { logout, setCredentials } from '../store/slices/authSlice';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token refresh mutex — prevents multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another refresh is in progress — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = store.getState().auth.refreshToken;

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { user, tokens } = response.data.data;
          store.dispatch(setCredentials({ user, tokens }));

          processQueue(null, tokens.accessToken);

          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          store.dispatch(logout());
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        processQueue(new Error('No refresh token'), null);
        isRefreshing = false;
        store.dispatch(logout());
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

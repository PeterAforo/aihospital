import api from './api';

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
}

export interface RegisterRequest {
  tenantId: string;
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export const authService = {
  login: async (data: LoginRequest) => {
    const response = await api.post('/auth/login', data);
    return response;
  },

  register: async (data: RegisterRequest) => {
    const response = await api.post('/auth/register', data);
    return response;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response;
  },

  getProfile: async () => {
    const response = await api.get('/users/me');
    return response;
  },
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { doctorService } from '../services/doctor.service';

interface DoctorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tenantId: string;
  branchId?: string;
}

interface AuthContextType {
  user: DoctorUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DoctorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('doctor_token');
      const stored = await SecureStore.getItemAsync('doctor_user');
      if (token && stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    const result = await doctorService.login(email, password);
    const token = result.accessToken || result.token;
    const userData: DoctorUser = {
      id: result.user?.id,
      firstName: result.user?.firstName,
      lastName: result.user?.lastName,
      email: result.user?.email,
      role: result.user?.role,
      tenantId: result.user?.tenantId,
      branchId: result.user?.branchId,
    };
    await SecureStore.setItemAsync('doctor_token', token);
    await SecureStore.setItemAsync('doctor_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('doctor_token');
    await SecureStore.deleteItemAsync('doctor_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

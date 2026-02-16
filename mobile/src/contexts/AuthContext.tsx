import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { portalService } from '../services/portal.service';

interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  photoUrl?: string;
}

interface AuthContextType {
  patient: PatientInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tenantId: string, identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  patient: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('portal_token');
      const stored = await SecureStore.getItemAsync('portal_patient');
      if (token && stored) {
        setPatient(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  };

  const login = async (tenantId: string, identifier: string, password: string) => {
    const result = await portalService.login(tenantId, identifier, password);
    await SecureStore.setItemAsync('portal_token', result.accessToken);
    await SecureStore.setItemAsync('portal_patient', JSON.stringify(result.patient));
    setPatient(result.patient);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('portal_token');
    await SecureStore.deleteItemAsync('portal_patient');
    setPatient(null);
  };

  return (
    <AuthContext.Provider value={{ patient, isLoading, isAuthenticated: !!patient, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
  tenant: {
    id: string;
    name: string;
    subdomain: string;
  };
}

interface Branch {
  id: string;
  name: string;
  isMainBranch: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentBranchId: string | null;
  branches: Branch[];
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  currentBranchId: localStorage.getItem('currentBranchId'),
  branches: [],
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        tokens: { accessToken: string; refreshToken: string };
      }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.tokens.accessToken);
      localStorage.setItem('refreshToken', action.payload.tokens.refreshToken);
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.currentBranchId = null;
      state.branches = [];
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentBranchId');
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setBranches: (state, action: PayloadAction<Branch[]>) => {
      state.branches = action.payload;
      if (!state.currentBranchId && action.payload.length > 0) {
        const main = action.payload.find(b => b.isMainBranch);
        state.currentBranchId = main?.id || action.payload[0].id;
        localStorage.setItem('currentBranchId', state.currentBranchId);
      }
    },
    setCurrentBranch: (state, action: PayloadAction<string>) => {
      state.currentBranchId = action.payload;
      localStorage.setItem('currentBranchId', action.payload);
    },
  },
});

export const { setCredentials, setUser, logout, setLoading, setBranches, setCurrentBranch } = authSlice.actions;
export default authSlice.reducer;

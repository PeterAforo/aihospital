import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setUser, logout } from '@/store/slices/authSlice';
import api from '@/services/api';

export function AuthRestorer({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [isRestoring, setIsRestoring] = useState(!user && !!accessToken);

  useEffect(() => {
    if (!user && accessToken) {
      api.get('/auth/me')
        .then((res) => {
          const userData = res.data?.data;
          if (userData) {
            dispatch(setUser(userData));
          } else {
            dispatch(logout());
          }
        })
        .catch(() => {
          dispatch(logout());
        })
        .finally(() => {
          setIsRestoring(false);
        });
    }
  }, [user, accessToken, dispatch]);

  if (isRestoring) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', backgroundColor: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #e5e7eb',
            borderTopColor: '#2563eb', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

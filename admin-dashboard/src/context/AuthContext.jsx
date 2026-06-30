import { createContext, useContext, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sos_admin_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('sos_admin_user');
    return raw ? JSON.parse(raw) : null;
  });

  const requestOtp = useCallback(async (phone) => {
    try {
      const { data } = await api.post('/auth/otp/request', { phone, purpose: 'LOGIN' });
      return { ok: true, debugOtp: data.debugOtp };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err) };
    }
  }, []);

  const verifyOtp = useCallback(async (phone, code) => {
    try {
      const { data } = await api.post('/auth/otp/verify', { phone, code, purpose: 'LOGIN' });
      if (data.user.role !== 'ADMIN' && data.user.role !== 'SUPPORT') {
        return { ok: false, error: 'This console is for admin and support team accounts only.' };
      }
      localStorage.setItem('sos_admin_token', data.token);
      localStorage.setItem('sos_admin_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err) };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sos_admin_token');
    localStorage.removeItem('sos_admin_user');
    setToken(null);
    setUser(null);
  }, []);

  const isSuperAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ token, user, requestOtp, verifyOtp, logout, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, apiErrorMessage, setAuthToken } from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';
import { registerForPushNotificationsAsync } from '../utils/registerPush';

const AuthContext = createContext(null);

function syncPushToken() {
  // Fire-and-forget: never block login/session-restore on push permission
  // prompts or a slow/failed token fetch.
  registerForPushNotificationsAsync()
    .then((pushToken) => {
      if (pushToken) return api.patch('/users/me', { fcmToken: pushToken });
    })
    .catch(() => {});
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/partners/me');
      setProfile(data.profile);
      await AsyncStorage.setItem('sos_partner_profile', JSON.stringify(data.profile));
      return data.profile;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [storedToken, storedUser, storedProfile] = await Promise.all([
        AsyncStorage.getItem('sos_partner_token'),
        AsyncStorage.getItem('sos_partner_user'),
        AsyncStorage.getItem('sos_partner_profile'),
      ]);
      if (storedToken) {
        setAuthToken(storedToken);
        setToken(storedToken);
        setUser(storedUser ? JSON.parse(storedUser) : null);
        setProfile(storedProfile ? JSON.parse(storedProfile) : null);
        connectSocket(storedToken);
        refreshProfile();
        syncPushToken();
      }
      setBootstrapping(false);
    })();
  }, [refreshProfile]);

  const requestOtp = useCallback(async (phone, purpose, role) => {
    try {
      const { data } = await api.post('/auth/otp/request', { phone, purpose, role });
      return { ok: true, debugOtp: data.debugOtp };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err) };
    }
  }, []);

  const verifyOtp = useCallback(async (phone, code, purpose, extra = {}) => {
    try {
      const { data } = await api.post('/auth/otp/verify', { phone, code, purpose, ...extra });
      if (data.user.role !== 'PARTNER') {
        return { ok: false, error: 'This app is for service partner accounts. Please use the customer app instead.' };
      }
      await AsyncStorage.setItem('sos_partner_token', data.token);
      await AsyncStorage.setItem('sos_partner_user', JSON.stringify(data.user));
      await AsyncStorage.setItem('sos_partner_profile', JSON.stringify(data.partnerProfile || {}));
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
      setProfile(data.partnerProfile || {});
      connectSocket(data.token);
      syncPushToken();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err) };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['sos_partner_token', 'sos_partner_user', 'sos_partner_profile']);
    setAuthToken(null);
    disconnectSocket();
    setToken(null);
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, profile, bootstrapping, requestOtp, verifyOtp, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

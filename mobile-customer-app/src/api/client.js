import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Falls back to localhost for the Expo Go simulator/web preview. On a real
// device, set EXPO_PUBLIC_API_URL (or edit app.json's extra.apiUrl) to your
// machine's LAN IP, e.g. http://192.168.1.50:4000, since "localhost" on a
// physical phone means the phone itself, not your dev machine.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://localhost:4000';

export const api = axios.create({ baseURL: `${API_URL}/api` });

let cachedToken = null;

export function setAuthToken(token) {
  cachedToken = token;
}

api.interceptors.request.use(async (config) => {
  const token = cachedToken ?? (await AsyncStorage.getItem('sos_token'));
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.';
}

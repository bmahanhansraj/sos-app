import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://localhost:4000';

export const api = axios.create({ baseURL: `${API_URL}/api` });

let cachedToken = null;

export function setAuthToken(token) {
  cachedToken = token;
}

api.interceptors.request.use(async (config) => {
  const token = cachedToken ?? (await AsyncStorage.getItem('sos_partner_token'));
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.';
}

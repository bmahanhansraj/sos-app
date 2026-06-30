import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Where the "Login" button sends staff/agency users who already have portal
// access. This is intentionally a separate deployed app (the admin
// dashboard), not a login form embedded in the marketing site -- see
// DEPLOYMENT.md for the recommended subdomain layout.
export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
});

export function apiErrorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Something went wrong';
}

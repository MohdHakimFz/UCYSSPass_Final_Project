// Keeps track of who is logged in.
// The token lives in localStorage (see api.js); the user object lives in memory
// here and is re-fetched from GET /auth/me every time the page loads.

import { api, getToken, setToken, clearToken } from './api.js';

let currentUser = null;

export function getUser() {
  return currentUser;
}

export function clearUser() {
  currentUser = null;
}

// Each role has its own start page.
export function homeFor(role) {
  if (role === 'admin') return '/admin';
  if (role === 'organiser') return '/organiser';
  return '/events';
}

export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password });
  setToken(data.token);
  currentUser = data.user;
  return currentUser;
}

// Registering always creates a customer and logs them in straight away.
export async function register(fields) {
  const data = await api.post('/auth/register', fields);
  setToken(data.token);
  currentUser = data.user;
  return currentUser;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Even if the server cannot be reached we still log out on this device.
  }
  clearToken();
  currentUser = null;
}

// Called once when the page loads. If a token was saved earlier, ask the API
// who it belongs to. A dead token gives a 401, which api.js already handles.
export async function restoreSession() {
  if (!getToken()) return null;
  currentUser = await api.get('/auth/me');
  return currentUser;
}

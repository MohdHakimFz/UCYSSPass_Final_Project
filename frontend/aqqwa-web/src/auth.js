// The logged-in user, shared by every page.
// Login, register, logout and "restore the session on page load" live here.

import { reactive } from 'vue'
import { api, getToken, setToken, clearToken } from './api'

export const auth = reactive({
  user: null, // { id, name, email, role } or null when logged out
})

// Where each role lands after logging in.
export function homeFor(role) {
  if (role === 'admin') return '/admin'
  if (role === 'organiser') return '/organiser'
  return '/events'
}

export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password })
  setToken(data.token)
  auth.user = data.user
  return data.user
}

export async function register(form) {
  const data = await api.post('/auth/register', form)
  setToken(data.token)
  auth.user = data.user
  return data.user
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch {
    // Even if the server call fails, the user is logged out on this browser.
  }
  clearToken()
  auth.user = null
}

// Called once in main.js before the router starts:
// if a token is saved, ask the API who it belongs to.
export async function restoreSession() {
  if (!getToken()) return
  try {
    auth.user = await api.get('/auth/me')
  } catch (err) {
    // 401 means the token is no longer valid; any other error (e.g. offline)
    // keeps the token so a refresh can try again.
    if (err.status === 401) clearToken()
    auth.user = null
  }
}

// Called when any logged-in request gets a 401.
export function forgetUser() {
  clearToken()
  auth.user = null
}

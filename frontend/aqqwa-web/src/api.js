// The one place where the app talks to the UCYSSPass API.
// Every request goes through request() below, so the base URL, headers,
// bearer token, timeout and error format are handled the same way everywhere.

import { reactive } from 'vue'

const DEFAULT_API_URL = 'https://ucyss-api.onrender.com'

// Base URL comes from the VITE_API_URL env variable (see .env.example).
// The server address can be given with or without /api; all routes live under /api.
function apiBase(url) {
  const trimmed = url.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : trimmed + '/api'
}
export const BASE_URL = apiBase(import.meta.env.VITE_API_URL || DEFAULT_API_URL)

const TOKEN_KEY = 'aqqwa_token'
const TIMEOUT_MS = 60000 // give up after 60 seconds
const SLOW_MS = 4000 // after 4 seconds, show "Waking up the server"

// ---------- token storage ----------

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // storage blocked (private mode): the session just will not survive a refresh
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // nothing to clear
  }
}

// ---------- shared state the UI can watch ----------

// slowCount > 0 means at least one request has been running for more than 4 seconds.
export const apiState = reactive({ slowCount: 0 })

// The router registers this in step 2 so a 401 on a logged-in request
// sends the user to the login page.
let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

// ---------- error messages ----------

const MESSAGES = {
  0: 'Cannot reach the server. Please check your internet connection.',
  timeout: 'The server took too long to respond. Please try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You are not allowed to do this.',
  404: 'We could not find what you were looking for. It may have been removed.',
  409: 'This conflicts with existing data. Please refresh and try again.',
  422: 'Please fix the highlighted fields.',
  429: 'Too many attempts. Please wait a minute and try again.',
  500: 'The server had a problem. Please try again in a moment.',
}

// Every error the app sees has this exact shape: { status, message, errors }.
// status 0 = offline or timeout; errors = { field: ['message', ...] } for 422.
function makeError(status, message, errors = {}) {
  return { status, message, errors }
}

function errorFromResponse(status, body) {
  const apiMessage = body && typeof body.message === 'string' ? body.message : ''

  if (status === 422) {
    return makeError(422, MESSAGES[422], (body && body.errors) || {})
  }
  if (status === 403) {
    return makeError(403, MESSAGES[403])
  }
  if (status === 409) {
    // The API explains conflicts well (e.g. "venue in use"), so prefer its text.
    return makeError(409, apiMessage || MESSAGES[409])
  }
  if (status >= 500) {
    return makeError(status, MESSAGES[500])
  }
  return makeError(status, MESSAGES[status] || apiMessage || 'Something went wrong. Please try again.')
}

// ---------- the request function ----------

function buildUrl(path, params) {
  const url = BASE_URL + (path.startsWith('/') ? path : '/' + path)
  if (!params) return url
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.append(key, value)
  }
  const text = query.toString()
  return text ? url + '?' + text : url
}

export async function request(method, path, { body, params } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if (token) headers.Authorization = 'Bearer ' + token

  const controller = new AbortController()
  let timedOut = false
  let isSlow = false

  const timeoutTimer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, TIMEOUT_MS)
  const slowTimer = setTimeout(() => {
    isSlow = true
    apiState.slowCount++
  }, SLOW_MS)

  let response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch {
    throw makeError(0, timedOut ? MESSAGES.timeout : MESSAGES[0])
  } finally {
    clearTimeout(timeoutTimer)
    clearTimeout(slowTimer)
    if (isSlow) apiState.slowCount--
  }

  // Read the body as JSON; if the server sent something else, treat it as empty.
  let data = null
  if (response.status !== 204) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  }

  if (response.ok) return data

  // A logged-in request was rejected: the token is no longer valid.
  if (response.status === 401 && token) {
    clearToken()
    if (onUnauthorized) onUnauthorized()
  }

  throw errorFromResponse(response.status, data)
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body = {}) => request('POST', path, { body }),
  put: (path, body = {}) => request('PUT', path, { body }),
  del: (path) => request('DELETE', path),
}

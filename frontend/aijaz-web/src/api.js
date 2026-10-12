// The one place that talks to the UCYSSPass API.
// Every page calls api.get / api.post / api.put / api.del from here, so the
// base URL, the headers, the token and the error handling live in a single file.

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'aijaz_token';

// Render's free tier sleeps when idle, so the first request can take ~45 s.
const TIMEOUT_MS = 60000;
// After this long we tell the user the server is probably waking up.
const SLOW_AFTER_MS = 4000;

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Every failed request is thrown as an ApiError, so pages only handle one shape:
//   status  - HTTP status code (0 = no response at all: offline or timeout)
//   message - a sentence that is safe to show to the user
//   errors  - 422 field errors, e.g. { email: ["The email field is required."] }
export class ApiError extends Error {
  constructor(status, message, errors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// Hooks that main.js fills in, so this file does not need to know about the UI.
let onUnauthorized = () => {};
let onSlow = () => {};
// How many requests are slow right now, so the banner only hides when all are done.
let slowCount = 0;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export function setSlowHandler(fn) {
  onSlow = fn;
}

// Picks the sentence we show for each kind of failure.
function messageFor(status, serverMessage) {
  switch (status) {
    case 401:
      return serverMessage || 'Please log in to continue.';
    case 403:
      return 'You are not allowed to do this.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return serverMessage || 'That conflicts with something that already exists.';
    case 422:
      return serverMessage || 'Please check the highlighted fields.';
    case 429:
      return 'Too many requests. Please wait a minute and try again.';
    default:
      return status >= 500
        ? 'The server had a problem. Please try again in a moment.'
        : serverMessage || 'Something went wrong. Please try again.';
  }
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  // AbortController lets us cancel the request ourselves when it takes too long.
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let wasSlow = false;
  const slowTimer = setTimeout(() => {
    wasSlow = true;
    slowCount += 1;
    onSlow(true);
  }, SLOW_AFTER_MS);

  let response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    // fetch only rejects when there was no response: offline, DNS, CORS or our timeout.
    throw new ApiError(0, "Can't reach the server, it may be waking up, try again in a moment.");
  } finally {
    clearTimeout(timeoutTimer);
    clearTimeout(slowTimer);
    if (wasSlow) {
      slowCount -= 1;
      if (slowCount === 0) onSlow(false);
    }
  }

  // Some responses (e.g. a delete) have no body, and an error page may not be JSON.
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.ok) return data;

  // A 401 on a request that carried a token means the token is dead: log out.
  // (A 401 without a token is just a wrong password on the login form.)
  if (response.status === 401 && token) {
    clearToken();
    onUnauthorized();
  }

  throw new ApiError(
    response.status,
    messageFor(response.status, data?.message),
    data?.errors || {},
  );
}

// Turns { search: 'ctf', category: '' } into "?search=ctf", skipping empty values.
function toQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const api = {
  get: (path, params) => request('GET', path + toQuery(params)),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
};

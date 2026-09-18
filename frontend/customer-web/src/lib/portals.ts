import { tokenStore, type User } from './api'

// Where each role's own app lives. Set these per environment; the defaults suit local development.
export const ORGANISER_URL = import.meta.env.VITE_ORGANISER_URL ?? 'http://localhost:5174'
export const ADMIN_URL = import.meta.env.VITE_ADMIN_URL ?? 'http://localhost:3000'

/**
 * The address a signed-in person should land on. Customers stay on this site (null).
 * Organisers and admins are handed their session token in the URL fragment, which the browser
 * never sends to any server; their app stores it and removes it from the address bar at once.
 */
export function portalFor(user: User): { label: string; url: string } | null {
  const token = tokenStore.get()
  if (!token || user.role === 'customer') return null
  const base = user.role === 'admin' ? ADMIN_URL : ORGANISER_URL
  return {
    label: user.role === 'admin' ? 'Admin dashboard' : 'Organiser portal',
    url: `${base}/auth/callback#token=${encodeURIComponent(token)}`,
  }
}

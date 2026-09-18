import { expect, type Page } from '@playwright/test'

const API = process.env.E2E_API_URL ?? 'http://localhost/api'
const PASSWORD = 'password'

export const ADMIN = { email: 'admin@sentrypass.test', password: PASSWORD }
export const SEEDED_CUSTOMER = { email: 'customer@sentrypass.test', password: PASSWORD }

type Json = Record<string, any>

/** Talks to the API directly, for building and tearing down test data. */
export async function api<T = Json>(path: string, opts: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = (await res.json().catch(() => ({}))) as T
  if (!res.ok) throw new Error(`${opts.method ?? 'GET'} ${path} failed with ${res.status}: ${JSON.stringify(data)}`)
  return data
}

export async function tokenFor(email: string, password = PASSWORD): Promise<string> {
  const res = await api<{ token: string }>('/auth/login', { method: 'POST', body: { email, password } })
  return res.token
}

let counter = 0
export const unique = (label: string) => `${label}-${Date.now().toString(36)}${counter++}`

/** A throwaway account of any role, created by the admin. Delete it with removeUser when done. */
export async function createUser(role: 'organiser' | 'customer', adminToken: string) {
  const email = `${unique(role)}@e2e.test`
  const user = await api<{ id: number }>('/users', {
    method: 'POST',
    token: adminToken,
    body: { name: `E2E ${role}`, email, password: PASSWORD, role },
  })
  return { id: user.id, email, password: PASSWORD }
}

export const removeUser = (id: number, adminToken: string) => api(`/users/${id}`, { method: 'DELETE', token: adminToken }).catch(() => undefined)

/** Signs in through the one shared login page. */
export async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password').fill(who.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export async function expectPath(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}(\\?.*)?$`))
}

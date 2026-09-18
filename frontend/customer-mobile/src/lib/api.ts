import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

// "localhost" on a phone is the phone itself, so the API address has to be worked out:
//  1. EXPO_PUBLIC_API_URL wins if it is set (use it for a deployed API).
//  2. Otherwise use the computer that is serving the app to Expo Go: it is the same machine that runs the API,
//     and Expo already knows its LAN address (for example 192.168.1.20).
//  3. Android emulators reach the host machine at 10.0.2.2; the web build and iOS simulator use localhost.
function devMachine(): string | null {
  const hostUri = Constants.expoConfig?.hostUri
  const host = hostUri?.split(':')[0]
  return host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? host : null
}

function defaultBase(): string {
  if (Platform.OS === 'web') return 'http://localhost/api'
  const host = devMachine()
  if (host) return `http://${host}/api`
  return Platform.OS === 'android' ? 'http://10.0.2.2/api' : 'http://localhost/api'
}

export const BASE = process.env.EXPO_PUBLIC_API_URL ?? defaultBase()

// A dead connection should fail in seconds with a clear message, not hang.
const TIMEOUT_MS = 10000
function timeoutSignal(): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), TIMEOUT_MS)
  return controller.signal
}

const TOKEN_KEY = 'sentrypass_customer_token'
let cachedToken: string | null = null

export const tokenStore = {
  async load() {
    cachedToken =
      Platform.OS === 'web' ? window.localStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY)
    return cachedToken
  },
  async set(t: string) {
    cachedToken = t
    if (Platform.OS === 'web') window.localStorage.setItem(TOKEN_KEY, t)
    else await SecureStore.setItemAsync(TOKEN_KEY, t)
  },
  async clear() {
    cachedToken = null
    if (Platform.OS === 'web') window.localStorage.removeItem(TOKEN_KEY)
    else await SecureStore.deleteItemAsync(TOKEN_KEY)
  },
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>
  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

let onUnauthorised: (() => void) | null = null
export const setUnauthorisedHandler = (fn: () => void) => {
  onUnauthorised = fn
}

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: timeoutSignal(),
  })

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))

  if (res.status === 401 && cachedToken && !path.startsWith('/auth/')) {
    await tokenStore.clear()
    onUnauthorised?.()
  }
  if (!res.ok) throw new ApiError(data.message ?? 'Something went wrong.', res.status, data.errors)
  return data as T
}

export function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const first = err.errors ? Object.values(err.errors)[0]?.[0] : undefined
    return first ?? err.message
  }
  return `Can't reach the server at ${BASE}. Check that the API is running and that your phone is on the same Wi-Fi as your computer.`
}

// The QR image sits behind auth, so fetch it with the token and hand back a data URI.
export async function fetchQrDataUri(bookingId: number): Promise<string> {
  const res = await fetch(`${BASE}/bookings/${bookingId}/qr-code`, {
    headers: cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {},
    signal: timeoutSignal(),
  })
  if (!res.ok) throw new ApiError('Could not load your pass.', res.status)
  const bytes = new Uint8Array(await res.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:image/png;base64,${btoa(binary)}`
}

export type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number }
export type User = { id: number; name: string; email: string; role: 'admin' | 'organiser' | 'customer' }
export type Category = 'ctf' | 'bootcamp' | 'conference' | 'workshop'
export const CATEGORY_LABEL: Record<Category, string> = {
  ctf: 'CTF',
  bootcamp: 'Bootcamp',
  conference: 'Conference',
  workshop: 'Workshop',
}

export type TicketType = { id: number; event_id: number; name: string; price: string; capacity: number; seats_remaining: number }

export type EventItem = {
  id: number
  title: string
  description: string | null
  category: Category
  start_at: string
  end_at: string
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  venue?: { id: number; name: string }
  from_price?: string | null
  seats_remaining?: number | null
  capacity?: number | null
  ticket_types?: TicketType[]
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'waitlisted' | 'attended'

export type Booking = {
  id: number
  status: BookingStatus
  booked_at: string
  checked_in_at: string | null
  qr_token: string | null
  waitlist_position?: number
  ticket_type?: {
    id: number
    name: string
    price: string
    event?: { id: number; title: string; category: Category; start_at: string; end_at: string; venue?: { id: number; name: string } }
  }
}

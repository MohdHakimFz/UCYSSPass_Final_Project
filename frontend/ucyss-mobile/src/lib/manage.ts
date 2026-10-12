import { askConfirm } from '../components/ConfirmDialog'
import { api, ApiError, errorText, type Booking, type EventItem } from './api'

// Shapes the organiser and admin screens read from the API.

export type Venue = { id: number; name: string; address: string; capacity: number }

export type ManagedUser = { id: number; name: string; email: string; role: 'admin' | 'organiser' | 'customer'; is_member?: boolean; created_at?: string }

/** An event as its organiser (or an admin) sees it: the meeting link and the owner are included. */
export type OrgEvent = EventItem & { organiser_id: number; venue_id: number | null; meeting_url?: string | null }

/** A booking as an organiser or admin sees it: it also says who booked. */
export type OrgBooking = Booking & { customer?: { id: number; name: string; email: string } }

export type OrganiserSummary = {
  events: number
  published: number
  drafts: number
  upcoming: number
  tickets_sold: number
  checked_in: number
  waitlisted: number
  awaiting_payment: number
  revenue: { gross: number; refunded: number; net: number }
}

export type AdminStats = {
  revenue: { gross: number; refunded: number; net: number; payments: number }
  pending_holds: number
  draft_events: number
  users_by_role: Record<string, number>
  events_by_status: Record<string, number>
  bookings_by_status: Record<string, number>
  recent_activity: { id: number; customer: string | null; event: string | null; tier: string | null; status: string; at: string }[]
}

/** The shared "Online" venue belongs to online events; it is not a place you can pick or edit. */
export const ONLINE_VENUE = 'Online'

/**
 * The message shown for a failed request on the organiser and admin screens.
 * 403 and 429 get fixed, plain wording; everything else (409, 404, network, cold start) keeps the app's usual text.
 */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'You are not allowed to do this.'
    if (err.status === 429) return 'Too many tries. Please wait a minute and try again.'
    if (err.status === 422) return err.message && !err.errors ? err.message : 'Please fix the fields marked in red.'
  }
  return errorText(err)
}

/** For a 422: the first message for each field, so each one can sit under its own input. Empty for any other error. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || err.status !== 422 || !err.errors) return {}
  const out: Record<string, string> = {}
  for (const [field, messages] of Object.entries(err.errors)) if (messages[0]) out[field] = messages[0]
  return out
}

/** Ask before something that cannot be undone, in the app's own dialog (components/ConfirmDialog.tsx). */
export function confirm(title: string, message: string, action: string, onYes: () => void) {
  askConfirm({ title, message, confirmLabel: action, cancelLabel: 'Keep it', tone: 'danger', onConfirm: onYes })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** An ISO date from the API, written as "YYYY-MM-DD HH:mm" in the phone's own time zone, for a text field. */
export function toInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "YYYY-MM-DD HH:mm" typed by the user, read as local time and turned into ISO for the API. Null if it is not a real date. */
export function fromInput(text: string): string | null {
  const m = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/)
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number)
  const date = new Date(y, mo - 1, d, h, mi)
  // new Date quietly rolls 31 Feb over to March; a date that changed on the way in was not a real one.
  if (date.getMonth() !== mo - 1 || date.getDate() !== d || h > 23 || mi > 59) return null
  return date.toISOString()
}

export const money = (n: number | string) => `RM ${Number(n).toFixed(2)}`

/** Newest first, sorted here because the API always returns events oldest first. */
export const latestFirst = <T extends { start_at: string }>(list: T[] | undefined) =>
  [...(list ?? [])].sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())

/**
 * The seeded demo accounts every group member signs in with for their videos. The database is shared and live,
 * so the app will not delete them or change their role, even for an admin.
 */
export const DEMO_EMAILS = ['admin@sentrypass.test', 'aisyah@ucyss.test', 'farid@ucyss.test', 'customer@sentrypass.test']
export const isDemoAccount = (email: string) => DEMO_EMAILS.includes(email.trim().toLowerCase())

/**
 * Check a guest in: POST /bookings/{id}/checkin with the pass's signed qr_token.
 * The API answers 409 if the booking is not confirmed (already checked in, cancelled...), 422 for a forged token,
 * and 403 if the event belongs to another organiser.
 */
export async function checkIn(bookingId: number, qrToken: string) {
  return api<Booking>(`/bookings/${bookingId}/checkin`, { method: 'POST', body: { qr_token: qrToken } })
}

/** What a UCYSS pass QR code holds: {"booking_id": 12, "qr_token": "..."}. Null for any other QR code. */
export function readPass(data: string): { booking_id: number; qr_token: string } | null {
  try {
    const parsed = JSON.parse(data)
    if (typeof parsed?.booking_id === 'number' && typeof parsed?.qr_token === 'string') return parsed
  } catch {
    /* not JSON, so not one of our passes */
  }
  return null
}

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost/api'
const TOKEN_KEY = 'sentrypass_token'

export const tokenStore = {
  get: () => window.localStorage.getItem(TOKEN_KEY),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
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

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = tokenStore.get()
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))

  if (res.status === 401 && token && !path.startsWith('/auth/')) {
    tokenStore.clear()
    window.location.assign('/login')
  }
  if (!res.ok) throw new ApiError(data.message ?? 'Something went wrong.', res.status, data.errors)
  return data as T
}

export function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const first = err.errors ? Object.values(err.errors)[0]?.[0] : undefined
    return first ?? err.message
  }
  return "Can't reach the server. Check that the API is running."
}

export type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number }
export type Role = 'admin' | 'organiser' | 'customer'
export type User = { id: number; name: string; email: string; role: Role; is_member?: boolean; created_at: string }
export type Venue = { id: number; name: string; address: string; capacity: number }
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export type Category = 'ctf' | 'bootcamp' | 'conference' | 'workshop'
export type EventMode = 'physical' | 'online'
export type MeetingPlatform = 'zoom' | 'meet' | 'teams' | 'webex' | 'discord' | 'whatsapp' | 'telegram' | 'other'

export type TicketType = {
  id: number
  event_id: number
  name: string
  price: string
  capacity: number
  seats_per_row?: number
  /** Only a UCYSS member can book this tier. */
  members_only?: boolean
  seats_remaining: number
}

export type SeatInfo = { id: number; row: string; number: number; label: string; taken: boolean }

export type EventItem = {
  id: number
  venue_id: number
  organiser_id: number
  title: string
  description: string | null
  category: Category
  start_at: string
  end_at: string
  status: EventStatus
  mode?: EventMode
  /** Only sent to the organiser, admins and confirmed guests. */
  meeting_url?: string | null
  meeting_platform?: MeetingPlatform | null
  seated?: boolean
  venue?: { id: number; name: string; address?: string }
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
  hold_expires_at?: string | null
  hold_seconds_left?: number | null
  payment?: { id: number; amount: string; method: 'card' | 'fpx' | 'ewallet'; status: 'paid' | 'failed' | 'refunded'; reference: string | null; paid_at: string | null; refunded_at: string | null; refunded_amount: string } | null
  refund?: { refunded: boolean; amount: string } | null
  seat?: { id: number; row_label: string; number: number; label: string } | null
  customer?: { id: number; name: string; email: string }
  waitlist_position?: number
  /** For a confirmed guest of an online event. The link itself is only given by the join call. */
  meeting?: { platform: MeetingPlatform | null; opens_at: string; ends_at: string; open: boolean } | null
  ticket_type?: {
    id: number
    name: string
    price: string
    event?: {
      id: number
      title: string
      category: Category
      mode?: EventMode
      start_at: string
      end_at: string
      venue?: { id: number; name: string; address?: string }
    }
  }
}

// The QR image sits behind auth, so it can't be a plain <img src>: fetch it with the token and show a blob URL.
export async function apiBlobUrl(path: string): Promise<string> {
  const token = tokenStore.get()
  const res = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new ApiError('Could not load your pass.', res.status)
  return URL.createObjectURL(await res.blob())
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = tokenStore.get()
  const res = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new ApiError("Couldn't create the export.", res.status)
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export type EventDetail = EventItem

export type NotificationRow = {
  id: number
  type: 'confirmation' | 'waitlist_promoted' | 'cancelled' | 'reminder' | 'announcement'
  sent_at: string | null
  provider_response: { status: number | string; body?: unknown; reason?: string } | null
  booking?: {
    customer?: { name: string; email: string }
    ticket_type?: { name: string; event?: { id: number; title: string } }
  }
}

export type AnnouncementRow = { id: number; subject: string; message: string; recipients: number; created_at: string; sender?: { id: number; name: string } | null }

/** What an organiser sent to an event's guests before, and how many people a new message would reach now. */
export type AnnouncementList = { audience: number; data: AnnouncementRow[] }

export type SeatMapSeat = {
  id: number
  row: string
  number: number
  label: string
  state: 'free' | 'held' | 'booked' | 'attended'
  guest: { booking_id: number; name: string | null; email: string | null; checked_in_at: string | null } | null
}

/** The room as an organiser sees it, with who holds each seat. */
export type SeatMap = { seated: boolean; tiers: { id: number; name: string; capacity: number; seats: SeatMapSeat[] }[] }

export type EventStats = {
  revenue: Money
  pending_holds: number
  capacity: number
  seats_remaining: number
  held: number
  confirmed: number
  attended: number
  waitlisted: number
  cancelled: number
  fill_rate: number
  check_in_rate: number
  no_show: number
  event_ended: boolean
  tiers: { id: number; name: string; capacity: number; seats_remaining: number; waitlisted: number }[]
  recent_checkins: { booking_id: number; name: string | null; tier: string | null; checked_in_at: string }[]
}

export type Money = { gross: number; refunded: number; net: number }

export type Stats = {
  revenue: Money & { payments: number }
  revenue_per_day: { day: string; total: number }[]
  pending_holds: number
  draft_events: number
  recent_activity: { id: number; customer: string | null; event: string | null; event_id: number | null; tier: string | null; status: BookingStatus; at: string }[]
  users_by_role: Partial<Record<Role, number>>
  events_by_status: Partial<Record<EventStatus, number>>
  events_by_category: Record<string, number>
  bookings_by_status: Partial<Record<BookingStatus, number>>
  bookings_per_day: { day: string; total: number }[]
  seat_manifest: {
    id: number
    title: string
    category: string
    start_at: string
    venue: string | null
    capacity: number
    seats_remaining: number
    confirmed: number
    attended: number
    waitlisted: number
  }[]
}

export type OrganiserSummary = {
  events: number
  published: number
  drafts: number
  upcoming: number
  tickets_sold: number
  checked_in: number
  waitlisted: number
  awaiting_payment: number
  revenue: Money
}

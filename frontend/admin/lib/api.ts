const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api";
const TOKEN_KEY = "sentrypass_admin_token";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token && !path.startsWith("/auth/")) {
    tokenStore.clear();
    window.location.assign("/login");
  }

  if (!res.ok) {
    throw new ApiError(data.message ?? "Something went wrong.", res.status, data.errors);
  }

  return data as T;
}

// CSV exports sit behind auth, so fetch with the token and save the blob as a file.
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new ApiError("Couldn't create the export.", res.status);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const first = err.errors ? Object.values(err.errors)[0]?.[0] : undefined;
    return first ?? err.message;
  }
  return "Can't reach the server. Check that the API is running.";
}

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

export type Role = "admin" | "organiser" | "customer";

export type User = { id: number; name: string; email: string; role: Role; created_at: string };

export type Venue = { id: number; name: string; address: string; capacity: number };

export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export type EventItem = {
  id: number;
  venue_id: number;
  organiser_id: number;
  title: string;
  category: "ctf" | "bootcamp" | "conference" | "workshop";
  start_at: string;
  end_at: string;
  status: EventStatus;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "waitlisted" | "attended";

export type Booking = {
  id: number;
  status: BookingStatus;
  booked_at: string;
  checked_in_at: string | null;
  customer?: { id: number; name: string; email: string };
  ticket_type?: { id: number; name: string; event?: { id: number; title: string } };
};

export type NotificationRow = {
  id: number;
  type: "confirmation" | "waitlist_promoted" | "cancelled";
  sent_at: string | null;
  provider_response: { status: number | string; body?: unknown; reason?: string } | null;
  booking?: {
    customer?: { name: string; email: string };
    ticket_type?: { name: string; event?: { id: number; title: string } };
  };
};

export type EventStats = {
  capacity: number;
  seats_remaining: number;
  held: number;
  confirmed: number;
  attended: number;
  waitlisted: number;
  cancelled: number;
  fill_rate: number;
  check_in_rate: number;
  no_show: number;
  event_ended: boolean;
  tiers: { id: number; name: string; capacity: number; seats_remaining: number; waitlisted: number }[];
  recent_checkins: { booking_id: number; name: string | null; tier: string | null; checked_in_at: string }[];
};

export type EventDetail = EventItem & {
  description: string | null;
  venue?: { id: number; name: string; address?: string };
  ticket_types?: { id: number; name: string; price: string; capacity: number; seats_remaining: number }[];
};

export type Stats = {
  users_by_role: Partial<Record<Role, number>>;
  events_by_status: Partial<Record<EventStatus, number>>;
  events_by_category: Record<string, number>;
  bookings_by_status: Partial<Record<BookingStatus, number>>;
  bookings_per_day: { day: string; total: number }[];
  seat_manifest: {
    id: number;
    title: string;
    category: string;
    start_at: string;
    venue: string | null;
    capacity: number;
    seats_remaining: number;
    confirmed: number;
    attended: number;
    waitlisted: number;
  }[];
};

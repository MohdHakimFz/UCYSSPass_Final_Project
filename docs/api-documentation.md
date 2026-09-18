# SentryPass API reference

A JSON REST API for event ticketing and venue booking, built on Laravel 12 with Sanctum token authentication and PostgreSQL. There are no server-rendered views; all four frontends use this API.

- **Base URL (local):** `http://localhost/api`
- **Format:** JSON in, JSON out. Send `Accept: application/json`. Dates are ISO 8601 in UTC (`2026-12-01T09:00:00.000000Z`).
- **Auth:** `Authorization: Bearer <token>`, where the token comes from `POST /auth/register` or `POST /auth/login`.
- **Health check:** `GET http://localhost/up` (outside `/api`).
- **Try it:** import [`postman/SentryPass.postman_collection.json`](postman/) — it runs every endpoint below, success and error cases.

## Contents

1. [Conventions](#conventions) — errors, pagination, status codes, roles
2. [Auth](#auth)
3. [Users](#users)
4. [Venues](#venues)
5. [Events](#events)
6. [Ticket types](#ticket-types)
7. [Bookings](#bookings)
8. [Admin](#admin)
9. [How the key features work](#how-the-key-features-work)
10. [Security and middleware](#security-and-middleware)
11. [Third-party APIs](#third-party-apis)

---

## Conventions

### Roles

| Role | Can do |
| --- | --- |
| **Guest** (no token) | Browse venues, events and ticket tiers. Register and log in. |
| **Customer** | Book, cancel and view their own bookings and QR passes. Edit their own profile. |
| **Organiser** | Everything a guest can, plus create and manage their own events, tiers and attendees, and check people in. |
| **Admin** | Everything, across all users. Manages venues, accounts and sees platform analytics. |

Ownership is enforced with Laravel Policies: an organiser can only change events (and tiers, and check-ins) that they own.

### Status codes

| Code | Meaning |
| --- | --- |
| `200` / `201` / `204` | Success / created / success with no body |
| `401` | No token, invalid token, or wrong credentials |
| `403` | Signed in, but this role (or this owner) is not allowed |
| `404` | Resource not found |
| `409` | Conflict: duplicate booking, guarded delete, ticket already used |
| `422` | Validation failed, or a forged ticket at check-in |
| `429` | Rate limit hit (`POST /bookings`) |
| `500` | Unexpected error (generic message; details go to the server log) |

### Error shape

Every failure has the same JSON shape. Validation errors add an `errors` object keyed by field.

```json
{ "message": "Unauthenticated." }
```

```json
{
  "message": "The email field must be a valid email address. (and 2 more errors)",
  "errors": {
    "name": ["The name field is required."],
    "email": ["The email field must be a valid email address."],
    "password": ["The password field is required."]
  }
}
```

### Pagination

List endpoints are paginated with `?page=` and `?per_page=` (default 15). The response is a standard Laravel paginator:

```json
{
  "current_page": 1,
  "data": [ ],
  "per_page": 15,
  "last_page": 4,
  "total": 52,
  "next_page_url": "http://localhost/api/events?page=2"
}
```

---

## Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a **customer** account. The role can't be chosen here. |
| POST | `/auth/login` | Public | Returns a Sanctum token. |
| POST | `/auth/logout` | Bearer | Revokes the token used for this request. |
| GET | `/auth/me` | Bearer | The signed-in user. |

`POST /auth/register`

```json
{ "name": "Aisha Rahman", "email": "aisha@example.com", "password": "password123", "password_confirmation": "password123" }
```

`201`

```json
{
  "user": { "id": 22, "name": "Aisha Rahman", "email": "aisha@example.com", "role": "customer" },
  "token": "1|P7zH8JxOGv6X7Jm5sQR4QDnX2zBh7N2a8HvkDGef70e5f83d"
}
```

`POST /auth/login` takes `{ "email", "password" }` and returns the same `{ user, token }` with `200`. Wrong credentials return `401`.

---

## Users

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/users` | Admin | Paginated. Filter with `?role=admin\|organiser\|customer`. |
| GET | `/users/{id}` | Admin, or that user | One account. |
| POST | `/users` | Admin | Create an organiser or admin account: `name`, `email`, `password` (min 8), `role`. |
| PUT | `/users/{id}` | Admin, or that user | Partial update of `name`, `email`, `password`. Only an admin can change `role`. |
| DELETE | `/users/{id}` | Admin | `204`. Their events and bookings are deleted too (database cascade). |

Changing your **own** password also requires `current_password`; a wrong value returns `422`. A non-admin who sends `role` has it ignored.

---

## Venues

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/venues` | Public | Paginated. `?search=` matches the name (case-insensitive). |
| GET | `/venues/{id}` | Public | One venue. |
| POST | `/venues` | Admin | `name`, `address`, `capacity` (≥ 1). |
| PUT | `/venues/{id}` | Admin | Partial update. |
| DELETE | `/venues/{id}` | Admin | `204`, or `409` if any event still uses the venue. |

---

## Events

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/events` | Public | Paginated, filterable, sortable (below). |
| GET | `/events/{id}` | Public | Includes `venue` and `ticket_types`. |
| POST | `/events` | Organiser, Admin | Create. `organiser_id` is set to you; only an admin may set it. |
| PUT | `/events/{id}` | Owner, Admin | Partial update. Setting `status` to `cancelled` also cancels bookings (see below). |
| DELETE | `/events/{id}` | Owner, Admin | `204`, or `409` if any booking is still pending, confirmed or waitlisted. |
| GET | `/events/{id}/stats` | Owner, Admin | Fill, check-in and waitlist numbers. |
| GET | `/events/{id}/export` | Owner, Admin | Attendee list as CSV. |
| POST | `/events/{id}/duplicate` | Owner, Admin | Copies the event and its tiers as a draft with every seat open. |

**`GET /events` query parameters**

| Parameter | Effect |
| --- | --- |
| `category` | `ctf`, `bootcamp`, `conference` or `workshop` |
| `status` | `draft`, `published`, `cancelled` or `completed` |
| `venue_id`, `organiser_id` | Exact match |
| `from`, `to` | Events starting on/after `from`, ending on/before `to` (ISO date-time) |
| `max_price` | Events that have a tier priced at or below this |
| `search` | Title contains (case-insensitive) |
| `sort`, `direction` | `start_at` (default) or `title`; `asc` (default) or `desc` |

Each item also carries `venue { id, name }`, `from_price` (cheapest tier), `seats_remaining` and `capacity` (summed over tiers).

`POST /events`

```json
{
  "venue_id": 1,
  "title": "Web Security CTF Night",
  "description": "Optional text",
  "category": "ctf",
  "start_at": "2026-12-01T09:00:00Z",
  "end_at": "2026-12-01T18:00:00Z",
  "status": "published"
}
```

`end_at` must be after `start_at` (`422` otherwise). `status` defaults to `draft`.

**`GET /events/{id}/stats`** `200`

```json
{
  "capacity": 2, "seats_remaining": 0, "held": 2, "confirmed": 1, "attended": 1,
  "waitlisted": 1, "cancelled": 0, "fill_rate": 100, "check_in_rate": 50,
  "no_show": 0, "event_ended": false,
  "tiers": [ { "id": 37, "name": "Solo", "capacity": 1, "seats_remaining": 0, "waitlisted": 1 } ],
  "recent_checkins": [ { "booking_id": 31, "name": "Aisha Rahman", "tier": "Solo", "checked_in_at": "2026-12-01T09:12:00.000000Z" } ]
}
```

`held` = confirmed + attended. `no_show` is the number of confirmed guests who never checked in, and is only counted once the event has ended.

**Cancelling an event.** `PUT /events/{id}` with `{ "status": "cancelled" }` cancels every pending, confirmed and waitlisted booking on it and records a `cancelled` email for each attendee. The response is the event plus `"cancelled_bookings": <count>`. Nobody is promoted from a waitlist, because the whole event is off.

---

## Ticket types

A ticket type is a tier of an event (for example Early Bird, Standard, VIP) with its own price and seat count.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/events/{eventId}/ticket-types` | Public | The event's tiers. |
| POST | `/events/{eventId}/ticket-types` | Owner, Admin | `name`, `price` (≥ 0), `capacity` (≥ 0), optional `seats_remaining` (defaults to `capacity`). |
| PUT | `/ticket-types/{id}` | Owner, Admin | Partial update. `seats_remaining` may not exceed `capacity` (`422`). |
| DELETE | `/ticket-types/{id}` | Owner, Admin | `204`. Bookings on the tier are deleted too. |

`price` is returned as a string with two decimals (`"25.00"`).

---

## Bookings

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/bookings` | Bearer | Scoped by role: a customer sees their own, an organiser sees bookings on their events, an admin sees all. Filters: `?status=`, `?event_id=`, `?per_page=`. |
| POST | `/bookings` | Customer | Book a seat. **Rate limited.** Returns `confirmed` or `waitlisted`. |
| GET | `/bookings/{id}` | Owner, the event's organiser, Admin | One booking. |
| GET | `/bookings/{id}/qr-code` | Owner, the event's organiser, Admin | The ticket as a PNG QR code. `404` until the booking is confirmed. |
| PUT | `/bookings/{id}/cancel` | Owner, Admin | Cancels and releases the seat (or promotes the next person on the waitlist). |
| POST | `/bookings/{id}/checkin` | Organiser, Admin, or device `X-Api-Key` | Verify the signed ticket and mark the booking attended. |
| DELETE | `/bookings/{id}` | Admin | `204`. Hard delete, for clean-up only. |

`POST /bookings` body: `{ "ticket_type_id": 37 }`

`201` when confirmed:

```json
{
  "id": 31, "customer_id": 22, "ticket_type_id": 37, "status": "confirmed",
  "qr_token": "7f14877428db33fda309b526885c16a57d90fef3cf67d87fe69a39fdaa02047c",
  "booked_at": "2026-09-18T21:49:32.000000Z"
}
```

`201` when the tier is sold out:

```json
{ "id": 32, "status": "waitlisted", "waitlist_position": 1, "booked_at": "2026-09-18T21:49:32.000000Z" }
```

| Result | Cause |
| --- | --- |
| `409` | You already have a pending, confirmed or waitlisted booking on this tier |
| `422` | `ticket_type_id` missing or unknown |
| `403` | Not a customer account |
| `429` | More than 5 attempts in a minute (see [rate limiting](#anti-scalping-rate-limit)) |

List items include `customer`, `ticket_type` (with `event` and its `venue`), and `waitlist_position` for waitlisted bookings.

**`POST /bookings/{id}/checkin`**

```json
{ "qr_token": "7f14877428db33fda309b526885c16a57d90fef3cf67d87fe69a39fdaa02047c" }
```

Authenticate with a Bearer token (organiser who owns the event, or admin) **or** send the scanning device's key as `X-Api-Key`.

| Result | Cause |
| --- | --- |
| `200` | Ticket is genuine; booking is now `attended` with `checked_in_at` set |
| `422` | `qr_token` doesn't match the booking's signature (forged or altered) |
| `409` | Booking isn't `confirmed` (already used, cancelled, waitlisted) |
| `401` | Wrong or missing `X-Api-Key` and no valid Bearer token |
| `403` | Signed in but not this event's organiser |

---

## Admin

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/admin/stats` | Admin | Users by role; events by status and category; bookings by status; bookings per day for the last 14 days; a seat manifest of upcoming published events. |
| GET | `/admin/notifications` | Admin | Email log, newest first. `?type=confirmation\|waitlist_promoted\|cancelled`. Each row includes the raw `provider_response`. |
| GET | `/admin/export/users` | Admin | All users as CSV. |
| GET | `/admin/export/bookings` | Admin | All bookings as CSV. |

CSV cells that begin with `=`, `+`, `-` or `@` are prefixed with `'`, so a name like `=HYPERLINK(...)` can't run as a spreadsheet formula.

---

## How the key features work

### Concurrency-safe booking

`BookingService::book()` wraps the seat check and decrement in a database transaction and locks the tier's row with `lockForUpdate()`. Two people booking the last seat at the same moment are serialised: one is `confirmed`, the other `waitlisted`, and `seats_remaining` never goes below zero. The duplicate-booking check runs inside the same transaction.

### Booking states

```
pending → confirmed → attended
              ↘ cancelled
waitlisted → confirmed (promoted) → cancelled
```

New bookings start as `confirmed` (a seat was free) or `waitlisted` (sold out). Cancelling a confirmed booking gives its seat to the oldest waitlisted booking on the same tier (ordered by `booked_at`, then `id`), stamps that booking with a fresh ticket and records a `waitlist_promoted` email. If nobody is waiting, the seat goes back to `seats_remaining`.

### Signed QR tickets

When a booking is confirmed it gets `qr_token = HMAC-SHA256("{booking_id}|{ticket_type_id}|{customer_id}", APP_KEY)`. The QR image encodes `{"booking_id": …, "qr_token": "…"}`. At check-in the server recomputes the signature from the booking's own database row and compares it to the scanned value with `hash_equals()`. Editing a QR image can't produce a valid signature without the server's key, so forged tickets are rejected with `422`.

### Anti-scalping rate limit

`POST /bookings` allows 5 attempts per minute per user (`throttle:5,1`) to stop bots mass-booking seats. The 6th attempt in the window returns `429` with `Retry-After` and `X-RateLimit-*` headers. Failed attempts count too.

### Notifications

Booking confirmed, booking cancelled and waitlist promotion each create a row in `notifications` and send an email through Resend. The row keeps `sent_at` and the provider's raw response in `provider_response`. Emails are sent after the database transaction commits, so a slow network call never holds a seat lock open. Without `RESEND_API_KEY` the row is recorded as `{"status":"skipped"}`.

---

## Security and middleware

- **Authentication:** Laravel Sanctum bearer tokens on every protected route.
- **Authorisation:** Policies for User, Venue, Event, TicketType and Booking; admins bypass via `before()`.
- **Validation:** a Form Request class per write endpoint, also used as the authorisation layer.
- **Check-in device key:** `X-Api-Key` compared in constant time against `CHECKIN_API_KEY` (`CheckinApiKey` middleware).
- **Request logging:** `LogApiRequests` logs method, path, user id, IP, status and duration for every API call.
- **Central error handling:** one JSON error shape for 401, 403, 404, 422, 429 and 500; unexpected errors never leak stack traces.
- **API management:** pagination, filtering, search and sorting on list endpoints, and rate limiting on booking.

## Third-party APIs

| Service | Used for | Where |
| --- | --- | --- |
| goqr.me QR Code Generator API (`api.qrserver.com`) | Renders the signed ticket as a PNG | `GET /bookings/{id}/qr-code` |
| Resend email API | Booking confirmation, cancellation and waitlist-promotion emails | `EmailService`, logged in `notifications.provider_response` |

Both are real external HTTP calls, not local libraries.

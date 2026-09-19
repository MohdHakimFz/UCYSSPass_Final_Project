# UCYSS API reference

A JSON REST API for event ticketing and venue booking, built on Laravel 12 with Sanctum token authentication and PostgreSQL. It was built for UCYSS (the UPTM Cybersecurity Student Society), and the code still uses the name SentryPass. There are no server-rendered views: the web app and the mobile app both use this API.

- **Base URL (local):** `http://localhost/api`
- **Format:** JSON in, JSON out. Send `Accept: application/json`. Dates are ISO 8601 in UTC (`2026-12-01T09:00:00.000000Z`).
- **Auth:** `Authorization: Bearer <token>`, where the token comes from `POST /auth/register` or `POST /auth/login`.
- **Health check:** `GET http://localhost/up` (outside `/api`).
- **Try it:** import [`postman/SentryPass.postman_collection.json`](postman/). It runs every endpoint below, success and error cases (186 requests, 290 assertions).

## Contents

1. [Conventions](#conventions): roles, status codes, errors, pagination, rate limits
2. [Auth](#auth)
3. [Users](#users)
4. [Venues](#venues)
5. [Events](#events)
6. [Ticket types and seats](#ticket-types-and-seats)
7. [Bookings](#bookings)
8. [Organiser and admin](#organiser-and-admin)
9. [How the key features work](#how-the-key-features-work)
10. [Security and middleware](#security-and-middleware)
11. [Third-party APIs](#third-party-apis)

---

## Conventions

### Roles

| Role | Can do |
| --- | --- |
| **Guest** (no token) | Browse venues, published events and their tiers and seats. Register, log in, reset a password. |
| **Customer** | Book, pay for, cancel and view their own bookings and passes. Join their online meetings. Edit their own profile. A customer on the **member list** can also book members-only tiers. |
| **Organiser** | Everything a guest can, plus create, **publish** and manage their own events, tiers and attendees, see the seat map, and check people in. |
| **Admin** | Everything, across all users. Manages venues and accounts, keeps the **member list**, and sees platform analytics. |

Ownership is enforced with Laravel Policies: an organiser can only change events (and tiers, seats and check-ins) that they own. An organiser publishes their own events; no admin approval is needed.

### Status codes

| Code | Meaning |
| --- | --- |
| `200` / `201` / `204` | Success / created / success with no body |
| `401` | No token, invalid token, or wrong credentials |
| `402` | A payment was declined |
| `403` | Signed in, but this role (or this owner) is not allowed |
| `404` | Resource not found (also: a draft event you may not see) |
| `409` | Conflict: duplicate booking, seat taken, event not open for booking, guarded delete, ticket already used, already paid |
| `422` | Validation failed, or a forged ticket at check-in, or a meeting that is not open yet |
| `429` | Rate limit hit (see below) |
| `500` | Unexpected error (generic message; details go to the server log) |

### Error shape

Every failure has the same JSON shape, and never carries a stack trace or file paths, even when the server runs in debug mode. Validation errors add an `errors` object keyed by field.

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

### Rate limits

| Scope | Limit |
| --- | --- |
| Every API route | 240 requests a minute per signed-in user, or per address for a guest (`API_RATE_LIMIT`) |
| `POST /bookings` | 5 a minute per user (anti-scalping). Paying and joining have their own counters, so they never use up this allowance |
| `POST /bookings/{id}/pay` | 20 a minute |
| `POST /bookings/{id}/join` | 30 a minute |
| `POST /events/{id}/announcements` | 10 a minute |
| `POST /auth/forgot-password` | 3 a minute |
| `POST /auth/reset-password` | 10 a minute |

Going over returns `429` with `Retry-After`. Every response carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`.

---

## Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a **customer** account. The role can't be chosen here. |
| POST | `/auth/login` | Public | Returns a Sanctum token. |
| POST | `/auth/logout` | Bearer | Revokes the token used for this request. |
| GET | `/auth/me` | Bearer | The signed-in user. |
| POST | `/auth/forgot-password` | Public | Emails a 6-digit reset code. Same answer for a known and an unknown address. |
| POST | `/auth/reset-password` | Public | Sets a new password from the emailed code. |

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

`POST /auth/forgot-password` takes `{ "email" }` and always answers `200`:

```json
{ "message": "If that email has an account, a reset code is on its way." }
```

`POST /auth/reset-password` takes `{ "email", "code", "password", "password_confirmation" }`. The code is 6 digits and is stored only as a hash. A wrong or expired code returns `422`:

```json
{ "message": "That code is wrong or has expired. Ask for a new one." }
```

---

## Users

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/users` | Admin | Paginated. Filter with `?role=admin\|organiser\|customer`, `?member=1` or `?member=0`, and `?search=` (name or email, case-insensitive). |
| GET | `/users/{id}` | Admin, or that user | One account. |
| POST | `/users` | Admin | Create an organiser or admin account: `name`, `email`, `password` (min 8), `role`. |
| PUT | `/users/{id}` | Admin, or that user | Partial update of `name`, `email`, `password`. Only an admin can change `role` and `is_member`. |
| DELETE | `/users/{id}` | Admin | `204`. Their events and bookings are deleted too (database cascade). |

Changing your **own** password also requires `current_password`; a wrong value returns `422`. A non-admin who sends `role` or `is_member` has it ignored (`200`, unchanged). **Membership** (`is_member`) comes from the society's own member list, so nobody can grant it to themselves and registering never sets it. `GET /auth/me` returns it.

---

## Venues

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/venues` | Public | Paginated. `?search=` matches the name (case-insensitive). |
| GET | `/venues/{id}` | Public | One venue. |
| POST | `/venues` | Admin | `name`, `address`, `capacity` (≥ 1). |
| PUT | `/venues/{id}` | Admin | Partial update. |
| DELETE | `/venues/{id}` | Admin | `204`, or `409` if any event still uses the venue. |

A venue named **Online** is created automatically the first time an online event is made. Every online event points at it.

---

## Events

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/events` | Public | Paginated, filterable, sortable (below). Drafts are left out. |
| GET | `/events/{id}` | Public | Includes `venue` and `ticket_types`. A draft is `404` unless you own it or are an admin. |
| POST | `/events` | Organiser, Admin | Create. `organiser_id` is set to you; only an admin may set it. |
| PUT | `/events/{id}` | Owner, Admin | Partial update, including `status` (this is how an organiser publishes). Cancelling also cancels bookings. |
| DELETE | `/events/{id}` | Owner, Admin | `204`, or `409` if any booking is still pending, confirmed or waitlisted. |
| GET | `/events/{id}/stats` | Owner, Admin | Fill, check-in, waitlist and revenue numbers. |
| GET | `/events/{id}/seat-map` | Owner, Admin | Every numbered seat and who holds it. |
| GET | `/events/{id}/export` | Owner, Admin | Attendee list as CSV. |
| POST | `/events/{id}/duplicate` | Owner, Admin | Copies the event and its tiers as a draft with every seat open. |
| GET | `/events/{id}/announcements` | Owner, Admin | Announcements sent so far, and how many people one would reach now. |
| POST | `/events/{id}/announcements` | Owner, Admin | Email a message to everyone booked on the event. |

**`GET /events` query parameters**

| Parameter | Effect |
| --- | --- |
| `category` | `ctf`, `bootcamp`, `conference` or `workshop` |
| `status` | `draft`, `published`, `cancelled` or `completed` |
| `mode` | `physical` or `online` (anything else is ignored) |
| `venue_id`, `organiser_id` | Exact match |
| `from`, `to` | Events starting on/after `from`, ending on/before `to` (ISO date-time) |
| `max_price` | Events that have a tier priced at or below this |
| `search` | Title contains (case-insensitive) |
| `sort`, `direction` | `start_at` (default) or `title`; `asc` (default) or `desc` |

Each item also carries `venue { id, name }`, `from_price` (cheapest tier), `seats_remaining` and `capacity` (summed over tiers).

**Drafts.** A new event is a `draft` unless `status` is sent. A draft is visible only to its organiser and to admins: `GET /events/{id}` returns `404` to everyone else, it is left out of `GET /events`, and its tickets cannot be booked (`409`). Drafts appear in `GET /events` only for an admin, or for an organiser who asks for their own with `?organiser_id=<their id>`.

**Physical event** `POST /events`

```json
{
  "venue_id": 1,
  "title": "Web Security CTF Night",
  "description": "Optional text",
  "category": "ctf",
  "start_at": "2026-12-01T09:00:00Z",
  "end_at": "2026-12-01T18:00:00Z",
  "status": "published",
  "seated": true
}
```

`end_at` must be after `start_at` (`422` otherwise). `seated: true` turns on numbered seats: each tier gets one seat per unit of capacity, and guests choose a seat when they book. A physical event needs a `venue_id` (`422` otherwise). The response has every column, including `mode: "physical"`.

**Online event** `POST /events` (no venue needed, no seats)

```json
{
  "title": "Malware Analysis Talk",
  "category": "conference",
  "mode": "online",
  "meeting_url": "https://meet.google.com/abc-defg-hij",
  "start_at": "2026-12-01T20:00:00Z",
  "end_at": "2026-12-01T22:00:00Z",
  "status": "published"
}
```

`201`

```json
{ "id": 999, "mode": "online", "venue_id": 7, "meeting_url": "https://meet.google.com/abc-defg-hij", "meeting_platform": "meet", "seated": false }
```

| Rule | Result |
| --- | --- |
| `mode` is `physical` (default) or `online` | `422` for anything else |
| An online event sits at the shared **Online** venue and has `seated: false`, whatever is sent | Seats sent with `seated: true` are refused (`422`) |
| Publishing an online event needs a `meeting_url` | `422` with `errors.meeting_url` |
| `meeting_url` must be an `http` or `https` address | `422` for anything else, such as `javascript:` |
| `meeting_platform` is **detected from the link**, and cannot be set | Zoom, Google Meet, Microsoft Teams, Webex, Discord, WhatsApp, Telegram, or `other` |
| A physical event never keeps a meeting link | The link is cleared |
| Changing the link changes the platform; changing anything else leaves it | |

**The meeting link is private.** It is included only in responses to the event's organiser and to admins. A guest, a customer or another organiser gets the same event without a `meeting_url` field. A confirmed guest receives the link from `POST /bookings/{id}/join`, once the meeting is open (see [Bookings](#bookings)).

**`GET /events/{id}/stats`** `200`

```json
{
  "capacity": 2, "seats_remaining": 0, "held": 2, "confirmed": 1, "attended": 1,
  "waitlisted": 1, "cancelled": 0, "fill_rate": 100, "check_in_rate": 50,
  "no_show": 0, "event_ended": false,
  "revenue": { "gross": 60, "refunded": 30, "net": 30 },
  "pending_holds": 0,
  "tiers": [ { "id": 37, "name": "Solo", "capacity": 1, "seats_remaining": 0, "waitlisted": 1 } ],
  "recent_checkins": [ { "booking_id": 31, "name": "Aisha Rahman", "tier": "Solo", "checked_in_at": "2026-12-01T09:12:00.000000Z" } ]
}
```

`held` = confirmed + attended. `no_show` is the number of confirmed guests who never checked in, and is only counted once the event has ended. `pending_holds` is the number of seats currently held for a payment that has not arrived.

**`GET /events/{id}/seat-map`** `200` (owner or admin; `403` for anyone else)

```json
{
  "seated": true,
  "tiers": [
    {
      "id": 2591, "name": "Standard", "capacity": 4,
      "seats": [
        { "id": 571, "row": "A", "number": 1, "label": "A1", "state": "booked",
          "guest": { "booking_id": 80535, "name": "Aisha Rahman", "email": "aisha@example.com", "checked_in_at": null } },
        { "id": 572, "row": "A", "number": 2, "label": "A2", "state": "free", "guest": null }
      ]
    }
  ]
}
```

`state` is `free`, `held` (chosen, waiting for payment), `booked` (confirmed) or `attended` (checked in). An event without numbered seats returns `"seated": false` with empty `seats`.

**Announcements.** An organiser writes to everyone who is booked on an event: guests who are `confirmed`, `pending` (holding a seat) or `waitlisted`, each person once even if they hold two tiers. Cancelled bookings and people already checked in are left out.

`POST /events/{id}/announcements`

```json
{ "subject": "Room change", "message": "We moved to Makmal 4.\nSee you there." }
```

`201`

```json
{ "id": 7, "event_id": 995, "sender_id": 6444, "subject": "Room change", "message": "We moved to Makmal 4.\nSee you there.", "recipients": 12, "sender": { "id": 6444, "name": "Nurul Aisyah" } }
```

| Result | Cause |
| --- | --- |
| `201` | Recorded. The emails go out after the response has been sent, one per guest, each logged in `notifications` (type `announcement`) with Resend's answer |
| `422` | `subject` (max 150) or `message` (max 2000) missing or too long; the event is not published; nobody is booked; or more than 500 guests |
| `403` | Not this event's organiser or an admin |
| `429` | More than 10 a minute |

`GET /events/{id}/announcements` returns `{ "audience": 12, "data": [ { "id", "subject", "message", "recipients", "created_at", "sender" } ] }`, newest first. What was typed is escaped in the email, and line breaks are kept.

**Cancelling an event.** `PUT /events/{id}` with `{ "status": "cancelled" }` cancels every pending, confirmed and waitlisted booking on it, refunds paid ones, and records a `cancelled` email for each attendee. The response is the event plus `"cancelled_bookings": <count>`. Nobody is promoted from a waitlist, because the whole event is off.

---

## Ticket types and seats

A ticket type is a tier of an event (for example Early Bird, Standard, VIP) with its own price and seat count.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/events/{eventId}/ticket-types` | Public | The event's tiers. |
| POST | `/events/{eventId}/ticket-types` | Owner, Admin | `name`, `price` (≥ 0), `capacity` (≥ 0), optional `seats_per_row` (1 to 40), `seats_remaining` (defaults to `capacity`) and `members_only` (default `false`). |
| PUT | `/ticket-types/{id}` | Owner, Admin | Partial update. `seats_remaining` may not exceed `capacity` (`422`). On a seated event, growing `capacity` adds seats and shrinking it removes only free ones. |
| DELETE | `/ticket-types/{id}` | Owner, Admin | `204`. Bookings on the tier are deleted too. |
| GET | `/ticket-types/{id}/seats` | Public | Every seat of a tier and whether it is taken. It never says who holds a seat. |

`price` is returned as a string with two decimals (`"25.00"`).

**Members-only tiers.** With `members_only: true` a tier can only be booked by someone on the member list; anyone else gets `403` ("This ticket is for UCYSS members. Ask a committee member to add you to the member list.") and no seat is taken. The flag is shown in the public tier list, so an app can label the tier, and a duplicated event keeps it.

`GET /ticket-types/{id}/seats` `200`

```json
[
  { "id": 571, "row": "A", "number": 1, "label": "A1", "taken": true },
  { "id": 572, "row": "A", "number": 2, "label": "A2", "taken": false }
]
```

Seats whose payment hold has run out are shown as free again.

---

## Bookings

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/bookings` | Bearer | Scoped by role: a customer sees their own, an organiser sees bookings on their events, an admin sees all. Filters: `?status=`, `?event_id=`, `?per_page=`. |
| POST | `/bookings` | Customer (or Admin) | Book a place. **Rate limited.** Returns `confirmed`, `pending` (a paid tier, held for payment) or `waitlisted`. |
| GET | `/bookings/{id}` | Owner, the event's organiser, Admin | One booking. |
| GET | `/bookings/{id}/qr-code` | Owner, the event's organiser, Admin | The ticket as a PNG QR code. `404` unless the booking is confirmed or attended. |
| POST | `/bookings/{id}/pay` | Owner | Pay for a held booking. |
| PUT | `/bookings/{id}/cancel` | Owner, Admin | Cancels, releases the seat (or promotes the next person on the waitlist) and refunds by policy. |
| POST | `/bookings/{id}/join` | Owner | Join an online meeting. Returns the link, and marks the booking attended. |
| POST | `/bookings/{id}/checkin` | Organiser, Admin, or device `X-Api-Key` | Verify the signed ticket and mark the booking attended. |
| DELETE | `/bookings/{id}` | Admin | `204`. Hard delete, for clean-up only. |

### Booking

`POST /bookings` body: `{ "ticket_type_id": 37 }`, or with a seat on a seated event `{ "ticket_type_id": 37, "seat_id": 571 }`.

`201` when a free tier is confirmed on the spot:

```json
{
  "id": 80535, "customer_id": 6445, "ticket_type_id": 2591, "seat_id": 571, "status": "confirmed",
  "qr_token": "ea0ac49e1920890df2a966a276aabfec3dd19e6c8e437d2e0c56e0707cf3b362",
  "booked_at": "2026-09-19T08:02:13.000000Z", "hold_expires_at": null, "hold_seconds_left": null,
  "meeting": null,
  "seat": { "id": 571, "row_label": "A", "number": 1, "label": "A1" },
  "payment": null
}
```

`201` when the tier costs money: the place is **held**, and paying confirms it:

```json
{ "id": 80536, "status": "pending", "seat_id": 575, "hold_expires_at": "2026-09-19T08:05:14.000000Z", "hold_seconds_left": 179, "qr_token": null }
```

`201` when the tier is sold out:

```json
{ "id": 32, "status": "waitlisted", "waitlist_position": 1, "booked_at": "2026-09-18T21:49:32.000000Z" }
```

| Result | Cause |
| --- | --- |
| `409` | You already have a pending, confirmed or waitlisted booking on this tier |
| `409` | The event is a draft, cancelled or already over ("This event is not open for booking.") |
| `409` | The seat was just taken by someone else |
| `422` | `ticket_type_id` missing or unknown; a seated event needs a `seat_id`; the seat belongs to another tier |
| `403` | An organiser account (organisers cannot book tickets; an admin can, for testing), or a members-only tier and you are not on the member list |
| `429` | More than 5 attempts in a minute |

On an event without numbered seats, a `seat_id` is ignored.

List items include `customer`, `ticket_type` (with `event` and its `venue`), `seat`, `payment`, `waitlist_position` for waitlisted bookings and `meeting` for confirmed online bookings.

### Paying

`POST /bookings/{id}/pay`

```json
{ "method": "card", "outcome": "approve" }
```

`method` is `card`, `fpx` or `ewallet`. The payment gateway is a **sandbox**: it takes no real money, and the optional `outcome` (`approve` by default, `decline` or `insufficient`) chooses the result so every case can be tested.

| Result | Cause |
| --- | --- |
| `200` | Paid. The booking is `confirmed`, has a signed `qr_token`, and `payment.status` is `paid` |
| `402` | Declined ("The payment was declined. Try another payment method."). The hold stays until it runs out, so the guest can try again |
| `409` | Already paid, or the hold has expired ("This hold has expired. Choose your seat again.") |
| `403` | Not your booking |
| `422` | Unknown `method` or `outcome` |
| `429` | More than 20 a minute |

### Cancelling and refunds

`PUT /bookings/{id}/cancel` returns the booking with a `refund` object:

```json
{ "id": 80539, "status": "cancelled", "refund": { "refunded": true, "amount": "30.00" } }
```

A paid booking is refunded in full when the event starts at least 24 hours away (`REFUND_HOURS_BEFORE`); later than that it is not refunded, and `refund.refunded` is `false`. Cancelling twice is harmless (`200`, nothing changes).

### Joining an online meeting

For a confirmed booking on an online event, the booking carries a `meeting` object. **It never contains the link.**

```json
"meeting": { "platform": "meet", "opens_at": "2026-09-19T07:57:40+00:00", "ends_at": "2026-09-19T09:42:40+00:00", "open": true }
```

`opens_at` is 15 minutes before the event starts (`MEETING_OPEN_MINUTES`); `open` is true from then until the event ends, and only while the event is published.

`POST /bookings/{id}/join` (no body) `200`

```json
{ "meeting_url": "https://meet.google.com/abc-defg-hij", "platform": "meet" }
```

Calling it marks the booking `attended` with `checked_in_at` set, so the organiser sees who joined. Calling it again returns the link again.

| Result | Cause |
| --- | --- |
| `403` | Not your booking (an admin cannot join for someone else either) |
| `422` | The booking has no online meeting (physical event, or not confirmed), or the meeting is not open yet ("The meeting opens 15 minutes before it starts."), or the organiser has not added a link |
| `429` | More than 30 a minute |

### Checking in

`POST /bookings/{id}/checkin`

```json
{ "qr_token": "7f14877428db33fda309b526885c16a57d90fef3cf67d87fe69a39fdaa02047c" }
```

Authenticate with a Bearer token (organiser who owns the event, or admin) **or** send the scanning device's key as `X-Api-Key`.

| Result | Cause |
| --- | --- |
| `200` | Ticket is genuine; booking is now `attended` with `checked_in_at` set |
| `422` | `qr_token` doesn't match the booking's signature (forged or altered): "Invalid or tampered ticket." |
| `409` | Booking isn't `confirmed` (already used, cancelled, waitlisted) |
| `401` | Wrong or missing `X-Api-Key` and no valid Bearer token |
| `403` | Signed in but not this event's organiser |

---

## Organiser and admin

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/organiser/summary` | Organiser (own events), Admin (all) | Counts and revenue for the organiser's dashboard. `403` for a customer. |
| GET | `/organiser/attendance` | Organiser (own events), Admin (all) | Who registered and who actually came, for the latest finished events. `403` for a customer. |
| GET | `/admin/stats` | Admin | Revenue, seats, holds, recent activity and breakdowns. |
| GET | `/admin/notifications` | Admin | Email log, newest first. `?type=confirmation\|waitlist_promoted\|cancelled\|reminder\|announcement`. Each row includes the raw `provider_response`. |
| GET | `/admin/export/users` | Admin | All users as CSV. |
| GET | `/admin/export/bookings` | Admin | All bookings as CSV. |

`GET /organiser/summary` `200`

```json
{
  "events": 2, "published": 2, "drafts": 0, "upcoming": 2,
  "tickets_sold": 2, "checked_in": 1, "waitlisted": 0, "awaiting_payment": 0,
  "revenue": { "gross": 30, "refunded": 30, "net": 0 }
}
```

`GET /organiser/attendance` `200` lists up to the 8 latest events that have ended (published or completed, not drafts), with the people who **registered** (confirmed or checked in) and the ones who **attended** (checked in, or joined an online meeting):

```json
{
  "events": [ { "id": 41, "title": "Intro to Web Hacking (Online)", "mode": "online", "category": "workshop", "start_at": "2026-10-24T20:00:00.000000Z", "registered": 40, "attended": 31, "rate": 78 } ],
  "registered": 40, "attended": 31, "rate": 78
}
```

`rate` is a whole percentage, or `null` when nobody registered. The numbers for all events come from one query.

`GET /admin/stats` has these keys: `revenue` (`gross`, `refunded`, `net`, `payments`), `revenue_per_day` (14 days), `pending_holds`, `draft_events`, `recent_activity` (the latest 8 bookings), `users_by_role`, `events_by_status`, `events_by_category`, `bookings_by_status`, `bookings_per_day` (14 days) and `seat_manifest` (upcoming published events with capacity, seats left, confirmed, attended and waitlisted).

CSV cells that begin with `=`, `+`, `-` or `@` are prefixed with `'`, so a name like `=HYPERLINK(...)` can't run as a spreadsheet formula.

---

## How the key features work

### Concurrency-safe booking

`BookingService::book()` wraps the seat check and decrement in a database transaction and locks the tier's row with `lockForUpdate()`. Two people booking the last seat at the same moment are serialised: one is confirmed (or held), the other waitlisted, and `seats_remaining` never goes below zero. A seat is also unique in the database (`bookings.seat_id`), so the same numbered seat can never be given twice. The duplicate-booking check runs inside the same transaction.

### Booking states

```
                      pay                    check in / join
pending (held) ─────────────▶ confirmed ─────────────────────▶ attended
      │  hold runs out            │
      ▼                           ▼
  released                    cancelled  (refund by policy)

waitlisted ──▶ promoted: confirmed (free tier) or pending (paid tier, held 30 minutes)
```

A free tier is `confirmed` on the spot. A paid tier is `pending` and holds the place for `SEAT_HOLD_MINUTES` (3 by default); paying confirms it. If the hold runs out, the place goes back on sale. Cancelling a confirmed booking gives its seat to the oldest waitlisted booking on the same tier (ordered by `booked_at`, then `id`), records a `waitlist_promoted` email and, for a paid tier, gives that person `PROMOTION_HOLD_MINUTES` (30) to pay. If nobody is waiting, the seat goes back to `seats_remaining`.

### Holds and their release

Expired holds are released when anyone looks at the bookings or the seats, and again by a task that runs every minute (`bookings:release-expired`). The countdown is sent as `hold_seconds_left`, worked out on the server, so a phone with the wrong clock still counts down correctly.

### Numbered seats

An organiser turns on `seated` for a physical event; each tier then gets one seat per unit of capacity, in rows of `seats_per_row` (labels A1, A2, B1 and so on). Turning it off removes the seats and keeps the bookings. Growing or shrinking a tier adds or removes only free seats. Guests see which seats are taken, never by whom; the organiser sees the whole room with `GET /events/{id}/seat-map`.

### Online events

An online event has no venue of its own, no seats, and a private meeting link. The platform is detected from the link. A confirmed guest sees when the meeting opens and, once it does, joins with `POST /bookings/{id}/join`, which is the only place the link is handed out and which counts as attending. The reminder email carries the link too, to the confirmed guest only.

### Signed QR tickets

When a booking is confirmed it gets `qr_token = HMAC-SHA256("{booking_id}|{ticket_type_id}|{customer_id}", APP_KEY)`. The QR image encodes `{"booking_id": …, "qr_token": "…"}`. At check-in the server recomputes the signature from the booking's own database row and compares it to the scanned value with `hash_equals()`. Editing a QR image can't produce a valid signature without the server's key, so forged tickets are rejected with `422`. A cancelled booking no longer gets a QR code.

### Notifications and reminders

Booking confirmed, booking cancelled, waitlist promotion, a **reminder** and an organiser **announcement** each create a row in `notifications` and send an email through Resend. The row keeps `sent_at` and the provider's raw response in `provider_response`. The reminder goes to each confirmed guest once, when their event is within 24 hours (`REMINDER_HOURS_BEFORE`), and not to someone who booked in the last hour. It states the time in Malaysian time, the venue and seat or the meeting link, and carries a calendar file (`event.ics`). A task runs every 10 minutes (`bookings:send-reminders`). Everything a person typed (an event title, a name) is escaped before it goes into an email. Without `RESEND_API_KEY` the row is recorded as `{"status":"skipped"}`. `php artisan emails:test <address>` sends one test email and prints Resend's exact answer.

### Screens stay up to date

The web and mobile apps ask the server again every 5 seconds while they are on screen (and straight away when they come back to the front), so a published event, a taken seat or a check-in appears for everyone within seconds without a reload. A dropped connection keeps what is on screen.

### Performance

The queries behind the slow endpoints are indexed, and waitlist positions and the admin overview are computed without a query per row. The measurements are in [`performance/PERFORMANCE.md`](performance/PERFORMANCE.md).

---

## Security and middleware

- **Authentication:** Laravel Sanctum bearer tokens on every protected route. Tokens are stored in the database, so logout revokes them at once.
- **Authorisation:** Policies for User, Venue, Event, TicketType and Booking; admins bypass via `before()`.
- **Validation:** a Form Request class per write endpoint, also used as the authorisation layer.
- **Check-in device key:** `X-Api-Key` compared in constant time against `CHECKIN_API_KEY` (`CheckinApiKey` middleware).
- **Request logging:** `LogApiRequests` logs method, path, user id, IP, status and duration for every API call.
- **Central error handling:** one JSON error shape for 401, 403, 404, 422, 429 and 500; errors never leak stack traces or file paths, even with debug on.
- **Rate limiting:** a global ceiling on the whole API, and tighter limits on booking, payment, joining and password reset.
- **Private data:** meeting links, seat holders' names, and drafts are only ever in responses to the people allowed to see them.
- **API management:** pagination, filtering, search and sorting on list endpoints.

## Third-party APIs

| Service | Used for | Where |
| --- | --- | --- |
| goqr.me QR Code Generator API (`api.qrserver.com`) | Renders the signed ticket as a PNG | `GET /bookings/{id}/qr-code` |
| Resend email API | Confirmation, cancellation, waitlist-promotion and reminder emails, and password reset codes | `EmailService`, logged in `notifications.provider_response` |

Both are real external HTTP calls, not local libraries. The calendar file attached to a reminder is generated by the API itself (`App\Support\Ics`), so it does not count as a third-party API.

While Resend is in its test mode it only delivers to the address of the Resend account; to email every guest, a sending domain has to be verified in Resend and set as `RESEND_FROM_EMAIL`.

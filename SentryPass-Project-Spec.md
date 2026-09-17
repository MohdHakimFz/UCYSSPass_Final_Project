# SentryPass — Project Specification

**Course:** SWC3633 / SWC4443 Web API Development (UPTM)
**Deadline:** 12 October 2026
**Group size:** 4 (1 shared backend/DB, 4 separate frontends)

This file is the full build spec. Feed it to Claude Code as project context and build section by section — database first, then API, then differentiator features, then frontends.

---

## 1. Project Overview

SentryPass is a RESTful Event Ticketing & Venue Booking API scoped to the infosec community — CTF competitions, pentesting bootcamps, and security conferences — rather than a generic concert/movie ticketing clone.

Three roles:
- **Administrator** — owns the platform: manages venues, oversees all users/events, views platform-wide analytics.
- **Organiser/Staff** — creates and manages their own events (CTF rooms, bootcamps, conference tracks), sets ticket tiers, scans attendee check-in.
- **Customer/Attendee** — browses events, books/cancels a slot, views booking status, receives a signed QR ticket.

The backend must expose a clean, versionless JSON REST API (`/api/...`) with no server-rendered views — every frontend (4 of them) consumes it independently.

---

## 2. Tech Stack

- **Backend:** Laravel 11 (PHP), API-only — `routes/api.php` only, no Blade views.
- **Local dev:** Docker via **Laravel Sail** (official Laravel Docker setup). One `docker-compose.yml` the whole group runs identically.
- **Database:** PostgreSQL (Sail's `pgsql` service).
- **Auth:** Laravel Sanctum (token-based API auth) + Policies/Gates for RBAC.
- **ORM:** Eloquent. Migrations = the DDL script. Seeders/factories = the required 5+ sample records per table.
- **DB GUI:** Beekeeper Studio for querying. For the ERD deliverable, export the schema to dbdiagram.io or use DBeaver (Beekeeper has no built-in ERD view).
- **Testing:** Postman (collection + environment exported for submission).
- **Frontends:**
  - Admin Dashboard — Next.js
  - Organiser/Staff Portal — React + Vite
  - Customer Web App — Next.js or React + Vite
  - Customer Mobile App — React Native + Expo
- **Hosting (optional, for live demo links):** Vercel (frontends), Railway or Fly.io (Docker-friendly host for Laravel + Postgres).

---

## 3. Database Schema

All tables use `id` as an unsigned bigint primary key and `created_at`/`updated_at` timestamps unless noted.

### `users`
| Column | Type | Constraints |
| --- | --- | --- |
| name | varchar(255) | not null |
| email | varchar(255) | unique, not null |
| password | varchar(255) | not null (hashed) |
| role | enum('admin','organiser','customer') | not null, default 'customer' |

### `venues`
| Column | Type | Constraints |
| --- | --- | --- |
| name | varchar(255) | not null |
| address | text | not null |
| capacity | integer | not null, check > 0 |

### `events`
| Column | Type | Constraints |
| --- | --- | --- |
| venue_id | bigint | FK → venues.id, on delete restrict |
| organiser_id | bigint | FK → users.id, on delete cascade |
| title | varchar(255) | not null |
| description | text | nullable |
| category | enum('ctf','bootcamp','conference','workshop') | not null |
| start_at | datetime | not null |
| end_at | datetime | not null, check end_at > start_at |
| status | enum('draft','published','cancelled','completed') | not null, default 'draft' |

### `ticket_types`
| Column | Type | Constraints |
| --- | --- | --- |
| event_id | bigint | FK → events.id, on delete cascade |
| name | varchar(100) | not null (e.g. "Early Bird", "Standard", "VIP") |
| price | decimal(10,2) | not null, default 0 |
| capacity | integer | not null, check >= 0 |
| seats_remaining | integer | not null, check >= 0 and <= capacity |

`seats_remaining` is the field the concurrency-safe booking logic guards (see §5.1).

### `bookings`
| Column | Type | Constraints |
| --- | --- | --- |
| customer_id | bigint | FK → users.id, on delete cascade |
| ticket_type_id | bigint | FK → ticket_types.id, on delete cascade |
| status | enum('pending','confirmed','cancelled','waitlisted','attended') | not null, default 'pending' |
| qr_token | text | nullable — HMAC-signed ticket payload |
| booked_at | timestamp | not null |
| checked_in_at | timestamp | nullable |

Business rule (enforce in app logic, not just DB): one customer cannot hold two simultaneously-active (`pending`/`confirmed`/`waitlisted`) bookings on the same `ticket_type_id`.

### `notifications`
| Column | Type | Constraints |
| --- | --- | --- |
| booking_id | bigint | FK → bookings.id, on delete cascade |
| type | enum('confirmation','waitlist_promoted','cancelled') | not null |
| channel | enum('email') | not null, default 'email' |
| sent_at | timestamp | nullable |
| provider_response | jsonb | nullable — raw response from the email API, evidence for A3 |

Optional extension table (only if time allows): `payments` (booking_id FK, amount, status enum, provider_reference) — can be a fully simulated/stubbed flow, no real payment gateway required.

Seed at least 5 rows per table (users: mix of all 3 roles; events: mix of all 4 categories; bookings: mix of all 5 statuses).

---

## 4. API Endpoints

Base path: `/api`. All responses JSON. Status codes: 200/201 success, 400 validation, 401 unauthenticated, 403 unauthorised role, 404 not found, 409 conflict (e.g. booking race lost / duplicate), 422 unprocessable, 500 server error.

### Auth
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | /auth/register | Public | role defaults to `customer`; admin creates organiser/admin accounts via `/users` |
| POST | /auth/login | Public | returns Sanctum token |
| POST | /auth/logout | Bearer token | revokes current token |
| GET | /auth/me | Bearer token | returns current user + role |

### Users
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | /users | Admin | paginated, filter by role |
| GET | /users/{id} | Admin, or self | |
| POST | /users | Admin | create organiser/staff/admin accounts |
| PUT | /users/{id} | Admin, or self (limited fields) | |
| DELETE | /users/{id} | Admin | |

### Venues
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | /venues | Public | paginated, search by name |
| GET | /venues/{id} | Public | |
| POST | /venues | Admin | |
| PUT | /venues/{id} | Admin | |
| DELETE | /venues/{id} | Admin | block delete if events reference it |

### Events
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | /events | Public | paginated, filter (category, venue, date range, status), search (title), sort (start_at, title) |
| GET | /events/{id} | Public | includes ticket_types |
| POST | /events | Organiser/Admin | organiser_id auto-set to authenticated user unless Admin |
| PUT | /events/{id} | Owning Organiser/Admin | |
| DELETE | /events/{id} | Owning Organiser/Admin | block delete if active bookings exist |

### Ticket Types
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | /events/{eventId}/ticket-types | Public | |
| POST | /events/{eventId}/ticket-types | Owning Organiser/Admin | |
| PUT | /ticket-types/{id} | Owning Organiser/Admin | |
| DELETE | /ticket-types/{id} | Owning Organiser/Admin | |

### Bookings
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | /bookings | Customer (own only), Organiser/Admin (all, or scoped to their events) | paginated, filter by status |
| GET | /bookings/{id} | Owning customer, or Organiser/Admin | |
| POST | /bookings | Customer | **concurrency-guarded** — see §5.1; returns `confirmed` or `waitlisted` |
| PUT | /bookings/{id}/cancel | Owning customer, or Admin | triggers waitlist promotion (§5.4) |
| DELETE | /bookings/{id} | Admin only | hard delete, rare/admin cleanup use only |

### Check-in
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | /bookings/{id}/checkin | Organiser/Staff (API key or Sanctum) | verifies signed `qr_token` before marking `attended` — see §5.2 |

---

## 5. Differentiator Features (build these carefully — they're the marks)

### 5.1 Concurrency-safe booking
When `POST /bookings` fires, wrap the seat check + decrement in a DB transaction using `lockForUpdate()` on the `ticket_types` row:

```php
DB::transaction(function () use ($ticketTypeId, $customerId) {
    $ticketType = TicketType::where('id', $ticketTypeId)->lockForUpdate()->first();
    if ($ticketType->seats_remaining > 0) {
        $ticketType->decrement('seats_remaining');
        // create booking with status = confirmed
    } else {
        // create booking with status = waitlisted
    }
});
```
Document this explicitly in the report's "Debugging and Performance Optimisation" section as a real race condition you solved (two simultaneous requests hitting the last seat).

### 5.2 Signed anti-forgery QR tickets
On booking confirmation, generate `qr_token = hash_hmac('sha256', "{$booking->id}|{$booking->ticket_type_id}|{$booking->customer_id}", config('app.key'))`. Encode this into the QR image via the third-party QR API. On check-in, recompute the HMAC server-side and compare — reject if it doesn't match (tampered/forged ticket).

### 5.3 Anti-scalping rate limiting
Apply Laravel's `throttle` middleware to `POST /bookings` (e.g. `throttle:5,1` — 5 attempts per minute per user/IP). Frame this explicitly in the report as preventing bot mass-booking, not generic rate limiting.

### 5.4 Waitlist auto-promotion
On `PUT /bookings/{id}/cancel`: if the cancelled booking was `confirmed`, find the oldest `waitlisted` booking for the same `ticket_type_id`, promote it to `confirmed`, and trigger a notification via the email API. State machine: `pending → confirmed → cancelled` / `waitlisted → confirmed (promoted) → cancelled`.

---

## 6. Security & Middleware (rubric A3)

**Security**
- Sanctum token auth on all protected routes
- Role-based access control via Policies/Gates (Administrator / Organiser-Staff / Customer)
- API key check on `POST /bookings/{id}/checkin` (scanning device, not a logged-in browser session)

**Middleware**
- Auth middleware (Sanctum, verifies token + attaches user/role)
- Request validation (Form Request classes per endpoint)
- Centralised error handling (custom exception handler → consistent JSON error shape)
- Logging middleware (request/response log — also doubles as evidence)

**API management** (need 2 minimum; these 4 give a buffer)
- Pagination on `/events`, `/bookings`, `/users`, `/venues`
- Filtering + search on `/events` (category, venue, date range, title)
- Sorting on `/events` and ticket types (by date, price)
- Rate limiting on `POST /bookings` (§5.3)

---

## 7. Third-Party API Integration

Minimum 1 required, doing 2 strengthens A3:
1. **QR Code Generator API** — generates the ticket QR image from the signed payload (§5.2).
2. **Email API** (Resend or Brevo) — sends booking confirmation and waitlist-promotion emails with the QR attached; log the provider's response into `notifications.provider_response`.

A locally installed QR/email *library* does NOT count — must be a genuine external API call. Capture request/response evidence (screenshots + logged payloads) for the report.

---

## 8. Repository Structure (suggested monorepo)

```
sentrypass/
├── backend/                      # Laravel + Sail
│   ├── app/Models/                (User, Venue, Event, TicketType, Booking, Notification)
│   ├── app/Http/Controllers/Api/
│   ├── app/Http/Middleware/
│   ├── app/Http/Requests/
│   ├── app/Policies/
│   ├── app/Services/              (QrTicketService, BookingService, NotificationService)
│   ├── database/migrations/
│   ├── database/seeders/
│   ├── docker-compose.yml
│   ├── routes/api.php
│   └── .env.example
├── frontend-admin/                # Next.js
├── frontend-staff/                # React + Vite
├── frontend-customer-web/         # Next.js or React + Vite
├── frontend-customer-mobile/      # React Native + Expo
├── docs/
│   ├── ERD.png
│   ├── postman-collection.json
│   └── api-documentation.md
└── README.md                      # setup + run instructions for the whole group
```

---

## 9. Frontend Split (4 Members)

| Member | Frontend | Scope | Tech |
| --- | --- | --- | --- |
| You (H2) | Admin Dashboard | Venue/user management, platform-wide analytics | Next.js |
| Member 2 | Organiser/Staff Portal | Create/manage events & ticket types, check-in scanner | React + Vite |
| Member 3 | Customer Web App | Browse/book/cancel, booking status, QR wallet | Next.js or React + Vite |
| Member 4 | Customer Mobile App | Same customer flow, mobile-native | React Native + Expo |

Splitting by platform/role (not by feature) makes the "materially different in workflow/scope" rubric requirement obvious, and lets the 3 web frontends share one design system/component library.

---

## 10. Timeline (18 Sep – 12 Oct 2026)

| Date | Milestone |
| --- | --- |
| Sep 18–21 | Finalise ERD + migrations, Sail environment up, agree on API contract |
| Sep 22–27 | Core CRUD for all resources + Sanctum auth + RBAC working end-to-end |
| Sep 28–Oct 2 | Differentiator features (§5) + third-party API integration |
| Oct 3–6 | All 4 frontends built against the shared API; Postman collection + API docs finalised |
| Oct 7–9 | Debugging/performance pass, individual demo videos recorded, quiz prep |
| Oct 10–11 | Report assembled, GitHub repo cleaned up (README, commit history check) |
| Oct 12 | Submission deadline |

---

## 11. Report Structure Checklist (maps to rubric)

| # | Report section | Rubric code(s) |
| --- | --- | --- |
| 1 | System Overview | A2/A6 |
| 2 | Database Design (ERD + DDL/DML) | A1 |
| 3 | RESTful API Documentation | A4 |
| 4 | API Testing (Postman screenshots + collection) | A4 |
| 5 | System Implementation (backend + each frontend) | A2, B1 |
| 6 | System Demonstration (screenshots) | A6, B2 |
| 7 | Project Repository (GitHub link) | A5 |
| 8 | Additional/Advanced Features (security, middleware, third-party API) | A3 |
| 9 | Debugging & Performance Optimisation | supports A2/A3 |
| 10 | Individual Reflection & Contribution Record (200–300 words/student) | B4 |

---

## 12. Build Order for Claude Code

1. Scaffold Laravel + Sail (Postgres service), confirm `docker-compose up` works.
2. Migrations for all 6 tables (§3), run + verify in Beekeeper Studio.
3. Seeders (5+ rows per table, realistic infosec-event data).
4. Models + relationships (§3 FKs) + Policies (§6).
5. Sanctum auth endpoints (§4 Auth).
6. CRUD for Users, Venues, Events, Ticket Types (§4).
7. Bookings endpoint with concurrency-safe logic (§5.1).
8. QR signing + check-in verification (§5.2).
9. Rate limiting on bookings (§5.3) + waitlist promotion (§5.4).
10. Third-party API integration: QR generator + email (§7).
11. Middleware pass: logging, centralised error handler, validation review (§6).
12. Postman collection covering every endpoint (success + error cases).
13. Frontends (§9), one at a time, against the finished API.

# Database design

SentryPass uses **PostgreSQL 18**. The schema is created by Laravel migrations (`backend/database/migrations`), and the sample data by seeders and factories (`backend/database/seeders`, `backend/database/factories`).

![Entity relationship diagram](ERD.png)

The diagram is drawn from the live database. Its editable vector version is [`ERD.svg`](ERD.svg). The exact DDL exported with `pg_dump` is in [`database/schema.sql`](database/schema.sql).

## Tables

| Table | What a row is | Key columns |
| --- | --- | --- |
| `users` | A person who can sign in | `role` is `admin`, `organiser` or `customer` (default `customer`); `email` is unique |
| `venues` | A place events can be held | `capacity` must be greater than 0 |
| `events` | A CTF, bootcamp, conference or workshop | `category`, `status` (`draft` → `published` → `completed` / `cancelled`), `venue_id`, `organiser_id` |
| `ticket_types` | A tier of an event, such as Early Bird or VIP | `price`, `capacity`, `seats_remaining` (guarded by the booking logic) |
| `bookings` | One customer's seat on one tier | `status`, `qr_token` (HMAC-signed ticket), `booked_at`, `checked_in_at` |
| `notifications` | An email owed to a customer | `type`, `sent_at`, `provider_response` (raw JSON from the email API) |

Laravel also creates `personal_access_tokens` (Sanctum), `sessions`, `cache`, `jobs` and `migrations`; they are not part of the domain model and are left out of the diagram.

## Relationships and delete rules

| Child → parent | Cardinality | On delete | Why |
| --- | --- | --- | --- |
| `events.venue_id` → `venues` | many events per venue | **restrict** | A venue that still has events can't be removed |
| `events.organiser_id` → `users` | many events per organiser | cascade | Removing an organiser removes their events |
| `ticket_types.event_id` → `events` | many tiers per event | cascade | Tiers belong to their event |
| `bookings.customer_id` → `users` | many bookings per customer | cascade | |
| `bookings.ticket_type_id` → `ticket_types` | many bookings per tier | cascade | |
| `notifications.booking_id` → `bookings` | many emails per booking | cascade | |

## Constraints enforced by the database

| Rule | Constraint |
| --- | --- |
| A venue holds at least one person | `venues_capacity_check`: `capacity > 0` |
| An event ends after it starts | `events_end_after_start_check`: `end_at > start_at` |
| Tier capacity is not negative | `ticket_types_capacity_check`: `capacity >= 0` |
| Seats left are between 0 and capacity | `ticket_types_seats_remaining_check`: `seats_remaining >= 0 AND seats_remaining <= capacity` |
| Allowed values | `users_role_check`, `events_category_check`, `events_status_check`, `bookings_status_check`, `notifications_type_check`, `notifications_channel_check` |
| One account per email | unique index on `users.email` |

The `seats_remaining <= capacity` and `>= 0` checks are the last line of defence for the booking race condition: even if application code were wrong, the database refuses to oversell a tier.

## Rule enforced in the application, not the database

A customer can't hold two active (`pending`, `confirmed` or `waitlisted`) bookings on the same ticket type. `BookingService::book()` checks this inside the same transaction that locks the tier row (`lockForUpdate()`), so two simultaneous requests can't both slip through.

## Sample data (DML)

`php artisan migrate:fresh --seed` fills every table with realistic infosec-themed data, well above the five-rows-per-table minimum:

| Table | Rows | Mix |
| --- | --- | --- |
| `users` | 21 | 1 admin, 4 organisers, 16 customers |
| `venues` | 5 | Cyber-themed venue names |
| `events` | 12 | 3 each of `ctf`, `bootcamp`, `conference`, `workshop`; statuses weighted towards `published` |
| `ticket_types` | 36 | Early Bird, Standard and VIP for every event |
| `bookings` | 30 | 6 each of `pending`, `confirmed`, `cancelled`, `waitlisted`, `attended`; confirmed and attended ones carry real signed QR tokens |
| `notifications` | 20 | Confirmation, cancelled and waitlist-promoted emails matching the booking states |

The demo password for every seeded account is `password`.

## Regenerating the DDL

```bash
cd backend
docker compose exec -T pgsql pg_dump -U sail -d laravel --schema-only --no-owner --no-privileges \
  -t users -t venues -t events -t ticket_types -t bookings -t notifications > ../docs/database/schema.sql
```

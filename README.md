# UCYSS Events (SentryPass)

Event ticketing and venue booking for the UPTM Cybersecurity Student Society (UCYSS): CTFs, bootcamps, conferences and workshops, in person or online. One Laravel API, a web app for customers, organisers and admins, and a customer mobile app.

## What it does

- **Customers** browse events, book free or paid passes (sandbox payments with a timed seat hold), pick seats on a 3D map, join a waitlist, get a signed QR pass, join online meetings, add events to their calendar, share on WhatsApp and download a certificate of attendance.
- **Organisers** create and publish events (in person or online), manage ticket tiers (including members-only), see a live seat map, check guests in by scanning QR codes, send announcements and see who came and who did not.
- **Admins** see the whole programme: revenue, bookings, people, venues, the email log and attendance, with refunds, cancellations and exports.
- **Everything updates live** (no refresh), reminder emails go out a day before an event, and the web and mobile apps follow light, dark or automatic themes.

## Database design

Nine domain tables in PostgreSQL. Full detail (columns, constraints, sample data) is in [`docs/database.md`](docs/database.md).

![Entity relationship diagram](docs/erd/ERD.png)

<details>
<summary>The same diagram as Mermaid code</summary>

```mermaid
erDiagram
    venues ||--o{ events : "held at"
    users ||--o{ events : "organises"
    events ||--o{ ticket_types : "has tiers"
    ticket_types ||--o{ seats : "has seats"
    users ||--o{ bookings : "books"
    ticket_types ||--o{ bookings : "is booked as"
    seats |o--o| bookings : "held by"
    bookings ||--o{ payments : "paid"
    bookings ||--o{ notifications : "emails"
    events ||--o{ announcements : "is told"
    users ||--o{ announcements : "sends"
    announcements ||--o{ notifications : "carried by"

    venues {
        bigint id PK
        varchar name
        text address
        int capacity "> 0"
    }

    users {
        bigint id PK
        varchar name
        varchar email UK
        varchar password "hash"
        varchar role "admin | organiser | customer"
        boolean is_member "set by admin"
        timestamp email_verified_at
        timestamp created_at
    }

    events {
        bigint id PK
        bigint venue_id FK "restrict, null for online"
        bigint organiser_id FK
        varchar title
        text description
        varchar category "ctf | bootcamp | ..."
        varchar mode "physical | online"
        varchar meeting_url "private"
        varchar meeting_platform
        boolean seated
        timestamp start_at
        timestamp end_at "> start_at"
        varchar status "draft | published | ..."
    }

    ticket_types {
        bigint id PK
        bigint event_id FK
        varchar name
        numeric price
        int capacity ">= 0"
        int seats_remaining "0..capacity"
        smallint seats_per_row
        boolean members_only
    }

    seats {
        bigint id PK
        bigint ticket_type_id FK
        varchar row_label UK
        int number UK
    }

    bookings {
        bigint id PK
        bigint customer_id FK
        bigint ticket_type_id FK
        bigint seat_id FK, UK "set null"
        varchar status "pending | confirmed | ..."
        text qr_token "HMAC"
        timestamp booked_at
        timestamp checked_in_at
        timestamp hold_expires_at
    }

    payments {
        bigint id PK
        bigint booking_id FK
        numeric amount
        varchar method "card | fpx | ewallet"
        varchar status "paid | failed | refunded"
        varchar reference
        timestamp paid_at
        numeric refunded_amount
    }

    announcements {
        bigint id PK
        bigint event_id FK
        bigint sender_id FK
        varchar subject
        text message
        int recipients
    }

    notifications {
        bigint id PK
        bigint booking_id FK
        bigint announcement_id FK
        varchar type "confirmation | reminder | ..."
        varchar channel "email"
        timestamp sent_at
        jsonb provider_response
    }
```

</details>

## Project layout

```
SentryPass/
├── backend/                 Laravel 12 API (Sanctum, PostgreSQL via Sail)
├── frontend/
│   ├── web/                 One web app for every role   React + Vite
│   └── customer-mobile/     Customer Mobile App   React Native + Expo
├── docs/                    API reference, ERD and database design, Postman collection, project spec
└── README.md
```

| App | Folder | Stack | Dev URL |
| --- | --- | --- | --- |
| API | `backend/` | Laravel 12, Sanctum, PostgreSQL | http://localhost/api |
| Web app (customer, organiser, admin) | `frontend/web/` | React + Vite | http://localhost:5175 |
| Customer Mobile | `frontend/customer-mobile/` | React Native + Expo | Expo Go / emulator |

## Documentation

Everything is in [`docs/`](docs/README.md):

- [API reference](docs/api-documentation.md): every endpoint with examples
- [Database design](docs/database.md): ERD, tables, constraints, sample data
- [Postman collection](docs/postman/README.md): 198 requests, 309 assertions, runnable with Newman

## Run the API

```bash
cd backend
cp .env.example .env            # Windows: uncomment WWWUSER / WWWGROUP in .env
docker compose up -d
docker compose exec -u root laravel.test chown sail:sail vendor
docker compose exec -u sail laravel.test composer install   # vendor/ lives on a Docker volume (fast on Windows)
docker compose restart laravel.test
docker compose exec laravel.test php artisan key:generate
docker compose exec laravel.test php artisan migrate:fresh --seed
```

`vendor/` sits on a named volume because reading it through the Windows bind mount made every request take 8-20 seconds.

Seeded accounts (password `password` for all): `admin@sentrypass.test` (admin), `aisyah@ucyss.test` and `farid@ucyss.test` (organisers), `customer@sentrypass.test` (a demo customer) and 40 named students such as `adam.iskandar@ucyss.test`. The seed is a small UCYSS programme: two online sessions, a seated CTF, a paid bootcamp with a waitlist, a free career talk, a draft, a cancelled event and a finished one. Dates are counted from the day you seed, so the events are always coming up. (`migrate:fresh` erases the database first.)

Optional `.env` settings: `MAIL_API_DRIVER` (`resend` or `brevo`) with `RESEND_API_KEY` or `BREVO_API_KEY` and `BREVO_FROM_EMAIL` (real emails; without them notifications are recorded as skipped) and `CHECKIN_API_KEY` (shared key for scanning devices sending `X-Api-Key`).

## Run a frontend

```bash
cd frontend/web
npm install
npm run dev
```

The web app is one application with one sign-in page. After signing in, the role decides where you land: customers in the public site (`/passes`), organisers in `/organiser`, admins in `/admin`. Each area has its own layout and route guard, and the API enforces the same roles on every request. The API address comes from `VITE_API_URL`, defaulting to `http://localhost/api`.

Mobile:

```bash
cd frontend/customer-mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` when the app can't reach `localhost`: `http://10.0.2.2/api` for an Android emulator, or `http://<your-computer-LAN-IP>/api` for a physical phone on the same Wi-Fi.

## Tests and continuous integration

| What | How to run it here |
| --- | --- |
| Backend (PHPUnit, real PostgreSQL) | `cd backend && docker compose exec laravel.test php artisan test` |
| Browser tests (Playwright; needs the API and the web app running) | `cd frontend/web && npx playwright test` |
| API collection (Newman) | `npx newman run docs/postman/SentryPass.postman_collection.json -e docs/postman/SentryPass.local.postman_environment.json --env-var "checkin_api_key=<your CHECKIN_API_KEY>"` |

`.github/workflows/ci.yml` runs on every push and pull request, in four separate jobs: the backend tests against a PostgreSQL service, the web app's type-check, lint and build, the mobile app's type-check, and the Postman collection against a freshly seeded API (`php artisan serve`). The browser tests are not part of CI, because they need the whole stack running together.

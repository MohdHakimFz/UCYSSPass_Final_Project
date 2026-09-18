# SentryPass

Event ticketing and venue booking API for the infosec community (CTFs, bootcamps, conferences), with four frontends.

## Project layout

```
SentryPass/
├── backend/                 Laravel 12 API (Sanctum, PostgreSQL via Sail)
├── frontend/
│   ├── admin/               Admin Dashboard       Next.js
│   ├── staff/               Organiser Portal      React + Vite
│   ├── customer-web/        Customer Web App      React + Vite
│   └── customer-mobile/     Customer Mobile App   React Native + Expo
├── docs/                    Project spec (and later: ERD, Postman collection, API docs)
└── README.md
```

| App | Folder | Stack | Dev URL |
| --- | --- | --- | --- |
| API | `backend/` | Laravel 12, Sanctum, PostgreSQL | http://localhost/api |
| Admin Dashboard | `frontend/admin/` | Next.js | http://localhost:3000 |
| Organiser Portal | `frontend/staff/` | React + Vite | http://localhost:5174 |
| Customer Web | `frontend/customer-web/` | React + Vite | http://localhost:5175 |
| Customer Mobile | `frontend/customer-mobile/` | React Native + Expo | Expo Go / emulator |

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

Seeded accounts (password `password` for all): `admin@sentrypass.test` (admin), `customer@sentrypass.test` (customer). Organiser accounts are seeded with random emails; list them with `select email from users where role = 'organiser'`.

Optional `.env` settings: `RESEND_API_KEY` (real confirmation emails; without it notifications are recorded as skipped) and `CHECKIN_API_KEY` (shared key for scanning devices sending `X-Api-Key`).

## Run a frontend

```bash
cd frontend/admin          # or frontend/staff / frontend/customer-web
npm install
npm run dev
```

Each web app reads the API address from `NEXT_PUBLIC_API_URL` (admin) or `VITE_API_URL` (staff, customer-web), defaulting to `http://localhost/api`.

Mobile:

```bash
cd frontend/customer-mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` when the app can't reach `localhost`: `http://10.0.2.2/api` for an Android emulator, or `http://<your-computer-LAN-IP>/api` for a physical phone on the same Wi-Fi.

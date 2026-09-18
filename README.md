# SentryPass

Event ticketing and venue booking API for the infosec community (CTFs, bootcamps, conferences), with four frontends.

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
- [Postman collection](docs/postman/README.md): 105 requests, 156 assertions, runnable with Newman

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

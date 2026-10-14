# UCYSSPass Web (Aqqwa)

My own web frontend for UCYSSPass, the event ticketing and venue booking system for infosec events.
It covers all three roles (Customer, Organiser, Administrator) and uses the group's shared REST API.

**Author:** Muhammad Nureel Aqqwa Bin Hisham (AM2512021715)
**Tech:** Vue 3, Vite, Vue Router, plain CSS (glassmorphism theme), JavaScript

## Install

You need Node.js 18 or newer.

```bash
cd frontend/aqqwa-web
npm install
```

## Configure

Copy the example env file:

```bash
cp .env.example .env
```

| Variable | Meaning | Default |
|---|---|---|
| `VITE_API_URL` | Address of the UCYSSPass API. `/api` is added automatically if you leave it off. | `https://ucyss-api.onrender.com` |

The API runs on Render's free plan and sleeps when idle. The first request can take up to a minute;
the app shows a "Waking up the server" bar while it waits.

## Run

```bash
npm run dev       # http://localhost:5174
npm run build     # production build in dist/
npm run preview   # serve the production build locally
```

## Demo accounts

Password for all: `password`

| Role | Email |
|---|---|
| Administrator | admin@sentrypass.test |
| Organiser | aisyah@ucyss.test |
| Organiser | farid@ucyss.test |
| Customer | customer@sentrypass.test |

The database is live and shared. Name test data "Aqqwa Demo ...", delete it afterwards, and never change the demo accounts, events or venues.

## Pages

| Role | Pages |
|---|---|
| Everyone | Log in, Create account (customer sign-up) |
| Customer | Events (search + category filter), Event detail (tiers, seats left, Book, seat picker for seated events), Booking result (confirmed / sandbox payment / waitlist), My bookings (status, Pay, Cancel) |
| Organiser | Dashboard (summary numbers), My events (including drafts), New / Edit event, Manage event (ticket tiers, Publish / Move back to draft, Delete, bookings for the event) |
| Administrator | Overview (revenue, users, events and bookings by status), Users (search, role filter, create, change role, delete), Venues (create, edit, delete), All events (publish / cancel), All bookings |

## How it talks to the API

Every request goes through `src/api.js`:

- the base URL comes from `VITE_API_URL`
- it sends `Accept: application/json`, plus `Content-Type: application/json` when there is a body
- it adds `Authorization: Bearer <token>`; the token is kept in localStorage as `aqqwa_token`
- it gives up after 60 seconds, and shows "Waking up the server" after 4 seconds
- every error becomes one object: `{ status, message, errors }`

On every page load, `src/main.js` calls `GET /auth/me` to restore the session before the router starts.

## Roles and the route guard

Each route in `src/router/index.js` names the role allowed to open it (`meta.role`).
After login each role goes to its own home (`/events`, `/organiser`, `/admin`).
Opening another role's page sends you back to your own home with a warning; logged-out users go to the login page.
The menu for each role is in `src/components/AppHeader.vue`.

## Error handling

| Case | What the user sees |
|---|---|
| 422 validation | Each message in red under its field (forms use `novalidate`); it clears as soon as the field is edited |
| 401 on the login form | "The provided credentials are incorrect." and the page stays open |
| 401 on any other request | Token cleared, back to login with "Your session has expired. Please log in again." |
| 403 | "You are not allowed to do this." |
| 404, 409, 429, 5xx, offline, timeout | A friendly message at the top of the page (409 shows the API's own reason, e.g. "Cannot delete a venue that still has events.") |

All API text is shown with Vue's `{{ }}` binding, which escapes it. The app never uses `v-html`.
The 422 / 403 handling for forms is in `src/useForm.js`; the messages per status are in `src/api.js`.

## Deploy on Vercel

| Setting | Value |
|---|---|
| Framework | Vite |
| Root Directory | `frontend/aqqwa-web` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment variable | `VITE_API_URL` = `https://ucyss-api.onrender.com` |

The router uses hash URLs (`/#/events`), so refreshing any page on Vercel never gives a 404.

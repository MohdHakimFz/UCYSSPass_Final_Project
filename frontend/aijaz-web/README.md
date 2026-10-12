# UCYSSPass web frontend (Aijaz)

A web frontend for UCYSSPass, the event ticketing and venue booking system for infosec events. It is one app with three role areas: Customer, Organiser and Administrator. It uses the group's shared backend API and never talks to the database directly.

- **Tech:** plain JavaScript (no framework), Vite, Bootstrap 5, hand-written hash routing
- **Dev server:** http://localhost:5175
- **API:** `https://ucyss-api.onrender.com/api` (already deployed, nothing to install)

## Install and run

You need Node.js 20 or newer.

```
cd frontend/aijaz-web
npm install
cp .env.example .env
npm run dev
```

Then open http://localhost:5175.

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

The API is on a free server that sleeps when idle, so the first request can take up to a minute. The app shows a blue "Waking up the server" banner while it waits.

## Configure the API URL

The API address is read from the environment variable `VITE_API_URL` in the `.env` file. It is not written anywhere in the code.

| Backend | Value of `VITE_API_URL` |
|---|---|
| Shared backend on Render (default) | `https://ucyss-api.onrender.com/api` |
| Backend running locally with Docker | `http://localhost/api` |

Restart `npm run dev` after changing `.env`.

## Demo accounts

The password is `password` for all of them.

| Role | Email | Lands on |
|---|---|---|
| Administrator | `admin@sentrypass.test` | `#/admin` |
| Organiser | `aisyah@ucyss.test` | `#/organiser` |
| Organiser | `farid@ucyss.test` | `#/organiser` |
| Customer | `customer@sentrypass.test` | `#/events` |

**The database is shared and live.** Anything you create is real data that the whole group sees. Name test data clearly (for example `Aijaz Test Event`), delete it afterwards, and do not edit or delete the seeded accounts, events or venues. The Users page disables the controls for the four demo accounts for this reason.

## What each role can do

**Customer**
- Browse published events with a search box and a category filter
- Open an event and book a ticket tier (choosing a seat on seated events)
- Pay for a paid booking with the sandbox payment form, or see the waitlist position
- See all their bookings and cancel one

**Organiser**
- Dashboard numbers
- List their own events, drafts included
- Create and edit an event (physical with a venue, or online with a meeting link)
- Add, edit and delete ticket tiers
- Publish an event or move it back to draft
- See the bookings for each event

**Administrator**
- Overview: revenue, users by role, events by status, bookings by status
- Users: search, filter by role, create, change role, delete
- Venues: list, create, edit, delete
- All events from every organiser, with an organiser filter: create an event for any organiser, edit it, manage its ticket tiers, publish, cancel, move back to draft or delete it
- All bookings

## How the code is organised

```
index.html            the single page; everything is drawn into <div id="app">
src/
  main.js             entry point: route table, session restore, starts the router
  api.js              the only file that calls the API
  auth.js             login, register, logout, who is logged in
  router.js           hash routing and the role route guard
  layout.js           navbar, "waking up" banner, alert area
  ui.js               shared helpers: alerts, loading and empty states, error display
  format.js           dates, prices, status badges
  pages/
    login.js, register.js
    customer/         events, eventDetail, bookingDetail, bookings
    organiser/        dashboard, events, eventForm, eventManage, tiers, eventBookings
    admin/            overview, users, venues, events, bookings
```

### How a page talks to the API

Every page calls `api.get`, `api.post`, `api.put` or `api.del` from `src/api.js`. That one file:

1. adds the base URL from `VITE_API_URL`,
2. sends `Accept: application/json`, and `Content-Type: application/json` when there is a body,
3. sends `Authorization: Bearer <token>` when logged in (the token is kept in `localStorage` under the key `aijaz_token`),
4. cancels the request after 60 seconds,
5. turns every failure into one `ApiError` object with `status`, `message` and `errors`.

### Routing and the route guard

The part of the address after `#` chooses the page, for example `#/events/5`. `src/router.js` listens for the browser's `hashchange` event and draws the matching page. Before drawing, the guard checks:

1. unknown address: go to your own home, or to login when logged out,
2. login or register while logged in: go to your own home,
3. any other page while logged out: go to login,
4. a page that belongs to another role: go back to your own home with a message.

On every page load the app calls `GET /auth/me` with the saved token to restore the session before the router starts.

### Error handling

| Response | What the user sees |
|---|---|
| 422 validation | Each message in red under its own input |
| 401 with a token | Token cleared, back to login, "Your session has expired" |
| 401 on the login form | "The provided credentials are incorrect." |
| 403 | "You are not allowed to do this." |
| 404 | "We could not find what you were looking for." |
| 409 conflict | The server's reason, at the top of the page |
| 429 | "Too many requests. Please wait a minute and try again." |
| No response or timeout | "Can't reach the server, it may be waking up, try again in a moment." |

Forms are not validated in the browser. They are sent as typed, and the API's own 422 messages are shown, so the rules live in one place. Every list has a loading state, an empty state and a "Try again" block if it fails to load.

## Build

```
npm run build
```

The production files are written to `dist/`. `npm run preview` serves that folder locally to check it.

## Deploy on Vercel

This folder deploys as its own Vercel project from the same repository.

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend/aijaz-web` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment variable | `VITE_API_URL=https://ucyss-api.onrender.com/api` |

No rewrite rule is needed. The app uses hash routing, so the server only ever serves `index.html`, and refreshing a page such as `#/admin/users` cannot give a 404.

`VITE_API_URL` is read at build time. After changing it in Vercel, redeploy for it to take effect.

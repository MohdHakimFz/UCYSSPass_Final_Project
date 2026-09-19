# Notes for the project report

Ready-to-adapt text and a map from the project description (`SWC3633_SWC4443`) to the evidence in this repository. Sections 1 and 2 are written so they can be pasted into the report and edited.

## 1. Authentication: why Laravel Sanctum tokens instead of JWT

The project description lists "JWT Authentication" under Security. This API authenticates with **Laravel Sanctum bearer tokens**, which meet the same requirement: a signed-in client sends `Authorization: Bearer <token>` on every request, and the server decides who it is and what it may do.

The two differ in where the truth lives:

| | JWT | Sanctum token (used here) |
| --- | --- | --- |
| What the token is | A self-contained signed document with the user's claims | A random string; the server looks it up in `personal_access_tokens` |
| Logging out | The token stays valid until it expires, unless a deny-list is kept | The row is deleted, so the token stops working at once |
| Changing a role or deleting an account | Old tokens keep their old claims until they expire | Takes effect on the next request |
| Stolen token | Usable until expiry | Can be revoked immediately |

For a ticketing system, where a stolen token could book seats or read a guest list, being able to revoke a token immediately mattered more than not having to look it up. The evidence is in the Postman collection: request 2.7 logs out and 2.8 shows the same token now returns `401`.

If the course strictly requires the JWT format, the change is contained: the authentication guard is the only part that would be swapped, since every route, policy and validation rule sits behind it. It is worth asking the lecturer before changing anything.

## 2. Advanced features (report section 8)

**Security**

- Sanctum bearer tokens, revocable at logout.
- Role-based access control for administrator, organiser and customer, enforced by Laravel Policies. An organiser can only touch their own events, tiers, seat map and check-ins.
- Private data stays private: a meeting link is only in responses to the organiser, admins and (through the join call) a confirmed guest; draft events are `404` to everyone else; the public seat list never names who holds a seat.
- Signed tickets: each ticket carries an HMAC-SHA256 signature checked with `hash_equals()`, so an edited QR code is rejected.
- API key for the door scanner (`X-Api-Key`, compared in constant time).
- Passwords hashed; password reset by a 6-digit code that is stored only as a hash and expires; the reset request gives the same answer for a known and an unknown email.
- Everything a person types is escaped before it goes into an email; CSV exports defuse spreadsheet formulas.
- Errors never carry a stack trace or file path, even with debug on.

**Middleware**

- Authentication (Sanctum), request validation (a Form Request per write endpoint), central error handling (one JSON error shape), request logging (`LogApiRequests`), the API-key check, and rate limiting.

**API management**

- Pagination, filtering (status, category, mode, venue, price, dates), search and sorting on list endpoints.
- Rate limiting: a global ceiling (240 a minute per person or address) plus tighter limits on booking (5), payment (20), joining (30) and password reset (3 and 10). Answers carry `Retry-After` and `X-RateLimit-*` headers.

**Third-party APIs**

- **Resend** (email): confirmations, cancellations, waitlist promotions, reminders (with a calendar file attached) and password reset codes. The raw answer from Resend is stored in `notifications.provider_response` and shown in the admin email log.
- **goqr.me QR Code API**: renders the signed ticket as a PNG.

Evidence: `docs/api-documentation.md` (Third-party APIs), Postman requests 7.12 and 10.3, the `emails:test` command, and the admin email log.

**Business rules that go beyond CRUD**

- Two people cannot take the last seat or the same numbered seat: a transaction with a row lock, plus a unique constraint in the database, checked by a real concurrent test.
- Paid tickets are held for a few minutes and confirmed by a (sandbox) payment; declined payments keep the hold; a hold that runs out releases the seat; cancelling refunds according to a 24-hour policy.
- A waitlist that promotes the next person automatically, with time to pay when the tier costs money.
- Online events with a private meeting link, opened 15 minutes before the start, detected platform (Zoom, Meet, Teams and more), and a join click that counts as attendance.
- Reminder emails a day before, once per booking.
- Screens refresh themselves every few seconds, so an organiser's change reaches guests without a reload.

## 3. Debugging and performance (report section 9)

Everything is in [`performance/PERFORMANCE.md`](performance/PERFORMANCE.md): missing indexes on foreign keys, an N+1 on waitlist positions, and a query per event on the admin overview, each with symptom, root cause, fix and the measured result on 80,000 bookings. It also lists other problems found and fixed during development.

## 4. Where each requirement is met

| Requirement in the description | Evidence |
| --- | --- |
| At least 4 related tables, keys, integrity constraints | `database/schema.sql` (9 tables, 12 foreign keys, check and unique constraints), `ERD.png`, `database.md` |
| ERD, DDL and DML with at least 5 records per table | `ERD.png`, `database/schema.sql`, `database/sample-data.sql` (checked by loading it into an empty database) |
| `/users`, `/events`, `/venues`, `/bookings` with GET, POST, PUT, DELETE, JSON, status codes, validation | `api-documentation.md` |
| Authentication, role-based access, validation, centralised error handling | `api-documentation.md` (Security and middleware), `backend/bootstrap/app.php`, the policies and form requests |
| At least one genuine third-party API | Resend and the QR Code API (above) |
| Two or more of logging, rate limiting, pagination, filtering, search, sorting | All of them, above |
| Debugging and performance report | `performance/PERFORMANCE.md` |
| Postman collection, success and error screenshots, API documentation | `postman/` (198 requests, 309 assertions), `PLAN-AND-POSTMAN-GUIDE.md` (screenshot list), `api-documentation.md` |
| README with setup and run instructions | `README.md` |
| Automated tests | 211 backend tests, 41 browser tests (Playwright), the Postman run in CI |

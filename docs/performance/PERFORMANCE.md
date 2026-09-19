# Debugging and performance optimisation

This is the evidence for the "Debugging and Performance Optimisation" part of the project report: what was slow, why, what changed, and the measured result.

## How it was measured

| | |
| --- | --- |
| Data | 80,338 bookings, 60,030 email log rows, 415 events, 1,239 ticket tiers, 3,022 users (loaded by `seed-bulk.sql`, removed by `cleanup-bulk.sql`) |
| Machine | Development setup: Laravel served from Docker on Windows, PostgreSQL in Docker |
| HTTP times | `measure.py`: 1 warm-up call then 15 timed calls per endpoint; median and 95th percentile |
| SQL times | `explain.sql`: `EXPLAIN ANALYZE` of the query behind each endpoint |
| Query counts | `query-count.php`: how many SQL queries each endpoint runs |

Every number below comes from those scripts, run before and after the changes on the same data.

## Issues found

### 1. No indexes on foreign keys or on the columns the API filters and sorts by

**Symptom.** Every plan for a bookings, events or email-log query was a `Seq Scan`: the database read the whole table each time. The tables only had primary keys and unique constraints.

**Root cause.** PostgreSQL does not create an index for a foreign key. The migrations declared `foreignId(...)->constrained()`, which adds the constraint but not an index, so `customer_id`, `ticket_type_id`, `event_id`, `organiser_id` and `booking_id` were never indexed.

**Fix.** Migration `2026_09_20_130000_add_query_indexes.php`:

| Index | Serves |
| --- | --- |
| `bookings (customer_id, booked_at)` | "My bookings", newest first |
| `bookings (ticket_type_id, status, booked_at, id)` | Counts per status for a tier or event, and the waitlist queue order |
| `bookings (status, booked_at)` and `(booked_at)` | Admin booking list, with and without a status filter |
| `bookings (hold_expires_at) WHERE status = 'pending'` | The every-minute sweep for holds that ran out (a partial index: only unpaid rows) |
| `events (status, start_at)`, `(organiser_id, start_at)`, `(venue_id)` | Public event list, organiser's events, venue lookups |
| `ticket_types (event_id)` | Seat and price totals per event |
| `notifications (booking_id, type)` | Email log per booking, and "has this booking had a reminder yet" |
| `users (role)` | Filtering people by role |

**Result (time PostgreSQL spends on the query, in ms):**

| Query | Before | After | Faster |
| --- | ---: | ---: | ---: |
| Q1 Customer's bookings, newest first | 3.198 | 0.327 | 9.8× |
| Q2 Admin booking list | 6.970 | 0.137 | 51× |
| Q3 Admin: waitlisted bookings | 3.459 | 0.352 | 9.8× |
| Q4 Public event list with price and seat totals | 0.950 | 0.379 | 2.5× |
| Q6 One event's booking totals | 3.898 | 0.266 | 14.7× |
| Q7 Expired-hold sweep (runs every minute) | 3.485 | 0.049 | 71× |
| Q8 Reminder job: who is due a reminder | 9.614 | 0.468 | 21× |
| Q9 Email log of one booking | 1.939 | 0.172 | 11× |
| Q5 Organiser's booking totals | 6.194 | 7.523 | no change |

Q5 did not improve, and this is expected: it counts the bookings of every tier of an organiser with about 100 events, which is a large share of the table, so the planner correctly still reads most of it.

On 80,000 rows the sequential scans were still only 3 to 10 ms, so the gain in absolute terms is small today. A sequential scan grows in step with the table and an index lookup barely does, so this is the fix that keeps the API fast as the society's history grows.

### 2. A query per waitlisted booking (N+1)

**Symptom.** Listing 10 waitlisted bookings ran 24 queries and spent 60.9 ms in SQL.

**Root cause.** `BookingController::index` called `withWaitlistPosition()` on every row, and each call counted the people ahead in the queue with its own query.

**Fix.** `withWaitlistPositions()` works out the place in the queue of every waitlisted booking on the page in one query, using `ROW_NUMBER() OVER (PARTITION BY ticket_type_id ORDER BY booked_at, id)`, which is the same ordering the promotion logic uses. The single-booking version is kept for the detail and create responses.

**Result.** Same answers, fewer queries: 24 → 15 queries, SQL time 60.9 → 14.7 ms. A test (`WaitlistPositionTest`) checks the positions and that the number of queries does not grow with the number of waitlisted rows. That test fails on the old code and passes on the new.

### 3. A query per event on the admin overview

**Symptom.** The admin overview ran 29 queries and 63.6 ms of SQL.

**Root cause.** For each of the 8 upcoming events, the seat manifest ran its own `COUNT(*) ... GROUP BY status` over that event's bookings.

**Fix.** One query joins bookings to tiers and groups by event and status for all 8 events together.

**Result.** 29 → 22 queries, SQL time 63.6 → 24.5 ms.

## What the client sees (HTTP, median of 15 calls, ms)

| Endpoint | Before | After |
| --- | ---: | ---: |
| Public event list (home page) | 95 | 98 |
| Event search with price filter | 102 | 97 |
| Customer: my bookings (300 rows) | 144 | 133 |
| Admin: booking list | 129 | 125 |
| Admin: waitlisted bookings | 167 | **119** |
| Admin: overview numbers | 161 | **126** |
| Organiser: summary | 125 | 111 |
| Organiser: one event's numbers | 123 | 109 |
| Admin: email log | 112 | 107 |

The endpoints with a real query problem improved clearly (waitlisted bookings −29%, overview −22%). The rest moved little, because about 86 ms of every response is fixed cost in this development setup (PHP starting up inside Docker on Windows: `GET /venues?per_page=1`, the simplest endpoint there is, has a median of 86 ms and a 95th percentile of 100 ms) and the database was not the bottleneck at this data size. The differences of a few milliseconds on those rows are within run-to-run noise.

## Other problems found and fixed during development

| Issue | Root cause | Fix |
| --- | --- | --- |
| Two customers could take the same last seat | Check and update were separate steps, so two requests could both see a free seat | The booking runs in a transaction that locks the tier row (`lockForUpdate`), and `bookings.seat_id` is unique. A real two-request race test checks only one wins |
| Draft events and closed events could be opened and booked by anyone | `show()` and booking creation never looked at the event status | Drafts return 404 to everyone but the owner and admin; booking a draft, cancelled or finished event returns 409 |
| A cancelled booking still produced a QR code | The QR endpoint only checked that a token existed | It now also requires the booking to be confirmed or attended |
| Event titles went into emails unescaped | Titles were pasted into the HTML body | Everything typed by a person is escaped |
| Screens showed stale data until refresh | A page loaded its data once | Screens re-ask every 5 seconds while visible, keep the old data through a dropped connection, and stop when the tab is hidden |
| Paying a few times stopped a customer from booking | The four `throttle:n,m` limits (booking, payment, joining, password reset) share one counter for the same user, so payments used up the 5-a-minute booking allowance | Each limit has its own counter (`throttle:5,1,book`, `20,1,pay`, and so on). A test makes six payment and six join attempts and then books four times |
| Signed out by a passing network error | The session check cleared the token on any failure | Only a real `401` ends the session |

## Reproduce

From the project root, with the API running:

```bash
cd backend
docker compose exec -T pgsql psql -U sail -d laravel -v ON_ERROR_STOP=1 < ../docs/performance/seed-bulk.sql
cd ..
python docs/performance/measure.py "Label for this run"
cd backend
docker compose exec -T pgsql psql -U sail -d laravel -f - < ../docs/performance/explain.sql | grep -E "^Q[0-9]|Execution Time"
cp ../docs/performance/query-count.php storage/query_count.php
docker compose exec -T laravel.test php storage/query_count.php ; rm storage/query_count.php
docker compose exec -T pgsql psql -U sail -d laravel -v ON_ERROR_STOP=1 < ../docs/performance/cleanup-bulk.sql
```

To see the "before" numbers again, roll the indexes back (`php artisan migrate:rollback --step=1`), run the same commands, then migrate again.

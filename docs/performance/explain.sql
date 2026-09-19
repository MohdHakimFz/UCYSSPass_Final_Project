-- The database side of each slow endpoint, with the time Postgres spent on it.
-- Run from the backend folder:
--   docker compose exec -T pgsql psql -U sail -d laravel -f - < ../docs/performance/explain.sql | grep -E "^(Q[0-9]+|Execution)"
-- Q1  customer's own bookings, newest first
\echo Q1 customer bookings
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT * FROM bookings
WHERE customer_id = (SELECT id FROM users WHERE email = 'customer@sentrypass.test')
ORDER BY booked_at DESC LIMIT 50;

-- Q2  admin booking list, newest first (and the count that pagination needs)
\echo Q2 admin booking list
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT * FROM bookings ORDER BY booked_at DESC LIMIT 10;

-- Q3  admin filtering by status
\echo Q3 waitlisted bookings
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT * FROM bookings WHERE status = 'waitlisted' ORDER BY booked_at DESC LIMIT 10;

-- Q4  public event list with the price and seat totals over each event's tiers
\echo Q4 public event list
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT e.*,
       (SELECT min(price) FROM ticket_types WHERE event_id = e.id) AS from_price,
       (SELECT sum(seats_remaining) FROM ticket_types WHERE event_id = e.id) AS seats_remaining,
       (SELECT sum(capacity) FROM ticket_types WHERE event_id = e.id) AS capacity
FROM events e
WHERE e.status = 'published' AND e.start_at >= now()
ORDER BY e.start_at LIMIT 8;

-- Q5  organiser summary: bookings on the organiser's own events, by status
\echo Q5 organiser booking totals
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT b.status, count(*) FROM bookings b
WHERE b.ticket_type_id IN (SELECT t.id FROM ticket_types t JOIN events e ON e.id = t.event_id
                           WHERE e.organiser_id = (SELECT id FROM users WHERE email = 'carmen.paucek@example.com'))
GROUP BY b.status;

-- Q6  one event's waitlist and check-in numbers
\echo Q6 one event's booking totals
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT b.status, count(*) FROM bookings b
WHERE b.ticket_type_id IN (SELECT id FROM ticket_types WHERE event_id = (SELECT min(id) FROM events WHERE title LIKE 'PERF %'))
GROUP BY b.status;

-- Q7  the sweep that gives back seats whose payment hold ran out (runs every minute)
\echo Q7 expired holds
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT id FROM bookings WHERE status = 'pending' AND hold_expires_at IS NOT NULL AND hold_expires_at < now();

-- Q8  the reminder job: who is due a reminder, and has not had one
\echo Q8 reminder candidates
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT b.id FROM bookings b
WHERE b.status = 'confirmed' AND b.booked_at <= now() - interval '1 hour'
  AND EXISTS (SELECT 1 FROM ticket_types t JOIN events e ON e.id = t.event_id
              WHERE t.id = b.ticket_type_id AND e.status = 'published' AND e.start_at > now() AND e.start_at <= now() + interval '24 hours')
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.booking_id = b.id AND n.type = 'reminder');

-- Q9  the email log for one booking (booking screens and the reminder check)
\echo Q9 email log of one booking
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT * FROM notifications WHERE booking_id = (SELECT min(id) + 500 FROM bookings);

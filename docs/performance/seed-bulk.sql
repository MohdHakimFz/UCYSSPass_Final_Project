-- Fills the development database with a realistic amount of data, so response times mean something.
-- Everything it adds is marked (users @bulk.test, events titled "PERF ...") and cleanup-bulk.sql removes it again.
-- Run from the backend folder:
--   docker compose exec -T pgsql psql -U sail -d laravel -v ON_ERROR_STOP=1 < ../docs/performance/seed-bulk.sql
-- Adds: 3,000 customers, 400 events, 1,200 ticket tiers, 80,300 bookings, up to 60,000 email log rows.

BEGIN;

-- Customers (same password as the demo accounts: "password")
INSERT INTO users (name, email, password, role, created_at, updated_at)
SELECT 'Bulk Customer ' || n, 'perf' || n || '@bulk.test',
       (SELECT password FROM users WHERE email = 'customer@sentrypass.test'), 'customer', now(), now()
FROM generate_series(1, 3000) AS n;

-- Events spread over a year, owned by the existing organisers, in the existing venues
INSERT INTO events (venue_id, organiser_id, title, description, category, start_at, end_at, status, created_at, updated_at)
SELECT (SELECT id FROM venues ORDER BY id OFFSET (n % (SELECT count(*) FROM venues)) LIMIT 1),
       (SELECT id FROM users WHERE role = 'organiser' ORDER BY id OFFSET (n % (SELECT count(*) FROM users WHERE role = 'organiser')) LIMIT 1),
       'PERF ' || (ARRAY['CTF','Bootcamp','Conference','Workshop'])[1 + n % 4] || ' ' || n,
       'Bulk test event ' || n,
       (ARRAY['ctf','bootcamp','conference','workshop'])[1 + n % 4],
       now() + ((n - 100) || ' days')::interval,
       now() + ((n - 100) || ' days')::interval + interval '3 hours',
       (ARRAY['published','published','published','draft','completed'])[1 + n % 5],
       now(), now()
FROM generate_series(1, 400) AS n;

INSERT INTO ticket_types (event_id, name, price, capacity, seats_remaining, created_at, updated_at)
SELECT e.id, t.name, t.price, 1000, 500, now(), now()
FROM events e
CROSS JOIN (VALUES ('Early Bird', 0), ('Standard', 25), ('VIP', 60)) AS t(name, price)
WHERE e.title LIKE 'PERF %';

-- Numbered list of the new customers and tiers, so the bookings below can pick from them by position
CREATE TEMP TABLE bulk_customers AS
SELECT row_number() OVER (ORDER BY id) AS pos, id FROM users WHERE email LIKE '%@bulk.test';
CREATE TEMP TABLE bulk_tiers AS
SELECT row_number() OVER (ORDER BY t.id) AS pos, t.id FROM ticket_types t JOIN events e ON e.id = t.event_id WHERE e.title LIKE 'PERF %';

-- 80,000 bookings from spread-out customers on spread-out tiers (no seat: these are plain tickets)
INSERT INTO bookings (customer_id, ticket_type_id, status, qr_token, booked_at, checked_in_at, hold_expires_at, created_at, updated_at)
SELECT c.id, t.id, s.status,
       CASE WHEN s.status IN ('confirmed', 'attended') THEN md5(random()::text) END,
       now() - (random() * 90 || ' days')::interval,
       CASE WHEN s.status = 'attended' THEN now() - interval '1 day' END,
       CASE WHEN s.status = 'pending' THEN now() + interval '1 day' END,
       now(), now()
FROM generate_series(1, 80000) AS g
JOIN bulk_customers c ON c.pos = 1 + (g::bigint * 7919) % 3000
JOIN bulk_tiers t ON t.pos = 1 + (g::bigint * 104729) % 1200
CROSS JOIN LATERAL (SELECT (ARRAY['confirmed','confirmed','confirmed','confirmed','confirmed','confirmed','cancelled','attended','waitlisted','pending'])[1 + g % 10] AS status) AS s;

-- The demo customer is a heavy user too: 300 bookings of their own
INSERT INTO bookings (customer_id, ticket_type_id, status, qr_token, booked_at, created_at, updated_at)
SELECT (SELECT id FROM users WHERE email = 'customer@sentrypass.test'), t.id, 'confirmed', md5(random()::text),
       now() - (g || ' hours')::interval, now(), now()
FROM generate_series(1, 300) AS g
JOIN bulk_tiers t ON t.pos = 1 + (g * 3) % 1200;

-- An email log row for most of the new bookings
INSERT INTO notifications (booking_id, type, channel, sent_at, provider_response, created_at, updated_at)
SELECT b.id, 'confirmation', 'email', now(), '{"status": 200}', now(), now()
FROM bookings b
WHERE b.customer_id IN (SELECT id FROM bulk_customers) OR b.customer_id = (SELECT id FROM users WHERE email = 'customer@sentrypass.test')
LIMIT 60000;

COMMIT;
ANALYZE;

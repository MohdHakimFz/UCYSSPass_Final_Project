-- Removes everything seed-bulk.sql added. Bookings and email log rows go with their events and users.
-- Run from the backend folder:
--   docker compose exec -T pgsql psql -U sail -d laravel -v ON_ERROR_STOP=1 < ../docs/performance/cleanup-bulk.sql
BEGIN;
DELETE FROM events WHERE title LIKE 'PERF %';
DELETE FROM users WHERE email LIKE '%@bulk.test';
COMMIT;
ANALYZE;

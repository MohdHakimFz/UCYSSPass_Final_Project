-- UCYSS / SentryPass: sample data (DML).
-- Run after schema.sql. At least five rows in every table, covering every status, both event modes and both payment outcomes.
-- Every account has the password "password".
--   psql -d yourdb -f schema.sql
--   psql -d yourdb -f sample-data.sql

BEGIN;

-- 8 users: 1 admin, 2 organisers, 5 customers
INSERT INTO users (id, name, email, password, role, created_at, updated_at) VALUES
  (1, 'UCYSS Admin',    'admin@ucyss.test',   '$2y$12$Kd7tVu1Z6rTmAXiDv.XX5OAtvBKEHSeLI0gC6C8rrELiQhjnXlbuG', 'admin',     '2026-09-01 09:00:00', '2026-09-01 09:00:00'),
  (2, 'Nurul Aisyah',   'aisyah@ucyss.test',  '$2y$12$Kd7tVu1Z6rTmAXiDv.XX5OAtvBKEHSeLI0gC6C8rrELiQhjnXlbuG', 'organiser', '2026-09-01 09:05:00', '2026-09-01 09:05:00'),
  (3, 'Farid Rahman',   'farid@ucyss.test',   '$2y$12$Kd7tVu1Z6rTmAXiDv.XX5OAtvBKEHSeLI0gC6C8rrELiQhjnXlbuG', 'organiser', '2026-09-01 09:10:00', '2026-09-01 09:10:00'),
  (4, 'Adam Iskandar',  'adam@ucyss.test',    '$2y$12$Kd7tVu1Z6rTmAXiDv.XX5OAtvBKEHSeLI0gC6C8rrELiQhjnXlbuG', 'customer',  '2026-09-02 10:00:00', '2026-09-02 10:00:00'),
  (5, 'Balqis Hana',    'balqis@ucyss.test',  '$2y$12$Kd7tVu1Z6rTmAXiDv.XX5OAtvBKEHSeLI0gC6C8rrELiQhjnXlbuG', 'customer',  '2026-09-02 10:05:00', '2026-09-02 10:05:00'),
  (6, 'Chen Wei',       'chen@ucyss.test',    '$2y$12$Kd7tVu1Z6rTmAXiDv.XX5OAtvBKEHSeLI0gC6C8rrELiQhjnXlbuG', 'customer',  '2026-09-02 10:10:00', '2026-09-02 10:10:00'),
  (7, 'Danish Irfan',   'danish@ucyss.test',  '$2y$12$Kd7tVu1Z6rTmAXiDv.XX5OAtvBKEHSeLI0gC6C8rrELiQhjnXlbuG', 'customer',  '2026-09-03 11:00:00', '2026-09-03 11:00:00'),
  (8, 'Elena Sofia',    'elena@ucyss.test',   '$2y$12$Kd7tVu1Z6rTmAXiDv.XX5OAtvBKEHSeLI0gC6C8rrELiQhjnXlbuG', 'customer',  '2026-09-03 11:05:00', '2026-09-03 11:05:00');

-- 6 venues; "Online" is the one shared venue every online event points at
INSERT INTO venues (id, name, address, capacity, created_at, updated_at) VALUES
  (1, 'Online',               'Online meeting',                               100000, '2026-09-01 09:00:00', '2026-09-01 09:00:00'),
  (2, 'Dewan Utama UPTM',     'UPTM Kampus Utama, Kuala Lumpur',                 400, '2026-09-01 09:00:00', '2026-09-01 09:00:00'),
  (3, 'Makmal Komputer 3',    'Blok C, Tingkat 2, UPTM Kuala Lumpur',             60, '2026-09-01 09:00:00', '2026-09-01 09:00:00'),
  (4, 'Auditorium Blok B',    'Blok B, UPTM Kuala Lumpur',                       250, '2026-09-01 09:00:00', '2026-09-01 09:00:00'),
  (5, 'Bilik Seminar 2',      'Blok A, Tingkat 1, UPTM Kuala Lumpur',             40, '2026-09-01 09:00:00', '2026-09-01 09:00:00'),
  (6, 'Cyber Range Lab',      'Blok D, Tingkat 3, UPTM Kuala Lumpur',             30, '2026-09-01 09:00:00', '2026-09-01 09:00:00');

-- 7 events: online and in-person, and every status
INSERT INTO events (id, venue_id, organiser_id, title, description, category, mode, meeting_url, meeting_platform, seated, start_at, end_at, status, created_at, updated_at) VALUES
  (1, 1, 2, 'Intro to Web Hacking (Online)',  'Two hours on the OWASP Top 10, live on Google Meet.',            'workshop',   'online',   'https://meet.google.com/abc-defg-hij', 'meet', false, '2026-10-24 20:00:00', '2026-10-24 22:00:00', 'published', '2026-09-10 09:00:00', '2026-09-10 09:00:00'),
  (2, 3, 2, 'UCYSS Capture the Flag 2026',    'A day of challenges. Pick your seat in the lab.',                 'ctf',        'physical', NULL, NULL, true,  '2026-11-07 09:00:00', '2026-11-07 17:00:00', 'published', '2026-09-10 09:10:00', '2026-09-10 09:10:00'),
  (3, 6, 3, 'Malware Analysis Bootcamp',      'Hands-on static and dynamic analysis in a safe lab.',             'bootcamp',   'physical', NULL, NULL, false, '2026-11-14 09:00:00', '2026-11-14 18:00:00', 'published', '2026-09-11 09:00:00', '2026-09-11 09:00:00'),
  (4, 2, 3, 'Cybersecurity Career Talk',      'Speakers from the industry on how to start.',                     'conference', 'physical', NULL, NULL, false, '2026-11-28 14:00:00', '2026-11-28 17:00:00', 'published', '2026-09-11 09:10:00', '2026-09-11 09:10:00'),
  (5, 5, 2, 'Cloud Security Workshop',        'Still being planned.',                                            'workshop',   'physical', NULL, NULL, false, '2026-12-05 10:00:00', '2026-12-05 13:00:00', 'draft',     '2026-09-12 09:00:00', '2026-09-12 09:00:00'),
  (6, 1, 3, 'Phishing Awareness Session',     'Spot the phish. Held on Zoom.',                                   'workshop',   'online',   'https://uptm.zoom.us/j/123456789',     'zoom', false, '2026-09-05 20:00:00', '2026-09-05 21:30:00', 'completed', '2026-08-25 09:00:00', '2026-09-05 21:30:00'),
  (7, 3, 2, 'Kali Linux Install Fest',        'Cancelled because the lab was closed.',                           'workshop',   'physical', NULL, NULL, false, '2026-10-10 14:00:00', '2026-10-10 17:00:00', 'cancelled', '2026-09-01 09:00:00', '2026-09-20 09:00:00');

-- 10 ticket tiers
INSERT INTO ticket_types (id, event_id, name, price, capacity, seats_remaining, seats_per_row, created_at, updated_at) VALUES
  (1,  1, 'Free',       0.00, 100,  98, 10, '2026-09-10 09:05:00', '2026-10-01 10:00:00'),
  (2,  2, 'Standard',  10.00,  12,  10,  6, '2026-09-10 09:15:00', '2026-10-02 10:00:00'),
  (3,  2, 'VIP',       25.00,   6,   5,  3, '2026-09-10 09:16:00', '2026-10-05 10:00:00'),
  (4,  3, 'Early Bird', 30.00, 30,  29, 10, '2026-09-11 09:05:00', '2026-10-03 10:00:00'),
  (5,  3, 'Standard',  50.00,  30,  30, 10, '2026-09-11 09:06:00', '2026-09-11 09:06:00'),
  (6,  4, 'Free',       0.00, 200, 200, 10, '2026-09-11 09:15:00', '2026-09-11 09:15:00'),
  (7,  5, 'Free',       0.00,  40,  40, 10, '2026-09-12 09:05:00', '2026-09-12 09:05:00'),
  (8,  6, 'Free',       0.00,  80,  78, 10, '2026-08-25 09:05:00', '2026-09-05 19:58:00'),
  (9,  7, 'Free',       0.00,  30,  30, 10, '2026-09-01 09:05:00', '2026-09-01 09:05:00'),
  (10, 4, 'Front row',  0.00,   2,   0, 10, '2026-09-11 09:16:00', '2026-10-04 10:00:00');

-- 18 numbered seats: 12 in the Standard tier of the CTF (rows A and B of 6), 6 in its VIP tier (rows A and B of 3)
INSERT INTO seats (id, ticket_type_id, row_label, number, created_at, updated_at) VALUES
  (1, 2, 'A', 1, '2026-09-10 09:15:00', '2026-09-10 09:15:00'), (2, 2, 'A', 2, '2026-09-10 09:15:00', '2026-09-10 09:15:00'),
  (3, 2, 'A', 3, '2026-09-10 09:15:00', '2026-09-10 09:15:00'), (4, 2, 'A', 4, '2026-09-10 09:15:00', '2026-09-10 09:15:00'),
  (5, 2, 'A', 5, '2026-09-10 09:15:00', '2026-09-10 09:15:00'), (6, 2, 'A', 6, '2026-09-10 09:15:00', '2026-09-10 09:15:00'),
  (7, 2, 'B', 1, '2026-09-10 09:15:00', '2026-09-10 09:15:00'), (8, 2, 'B', 2, '2026-09-10 09:15:00', '2026-09-10 09:15:00'),
  (9, 2, 'B', 3, '2026-09-10 09:15:00', '2026-09-10 09:15:00'), (10, 2, 'B', 4, '2026-09-10 09:15:00', '2026-09-10 09:15:00'),
  (11, 2, 'B', 5, '2026-09-10 09:15:00', '2026-09-10 09:15:00'), (12, 2, 'B', 6, '2026-09-10 09:15:00', '2026-09-10 09:15:00'),
  (13, 3, 'A', 1, '2026-09-10 09:16:00', '2026-09-10 09:16:00'), (14, 3, 'A', 2, '2026-09-10 09:16:00', '2026-09-10 09:16:00'),
  (15, 3, 'A', 3, '2026-09-10 09:16:00', '2026-09-10 09:16:00'), (16, 3, 'B', 1, '2026-09-10 09:16:00', '2026-09-10 09:16:00'),
  (17, 3, 'B', 2, '2026-09-10 09:16:00', '2026-09-10 09:16:00'), (18, 3, 'B', 3, '2026-09-10 09:16:00', '2026-09-10 09:16:00');

-- 12 bookings: every status. Confirmed and attended ones carry a signed ticket; a pending one carries a payment hold.
INSERT INTO bookings (id, customer_id, ticket_type_id, seat_id, status, qr_token, booked_at, checked_in_at, hold_expires_at, created_at, updated_at) VALUES
  (1,  4, 1,  NULL, 'confirmed',  '831ba420e01d1e1c357cf63e8b8b2098c759665a108b73b027b892c3e98f1b7c',  '2026-10-01 10:00:00', NULL,                  NULL,                  '2026-10-01 10:00:00', '2026-10-01 10:00:00'),
  (2,  5, 1,  NULL, 'confirmed',  '1e57840fd69a334355299085789705c2ddf5ae041640a3a79c622f5fd90dd168',  '2026-10-01 10:05:00', NULL,                  NULL,                  '2026-10-01 10:05:00', '2026-10-01 10:05:00'),
  (3,  4, 2,  1,    'confirmed',  '0c8315bda63684927b1e1b008624ccdae8347e15fcea712b4a5dd4ac45a4e4d5',  '2026-10-02 10:00:00', NULL,                  NULL,                  '2026-10-02 10:00:00', '2026-10-02 10:01:00'),
  (4,  5, 2,  2,    'confirmed',  '3fc82da4d4d51c3836485506924ffa0b5860ff3d0625b677411998aa6d09d3dd',  '2026-10-02 10:10:00', NULL,                  NULL,                  '2026-10-02 10:10:00', '2026-10-02 10:11:00'),
  (5,  6, 3,  13,   'pending',    NULL,       '2026-10-05 10:00:00', NULL,                  '2026-10-05 10:03:00', '2026-10-05 10:00:00', '2026-10-05 10:00:00'),
  (6,  6, 4,  NULL, 'confirmed',  'eae45a14692c0690d8832f6129dc9ba19c182fb80663fe0e1205458e62a6687c',  '2026-10-03 09:00:00', NULL,                  NULL,                  '2026-10-03 09:00:00', '2026-10-03 09:01:00'),
  (7,  7, 10, NULL, 'confirmed',  '5b0e67058c64b52ae01d40ccf063cb3ad894355eac6cc05ab595acd9c37cd312',  '2026-10-04 09:00:00', NULL,                  NULL,                  '2026-10-04 09:00:00', '2026-10-04 09:00:00'),
  (8,  8, 10, NULL, 'confirmed',  'fd111a6f7b8e325e1c799943bfc0e6617c5d5da64fe86f8344830f4b6ecb1c1a',  '2026-10-04 09:05:00', NULL,                  NULL,                  '2026-10-04 09:05:00', '2026-10-04 09:05:00'),
  (9,  4, 10, NULL, 'waitlisted', NULL,       '2026-10-04 09:10:00', NULL,                  NULL,                  '2026-10-04 09:10:00', '2026-10-04 09:10:00'),
  (10, 8, 8,  NULL, 'attended',   '6938c12e2c6433ff035d308f02d4412fc327ee80b251b5f98b71719b961e6033', '2026-08-28 12:00:00', '2026-09-05 19:58:00', NULL,                  '2026-08-28 12:00:00', '2026-09-05 19:58:00'),
  (11, 7, 8,  NULL, 'attended',   'cda68871a556e55bdc96bb8715e2e328683646a6156cccde62d631b7202bb09f', '2026-08-28 12:05:00', '2026-09-05 19:59:00', NULL,                  '2026-08-28 12:05:00', '2026-09-05 19:59:00'),
  (12, 5, 4,  NULL, 'cancelled',  NULL,       '2026-10-03 09:30:00', NULL,                  NULL,                  '2026-10-03 09:30:00', '2026-10-03 12:00:00');

-- 6 payments: paid, refunded and declined attempts (the payment gateway is a sandbox)
INSERT INTO payments (id, booking_id, amount, method, status, reference, failure_reason, paid_at, refunded_at, refunded_amount, created_at, updated_at) VALUES
  (1, 3,  10.00, 'card',    'paid',     'PAY-20261002-0001', NULL,                       '2026-10-02 10:01:00', NULL,                  0.00,  '2026-10-02 10:01:00', '2026-10-02 10:01:00'),
  (2, 4,  10.00, 'fpx',     'paid',     'PAY-20261002-0002', NULL,                       '2026-10-02 10:11:00', NULL,                  0.00,  '2026-10-02 10:11:00', '2026-10-02 10:11:00'),
  (3, 6,  30.00, 'ewallet', 'paid',     'PAY-20261003-0001', NULL,                       '2026-10-03 09:01:00', NULL,                  0.00,  '2026-10-03 09:01:00', '2026-10-03 09:01:00'),
  (4, 12, 30.00, 'card',    'refunded', 'PAY-20261003-0002', NULL,                       '2026-10-03 09:31:00', '2026-10-03 12:00:00', 30.00, '2026-10-03 09:31:00', '2026-10-03 12:00:00'),
  (5, 5,  25.00, 'card',    'failed',   NULL,                'The payment was declined.', NULL,                  NULL,                  0.00,  '2026-10-05 10:01:00', '2026-10-05 10:01:00'),
  (6, 5,  25.00, 'card',    'failed',   NULL,                'Insufficient funds.',       NULL,                  NULL,                  0.00,  '2026-10-05 10:02:00', '2026-10-05 10:02:00');

-- 5 announcements an organiser sent to the guests of an event
INSERT INTO announcements (id, event_id, sender_id, subject, message, recipients, created_at, updated_at) VALUES
  (1, 1, 2, 'Room link and what to install', E'The meeting link is on your pass, and it opens 15 minutes before we start.\nPlease install Burp Suite Community first.', 2, '2026-10-22 09:00:00', '2026-10-22 09:00:00'),
  (2, 2, 2, 'Bring your student card',        E'Bring your student card for the lab door.\nParking is at Blok C.',                                                       3, '2026-11-05 10:00:00', '2026-11-05 10:00:00'),
  (3, 3, 3, 'Lab moved to level 3',           'The Cyber Range Lab is on level 3, Blok D.',                                                                            2, '2026-11-12 09:30:00', '2026-11-12 09:30:00'),
  (4, 4, 3, 'Doors open at 1:30 pm',          'Doors open at 1:30 pm, and the talk starts at 2:00 pm sharp.',                                                          1, '2026-11-27 12:00:00', '2026-11-27 12:00:00'),
  (5, 1, 2, 'Recording',                      'A recording will be shared after the session.',                                                                         2, '2026-10-24 22:15:00', '2026-10-24 22:15:00');

-- 7 email log rows, with the raw answer from the email provider
INSERT INTO notifications (id, booking_id, type, channel, sent_at, provider_response, created_at, updated_at) VALUES
  (1, 1,  'confirmation',      'email', '2026-10-01 10:00:02', '{"status": 200, "body": {"id": "sample-email-1"}}', '2026-10-01 10:00:02', '2026-10-01 10:00:02'),
  (2, 3,  'confirmation',      'email', '2026-10-02 10:01:02', '{"status": 200, "body": {"id": "sample-email-2"}}', '2026-10-02 10:01:02', '2026-10-02 10:01:02'),
  (3, 6,  'confirmation',      'email', '2026-10-03 09:01:02', '{"status": 200, "body": {"id": "sample-email-3"}}', '2026-10-03 09:01:02', '2026-10-03 09:01:02'),
  (4, 12, 'cancelled',         'email', '2026-10-03 12:00:02', '{"status": 200, "body": {"id": "sample-email-4"}}', '2026-10-03 12:00:02', '2026-10-03 12:00:02'),
  (5, 7,  'waitlist_promoted', 'email', '2026-10-04 09:00:02', '{"status": 200, "body": {"id": "sample-email-5"}}', '2026-10-04 09:00:02', '2026-10-04 09:00:02'),
  (6, 1,  'reminder',          'email', '2026-10-23 12:00:02', '{"status": 200, "body": {"id": "sample-email-6"}}', '2026-10-23 12:00:02', '2026-10-23 12:00:02'),
  (7, 2,  'reminder',          'email', '2026-10-23 12:00:03', '{"status": 403, "body": {"name": "validation_error"}}', '2026-10-23 12:00:03', '2026-10-23 12:00:03');

-- Five emails that carried an announcement (announcement_id says which one)
INSERT INTO notifications (id, booking_id, announcement_id, type, channel, sent_at, provider_response, created_at, updated_at) VALUES
  (8,  1, 1, 'announcement', 'email', '2026-10-22 09:00:05', '{"status": 200, "body": {"id": "sample-email-8"}}',  '2026-10-22 09:00:05', '2026-10-22 09:00:05'),
  (9,  2, 1, 'announcement', 'email', '2026-10-22 09:00:06', '{"status": 200, "body": {"id": "sample-email-9"}}',  '2026-10-22 09:00:06', '2026-10-22 09:00:06'),
  (10, 3, 2, 'announcement', 'email', '2026-11-05 10:00:05', '{"status": 200, "body": {"id": "sample-email-10"}}', '2026-11-05 10:00:05', '2026-11-05 10:00:05'),
  (11, 6, 3, 'announcement', 'email', '2026-11-12 09:30:05', '{"status": 200, "body": {"id": "sample-email-11"}}', '2026-11-12 09:30:05', '2026-11-12 09:30:05'),
  (12, 7, 4, 'announcement', 'email', '2026-11-27 12:00:05', '{"status": 403, "body": {"name": "validation_error"}}', '2026-11-27 12:00:05', '2026-11-27 12:00:05');

-- Ids were given by hand above, so move each id counter past them
SELECT setval('users_id_seq', (SELECT max(id) FROM users));
SELECT setval('venues_id_seq', (SELECT max(id) FROM venues));
SELECT setval('events_id_seq', (SELECT max(id) FROM events));
SELECT setval('ticket_types_id_seq', (SELECT max(id) FROM ticket_types));
SELECT setval('seats_id_seq', (SELECT max(id) FROM seats));
SELECT setval('bookings_id_seq', (SELECT max(id) FROM bookings));
SELECT setval('payments_id_seq', (SELECT max(id) FROM payments));
SELECT setval('notifications_id_seq', (SELECT max(id) FROM notifications));
SELECT setval('announcements_id_seq', (SELECT max(id) FROM announcements));

-- Two students are on the member list, and the draft workshop has a members-only tier
UPDATE users SET is_member = true WHERE id IN (4, 5);
UPDATE ticket_types SET members_only = true WHERE id = 7;

COMMIT;

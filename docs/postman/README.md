# Postman collection

Two files:

| File | What it is |
| --- | --- |
| `SentryPass.postman_collection.json` | **198 requests in 20 folders, with 309 test assertions** (collection name in Postman: "UCYSS API") |
| `SentryPass.local.postman_environment.json` | Local settings: `base_url`, admin login, check-in device key |

## Run it in Postman

1. **Import** both files.
2. Choose the **SentryPass Local** environment (top right).
3. Start the API (`docker compose up -d` in `backend/`) with the seeded database.
4. Set `checkin_api_key` in the environment to the value of `CHECKIN_API_KEY` in `backend/.env` (see the notes below).
5. Right-click the collection → **Run collection** → **Run**. Keep the order; later requests use ids and tokens saved by earlier ones.

## Run it from the command line

```bash
npx newman run docs/postman/SentryPass.postman_collection.json \
  -e docs/postman/SentryPass.local.postman_environment.json \
  --env-var "checkin_api_key=<your CHECKIN_API_KEY>"
```

Last run: 198 requests, 309 assertions, 0 failures (about 55 seconds).

## What it covers

Each folder mixes the success case and the error cases (401, 403, 404, 409, 422, 429).

| Folder | Covers |
| --- | --- |
| 1. Setup | Admin login; creates two organisers and three customers for the run |
| 2. Auth | Register, validation errors, wrong password, `me`, logout revokes the token |
| 3. Users | Admin list and filter, self-service, role escalation ignored, password change |
| 4. Venues | Public list and search, admin create and update, validation |
| 5. Events | Create, ownership rules, filters, search, sorting, JSON 404 |
| 6. Ticket types | Tier CRUD, ownership, `seats_remaining <= capacity` |
| 7. Bookings | Seat booking, waitlist, duplicate block, QR image, forged and genuine check-in (Bearer and device API key), waitlist auto-promotion, cancel |
| 8. Anti-scalping rate limit | Five attempts pass, the sixth returns 429 |
| 9. Organiser tools | Event statistics, CSV export, duplicate, delete guard |
| 10. Admin | Platform stats, email log, CSV exports, venue delete guard |
| 11. Cancel an event | Cancelling cancels every active booking |
| 12. Paid tickets, seat holds and refunds | A paid booking is held as `pending`, a declined payment (402), an invalid method (422), only the owner can pay (403), approval confirms it, paying twice (409), a refund on cancel |
| 13. Numbered seats | Public seat list (no personal data), a seat is required (422), a taken seat (409), the organiser's seat map (owner only) |
| 14. Online events and joining | No venue needed, publishing needs a link (422), the platform is detected from the link, the link is hidden from the public and customers, joining before the meeting opens (422), someone else's booking (403), joining when open returns the link and marks the booking attended |
| 15. Drafts stay private | A draft is 404 to the public, customers and other organisers, visible to the owner and admin, cannot be booked (409), the organiser publishes it themselves |
| 16. Members-only tickets | A tier limited to members, a non-member is refused (403), nobody can make themselves a member, an admin adds a customer to the member list, the customer can then book, and the admin's people search |
| 17. Announcements to guests | Nobody booked means nobody to tell (422), a subject is required, another organiser and a customer are refused (403), the organiser sends to everyone booked, the history, and the admin email log |
| 18. Certificate of attendance | No certificate before attending (422) or before the event ends (422), the booking says it is ready, the guest downloads a real PDF, another customer is refused (403), anyone can check the code, and a wrong code is a plain 404 |
| 19. Organiser summary, attendance and password reset | `/organiser/summary`, attendance, the same answer for a known and an unknown email, a wrong reset code |
| 20. Cleanup | Deletes everything the run created |

## Notes

- **Self-contained and repeatable.** The run creates its own users (`…@postman.test`) and removes them in folder 20, so it needs only the seeded admin account and leaves the database as it found it. If a run stops halfway, delete the leftover `@postman.test` users from the admin People page. The shared "Online" venue, created by the first online event, stays.
- **Wait a minute between runs.** Some routes are rate limited on purpose: `POST /bookings` allows 5 attempts a minute per user, and `forgot-password` allows 3 a minute per address. A second run straight after the first can hit a 429 on those. The collection uses fresh customers for the booking limits, so this only matters for `forgot-password` (folder 19).
- **QR code request** (7.12) calls the external QR API, so it needs internet access from the API container.
- **Check-in device key.** `checkin_api_key` in the environment must match `CHECKIN_API_KEY` in `backend/.env`. The environment file ships with the development default; if you changed the key in `.env` (you should, before deploying), request 7.17 returns 401 until the environment matches. Do not commit a real key.
- **Time-dependent request.** Folder 14 creates an online event that starts ten minutes after the run began, so the meeting is open when the guest joins. The times are computed in a pre-request script.
- **Paid tiers.** A paid ticket is `pending` until paid, so the ticket, check-in and waitlist cases in folders 6 to 11 use free (RM 0) tiers, and folder 12 covers paying.

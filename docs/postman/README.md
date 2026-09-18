# Postman collection

Two files:

| File | What it is |
| --- | --- |
| `SentryPass.postman_collection.json` | 105 requests in 12 folders, with 156 test assertions |
| `SentryPass.local.postman_environment.json` | Local settings: `base_url`, admin login, check-in device key |

## Run it in Postman

1. **Import** both files.
2. Choose the **SentryPass Local** environment (top right).
3. Start the API (`docker compose up -d` in `backend/`) with the seeded database.
4. Right-click the collection → **Run collection** → **Run SentryPass API**. Keep the order; later requests use ids and tokens saved by earlier ones.

## Run it from the command line

```bash
npx newman run docs/postman/SentryPass.postman_collection.json \
  -e docs/postman/SentryPass.local.postman_environment.json
```

Last run: 105 requests, 156 assertions, 0 failures (about 21 seconds).

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
| 12. Cleanup | Deletes everything the run created |

## Notes

- **Self-contained and repeatable.** The run creates its own users (`…@postman.test`) and removes them in folder 12, so it needs only the seeded admin account and leaves the database as it found it. If a run stops halfway, delete the leftover `@postman.test` users from the Admin Dashboard.
- **Rate limit.** `POST /bookings` allows 5 attempts a minute per user. The collection uses a fresh customer for the rate-limit demo, so re-running straight away is fine.
- **QR code request** (7.12) calls the external QR API, so it needs internet access from the API container.
- **Check-in device key.** `checkin_api_key` in the environment must match `CHECKIN_API_KEY` in `backend/.env`.

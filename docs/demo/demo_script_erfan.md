# Erfan: Demo Section (target 4:00)

**Erfan Danish Bin Erwan | AM2512021556**
UCYSS mobile app (Expo React Native, folder `frontend/ucyss-mobile`), covering all three roles: Customer, Organiser, Administrator.

The brief marks this section on four things: the main tasks of all three roles, how the app uses the API, how it handles invalid input and errors, and a 3 to 4 minute length. Your name and student ID are added on screen in editing, and you also say them in Step 1.

Timing at a calm pace: Step 1 0:20, Step 2 0:50, Step 3 0:50, Step 4 0:40, Step 5 0:30, Step 6 0:35, Step 7 0:15. Total **about 4:00**.

---

## ACCOUNTS (sign in with these)

| Role | Email | Password | Used in |
|---|---|---|---|
| Customer | `customer@sentrypass.test` | `password` | Step 2, and the wrong-password test in Step 6.3 (type `wrong` as the password) |
| Organiser | `aisyah@ucyss.test` | `password` | Step 3 (spare organiser: `farid@ucyss.test` / `password`) |
| Admin | `admin@sentrypass.test` | `password` | Steps 4 and 6.1–6.2 |
| Test user you create in Step 4.3 | `erfan.demo@ucyss.test` | `password123` | Created on camera, deleted afterwards (see NOTES) |

Type these exactly: all lower case, no spaces. The four demo accounts are shared with the whole group, so never change their password, role or email.

---

## SETUP (do all of this before you press Record)

**S.1 Two recordings, joined in editing.**
- **Phone:** use the Android screen recorder with the microphone on, or `scrcpy --record erfan_phone.mp4` from the laptop.
- **VS Code:** record with OBS or Win+G while you narrate. Set the font size to 16–18 (Ctrl +) so the code can be read in the video.

**S.2 Start the app.** In `frontend/ucyss-mobile`, `.env` must say `EXPO_PUBLIC_API_URL=https://ucyss-api.onrender.com/api`. Run `npx expo start`, then open the UCYSS app on the phone. Open any screen once a minute before you record, so the Render server is awake and nothing stalls on camera.

**S.3 Sign in as the customer first:** `customer@sentrypass.test` / `password`. You will sign out and back in as the other roles during the recording, so practise that once.

**S.4 Pick the event for Step 2.** Choose one **free, non-seated** published event. Its tier button must say **Book this pass**, not "Choose a seat above". Remember its name, and do not use a seated event.

**S.5 Open the VS Code tabs** (Ctrl+P, type the file name, then Ctrl+G to jump to the line):

| Tab | File | Line | What is there |
|---|---|---|---|
| 1 | `src/lib/api.ts` | 76 | `Authorization: \`Bearer ${cachedToken}\`` is added to every request |
| 2 | `src/lib/api.ts` | 46 | `SecureStore.setItemAsync(TOKEN_KEY, t)` stores the token in secure storage |
| 3 | `src/lib/themeMode.tsx` | 29 | `AsyncStorage.setItem(KEY, next)` stores the theme (not sensitive) |
| 4 | `src/screens/admin/VenueFormScreen.tsx` | 33 | `api(... '/venues', { method: ... 'POST' ...})` is the venue request |
| 5 | `src/lib/manage.ts` | 45–58 | `describeError` (403 becomes "You are not allowed to do this.") and `fieldErrors` (422 messages per field) |
| 6 | `src/lib/api.ts` | 85 | `if (res.status === 401 && cachedToken && ...)` clears the token on a real 401 only |

Optional, for Step 5 if you have time: `src/lib/api.ts` line 27 (`TIMEOUT_MS = 45000`) and lines 103–104 (the two "Can't reach the server" messages).

**S.6 Turn on Do Not Disturb** on the phone and the laptop.

**VERIFY ON THE PHONE BEFORE RECORDING**
- [ ] Customer: booking the S.4 event shows "You're in. Your … pass is confirmed and waiting in My passes."
- [ ] Organiser (`aisyah@ucyss.test`): the tabs read **My events, Check-in, Bookings, Account**.
- [ ] Admin (`admin@sentrypass.test`): the tabs read **Overview, Events, Users, Venues, Account**.
- [ ] Venue form with Capacity `0` shows **"The capacity field must be at least 1."** in red under Capacity.
- [ ] Wrong password shows **"The provided credentials are incorrect."**

---

## RECORD

### STEP 1 — Intro (≈ 0:20)

**1.1**
DO: Show the phone on the customer **Events** tab.
SAY: "Hi, I'm Erfan Danish Bin Erwan, student ID AM2512021556. This is my mobile app for UCYSSPass, built with Expo React Native. It uses our group's API and database, and covers all three roles: customer, organiser and administrator. I'll show the main tasks for each role, how the app talks to the API, and how it handles errors."

### STEP 2 — First role: Customer (≈ 0:50)

**2.1**
DO: On **Events**, type part of the S.4 event's name in **Search events** and press search, then tap the **CTF** (or matching) category chip.
SAY: "First, the customer. I can search events and filter them by category."

**2.2**
DO: Tap the event. Scroll to the ticket tiers.
SAY: "The event page shows each ticket tier with its price and how many seats are left, so I can check availability."

**2.3**
DO: Tap **Book this pass**. Hold on the green message.
SAY: "I book a free pass, and the booking is confirmed straight away."

**2.4**
DO: Go back, open the **My passes** tab and show the new booking with its **Confirmed** status.
SAY: "My passes shows my own bookings with their status."

**2.5**
DO: On that booking tap **Cancel booking**, then **Cancel booking** in the dialog. Show the status change to **Cancelled**.
SAY: "And I can cancel an eligible booking. The app asks first, then the status updates."

### STEP 3 — Second role: Organiser (≈ 0:50)

**3.1**
DO: **Account** tab → **Sign out** → **Sign in** as `aisyah@ucyss.test` / `password`.
SAY: "Now let's move on to the second role, the organiser. After sign-in the app reads the user's role and shows different tabs."

**3.2**
DO: On **My events**, hold on the number tiles, then scroll the event list.
SAY: "My events shows the organiser's numbers, like tickets sold and revenue, and every event they own, including drafts."

**3.3**
DO: Tap **New event**. Fill in Title `Erfan Demo Event`, choose **CTF**, then **Online**, Meeting link `https://meet.google.com/abc-defg-hij`, Starts `2026-12-01 10:00`, Ends `2026-12-01 12:00`. Leave Status **Draft**. Tap **Create event**.
SAY: "Creating an event: title, category, online or physical, the schedule and the status."

**3.4**
DO: On the new event's page tap **Add tier**. Fill in Tier name `Free`, Price `0`, Seats `20`. Tap **Add tier**. Show the tier in the list.
SAY: "Then I add a ticket tier, which sets the price and how many seats are available."

**3.5**
DO: Open the **Bookings** tab and tap the **Confirmed** filter.
SAY: "The Bookings tab shows bookings for this organiser's events only, filtered by status."

### STEP 4 — Third role: Administrator (≈ 0:40)

**4.1**
DO: **Account** → **Sign out** → **Sign in** as `admin@sentrypass.test` / `password`. Hold on **Overview**.
SAY: "Next, the third role, the administrator. The overview shows system-wide records: revenue, users by role, events and bookings by status."

**4.2**
DO: Tap the **Events** tab and scroll briefly.
SAY: "The admin sees every event, including drafts, and can publish or cancel any of them."

**4.3**
DO: Tap **Users** → **New user**. Fill in Full name `Erfan Demo User`, Email `erfan.demo@ucyss.test`, Role **Customer**, Password `password123`. Tap **Create user**.
SAY: "Managing users: I create a new account and choose its role."

**4.4**
DO: Tap **Erfan Demo User** in the list, choose Role **Organiser**, then tap **Save changes**.
SAY: "And I change that user's role to organiser."

**4.5**
DO: Tap the **Venues** tab.
SAY: "The admin also manages venues, which I'll use in a moment."

### STEP 5 — How the app uses the API (≈ 0:30)

**5.1**
DO: Switch to VS Code, **Tab 1** (`api.ts` line 76).
SAY: "Every screen goes through one API helper. It adds the base URL from an environment variable, the JSON headers, and the bearer token on each request."

**5.2**
DO: **Tab 2** (`api.ts` line 46), then **Tab 3** (`themeMode.tsx` line 29).
SAY: "The token is kept in secure storage, while the theme setting stays in normal storage because it isn't sensitive."

**5.3**
DO: **Tab 4** (`VenueFormScreen.tsx` line 33).
SAY: "Each screen calls a REST endpoint. For example, saving a venue is a POST to slash venues, and an edit is a PUT."

### STEP 6 — Invalid input and errors (≈ 0:35)

**6.1**
DO: Back to the phone, still the admin on **Venues**. Tap **New venue**. Fill in Venue name `Erfan Demo Venue`, Address `UPTM`, Capacity `0`. Tap **Add venue**. Hold on the red text under Capacity.
SAY: "Invalid input. A venue with capacity zero. The server answers 422, and my app shows its message in red under the right field."

**6.2**
DO: Change Capacity to `50` and tap **Add venue**. Show the new venue in the list.
SAY: "I fix it, and the venue is saved."

**6.3**
DO: **Account** → **Sign out** → **Sign in** with `customer@sentrypass.test` and password `wrong`. Hold on the error.
SAY: "A wrong password gets a 401, and the app shows: the provided credentials are incorrect."

**6.4**
DO: VS Code, **Tab 5** (`manage.ts` lines 45–58), then **Tab 6** (`api.ts` line 85).
SAY: "Here a 403 becomes 'You are not allowed to do this', and 422 messages are matched to their fields. And the token is only cleared on a real 401, so a weak signal doesn't log people out."

### STEP 7 — Close (≈ 0:15)

**7.1**
DO: Back to the phone, on the sign-in screen.
SAY: "So that's one mobile app for all three roles, working against our shared API. My lesson was to handle every error the API can return, not only the happy path. Thank you."

[STOP RECORDING]

---

## NOTES

- **Delete your test data after recording.** The database is live and shared:
  - Organiser (`aisyah@ucyss.test`): open **Erfan Demo Event** → **Delete event**.
  - Admin: **Users** → **Erfan Demo User** → **Delete user**. **Venues** → **Erfan Demo Venue** → **Delete venue**.
  - The cancelled booking from Step 2 stays in the history. That is normal.
- **Never edit or delete** the seeded demo accounts, events or venues. The app itself locks the four demo accounts (marked `DEMO ·` in Users).
- **If you are under 3:45:** in Step 3, open the **Check-in** tab and say "the organiser can scan a guest's QR pass at the door". Do not scan anything unless you made the booking yourself.
- **If you are over 4:15:** drop 2.1's category chip and 4.2 (admin Events tab).
- **If the server is slow** (Render cold start), keep talking over it. The app waits up to 45 seconds (`TIMEOUT_MS` in `api.ts` line 27) and then shows "Can't reach the server. It may be waking up after being idle".
- **Editing:** cut the phone clip and the VS Code clip together in the order above. Keep the narration continuous so the cuts are clean.

# Aqqwa: Demo Script (target 4:00)

**Muhammad Nureel Aqqwa Bin Hisham** | Student ID **AM2512021715**
Section: my own web frontend, `frontend/aqqwa-web` (Vue 3 + Vite)

## How to read this

- **DO** = what I click or type.
- **SAY** = what I say, word for word.

## ACCOUNTS

Password for all demo accounts: `password`

| Who | Email | Used in |
|---|---|---|
| Customer | customer@sentrypass.test | Step 2, Step 5 |
| Organiser | aisyah@ucyss.test | Step 3, Step 6 (422) |
| Administrator | admin@sentrypass.test | Step 4 |
| Organiser (not the owner) | farid@ucyss.test | Step 6 (403) |
| Test user I create | aqqwa.demo@ucyss.test (name `Aqqwa Demo User`, password `password123`) | Step 4 |

## SETUP

1. In `frontend/aqqwa-web`, check `.env` says `VITE_API_URL=https://ucyss-api.onrender.com`, then run `npm run dev` and open http://localhost:5174.
2. Warm the server up 2 minutes before recording: open http://localhost:5174 and wait until the login page works with no yellow "Waking up the server" bar. Log in and out once.
3. Browser zoom **125%**.
4. **One window per account, each with its own storage.** My app keeps the token in localStorage, and all Incognito windows share one storage, so a second Incognito login would replace the first. Use:
   - Customer: Chrome (normal window)
   - Aisyah: Chrome Incognito
   - Admin: Microsoft Edge (normal window)
   - Farid: Edge InPrivate
5. In the **Customer** window, open DevTools docked at the **bottom**: **Network** tab, **Fetch/XHR**, tick **Preserve log**, right-click a column header and turn on **Method**. Just before Step 2.4, type `method:POST` in the Filter box.
6. Also open DevTools (Network, Fetch/XHR, Preserve log) in the **Aisyah** and **Farid** windows for Step 6.
7. VS Code: open `frontend/aqqwa-web/src/api.js`, `src/useForm.js` and `src/views/LoginView.vue` as tabs, with line numbers on and the font made bigger.
8. Turn on **Do Not Disturb** and close chat apps.

## VERIFY BEFORE RECORDING

Check each item in the browser. If anything is different, change the script to match the screen.

- [ ] Login page shows the label `UCYSSPass · Infosec events`, the title **Welcome ↘Back**, fields **Email** and **Password**, and the button **Log in →**.
- [ ] Customer menu shows **Events** and **My bookings**, and a **Log out** button.
- [ ] Events page: search box says `Search events by title...`, the category list has **Conference**, and **Cybersecurity Career Talk** (22 Oct, Dewan Utama UPTM) is listed.
- [ ] Its **Free** tier shows `... of 200 seats remaining` and a **Book →** button. The customer has no active booking for it yet (if they do, cancel it in My bookings first).
- [ ] After booking: **Booking confirmed** and the text "Your seat is booked. You can see it any time under My bookings."
- [ ] My bookings: status badge **Confirmed**, a red **Cancel** button, and after cancelling the green message `Booking #<number> was cancelled.`
- [ ] Organiser menu shows **Dashboard**, **My events** and **New event**. The dashboard tiles are **Events, Published, Drafts, Upcoming, Tickets sold, Checked in, Waitlisted, Net revenue**.
- [ ] New event form: **Title, Category, Status, Where (Physical / Online), Venue, Starts, Ends, Description**, and the button **Create event →**.
- [ ] After creating: the green message "Event created. Now add its ticket tiers." and the buttons **Publish**, **Edit details** and **Delete**.
- [ ] Add a tier form: **Name**, **Price (RM, 0 = free)**, **Capacity**, **Add tier**. After adding: `Ticket tier "General" added.`
- [ ] After Publish: "Event published. Customers can now book it." The Bookings box says "No bookings for this event yet."
- [ ] Admin menu shows **Overview, Users, Venues, Events, Bookings**. Overview tiles: **Net revenue, Gross revenue, Refunded, Users, Events, Bookings**.
- [ ] Users: **+ New user**, the form fields **Name, Email, Password (min 8 characters), Role**, and **Create user**. After saving: `User aqqwa.demo@ucyss.test created as customer.`
- [ ] Changing the role in the row shows `aqqwa.demo@ucyss.test is now organiser.` The demo accounts show "Demo account" and have no Delete button.
- [ ] Venues: the **Online** venue shows "Used by online events" instead of Delete.
- [ ] Empty New event form + Create event: red box "Please fix the highlighted fields." and red messages under the fields: "The title field is required.", "The category field is required.", "The venue id field is required.", "The start at field is required.", "The end at field is required." The Network tab shows `POST events` with status **422**.
- [ ] Farid opening `http://localhost:5174/#/organiser/events/17/edit` sees "Threat Hunting 101" (Aisyah's event). **Save changes** shows the red box "You are not allowed to do this." and Network shows `PUT 17` with status **403**.
- [ ] VS Code line numbers: `api.js` lines 9 to 15 (base URL), line 116 (Bearer token), lines 61 to 68 (messages per status); `useForm.js` line 32 (`showError`); `LoginView.vue` lines 22 to 24 (401 message).

## SCRIPT

### STEP 1: Intro (0:00 to 0:20)

**1.1**
- DO: Show the login page in the Customer window.
- SAY: "Hi, I am Muhammad Nureel Aqqwa Bin Hisham, student ID AM2512021715."

**1.2**
- DO: Move the mouse slowly over the login card.
- SAY: "I built my own web frontend for UCYSSPass with Vue 3 and Vite. It covers all three roles, Customer, Organiser and Administrator, and it uses our group's shared REST API. Let's start with the first role, the Customer."

### STEP 2: Customer (0:20 to 1:05)

**2.1**
- DO: Log in as `customer@sentrypass.test` / `password` and click **Log in**.
- SAY: "After login, each role goes to its own home. The customer lands on Events."

**2.2**
- DO: Type `career` in the search box, then choose **Conference** in the category list.
- SAY: "Customers can search events by title and filter by category."

**2.3**
- DO: Click **Cybersecurity Career Talk** and point at the Free tier and its seats remaining.
- SAY: "The event page shows the date, the venue and each ticket tier with its price and how many seats are left."

**2.4**
- DO: Make sure the Network filter says `method:POST`, then click **Book →** on the Free tier.
- SAY: "This tier is free, so the booking is confirmed straight away. A paid tier would show a sandbox payment form instead."

**2.5**
- DO: Click **My bookings** and point at the **Confirmed** badge.
- SAY: "My bookings lists every booking with its tier, date and status."

**2.6**
- DO: Click **Cancel** on that booking, press **OK**, and point at the green message and the **Cancelled** badge.
- SAY: "An active booking can be cancelled, and the seat goes back on sale. Now let's move on to the second role, the Organiser."

### STEP 3: Organiser (1:05 to 1:55)

**3.1**
- DO: In the Aisyah window, log in as `aisyah@ucyss.test` and point at the dashboard tiles.
- SAY: "The organiser dashboard shows her numbers: events, drafts, tickets sold, waitlist and revenue."

**3.2**
- DO: Click **My events**.
- SAY: "My events lists only her own events, including drafts, with their status."

**3.3**
- DO: Click **New event**. Fill in Title `Aqqwa Demo Event`, Category **Workshop**, Status **Draft**, **Physical**, Venue **Cyber Range Lab**, Starts `20 Nov 2026 10:00`, Ends `20 Nov 2026 13:00`. Click **Create event →**.
- SAY: "She creates an event as a draft, with a category, a venue and a start and end time."

**3.4**
- DO: Under **Add a tier**, type Name `General`, Price `0`, Capacity `30`, and click **Add tier**.
- SAY: "Then she adds a ticket tier, which sets the price and how many seats are available."

**3.5**
- DO: Click **Publish** and point at the **Published** badge.
- SAY: "Publishing makes the event visible to customers. She can move it back to draft at any time."

**3.6**
- DO: Scroll down to **Bookings**.
- SAY: "Here she sees the bookings for this event. It is new, so there are none yet. Next, the third role, the Administrator."

### STEP 4: Administrator (1:55 to 2:35)

**4.1**
- DO: In the Admin window, log in as `admin@sentrypass.test` and point at the Overview tiles.
- SAY: "The admin overview shows revenue, users by role, events by status and bookings by status for the whole system."

**4.2**
- DO: Click **Users**, then **+ New user**. Fill in Name `Aqqwa Demo User`, Email `aqqwa.demo@ucyss.test`, Password `password123`, Role **customer**. Click **Create user**.
- SAY: "The admin manages user accounts. I create a test customer."

**4.3**
- DO: Type `aqqwa` in the search box, change the role dropdown on that row to **organiser**, and point at the green message.
- SAY: "Roles can be changed here. The shared demo accounts and my own account are locked, so they cannot be changed or deleted."

**4.4**
- DO: Click **Venues** and point at the **Online** row.
- SAY: "The admin also manages venues. The Online venue is used by every online event, so it cannot be deleted. Now let me show how my frontend talks to the API."

### STEP 5: How my frontend uses the API (2:35 to 3:05)

**5.1**
- DO: Go to the Customer window. In DevTools, click the `bookings` row with method **POST**, open **Headers**, and point at Request URL, Request Method, Status Code **201**, and `Authorization: Bearer ...`.
- SAY: "When I booked, the app sent a POST to the bookings endpoint of our API, with the login token as a Bearer header. The server answered 201 Created."

**5.2**
- DO: Click the **Response** tab and point at `"status":"confirmed"`.
- SAY: "The reply is JSON, and the page uses this status to show the confirmed screen."

**5.3**
- DO: In VS Code, open `api.js`, point at lines 9 to 15, then line 116.
- SAY: "Every request goes through this one helper. The base URL comes from the VITE_API_URL variable, and here the token is added as the Bearer header. Next, how it handles invalid input and errors."

### STEP 6: Invalid input and errors (3:05 to 3:45)

**6.1**
- DO: In the Aisyah window, click **New event** and click **Create event →** with the form empty.
- SAY: "The form has no browser checks, so the request really goes to the server."

**6.2**
- DO: Point at the red messages under Title, Category, Venue, Starts and Ends, then at the `POST events` row with status **422** in Network.
- SAY: "The API answers 422, and my app shows each message in red under its own field."

**6.3**
- DO: Type a letter in **Title** and let the camera see its red message disappear.
- SAY: "The message clears as soon as the user fixes that field."

**6.4**
- DO: In the Farid window, log in as `farid@ucyss.test`, open `http://localhost:5174/#/organiser/events/17/edit`, and click **Save changes**.
- SAY: "Farid is an organiser, but this is Aisyah's event. The API returns 403, and my app shows: You are not allowed to do this."

**6.5**
- DO: In VS Code, show `api.js` lines 61 to 68, then `useForm.js` line 32, then `LoginView.vue` lines 22 to 24.
- SAY: "Here my code turns each status into a message: 422 goes under the fields, 403 becomes not allowed, and a 401 on login says the credentials are incorrect."

### STEP 7: Close (3:45 to 4:00)

**7.1**
- DO: Switch back to the browser on the Events page.
- SAY: "One lesson I learned: putting every request through one helper made my error handling the same on every page, and much easier to fix. That's my section. Thank you."

> The lesson in 7.1 is a suggestion. Replace it with a real lesson from your own experience if you have a better one.

## NOTES

### Timing

- **Over 4:15?** Cut in this order: 2.2 (search and filter), 4.4 (venues), 6.3 (field clears), 3.2 (My events).
- **Under 3:45?** Add one of these:
  - In the Customer window, type `http://localhost:5174/#/admin` in the address bar. The app sends you back to Events with "That page is for admins only, so you were sent back to your own home." SAY: "The route guard keeps each role in its own area."
  - On the login page, try a wrong password to show "The provided credentials are incorrect."

### Delete my test data after recording

The database is live and shared by the whole group.

1. **Aqqwa Demo Event**: as Aisyah, open **My events**, click **Manage** on Aqqwa Demo Event, then **Delete** and **OK**.
2. **aqqwa.demo@ucyss.test**: as Admin, open **Users**, search `aqqwa`, and click **Delete**.
3. **The test booking** on Cybersecurity Career Talk is already cancelled in Step 2.6. A customer cannot delete it, and a cancelled booking is fine to leave.
4. If you made any test venue, delete it in **Venues**.

Never edit or delete the seeded demo accounts, events or venues. In Step 6.4, Farid's save is refused by the server, so Threat Hunting 101 is not changed.

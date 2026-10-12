// Entry point: loads Bootstrap, restores the session, then starts the router.

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { setUnauthorizedHandler, setSlowHandler } from './api.js';
import { restoreSession, clearUser } from './auth.js';
import { renderLayout, setSlowBanner } from './layout.js';
import { startRouter, navigate } from './router.js';
import { flash, loadingHtml, escapeHtml } from './ui.js';
import { loginPage } from './pages/login.js';
import { registerPage } from './pages/register.js';
import { placeholderPage } from './pages/placeholder.js';
import { eventsPage } from './pages/customer/events.js';
import { eventDetailPage } from './pages/customer/eventDetail.js';
import { bookingsPage } from './pages/customer/bookings.js';
import { bookingDetailPage } from './pages/customer/bookingDetail.js';
import { organiserDashboardPage } from './pages/organiser/dashboard.js';
import { organiserEventsPage } from './pages/organiser/events.js';
import { eventFormPage } from './pages/organiser/eventForm.js';
import { eventManagePage } from './pages/organiser/eventManage.js';

// Every address the app knows.
//   guest: true -> only for logged-out visitors
//   role        -> only for that role (checked by the route guard in router.js)
const routes = [
  { path: '/login', guest: true, page: loginPage },
  { path: '/register', guest: true, page: registerPage },
  { path: '/events', role: 'customer', page: eventsPage },
  { path: '/events/:id', role: 'customer', page: eventDetailPage },
  { path: '/bookings', role: 'customer', page: bookingsPage },
  { path: '/bookings/:id', role: 'customer', page: bookingDetailPage },
  { path: '/organiser', role: 'organiser', page: organiserDashboardPage },
  { path: '/organiser/events', role: 'organiser', page: organiserEventsPage },
  // "new" must come before ":id", otherwise "new" would be read as an event id.
  { path: '/organiser/events/new', role: 'organiser', page: eventFormPage },
  { path: '/organiser/events/:id', role: 'organiser', page: eventManagePage },
  { path: '/organiser/events/:id/edit', role: 'organiser', page: eventFormPage },
  { path: '/admin', role: 'admin', page: placeholderPage('Admin area') },
];

const app = document.querySelector('#app');
renderLayout(app);

// Show the banner when a request is slow (the free server sleeps when idle).
setSlowHandler(setSlowBanner);

// api.js calls this when the API answers 401 for a request that had a token.
setUnauthorizedHandler(() => {
  clearUser();
  flash('Your session has expired. Please log in again.', 'warning');
  navigate('/login');
});

async function boot() {
  const view = document.querySelector('#view');
  view.innerHTML = loadingHtml('Checking your session...');

  try {
    // GET /auth/me with the saved token (does nothing when there is no token).
    await restoreSession();
  } catch (error) {
    // 401 is already handled above; we simply continue as a logged-out visitor.
    // Anything else (server asleep, offline) keeps the token and offers a retry.
    if (error.status !== 401) {
      view.innerHTML = `
        <div class="text-center py-5">
          <p class="text-danger">${escapeHtml(error.message)}</p>
          <button class="btn btn-primary" id="retry-btn">Try again</button>
        </div>`;
      view.querySelector('#retry-btn').addEventListener('click', boot);
      return;
    }
  }

  startRouter(routes);
}

boot();

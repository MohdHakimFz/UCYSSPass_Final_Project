// All pages, and the guard that keeps each role in its own area.
// Every route says who may open it in meta.role:
//   'guest'     = logged-out users only (login, register)
//   'customer' / 'organiser' / 'admin' = that role only
//   'any'       = everyone

import { createRouter, createWebHashHistory } from 'vue-router'
import { auth, homeFor, forgetUser } from '../auth'
import { setUnauthorizedHandler } from '../api'
import { showFlash, onPageChange } from '../flash'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import NotFoundView from '../views/NotFoundView.vue'

import EventsView from '../views/customer/EventsView.vue'
import EventDetailView from '../views/customer/EventDetailView.vue'
import MyBookingsView from '../views/customer/MyBookingsView.vue'
import BookingResultView from '../views/customer/BookingResultView.vue'

import OrganiserDashboardView from '../views/organiser/DashboardView.vue'
import OrganiserEventsView from '../views/organiser/MyEventsView.vue'
import EventFormView from '../views/organiser/EventFormView.vue'
import EventManageView from '../views/organiser/EventManageView.vue'

import AdminOverviewView from '../views/admin/OverviewView.vue'
import AdminUsersView from '../views/admin/UsersView.vue'
import AdminVenuesView from '../views/admin/VenuesView.vue'
import AdminEventsView from '../views/admin/EventsView.vue'
import AdminBookingsView from '../views/admin/BookingsView.vue'

const routes = [
  { path: '/', redirect: () => (auth.user ? homeFor(auth.user.role) : '/login') },

  { path: '/login', component: LoginView, meta: { role: 'guest', title: 'Log in' } },
  { path: '/register', component: RegisterView, meta: { role: 'guest', title: 'Create account' } },

  // Customer area
  { path: '/events', component: EventsView, meta: { role: 'customer', title: 'Events' } },
  { path: '/events/:id', component: EventDetailView, meta: { role: 'customer', title: 'Event' } },
  { path: '/bookings', component: MyBookingsView, meta: { role: 'customer', title: 'My bookings' } },
  { path: '/bookings/:id', component: BookingResultView, meta: { role: 'customer', title: 'Booking' } },

  // Organiser area
  { path: '/organiser', component: OrganiserDashboardView, meta: { role: 'organiser', title: 'Dashboard' } },
  { path: '/organiser/events', component: OrganiserEventsView, meta: { role: 'organiser', title: 'My events' } },
  { path: '/organiser/events/new', component: EventFormView, meta: { role: 'organiser', title: 'New event' } },
  { path: '/organiser/events/:id/edit', component: EventFormView, meta: { role: 'organiser', title: 'Edit event' } },
  { path: '/organiser/events/:id', component: EventManageView, meta: { role: 'organiser', title: 'Manage event' } },

  // Admin area
  { path: '/admin', component: AdminOverviewView, meta: { role: 'admin', title: 'Overview' } },
  { path: '/admin/users', component: AdminUsersView, meta: { role: 'admin', title: 'Users' } },
  { path: '/admin/venues', component: AdminVenuesView, meta: { role: 'admin', title: 'Venues' } },
  { path: '/admin/events', component: AdminEventsView, meta: { role: 'admin', title: 'All events' } },
  { path: '/admin/bookings', component: AdminBookingsView, meta: { role: 'admin', title: 'All bookings' } },

  { path: '/:pathMatch(.*)*', component: NotFoundView, meta: { role: 'any', title: 'Not found' } },
]

const router = createRouter({
  // Hash history (/#/events) so refreshing any page on Vercel never gives a 404.
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  onPageChange()
  const role = to.meta.role
  const user = auth.user

  if (role === 'any') return true

  if (role === 'guest') {
    // Already logged in: go to your own home instead of the login page.
    return user ? homeFor(user.role) : true
  }

  if (!user) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (user.role !== role) {
    showFlash('That page is for ' + role + 's only, so you were sent back to your own home.', 'warn')
    return homeFor(user.role)
  }

  return true
})

router.afterEach((to) => {
  document.title = (to.meta.title ? to.meta.title + ' · ' : '') + 'UCYSSPass'
})

// A logged-in request came back 401: the token expired or was revoked.
setUnauthorizedHandler(() => {
  forgetUser()
  showFlash('Your session has expired. Please log in again.', 'warn')
  if (router.currentRoute.value.path !== '/login') router.push('/login')
})

export default router

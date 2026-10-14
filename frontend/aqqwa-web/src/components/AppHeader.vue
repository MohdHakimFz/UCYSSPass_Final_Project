<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, homeFor, logout } from '../auth'
import { showFlash } from '../flash'

const router = useRouter()
const loggingOut = ref(false)

// The menu for each role: this is where the three roles are separated in the header.
const MENUS = {
  customer: [
    { to: '/events', label: 'Events' },
    { to: '/bookings', label: 'My bookings' },
  ],
  organiser: [
    { to: '/organiser', label: 'Dashboard' },
    { to: '/organiser/events', label: 'My events' },
    { to: '/organiser/events/new', label: 'New event' },
  ],
  admin: [
    { to: '/admin', label: 'Overview' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/venues', label: 'Venues' },
    { to: '/admin/events', label: 'Events' },
    { to: '/admin/bookings', label: 'Bookings' },
  ],
}

const links = computed(() => (auth.user ? MENUS[auth.user.role] || [] : []))
const home = computed(() => (auth.user ? homeFor(auth.user.role) : '/login'))

async function onLogout() {
  loggingOut.value = true
  await logout()
  loggingOut.value = false
  showFlash('You have been logged out.', 'success')
  router.push('/login')
}
</script>

<template>
  <header class="header glass">
    <div class="inner">
      <RouterLink :to="home" class="brand-mark">UCYSS<span>Pass</span></RouterLink>

      <nav v-if="auth.user" class="nav">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ active: $route.path === link.to }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="spacer"></div>

      <div v-if="auth.user" class="user">
        <div class="who">
          <strong>{{ auth.user.name }}</strong>
          <span :class="['badge', 'role-' + auth.user.role]">{{ auth.user.role }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" :disabled="loggingOut" @click="onLogout">
          {{ loggingOut ? 'Logging out...' : 'Log out' }}
        </button>
      </div>
      <div v-else class="row">
        <RouterLink to="/login" class="btn btn-ghost btn-sm">Log in</RouterLink>
        <RouterLink to="/register" class="btn btn-sm">Sign up</RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
}
.inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.brand-mark {
  color: var(--text);
  text-decoration: none;
}
.nav {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.nav-link {
  color: var(--muted);
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 500;
  text-decoration: none;
}
.nav-link:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.6);
}
.nav-link.active {
  color: var(--teal-ink);
  background: #fff;
  box-shadow: 0 4px 14px rgba(16, 112, 120, 0.12);
}
.user {
  display: flex;
  align-items: center;
  gap: 12px;
}
.who {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.role-admin {
  color: var(--danger);
  background: var(--danger-bg);
  border-color: rgba(255, 122, 138, 0.35);
}
.role-organiser {
  color: var(--info);
  background: var(--info-bg);
  border-color: rgba(143, 211, 255, 0.35);
}
.role-customer {
  color: var(--success);
  background: var(--success-bg);
  border-color: rgba(94, 240, 165, 0.35);
}
@media (max-width: 720px) {
  .who strong {
    display: none;
  }
}
</style>

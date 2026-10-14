<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../../api'
import { badgeClass, formatMoney } from '../../format'

const stats = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await api.get('/admin/stats')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// { customer: 5, admin: 1 } -> [['customer', 5], ['admin', 1]]
function entries(obj) {
  return Object.entries(obj || {})
}
function sum(obj) {
  return entries(obj).reduce((total, [, n]) => total + Number(n), 0)
}

const recent = computed(() => (stats.value && stats.value.recent_activity) || [])

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Overview</h1>
      <p class="muted">The whole system at a glance.</p>
    </div>
    <button class="btn btn-ghost" :disabled="loading" @click="load">{{ loading ? 'Loading...' : 'Refresh' }}</button>
  </div>

  <div v-if="error" class="alert alert-error">{{ error }}</div>
  <div v-if="loading && !stats" class="loading"><span class="spinner"></span>Loading statistics...</div>

  <template v-if="stats">
    <div class="grid grid-stats">
      <div class="glass stat"><div class="label">Net revenue</div><div class="value">{{ formatMoney(stats.revenue?.net) }}</div></div>
      <div class="glass stat"><div class="label">Gross revenue</div><div class="value">{{ formatMoney(stats.revenue?.gross) }}</div></div>
      <div class="glass stat"><div class="label">Refunded</div><div class="value">{{ formatMoney(stats.revenue?.refunded) }}</div></div>
      <div class="glass stat"><div class="label">Users</div><div class="value">{{ sum(stats.users_by_role) }}</div></div>
      <div class="glass stat"><div class="label">Events</div><div class="value">{{ sum(stats.events_by_status) }}</div></div>
      <div class="glass stat"><div class="label">Bookings</div><div class="value">{{ sum(stats.bookings_by_status) }}</div></div>
    </div>

    <div class="grid breakdown" style="margin-top: 18px">
      <div class="card">
        <h3>Users by role</h3>
        <div v-if="!entries(stats.users_by_role).length" class="empty">No users.</div>
        <div v-for="[name, n] in entries(stats.users_by_role)" :key="name" class="line">
          <span :class="badgeClass(name)">{{ name }}</span><strong>{{ n }}</strong>
        </div>
      </div>
      <div class="card">
        <h3>Events by status</h3>
        <div v-if="!entries(stats.events_by_status).length" class="empty">No events.</div>
        <div v-for="[name, n] in entries(stats.events_by_status)" :key="name" class="line">
          <span :class="badgeClass(name)">{{ name }}</span><strong>{{ n }}</strong>
        </div>
      </div>
      <div class="card">
        <h3>Bookings by status</h3>
        <div v-if="!entries(stats.bookings_by_status).length" class="empty">No bookings.</div>
        <div v-for="[name, n] in entries(stats.bookings_by_status)" :key="name" class="line">
          <span :class="badgeClass(name)">{{ name }}</span><strong>{{ n }}</strong>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 18px">
      <h3>Recent bookings</h3>
      <div v-if="recent.length === 0" class="empty">No recent activity.</div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Customer</th><th>Event</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="r in recent" :key="r.id">
              <td>{{ r.id }}</td>
              <td>{{ r.customer }}</td>
              <td>{{ r.event }}</td>
              <td><span :class="badgeClass(r.status)">{{ r.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </template>
</template>

<style scoped>
.breakdown {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.breakdown .card + .card {
  margin-top: 0;
}
.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}
.line:last-child {
  border-bottom: none;
}
</style>

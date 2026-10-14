<script setup>
import { ref, watch, onMounted } from 'vue'
import { api } from '../../api'
import { badgeClass, formatDate, formatPrice } from '../../format'

const bookings = ref([])
const loading = ref(true)
const error = ref('')
const status = ref('')
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)

async function load() {
  loading.value = true
  error.value = ''
  try {
    // For an admin, GET /bookings returns every booking in the system.
    const result = await api.get('/bookings', { status: status.value, per_page: 25, page: page.value })
    bookings.value = result.data || []
    lastPage.value = result.last_page || 1
    total.value = result.total || 0
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

watch(status, () => {
  page.value = 1
  load()
})

function goTo(p) {
  page.value = p
  load()
}

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>All bookings</h1>
      <p class="muted">{{ total }} booking(s) across every event.</p>
    </div>
    <select v-model="status" class="input" style="width: 200px" aria-label="Status filter">
      <option value="">All statuses</option>
      <option value="confirmed">Confirmed</option>
      <option value="pending">Pending</option>
      <option value="waitlisted">Waitlisted</option>
      <option value="attended">Attended</option>
      <option value="cancelled">Cancelled</option>
    </select>
  </div>

  <div v-if="error" class="alert alert-error">{{ error }}</div>

  <div class="card">
    <div v-if="loading" class="loading"><span class="spinner"></span>Loading bookings...</div>
    <div v-else-if="bookings.length === 0" class="empty">No bookings match this filter.</div>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Customer</th><th>Event</th><th>Tier</th><th>Booked</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="b in bookings" :key="b.id">
            <td>{{ b.id }}</td>
            <td>
              {{ b.customer?.name }}
              <div class="muted small">{{ b.customer?.email }}</div>
            </td>
            <td>{{ b.ticket_type?.event?.title }}</td>
            <td>
              {{ b.ticket_type?.name }}
              <div class="muted small">{{ formatPrice(b.ticket_type?.price) }}</div>
            </td>
            <td>{{ formatDate(b.booked_at) }}</td>
            <td><span :class="badgeClass(b.status)">{{ b.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="lastPage > 1" class="row" style="justify-content: center; margin-top: 14px">
      <button class="btn btn-ghost btn-sm" :disabled="page <= 1 || loading" @click="goTo(page - 1)">← Previous</button>
      <span class="muted small">Page {{ page }} of {{ lastPage }}</span>
      <button class="btn btn-ghost btn-sm" :disabled="page >= lastPage || loading" @click="goTo(page + 1)">Next →</button>
    </div>
  </div>
</template>

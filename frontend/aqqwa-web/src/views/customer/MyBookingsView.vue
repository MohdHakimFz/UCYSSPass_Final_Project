<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../api'
import { badgeClass, formatDate, formatPrice } from '../../format'

const bookings = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref('')
const status = ref('')
const cancelling = ref(null)

// A booking can be cancelled while it is still active and the event has not ended.
function canCancel(b) {
  const event = b.ticket_type && b.ticket_type.event
  const ended = event && new Date(event.end_at) < new Date()
  return ['confirmed', 'pending', 'waitlisted'].includes(b.status) && !ended
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.get('/bookings', { status: status.value, per_page: 50 })
    bookings.value = result.data || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function cancel(b) {
  const title = b.ticket_type && b.ticket_type.event ? b.ticket_type.event.title : 'this event'
  if (!confirm('Cancel your booking for "' + title + '"?')) return
  cancelling.value = b.id
  error.value = ''
  notice.value = ''
  try {
    await api.put('/bookings/' + b.id + '/cancel')
    notice.value = 'Booking #' + b.id + ' was cancelled.'
    await load()
  } catch (err) {
    error.value = err.message
  } finally {
    cancelling.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>My bookings</h1>
      <p class="muted">Every ticket you have booked, and its status.</p>
    </div>
    <select v-model="status" class="input" style="width: 200px" @change="load">
      <option value="">All statuses</option>
      <option value="confirmed">Confirmed</option>
      <option value="pending">Pending payment</option>
      <option value="waitlisted">Waitlisted</option>
      <option value="attended">Attended</option>
      <option value="cancelled">Cancelled</option>
    </select>
  </div>

  <div v-if="notice" class="alert alert-success">{{ notice }}</div>
  <div v-if="error" class="alert alert-error">{{ error }}</div>

  <div class="card">
    <div v-if="loading" class="loading"><span class="spinner"></span>Loading bookings...</div>
    <div v-else-if="bookings.length === 0" class="empty">
      You have no bookings yet. <RouterLink to="/events">Browse events</RouterLink>
    </div>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Tier</th>
            <th>Date</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in bookings" :key="b.id">
            <td>
              <strong>{{ b.ticket_type?.event?.title || 'Event' }}</strong>
              <div class="muted small">#{{ b.id }}<span v-if="b.seat"> · Seat {{ b.seat.row_label }}{{ b.seat.number }}</span></div>
            </td>
            <td>
              {{ b.ticket_type?.name }}
              <div class="muted small">{{ formatPrice(b.ticket_type?.price) }}</div>
            </td>
            <td>{{ formatDate(b.ticket_type?.event?.start_at) }}</td>
            <td>
              <span :class="badgeClass(b.status)">{{ b.status }}</span>
              <div v-if="b.status === 'waitlisted' && b.waitlist_position" class="muted small">#{{ b.waitlist_position }} in line</div>
            </td>
            <td style="text-align: right; white-space: nowrap">
              <RouterLink
                v-if="b.status === 'pending'"
                :to="{ path: '/bookings/' + b.id, query: { event: b.ticket_type?.event?.id } }"
                class="btn btn-success btn-sm"
              >Pay</RouterLink>
              <button
                v-if="canCancel(b)"
                class="btn btn-danger btn-sm"
                style="margin-left: 6px"
                :disabled="cancelling === b.id"
                @click="cancel(b)"
              >
                {{ cancelling === b.id ? 'Cancelling...' : 'Cancel' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

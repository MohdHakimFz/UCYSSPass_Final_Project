<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../api'
import { auth } from '../../auth'
import { badgeClass, categoryLabel, formatDate } from '../../format'

const events = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    // Asking for my own organiser_id also returns my drafts.
    const result = await api.get('/events', { organiser_id: auth.user.id, per_page: 50 })
    events.value = result.data || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>My events</h1>
      <p class="muted">Drafts, published and past events you organise.</p>
    </div>
    <RouterLink to="/organiser/events/new" class="btn">+ New event</RouterLink>
  </div>

  <div v-if="error" class="alert alert-error">{{ error }}</div>

  <div class="card">
    <div v-if="loading" class="loading"><span class="spinner"></span>Loading your events...</div>
    <div v-else-if="events.length === 0" class="empty">
      You have no events yet. <RouterLink to="/organiser/events/new">Create your first event</RouterLink>
    </div>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Starts</th>
            <th>Seats left</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in events" :key="event.id">
            <td>
              <strong>{{ event.title }}</strong>
              <div class="muted small">{{ event.venue ? event.venue.name : '-' }}</div>
            </td>
            <td>{{ categoryLabel(event.category) }}</td>
            <td>{{ formatDate(event.start_at) }}</td>
            <td>{{ event.seats_remaining ?? 0 }} / {{ event.capacity ?? 0 }}</td>
            <td><span :class="badgeClass(event.status)">{{ event.status }}</span></td>
            <td style="text-align: right; white-space: nowrap">
              <RouterLink :to="'/organiser/events/' + event.id" class="btn btn-sm">Manage</RouterLink>
              <RouterLink :to="'/organiser/events/' + event.id + '/edit'" class="btn btn-ghost btn-sm" style="margin-left: 6px">Edit</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

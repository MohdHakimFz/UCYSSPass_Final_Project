<script setup>
import { ref, watch, onMounted } from 'vue'
import { api } from '../../api'
import { badgeClass, categoryLabel, formatDate } from '../../format'

const events = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref('')
const status = ref('')
const search = ref('')
const page = ref(1)
const lastPage = ref(1)
const busyId = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    // An admin sees every event, drafts included.
    const result = await api.get('/events', {
      status: status.value,
      search: search.value.trim(),
      per_page: 25,
      page: page.value,
      sort: 'start_at',
      direction: 'desc',
    })
    events.value = result.data || []
    lastPage.value = result.last_page || 1
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})
watch(status, () => {
  page.value = 1
  load()
})

async function setStatus(event, newStatus) {
  if (newStatus === 'cancelled' && !confirm('Cancel "' + event.title + '"? All its active bookings will be cancelled too.')) return
  busyId.value = event.id
  error.value = ''
  notice.value = ''
  try {
    const updated = await api.put('/events/' + event.id, { status: newStatus })
    event.status = updated.status
    notice.value = '"' + event.title + '" is now ' + updated.status +
      (updated.cancelled_bookings ? ' (' + updated.cancelled_bookings + ' booking(s) cancelled).' : '.')
  } catch (err) {
    error.value = err.status === 422 ? Object.values(err.errors).flat().join(' ') || err.message : err.message
  } finally {
    busyId.value = null
  }
}

function goTo(p) {
  page.value = p
  load()
}

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>All events</h1>
      <p class="muted">Every event in the system. Publish or cancel any of them.</p>
    </div>
  </div>

  <div v-if="notice" class="alert alert-success">{{ notice }}</div>
  <div v-if="error" class="alert alert-error">{{ error }}</div>

  <div class="card">
    <div class="filters">
      <input v-model="search" class="input" type="search" placeholder="Search by title..." aria-label="Search events" />
      <select v-model="status" class="input" aria-label="Status filter">
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="cancelled">Cancelled</option>
        <option value="completed">Completed</option>
      </select>
    </div>

    <div v-if="loading" class="loading"><span class="spinner"></span>Loading events...</div>
    <div v-else-if="events.length === 0" class="empty">No events match this filter.</div>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>Title</th><th>Category</th><th>Starts</th><th>Venue</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="event in events" :key="event.id">
            <td><strong>{{ event.title }}</strong></td>
            <td>{{ categoryLabel(event.category) }}</td>
            <td>{{ formatDate(event.start_at) }}</td>
            <td>{{ event.venue ? event.venue.name : '-' }}</td>
            <td><span :class="badgeClass(event.status)">{{ event.status }}</span></td>
            <td style="text-align: right; white-space: nowrap">
              <button
                v-if="event.status !== 'published'"
                class="btn btn-success btn-sm"
                :disabled="busyId === event.id"
                @click="setStatus(event, 'published')"
              >{{ busyId === event.id ? 'Saving...' : 'Publish' }}</button>
              <button
                v-if="event.status !== 'cancelled'"
                class="btn btn-danger btn-sm"
                style="margin-left: 6px"
                :disabled="busyId === event.id"
                @click="setStatus(event, 'cancelled')"
              >{{ busyId === event.id ? 'Saving...' : 'Cancel' }}</button>
            </td>
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

<style scoped>
.filters {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 12px;
  margin-bottom: 8px;
}
@media (max-width: 600px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../api'
import { auth } from '../../auth'
import { formatMoney } from '../../format'

const summary = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    summary.value = await api.get('/organiser/summary')
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
      <h1>Hello, {{ auth.user.name }}</h1>
      <p class="muted">Here is how your events are doing.</p>
    </div>
    <div class="row">
      <RouterLink to="/organiser/events" class="btn btn-ghost">My events</RouterLink>
      <RouterLink to="/organiser/events/new" class="btn">+ New event</RouterLink>
    </div>
  </div>

  <div v-if="error" class="alert alert-error">{{ error }}</div>
  <div v-if="loading" class="loading"><span class="spinner"></span>Loading your numbers...</div>

  <div v-else-if="summary" class="grid grid-stats">
    <div class="glass stat"><div class="label">Events</div><div class="value">{{ summary.events }}</div></div>
    <div class="glass stat"><div class="label">Published</div><div class="value">{{ summary.published }}</div></div>
    <div class="glass stat"><div class="label">Drafts</div><div class="value">{{ summary.drafts }}</div></div>
    <div class="glass stat"><div class="label">Upcoming</div><div class="value">{{ summary.upcoming }}</div></div>
    <div class="glass stat"><div class="label">Tickets sold</div><div class="value">{{ summary.tickets_sold }}</div></div>
    <div class="glass stat"><div class="label">Checked in</div><div class="value">{{ summary.checked_in }}</div></div>
    <div class="glass stat"><div class="label">Waitlisted</div><div class="value">{{ summary.waitlisted }}</div></div>
    <div class="glass stat">
      <div class="label">Net revenue</div>
      <div class="value">{{ formatMoney(summary.revenue && typeof summary.revenue === 'object' ? summary.revenue.net : summary.revenue) }}</div>
    </div>
  </div>
</template>

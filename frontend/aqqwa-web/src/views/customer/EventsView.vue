<script setup>
import { ref, watch, onMounted } from 'vue'
import { api } from '../../api'
import { CATEGORIES, categoryLabel, formatDate, formatPrice } from '../../format'

const search = ref('')
const category = ref('')
const page = ref(1)

const events = ref([])
const lastPage = ref(1)
const total = ref(0)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.get('/events', {
      search: search.value.trim(),
      category: category.value,
      status: 'published',
      ends_after: new Date().toISOString(), // hide events that are already over
      per_page: 12,
      page: page.value,
    })
    events.value = result.data || []
    lastPage.value = result.last_page || 1
    total.value = result.total || 0
  } catch (err) {
    error.value = err.message
    events.value = []
  } finally {
    loading.value = false
  }
}

// Wait until the user stops typing for a moment before searching.
let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})
watch(category, () => {
  page.value = 1
  load()
})

function goTo(newPage) {
  page.value = newPage
  load()
}

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Events</h1>
      <p class="muted">Browse upcoming infosec events and book your seat.</p>
    </div>
  </div>

  <div class="card filters">
    <input v-model="search" class="input" type="search" placeholder="Search events by title..." aria-label="Search" />
    <select v-model="category" class="input" aria-label="Category">
      <option value="">All categories</option>
      <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
    </select>
  </div>

  <div v-if="error" class="alert alert-error" style="margin-top: 16px">{{ error }}</div>

  <div v-if="loading" class="loading"><span class="spinner"></span>Loading events...</div>
  <div v-else-if="!error && events.length === 0" class="card empty" style="margin-top: 16px">
    No events match your search. Try another title or category.
  </div>

  <template v-else-if="events.length">
    <p class="muted small" style="margin: 16px 0 10px">{{ total }} event(s) found</p>
    <div class="grid grid-cards">
      <RouterLink v-for="event in events" :key="event.id" :to="'/events/' + event.id" class="glass event-card">
        <div class="row">
          <span class="badge badge-purple">{{ categoryLabel(event.category) }}</span>
          <span v-if="event.mode === 'online'" class="badge badge-blue">Online</span>
        </div>
        <h3>{{ event.title }}</h3>
        <div class="meta">📅 {{ formatDate(event.start_at) }}</div>
        <div class="meta">📍 {{ event.venue ? event.venue.name : 'Venue to be announced' }}</div>
        <div class="foot">
          <span>From <strong>{{ formatPrice(event.from_price) }}</strong></span>
          <span class="muted small">{{ event.seats_remaining ?? 0 }} seats left</span>
        </div>
      </RouterLink>
    </div>

    <div v-if="lastPage > 1" class="row pager">
      <button class="btn btn-ghost btn-sm" :disabled="page <= 1" @click="goTo(page - 1)">← Previous</button>
      <span class="muted small">Page {{ page }} of {{ lastPage }}</span>
      <button class="btn btn-ghost btn-sm" :disabled="page >= lastPage" @click="goTo(page + 1)">Next →</button>
    </div>
  </template>
</template>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 12px;
}
.event-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  color: var(--text);
  text-decoration: none;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.event-card:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.6);
  border-color: #fff;
  text-decoration: none;
}
.event-card h3 {
  margin: 6px 0 2px;
  font-size: 17px;
}
.meta {
  color: var(--muted);
  font-size: 14px;
}
.foot {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pager {
  justify-content: center;
  margin-top: 20px;
}
@media (max-width: 600px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>

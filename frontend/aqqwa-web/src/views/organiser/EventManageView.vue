<script setup>
// One event, seen by its organiser: ticket tiers, publish / draft, and its bookings.
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../api'
import { useForm } from '../../useForm'
import { showFlash } from '../../flash'
import { badgeClass, categoryLabel, formatDate, formatPrice } from '../../format'

const route = useRoute()
const router = useRouter()
const eventId = route.params.id

const event = ref(null)
const loading = ref(true)
const loadError = ref('')
const pageError = ref('')
const notice = ref('')
const statusSaving = ref(false)
const deleting = ref(false)

// Ticket tiers
const addForm = useForm()
const newTier = reactive({ name: '', price: '', capacity: '' })
const editForm = useForm()
const editingId = ref(null)
const editTier = reactive({ name: '', price: '', capacity: '' })
const deletingTier = ref(null)

// Bookings for this event
const bookings = ref([])
const bookingsLoading = ref(true)
const bookingsError = ref('')

async function loadEvent() {
  try {
    event.value = await api.get('/events/' + eventId)
  } catch (err) {
    loadError.value = err.status === 404 ? 'This event does not exist.' : err.message
  }
}

async function loadBookings() {
  bookingsLoading.value = true
  bookingsError.value = ''
  try {
    const result = await api.get('/bookings', { event_id: eventId, per_page: 50 })
    bookings.value = result.data || []
  } catch (err) {
    bookingsError.value = err.message
  } finally {
    bookingsLoading.value = false
  }
}

// Shows a failed action at the top: for a 422 we also list the API's reasons (e.g. missing meeting link).
function showPageError(err) {
  const reasons = err.status === 422 ? Object.values(err.errors || {}).flat() : []
  pageError.value = reasons.length ? reasons.join(' ') : err.message
}

async function setStatus(status) {
  statusSaving.value = true
  pageError.value = ''
  notice.value = ''
  try {
    const updated = await api.put('/events/' + eventId, { status })
    event.value.status = updated.status
    notice.value = status === 'published' ? 'Event published. Customers can now book it.' : 'Event moved back to draft.'
  } catch (err) {
    showPageError(err)
  } finally {
    statusSaving.value = false
  }
}

async function deleteEvent() {
  if (!confirm('Delete "' + event.value.title + '"? This cannot be undone.')) return
  deleting.value = true
  pageError.value = ''
  try {
    await api.del('/events/' + eventId)
    showFlash('Event deleted.', 'success')
    router.push('/organiser/events')
  } catch (err) {
    showPageError(err)
  } finally {
    deleting.value = false
  }
}

async function addTier() {
  const tier = await addForm.submit(() =>
    api.post('/events/' + eventId + '/ticket-types', {
      name: newTier.name,
      price: newTier.price,
      capacity: newTier.capacity,
    }),
  )
  if (tier) {
    event.value.ticket_types = [...(event.value.ticket_types || []), tier]
    newTier.name = ''
    newTier.price = ''
    newTier.capacity = ''
    notice.value = 'Ticket tier "' + tier.name + '" added.'
  }
}

function startEdit(tier) {
  editForm.clearErrors()
  editingId.value = tier.id
  editTier.name = tier.name
  editTier.price = tier.price
  editTier.capacity = tier.capacity
}

async function saveTier(tier) {
  const updated = await editForm.submit(() =>
    api.put('/ticket-types/' + tier.id, {
      name: editTier.name,
      price: editTier.price,
      capacity: editTier.capacity,
    }),
  )
  if (updated) {
    Object.assign(tier, updated)
    editingId.value = null
    notice.value = 'Ticket tier saved.'
  }
}

async function deleteTier(tier) {
  if (!confirm('Delete the "' + tier.name + '" tier?')) return
  deletingTier.value = tier.id
  pageError.value = ''
  try {
    await api.del('/ticket-types/' + tier.id)
    event.value.ticket_types = event.value.ticket_types.filter((t) => t.id !== tier.id)
    notice.value = 'Ticket tier deleted.'
  } catch (err) {
    showPageError(err)
  } finally {
    deletingTier.value = null
  }
}

onMounted(async () => {
  loading.value = true
  await loadEvent()
  loading.value = false
  if (event.value) loadBookings()
})
</script>

<template>
  <RouterLink to="/organiser/events" class="muted small">← My events</RouterLink>

  <div v-if="loading" class="loading"><span class="spinner"></span>Loading event...</div>
  <div v-else-if="loadError" class="alert alert-error" style="margin-top: 16px">{{ loadError }}</div>

  <template v-else-if="event">
    <div class="page-head" style="margin-top: 8px">
      <div>
        <div class="row" style="margin-bottom: 8px">
          <span :class="badgeClass(event.status)">{{ event.status }}</span>
          <span class="badge badge-purple">{{ categoryLabel(event.category) }}</span>
          <span v-if="event.mode === 'online'" class="badge badge-blue">Online</span>
        </div>
        <h1>{{ event.title }}</h1>
        <p class="muted">{{ formatDate(event.start_at) }} → {{ formatDate(event.end_at) }} · {{ event.venue ? event.venue.name : '-' }}</p>
      </div>
      <div class="row">
        <button
          v-if="event.status !== 'published'"
          class="btn btn-success"
          :disabled="statusSaving"
          @click="setStatus('published')"
        >
          {{ statusSaving ? 'Saving...' : 'Publish' }}
        </button>
        <button v-else class="btn btn-ghost" :disabled="statusSaving" @click="setStatus('draft')">
          {{ statusSaving ? 'Saving...' : 'Move back to draft' }}
        </button>
        <RouterLink :to="'/organiser/events/' + event.id + '/edit'" class="btn btn-ghost">Edit details</RouterLink>
        <button class="btn btn-danger" :disabled="deleting" @click="deleteEvent">
          {{ deleting ? 'Deleting...' : 'Delete' }}
        </button>
      </div>
    </div>

    <div v-if="notice" class="alert alert-success">{{ notice }}</div>
    <div v-if="pageError" class="alert alert-error">{{ pageError }}</div>

    <!-- Ticket tiers -->
    <div class="card">
      <h2>Ticket tiers</h2>
      <div v-if="editForm.error.value" class="alert alert-error">{{ editForm.error.value }}</div>

      <div v-if="!event.ticket_types || event.ticket_types.length === 0" class="empty">
        No ticket tiers yet. Add one below so customers can book.
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Price (RM)</th><th>Capacity</th><th>Seats left</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="tier in event.ticket_types" :key="tier.id">
              <template v-if="editingId === tier.id">
                <td class="field">
                  <input v-model="editTier.name" :class="{ 'has-error': editForm.errors.name }" @input="editForm.clearField('name')" />
                  <div v-if="editForm.errors.name" class="field-error">{{ editForm.fieldError('name') }}</div>
                </td>
                <td class="field">
                  <input v-model="editTier.price" type="number" min="0" step="0.01" :class="{ 'has-error': editForm.errors.price }" @input="editForm.clearField('price')" />
                  <div v-if="editForm.errors.price" class="field-error">{{ editForm.fieldError('price') }}</div>
                </td>
                <td class="field">
                  <input v-model="editTier.capacity" type="number" min="0" :class="{ 'has-error': editForm.errors.capacity }" @input="editForm.clearField('capacity')" />
                  <div v-if="editForm.errors.capacity" class="field-error">{{ editForm.fieldError('capacity') }}</div>
                </td>
                <td>{{ tier.seats_remaining }}</td>
                <td style="text-align: right; white-space: nowrap">
                  <button class="btn btn-sm" :disabled="editForm.saving.value" @click="saveTier(tier)">
                    {{ editForm.saving.value ? 'Saving...' : 'Save' }}
                  </button>
                  <button class="btn btn-ghost btn-sm" style="margin-left: 6px" @click="editingId = null">Cancel</button>
                </td>
              </template>
              <template v-else>
                <td><strong>{{ tier.name }}</strong></td>
                <td>{{ formatPrice(tier.price) }}</td>
                <td>{{ tier.capacity }}</td>
                <td>{{ tier.seats_remaining }}</td>
                <td style="text-align: right; white-space: nowrap">
                  <button class="btn btn-ghost btn-sm" @click="startEdit(tier)">Edit</button>
                  <button class="btn btn-danger btn-sm" style="margin-left: 6px" :disabled="deletingTier === tier.id" @click="deleteTier(tier)">
                    {{ deletingTier === tier.id ? 'Deleting...' : 'Delete' }}
                  </button>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <form class="add-tier glass" novalidate @submit.prevent="addTier">
        <h3>Add a tier</h3>
        <div v-if="addForm.error.value" class="alert alert-error">{{ addForm.error.value }}</div>
        <div class="add-grid">
          <div class="field">
            <label for="tier-name">Name</label>
            <input id="tier-name" v-model="newTier.name" placeholder="e.g. General" :class="{ 'has-error': addForm.errors.name }" @input="addForm.clearField('name')" />
            <div v-if="addForm.errors.name" class="field-error">{{ addForm.fieldError('name') }}</div>
          </div>
          <div class="field">
            <label for="tier-price">Price (RM, 0 = free)</label>
            <input id="tier-price" v-model="newTier.price" type="number" min="0" step="0.01" placeholder="0" :class="{ 'has-error': addForm.errors.price }" @input="addForm.clearField('price')" />
            <div v-if="addForm.errors.price" class="field-error">{{ addForm.fieldError('price') }}</div>
          </div>
          <div class="field">
            <label for="tier-capacity">Capacity</label>
            <input id="tier-capacity" v-model="newTier.capacity" type="number" min="0" placeholder="50" :class="{ 'has-error': addForm.errors.capacity }" @input="addForm.clearField('capacity')" />
            <div v-if="addForm.errors.capacity" class="field-error">{{ addForm.fieldError('capacity') }}</div>
          </div>
          <div class="field add-btn">
            <button class="btn" type="submit" :disabled="addForm.saving.value">
              {{ addForm.saving.value ? 'Saving...' : 'Add tier' }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Bookings for this event -->
    <div class="card">
      <div class="row">
        <h2 style="margin: 0">Bookings</h2>
        <div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" :disabled="bookingsLoading" @click="loadBookings">Refresh</button>
      </div>
      <div v-if="bookingsError" class="alert alert-error" style="margin-top: 12px">{{ bookingsError }}</div>
      <div v-if="bookingsLoading" class="loading"><span class="spinner"></span>Loading bookings...</div>
      <div v-else-if="!bookingsError && bookings.length === 0" class="empty">No bookings for this event yet.</div>
      <div v-else-if="bookings.length" class="table-wrap" style="margin-top: 8px">
        <table>
          <thead>
            <tr><th>#</th><th>Customer</th><th>Tier</th><th>Booked</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-for="b in bookings" :key="b.id">
              <td>{{ b.id }}</td>
              <td>
                {{ b.customer?.name }}
                <div class="muted small">{{ b.customer?.email }}</div>
              </td>
              <td>{{ b.ticket_type?.name }}<span v-if="b.seat" class="muted small"> · {{ b.seat.row_label }}{{ b.seat.number }}</span></td>
              <td>{{ formatDate(b.booked_at) }}</td>
              <td><span :class="badgeClass(b.status)">{{ b.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </template>
</template>

<style scoped>
td.field {
  margin: 0;
  min-width: 110px;
}
.add-tier {
  margin-top: 18px;
  padding: 16px;
  border-radius: var(--radius-sm);
  box-shadow: none;
}
.add-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 12px;
  align-items: start;
}
.add-btn {
  padding-top: 24px;
}
@media (max-width: 760px) {
  .add-grid {
    grid-template-columns: 1fr 1fr;
  }
  .add-btn {
    padding-top: 0;
  }
}
</style>

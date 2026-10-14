<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../api'
import { categoryLabel, formatDate, formatPrice } from '../../format'

const route = useRoute()
const router = useRouter()

const event = ref(null)
const loading = ref(true)
const loadError = ref('')

const bookingTier = ref(null) // id of the tier being booked (shows "Booking..." on that button)
const bookError = ref('')

// Seated events: the customer picks a seat before booking.
const seatTier = ref(null)
const seats = ref([])
const seatsLoading = ref(false)
const chosenSeat = ref(null)
const seatError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    event.value = await api.get('/events/' + route.params.id)
  } catch (err) {
    loadError.value = err.status === 404 ? 'This event does not exist or is not open to the public.' : err.message
  } finally {
    loading.value = false
  }
}

async function openSeats(tier) {
  seatTier.value = tier
  chosenSeat.value = null
  seatError.value = ''
  seatsLoading.value = true
  try {
    seats.value = await api.get('/ticket-types/' + tier.id + '/seats')
  } catch (err) {
    seatError.value = err.message
    seats.value = []
  } finally {
    seatsLoading.value = false
  }
}

async function book(tier, seatId = null) {
  bookError.value = ''
  seatError.value = ''
  bookingTier.value = tier.id
  try {
    const body = { ticket_type_id: tier.id }
    if (seatId) body.seat_id = seatId
    const booking = await api.post('/bookings', body)
    router.push({ path: '/bookings/' + booking.id, query: { event: event.value.id } })
  } catch (err) {
    if (err.status === 422 && err.errors.seat_id) {
      seatError.value = err.errors.seat_id[0]
    } else {
      // 409 (already booked / seat taken / not open), 403, 429 ...
      bookError.value = err.message
    }
    if (err.status === 409 && seatTier.value) openSeats(seatTier.value)
  } finally {
    bookingTier.value = null
  }
}

function onBookClick(tier) {
  if (event.value.seated && tier.seats_remaining > 0) openSeats(tier)
  else book(tier)
}

onMounted(load)
</script>

<template>
  <RouterLink to="/events" class="muted small">← Back to events</RouterLink>

  <div v-if="loading" class="loading"><span class="spinner"></span>Loading event...</div>
  <div v-else-if="loadError" class="alert alert-error" style="margin-top: 16px">{{ loadError }}</div>

  <template v-else-if="event">
    <div class="card hero" style="margin-top: 12px">
      <div class="row">
        <span class="badge badge-purple">{{ categoryLabel(event.category) }}</span>
        <span v-if="event.mode === 'online'" class="badge badge-blue">Online</span>
        <span v-if="event.seated" class="badge badge-grey">Numbered seats</span>
      </div>
      <h1 style="margin-top: 12px">{{ event.title }}</h1>
      <div class="facts">
        <div><span class="muted small">Starts</span><div>{{ formatDate(event.start_at) }}</div></div>
        <div><span class="muted small">Ends</span><div>{{ formatDate(event.end_at) }}</div></div>
        <div>
          <span class="muted small">Venue</span>
          <div>{{ event.venue ? event.venue.name : '-' }}</div>
          <div v-if="event.venue && event.venue.address" class="muted small">{{ event.venue.address }}</div>
        </div>
      </div>
      <p v-if="event.description" class="desc">{{ event.description }}</p>
    </div>

    <div class="card">
      <h2>Tickets</h2>
      <div v-if="bookError" class="alert alert-error">{{ bookError }}</div>

      <div v-if="!event.ticket_types || event.ticket_types.length === 0" class="empty">
        No ticket tiers are on sale for this event yet.
      </div>

      <div v-else class="tiers">
        <div v-for="tier in event.ticket_types" :key="tier.id" class="tier glass">
          <div>
            <h3 style="margin: 0">{{ tier.name }}</h3>
            <div class="muted small">
              {{ tier.seats_remaining }} of {{ tier.capacity }} seats remaining
              <span v-if="tier.members_only"> · UCYSS members only</span>
            </div>
          </div>
          <div class="price">{{ formatPrice(tier.price) }}</div>
          <button class="btn btn-arrow" :disabled="bookingTier !== null" @click="onBookClick(tier)">
            <template v-if="bookingTier === tier.id">Booking...</template>
            <template v-else-if="tier.seats_remaining > 0">Book</template>
            <template v-else>Join waitlist</template>
          </button>
        </div>
      </div>
    </div>

    <!-- Seat picker for seated events -->
    <div v-if="seatTier" class="card">
      <div class="row">
        <h2 style="margin: 0">Choose a seat: {{ seatTier.name }}</h2>
        <div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" @click="seatTier = null">Close</button>
      </div>
      <div v-if="seatsLoading" class="loading"><span class="spinner"></span>Loading seats...</div>
      <template v-else>
        <div v-if="seats.length === 0 && !seatError" class="empty">No seats found for this tier.</div>
        <div class="seat-grid">
          <button
            v-for="seat in seats"
            :key="seat.id"
            class="seat"
            :class="{ taken: seat.taken, chosen: chosenSeat === seat.id }"
            :disabled="seat.taken"
            @click="chosenSeat = seat.id; seatError = ''"
          >
            {{ seat.label }}
          </button>
        </div>
        <div v-if="seatError" class="field-error">{{ seatError }}</div>
        <button
          class="btn"
          style="margin-top: 14px"
          :disabled="!chosenSeat || bookingTier !== null"
          @click="book(seatTier, chosenSeat)"
        >
          {{ bookingTier === seatTier.id ? 'Booking...' : 'Book this seat' }}
        </button>
      </template>
    </div>
  </template>
</template>

<style scoped>
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 14px;
}
.desc {
  margin: 18px 0 0;
  white-space: pre-line;
  color: var(--text);
}
.tiers {
  display: grid;
  gap: 12px;
}
.tier {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  box-shadow: none;
}
.price {
  font-size: 18px;
  font-weight: 700;
}
.seat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.seat {
  padding: 8px 0;
  border-radius: 8px;
  border: 1px solid #d3e6e7;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.seat:hover:not(:disabled) {
  border-color: var(--teal);
}
.seat.taken {
  opacity: 0.3;
  cursor: not-allowed;
  text-decoration: line-through;
}
.seat.chosen {
  background: linear-gradient(180deg, #2cc6b1 0%, #15a596 100%);
  border-color: transparent;
  color: #fff;
}
@media (max-width: 600px) {
  .tier {
    grid-template-columns: 1fr auto;
  }
  .tier .btn {
    grid-column: 1 / -1;
  }
}
</style>

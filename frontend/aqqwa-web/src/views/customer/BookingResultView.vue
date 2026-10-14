<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../api'
import { badgeClass, formatPrice } from '../../format'

const route = useRoute()

const booking = ref(null)
const event = ref(null)
const loading = ref(true)
const error = ref('')

const method = ref('card')
const paying = ref(false)
const payError = ref('')
const justPaid = ref(false)

const METHODS = [
  { value: 'card', label: 'Credit / debit card' },
  { value: 'fpx', label: 'FPX online banking' },
  { value: 'ewallet', label: 'E-wallet' },
]

// The booking only carries the tier id, so look the tier up on its event.
const tier = computed(() => {
  if (!booking.value || !event.value || !event.value.ticket_types) return null
  return event.value.ticket_types.find((t) => t.id === booking.value.ticket_type_id) || null
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    booking.value = await api.get('/bookings/' + route.params.id)
    if (route.query.event) {
      try {
        event.value = await api.get('/events/' + route.query.event)
      } catch {
        event.value = null // the event details are a nice extra; the booking still shows
      }
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function pay() {
  paying.value = true
  payError.value = ''
  try {
    // Sandbox payment: no real money moves. outcome "approve" means the payment succeeds.
    booking.value = await api.post('/bookings/' + booking.value.id + '/pay', {
      method: method.value,
      outcome: 'approve',
    })
    justPaid.value = true
  } catch (err) {
    payError.value = err.status === 422 && err.errors.method ? err.errors.method[0] : err.message
    if (err.status === 409) load() // hold expired or already paid: show the real status
  } finally {
    paying.value = false
  }
}

onMounted(load)
</script>

<template>
  <RouterLink :to="event ? '/events/' + event.id : '/events'" class="muted small">← Back</RouterLink>

  <div v-if="loading" class="loading"><span class="spinner"></span>Loading your booking...</div>
  <div v-else-if="error" class="alert alert-error" style="margin-top: 16px">{{ error }}</div>

  <div v-else-if="booking" class="card result" style="margin-top: 12px">
    <!-- Confirmed -->
    <template v-if="booking.status === 'confirmed' || booking.status === 'attended'">
      <div class="icon ok">✓</div>
      <h1>{{ justPaid ? 'Payment received. You are in!' : 'Booking confirmed' }}</h1>
      <p class="muted">Your seat is booked. You can see it any time under My bookings.</p>
    </template>

    <!-- Pending: paid tier, seat is held while the customer pays -->
    <template v-else-if="booking.status === 'pending'">
      <div class="icon wait">⏳</div>
      <h1>Complete your payment</h1>
      <p class="muted">
        Your seat is held for you while you pay.
        <span v-if="booking.hold_seconds_left">About {{ Math.ceil(booking.hold_seconds_left / 60) }} minute(s) left.</span>
      </p>
    </template>

    <!-- Waitlisted: sold out -->
    <template v-else-if="booking.status === 'waitlisted'">
      <div class="icon list">☰</div>
      <h1>You are on the waitlist</h1>
      <p class="muted">
        This tier is sold out. If a seat frees up, it goes to the next person in line.
        <span v-if="booking.waitlist_position">Your position: <strong>#{{ booking.waitlist_position }}</strong>.</span>
      </p>
    </template>

    <template v-else>
      <h1>Booking {{ booking.status }}</h1>
    </template>

    <div class="details glass">
      <div><span class="muted small">Booking</span><div>#{{ booking.id }}</div></div>
      <div v-if="event"><span class="muted small">Event</span><div>{{ event.title }}</div></div>
      <div v-if="tier"><span class="muted small">Tier</span><div>{{ tier.name }} · {{ formatPrice(tier.price) }}</div></div>
      <div v-if="booking.seat"><span class="muted small">Seat</span><div>{{ booking.seat.row_label }}{{ booking.seat.number }}</div></div>
      <div><span class="muted small">Status</span><div><span :class="badgeClass(booking.status)">{{ booking.status }}</span></div></div>
    </div>

    <!-- Sandbox payment form -->
    <form v-if="booking.status === 'pending'" class="pay" novalidate @submit.prevent="pay">
      <h2>Sandbox payment</h2>
      <p class="muted small" style="margin-top: -6px">Test mode. No real money is charged.</p>
      <div class="methods">
        <label v-for="m in METHODS" :key="m.value" class="method glass" :class="{ active: method === m.value }">
          <input v-model="method" type="radio" name="method" :value="m.value" />
          {{ m.label }}
        </label>
      </div>
      <div v-if="payError" class="alert alert-error" style="margin-top: 12px">{{ payError }}</div>
      <button class="btn btn-success" type="submit" :disabled="paying" style="margin-top: 14px">
        {{ paying ? 'Saving...' : 'Pay ' + (tier ? formatPrice(tier.price) : '') }}
      </button>
    </form>

    <div class="row" style="margin-top: 20px; justify-content: center">
      <RouterLink to="/bookings" class="btn btn-ghost">My bookings</RouterLink>
      <RouterLink to="/events" class="btn btn-ghost">Browse more events</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.result {
  max-width: 620px;
  margin: 0 auto;
  text-align: center;
}
.icon {
  width: 64px;
  height: 64px;
  margin: 4px auto 12px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 700;
}
.icon.ok {
  background: var(--success-bg);
  color: var(--success);
  box-shadow: 0 0 40px rgba(94, 240, 165, 0.35);
}
.icon.wait {
  background: var(--warn-bg);
}
.icon.list {
  background: #d9f6f1;
  color: var(--teal-ink);
}
.details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  padding: 16px;
  margin-top: 18px;
  text-align: left;
  box-shadow: none;
  border-radius: var(--radius-sm);
}
.pay {
  margin-top: 22px;
  text-align: left;
}
.methods {
  display: grid;
  gap: 8px;
}
.method {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow: none;
}
.method.active {
  border-color: var(--primary);
  background: rgba(27, 179, 160, 0.1);
}
</style>

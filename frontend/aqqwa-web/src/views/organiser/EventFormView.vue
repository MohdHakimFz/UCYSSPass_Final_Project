<script setup>
// One form for both "New event" and "Edit event".
// novalidate is on the <form>, so the browser does not block the submit:
// the API checks the data and its 422 messages appear under each field.
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../api'
import { useForm } from '../../useForm'
import { showFlash } from '../../flash'
import { CATEGORIES, toInputDate, fromInputDate } from '../../format'

const route = useRoute()
const router = useRouter()
const form = useForm()

const isEdit = computed(() => Boolean(route.params.id))
const loading = ref(false)
const loadError = ref('')
const venues = ref([])

const fields = reactive({
  title: '',
  category: '',
  mode: 'physical',
  venue_id: '',
  meeting_url: '',
  start_at: '',
  end_at: '',
  status: 'draft',
  description: '',
})

// The shared "Online" venue is used automatically for online events, so hide it here.
const physicalVenues = computed(() => venues.value.filter((v) => v.name !== 'Online'))

async function loadVenues() {
  try {
    const result = await api.get('/venues', { per_page: 100 })
    venues.value = result.data || result || []
  } catch (err) {
    form.error.value = 'Could not load venues: ' + err.message
  }
}

async function loadEvent() {
  loading.value = true
  loadError.value = ''
  try {
    const event = await api.get('/events/' + route.params.id)
    fields.title = event.title || ''
    fields.category = event.category || ''
    fields.mode = event.mode || 'physical'
    fields.venue_id = event.mode === 'online' ? '' : event.venue_id || ''
    fields.meeting_url = event.meeting_url || ''
    fields.start_at = toInputDate(event.start_at)
    fields.end_at = toInputDate(event.end_at)
    fields.status = event.status || 'draft'
    fields.description = event.description || ''
  } catch (err) {
    loadError.value = err.status === 404 ? 'This event does not exist.' : err.message
  } finally {
    loading.value = false
  }
}

function setMode(mode) {
  fields.mode = mode
  form.clearField('venue_id')
  form.clearField('meeting_url')
}

async function onSubmit() {
  const body = {
    title: fields.title,
    category: fields.category,
    mode: fields.mode,
    start_at: fromInputDate(fields.start_at),
    end_at: fromInputDate(fields.end_at),
    status: fields.status,
    description: fields.description,
  }
  if (fields.mode === 'physical') body.venue_id = fields.venue_id || null
  else body.meeting_url = fields.meeting_url

  const saved = await form.submit(() =>
    isEdit.value ? api.put('/events/' + route.params.id, body) : api.post('/events', body),
  )
  if (saved) {
    showFlash(isEdit.value ? 'Event saved.' : 'Event created. Now add its ticket tiers.', 'success')
    router.push('/organiser/events/' + saved.id)
  }
}

onMounted(async () => {
  await loadVenues()
  if (isEdit.value) await loadEvent()
})
</script>

<template>
  <RouterLink :to="isEdit ? '/organiser/events/' + route.params.id : '/organiser/events'" class="muted small">← Back</RouterLink>

  <div class="page-head" style="margin-top: 8px">
    <div>
      <h1>{{ isEdit ? 'Edit event' : 'New event' }}</h1>
      <p class="muted">Fill in the details. Save it as a draft until you are ready to publish.</p>
    </div>
  </div>

  <div v-if="loading" class="loading"><span class="spinner"></span>Loading event...</div>
  <div v-else-if="loadError" class="alert alert-error">{{ loadError }}</div>

  <form v-else class="card form" novalidate @submit.prevent="onSubmit">
    <div v-if="form.error.value" class="alert alert-error" role="alert">{{ form.error.value }}</div>

    <div class="field">
      <label for="title">Title</label>
      <input
        id="title"
        v-model="fields.title"
        placeholder="e.g. Aqqwa Demo Event"
        :class="{ 'has-error': form.errors.title }"
        @input="form.clearField('title')"
      />
      <div v-if="form.errors.title" class="field-error">{{ form.fieldError('title') }}</div>
    </div>

    <div class="grid grid-2" style="gap: 0 16px">
      <div class="field">
        <label for="category">Category</label>
        <select
          id="category"
          v-model="fields.category"
          :class="{ 'has-error': form.errors.category }"
          @change="form.clearField('category')"
        >
          <option value="">Choose a category</option>
          <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <div v-if="form.errors.category" class="field-error">{{ form.fieldError('category') }}</div>
      </div>

      <div class="field">
        <label for="status">Status</label>
        <select id="status" v-model="fields.status" :class="{ 'has-error': form.errors.status }" @change="form.clearField('status')">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <div v-if="form.errors.status" class="field-error">{{ form.fieldError('status') }}</div>
      </div>
    </div>

    <div class="field">
      <label>Where</label>
      <div class="toggle">
        <button type="button" :class="{ active: fields.mode === 'physical' }" @click="setMode('physical')">Physical</button>
        <button type="button" :class="{ active: fields.mode === 'online' }" @click="setMode('online')">Online</button>
      </div>
      <div v-if="form.errors.mode" class="field-error">{{ form.fieldError('mode') }}</div>
    </div>

    <div v-if="fields.mode === 'physical'" class="field">
      <label for="venue_id">Venue</label>
      <select
        id="venue_id"
        v-model="fields.venue_id"
        :class="{ 'has-error': form.errors.venue_id }"
        @change="form.clearField('venue_id')"
      >
        <option value="">Choose a venue</option>
        <option v-for="v in physicalVenues" :key="v.id" :value="v.id">{{ v.name }} (capacity {{ v.capacity }})</option>
      </select>
      <div v-if="form.errors.venue_id" class="field-error">{{ form.fieldError('venue_id') }}</div>
    </div>

    <div v-else class="field">
      <label for="meeting_url">Meeting link</label>
      <input
        id="meeting_url"
        v-model="fields.meeting_url"
        type="url"
        placeholder="https://meet.google.com/..."
        :class="{ 'has-error': form.errors.meeting_url }"
        @input="form.clearField('meeting_url')"
      />
      <div v-if="form.errors.meeting_url" class="field-error">{{ form.fieldError('meeting_url') }}</div>
    </div>

    <div class="grid grid-2" style="gap: 0 16px">
      <div class="field">
        <label for="start_at">Starts</label>
        <input
          id="start_at"
          v-model="fields.start_at"
          type="datetime-local"
          :class="{ 'has-error': form.errors.start_at }"
          @input="form.clearField('start_at')"
        />
        <div v-if="form.errors.start_at" class="field-error">{{ form.fieldError('start_at') }}</div>
      </div>
      <div class="field">
        <label for="end_at">Ends</label>
        <input
          id="end_at"
          v-model="fields.end_at"
          type="datetime-local"
          :class="{ 'has-error': form.errors.end_at }"
          @input="form.clearField('end_at')"
        />
        <div v-if="form.errors.end_at" class="field-error">{{ form.fieldError('end_at') }}</div>
      </div>
    </div>

    <div class="field">
      <label for="description">Description</label>
      <textarea
        id="description"
        v-model="fields.description"
        placeholder="What will people learn or do at this event?"
        :class="{ 'has-error': form.errors.description }"
        @input="form.clearField('description')"
      ></textarea>
      <div v-if="form.errors.description" class="field-error">{{ form.fieldError('description') }}</div>
    </div>

    <div class="row">
      <button class="btn btn-arrow" type="submit" :disabled="form.saving.value">
        {{ form.saving.value ? 'Saving...' : isEdit ? 'Save changes' : 'Create event' }}
      </button>
      <RouterLink :to="isEdit ? '/organiser/events/' + route.params.id : '/organiser/events'" class="btn btn-ghost">Cancel</RouterLink>
    </div>
  </form>
</template>

<style scoped>
.form {
  max-width: 760px;
}
</style>

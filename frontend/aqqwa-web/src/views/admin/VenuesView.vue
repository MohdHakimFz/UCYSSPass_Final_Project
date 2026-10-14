<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '../../api'
import { useForm } from '../../useForm'

const venues = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref('')
const deletingId = ref(null)

// One form for both "new venue" and "edit venue".
const form = useForm()
const editingId = ref(null) // null = creating
const showForm = ref(false)
const fields = reactive({ name: '', address: '', capacity: '' })

// The shared "Online" venue is used by every online event: it must never be deleted.
function isOnlineVenue(v) {
  return v.name === 'Online'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.get('/venues', { per_page: 100 })
    venues.value = result.data || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.clearErrors()
  editingId.value = null
  Object.assign(fields, { name: '', address: '', capacity: '' })
  showForm.value = true
}

function openEdit(v) {
  form.clearErrors()
  editingId.value = v.id
  Object.assign(fields, { name: v.name, address: v.address, capacity: v.capacity })
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function save() {
  const body = { ...fields }
  const saved = await form.submit(() =>
    editingId.value ? api.put('/venues/' + editingId.value, body) : api.post('/venues', body),
  )
  if (saved) {
    notice.value = editingId.value ? 'Venue saved.' : 'Venue "' + saved.name + '" created.'
    showForm.value = false
    load()
  }
}

async function remove(v) {
  if (isOnlineVenue(v)) return
  if (!confirm('Delete the venue "' + v.name + '"?')) return
  deletingId.value = v.id
  error.value = ''
  notice.value = ''
  try {
    await api.del('/venues/' + v.id)
    notice.value = 'Venue "' + v.name + '" deleted.'
    venues.value = venues.value.filter((x) => x.id !== v.id)
  } catch (err) {
    // 409: the venue still has events, the API's message explains it.
    error.value = err.message
  } finally {
    deletingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Venues</h1>
      <p class="muted">Places where physical events happen.</p>
    </div>
    <button class="btn" @click="showForm ? (showForm = false) : openCreate()">{{ showForm ? 'Close' : '+ New venue' }}</button>
  </div>

  <div v-if="notice" class="alert alert-success">{{ notice }}</div>
  <div v-if="error" class="alert alert-error">{{ error }}</div>

  <form v-if="showForm" class="card" novalidate @submit.prevent="save">
    <h2>{{ editingId ? 'Edit venue' : 'New venue' }}</h2>
    <div v-if="form.error.value" class="alert alert-error">{{ form.error.value }}</div>
    <div class="field">
      <label for="v-name">Name</label>
      <input id="v-name" v-model="fields.name" placeholder="e.g. Aqqwa Demo Hall" :class="{ 'has-error': form.errors.name }" @input="form.clearField('name')" />
      <div v-if="form.errors.name" class="field-error">{{ form.fieldError('name') }}</div>
    </div>
    <div class="field">
      <label for="v-address">Address</label>
      <input id="v-address" v-model="fields.address" :class="{ 'has-error': form.errors.address }" @input="form.clearField('address')" />
      <div v-if="form.errors.address" class="field-error">{{ form.fieldError('address') }}</div>
    </div>
    <div class="field" style="max-width: 220px">
      <label for="v-capacity">Capacity</label>
      <input id="v-capacity" v-model="fields.capacity" type="number" min="1" :class="{ 'has-error': form.errors.capacity }" @input="form.clearField('capacity')" />
      <div v-if="form.errors.capacity" class="field-error">{{ form.fieldError('capacity') }}</div>
    </div>
    <button class="btn" type="submit" :disabled="form.saving.value">
      {{ form.saving.value ? 'Saving...' : editingId ? 'Save venue' : 'Create venue' }}
    </button>
  </form>

  <div class="card">
    <div v-if="loading" class="loading"><span class="spinner"></span>Loading venues...</div>
    <div v-else-if="venues.length === 0" class="empty">No venues yet.</div>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Address</th><th>Capacity</th><th></th></tr></thead>
        <tbody>
          <tr v-for="v in venues" :key="v.id">
            <td><strong>{{ v.name }}</strong></td>
            <td class="muted">{{ v.address }}</td>
            <td>{{ v.capacity }}</td>
            <td style="text-align: right; white-space: nowrap">
              <template v-if="isOnlineVenue(v)">
                <span class="muted small">Used by online events</span>
              </template>
              <template v-else>
                <button class="btn btn-ghost btn-sm" @click="openEdit(v)">Edit</button>
                <button class="btn btn-danger btn-sm" style="margin-left: 6px" :disabled="deletingId === v.id" @click="remove(v)">
                  {{ deletingId === v.id ? 'Deleting...' : 'Delete' }}
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

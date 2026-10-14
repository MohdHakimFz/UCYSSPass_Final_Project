<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { api } from '../../api'
import { auth } from '../../auth'
import { useForm } from '../../useForm'
import { badgeClass } from '../../format'

// Shared demo accounts the whole group relies on: never changed or deleted from here.
const PROTECTED_EMAILS = [
  'admin@sentrypass.test',
  'aisyah@ucyss.test',
  'farid@ucyss.test',
  'customer@sentrypass.test',
]
const ROLES = ['customer', 'organiser', 'admin']

function isProtected(user) {
  return PROTECTED_EMAILS.includes(user.email.toLowerCase()) || user.id === auth.user.id
}

const users = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref('')
const roleFilter = ref('')
const search = ref('')
const busyId = ref(null)

const form = useForm()
const showCreate = ref(false)
const newUser = reactive({ name: '', email: '', password: '', role: 'customer' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.get('/users', { role: roleFilter.value, search: search.value.trim(), per_page: 50 })
    users.value = result.data || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 350)
})
watch(roleFilter, load)

async function createUser() {
  const created = await form.submit(() => api.post('/users', { ...newUser }))
  if (created) {
    notice.value = 'User ' + created.email + ' created as ' + created.role + '.'
    Object.assign(newUser, { name: '', email: '', password: '', role: 'customer' })
    showCreate.value = false
    load()
  }
}

async function changeRole(user, role) {
  if (isProtected(user) || role === user.role) return
  busyId.value = user.id
  error.value = ''
  notice.value = ''
  try {
    const updated = await api.put('/users/' + user.id, { role })
    user.role = updated.role
    notice.value = user.email + ' is now ' + updated.role + '.'
  } catch (err) {
    error.value = err.status === 422 ? Object.values(err.errors).flat().join(' ') || err.message : err.message
    load()
  } finally {
    busyId.value = null
  }
}

async function deleteUser(user) {
  if (isProtected(user)) return
  if (!confirm('Delete ' + user.email + '? This cannot be undone.')) return
  busyId.value = user.id
  error.value = ''
  notice.value = ''
  try {
    await api.del('/users/' + user.id)
    notice.value = user.email + ' was deleted.'
    users.value = users.value.filter((u) => u.id !== user.id)
  } catch (err) {
    error.value = err.message
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Users</h1>
      <p class="muted">Create accounts, change roles and remove users.</p>
    </div>
    <button class="btn" @click="showCreate = !showCreate; form.clearErrors()">
      {{ showCreate ? 'Close' : '+ New user' }}
    </button>
  </div>

  <div v-if="notice" class="alert alert-success">{{ notice }}</div>
  <div v-if="error" class="alert alert-error">{{ error }}</div>

  <form v-if="showCreate" class="card" novalidate @submit.prevent="createUser">
    <h2>New user</h2>
    <div v-if="form.error.value" class="alert alert-error">{{ form.error.value }}</div>
    <div class="grid grid-2" style="gap: 0 16px">
      <div class="field">
        <label for="u-name">Name</label>
        <input id="u-name" v-model="newUser.name" :class="{ 'has-error': form.errors.name }" @input="form.clearField('name')" />
        <div v-if="form.errors.name" class="field-error">{{ form.fieldError('name') }}</div>
      </div>
      <div class="field">
        <label for="u-email">Email</label>
        <input id="u-email" v-model="newUser.email" type="email" placeholder="aqqwa.demo@ucyss.test" :class="{ 'has-error': form.errors.email }" @input="form.clearField('email')" />
        <div v-if="form.errors.email" class="field-error">{{ form.fieldError('email') }}</div>
      </div>
      <div class="field">
        <label for="u-password">Password (min 8 characters)</label>
        <input id="u-password" v-model="newUser.password" type="password" autocomplete="new-password" :class="{ 'has-error': form.errors.password }" @input="form.clearField('password')" />
        <div v-if="form.errors.password" class="field-error">{{ form.fieldError('password') }}</div>
      </div>
      <div class="field">
        <label for="u-role">Role</label>
        <select id="u-role" v-model="newUser.role" :class="{ 'has-error': form.errors.role }" @change="form.clearField('role')">
          <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
        </select>
        <div v-if="form.errors.role" class="field-error">{{ form.fieldError('role') }}</div>
      </div>
    </div>
    <button class="btn" type="submit" :disabled="form.saving.value">{{ form.saving.value ? 'Saving...' : 'Create user' }}</button>
  </form>

  <div class="card">
    <div class="filters">
      <input v-model="search" class="input" type="search" placeholder="Search by name or email..." aria-label="Search users" />
      <select v-model="roleFilter" class="input" aria-label="Role filter">
        <option value="">All roles</option>
        <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>

    <div v-if="loading" class="loading"><span class="spinner"></span>Loading users...</div>
    <div v-else-if="users.length === 0" class="empty">No users match this filter.</div>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td><strong>{{ user.name }}</strong></td>
            <td>{{ user.email }}</td>
            <td>
              <span v-if="isProtected(user)" :class="badgeClass(user.role)">{{ user.role }}</span>
              <select
                v-else
                class="input role-select"
                :value="user.role"
                :disabled="busyId === user.id"
                @change="changeRole(user, $event.target.value)"
              >
                <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
              </select>
            </td>
            <td style="text-align: right">
              <span v-if="isProtected(user)" class="muted small">{{ user.id === auth.user.id ? 'You' : 'Demo account' }}</span>
              <button v-else class="btn btn-danger btn-sm" :disabled="busyId === user.id" @click="deleteUser(user)">
                {{ busyId === user.id ? 'Saving...' : 'Delete' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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
.role-select {
  width: 140px;
  padding: 6px 10px;
}
@media (max-width: 600px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>

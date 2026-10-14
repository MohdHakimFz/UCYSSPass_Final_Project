<script setup>
import { reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { login, homeFor } from '../auth'
import { useForm } from '../useForm'

const router = useRouter()
const route = useRoute()
const form = useForm()
const fields = reactive({ email: '', password: '' })

async function onSubmit() {
  form.clearErrors()
  form.saving.value = true
  try {
    const user = await login(fields.email, fields.password)
    // Go back to the page the user wanted, but only if it is in their own area.
    const home = homeFor(user.role)
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' && redirect.startsWith(home) ? redirect : home)
  } catch (err) {
    if (err.status === 401) {
      // Wrong email or password: stay on this page.
      form.error.value = 'The provided credentials are incorrect.'
    } else {
      form.showError(err) // 422 under the fields, or a friendly message
    }
  } finally {
    form.saving.value = false
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="glass auth-frame">
    <div class="card auth-card">
      <span class="eyebrow">UCYSSPass · Infosec events</span>
      <h1 class="hero-title">Welcome<br /><span class="arrow">↘</span>Back</h1>
      <p class="hero-sub">Log in to book infosec events or manage your area.</p>

      <div v-if="form.error.value" class="alert alert-error" role="alert">{{ form.error.value }}</div>

      <form novalidate @submit.prevent="onSubmit">
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="fields.email"
            type="email"
            autocomplete="username"
            placeholder="you@example.com"
            :class="{ 'has-error': form.errors.email }"
            @input="form.clearField('email')"
          />
          <div v-if="form.errors.email" class="field-error">{{ form.fieldError('email') }}</div>
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="fields.password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            :class="{ 'has-error': form.errors.password }"
            @input="form.clearField('password')"
          />
          <div v-if="form.errors.password" class="field-error">{{ form.fieldError('password') }}</div>
        </div>

        <button class="btn btn-arrow" type="submit" :disabled="form.saving.value">
          {{ form.saving.value ? 'Logging in...' : 'Log in' }}
        </button>
      </form>
    </div>
      <p class="auth-foot">
        New here? <RouterLink to="/register">Create a customer account</RouterLink>
      </p>
    </div>
  </div>
</template>

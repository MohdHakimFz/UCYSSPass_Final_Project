<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../auth'
import { useForm } from '../useForm'
import { showFlash } from '../flash'

const router = useRouter()
const form = useForm()
const fields = reactive({ name: '', email: '', password: '', password_confirmation: '' })

async function onSubmit() {
  const user = await form.submit(() => register({ ...fields }))
  if (user) {
    showFlash('Welcome, ' + user.name + '! Your customer account is ready.', 'success')
    router.push('/events')
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="glass auth-frame">
    <div class="card auth-card">
      <span class="eyebrow">UCYSSPass · New customer</span>
      <h1 class="hero-title">Join<br /><span class="arrow">↘</span>Now</h1>
      <p class="hero-sub">Sign up as a customer to book infosec events.</p>

      <div v-if="form.error.value" class="alert alert-error" role="alert">{{ form.error.value }}</div>

      <form novalidate @submit.prevent="onSubmit">
        <div class="field">
          <label for="name">Full name</label>
          <input
            id="name"
            v-model="fields.name"
            :class="{ 'has-error': form.errors.name }"
            @input="form.clearField('name')"
          />
          <div v-if="form.errors.name" class="field-error">{{ form.fieldError('name') }}</div>
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="fields.email"
            type="email"
            autocomplete="username"
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
            autocomplete="new-password"
            :class="{ 'has-error': form.errors.password }"
            @input="form.clearField('password')"
          />
          <div v-if="form.errors.password" class="field-error">{{ form.fieldError('password') }}</div>
        </div>

        <div class="field">
          <label for="password_confirmation">Confirm password</label>
          <input
            id="password_confirmation"
            v-model="fields.password_confirmation"
            type="password"
            autocomplete="new-password"
            :class="{ 'has-error': form.errors.password_confirmation }"
            @input="form.clearField('password_confirmation')"
          />
          <div v-if="form.errors.password_confirmation" class="field-error">
            {{ form.fieldError('password_confirmation') }}
          </div>
        </div>

        <button class="btn btn-arrow" type="submit" :disabled="form.saving.value">
          {{ form.saving.value ? 'Saving...' : 'Create account' }}
        </button>
      </form>
    </div>
      <p class="auth-foot">
        Already have an account? <RouterLink to="/login">Log in</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { auth, homeFor } from '../auth'

const home = computed(() => (auth.user ? homeFor(auth.user.role) : '/login'))
</script>

<template>
  <div class="card" style="text-align: center; padding: 48px 20px">
    <h1>Page not found</h1>
    <p class="muted">The page you opened does not exist.</p>
    <RouterLink :to="home" class="btn">Go to my home</RouterLink>
  </div>
</template>

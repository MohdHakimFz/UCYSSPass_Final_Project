<script setup>
import { apiState } from '../api'
</script>

<template>
  <div v-if="apiState.slowCount > 0" class="wake-banner" role="status">
    <span class="spinner"></span>
    Waking up the server. The free server sleeps when idle, so the first request can take up to a minute.
  </div>
</template>

<style scoped>
.wake-banner {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 242, 207, 0.85);
  color: #805700;
  border-bottom: 1px solid #f2d98f;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 10px 16px;
  text-align: center;
  font-size: 14px;
}
</style>

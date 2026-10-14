<script setup>
import { flash, clearFlash } from '../flash'
</script>

<template>
  <div v-if="flash.text" :class="['alert', 'alert-' + flash.type]" role="alert">
    <span>{{ flash.text }}</span>
    <button class="close" aria-label="Dismiss" @click="clearFlash">×</button>
  </div>
</template>

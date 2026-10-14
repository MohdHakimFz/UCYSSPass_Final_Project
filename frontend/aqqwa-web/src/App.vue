<script setup>
import AppHeader from './components/AppHeader.vue'
import WakeBanner from './components/WakeBanner.vue'
import FlashMessage from './components/FlashMessage.vue'
import BackgroundBlobs from './components/BackgroundBlobs.vue'
</script>

<template>
  <BackgroundBlobs />
  <WakeBanner />
  <AppHeader />
  <main class="container">
    <FlashMessage />
    <RouterView />
  </main>
</template>

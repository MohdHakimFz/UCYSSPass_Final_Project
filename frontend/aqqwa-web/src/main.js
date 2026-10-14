import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { restoreSession } from './auth'
import './assets/main.css'

// Ask GET /auth/me who is logged in BEFORE the router runs its guard,
// so a page refresh keeps the user on the page they were on.
async function start() {
  await restoreSession()
  createApp(App).use(router).mount('#app')
}

start()

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Port 5173 is already published by the Sail container, so use 5175.
export default defineConfig({
  plugins: [react()],
  server: { port: 5175 },
})

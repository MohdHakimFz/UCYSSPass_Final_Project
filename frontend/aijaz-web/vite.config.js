import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5175,
    // Fail instead of silently picking another port, so the URL is always the same.
    strictPort: true,
  },
});

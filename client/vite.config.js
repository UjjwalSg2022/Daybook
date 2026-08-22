import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Serving under /daybook/ in production (macintl.in/daybook), so the base
// path is set accordingly. Local dev still runs at the site root.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/daybook/' : '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}));

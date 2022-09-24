import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
  },
  define: {
    'window.navigator.userAgent.indexOf("Safari")': '1',
    'navigator.userAgent.indexOf("Chrome")': '-1',
  },
});

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Relative base for the production build so hashed assets resolve correctly when
  // GitHub Pages serves the app from a project sub-path (/SpotMo/). Dev keeps '/'.
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      // Second entry point for the standalone admin dashboard (src/admin/**).
      // It doesn't import App.tsx/MapScreen at all, so Vite's per-entry
      // graph naturally excludes leaflet/react-leaflet/framer-motion from
      // its bundle — that's what keeps admin.html light, not manual config.
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
}));

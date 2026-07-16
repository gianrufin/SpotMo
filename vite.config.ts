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
}));

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['manifest.webmanifest'],
      manifest: {
        name: 'Idle GBF',
        short_name: 'Idle GBF',
        description: '手机优先的本地放置 RPG 原型',
        theme_color: '#10131a',
        background_color: '#10131a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: []
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    passWithNoTests: true
  }
});

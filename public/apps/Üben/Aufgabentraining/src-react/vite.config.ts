import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: "Aufgabentraining",
        short_name: "Training",
        description: "Mathe Aufgabentraining",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "./index.html",
        icons: [
          {
            src: "./assets/Aufabentraining-logo-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "./assets/Aufabentraining-logo-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
  base: './',
  build: {
    outDir: '..',
    emptyOutDir: false, // Don't delete src-react!
  }
})

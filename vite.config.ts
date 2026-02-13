import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      devOptions: {
        enabled: false
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['apps/**', '**/node_modules/**'],
        navigateFallbackDenylist: [/^\/apps/],
      },
      manifest: {
        name: "Numo Mathetrainer",
        short_name: "Numo",
        description: "Deine Lernumgebung für Mathematik",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "./index.html",
        icons: [
            {
                src: "numo-logo/Numo-logo-192x192.png",
                sizes: "192x192",
                type: "image/png"
            },
            {
                src: "numo-logo/Numo-logo-512x512.png",
                sizes: "512x512",
                type: "image/png"
            }
        ]
      }
    })
  ],
  base: '/Numo-Mathetrainer/',
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  logLevel: 'error',

  plugins: [
    react(),
  ],

  server: {
    allowedHosts: [
      'ta-01kek6py1asht8pb1tt7q627at-5173.wo-lp1kw27ez4o2l7ym3p8rou72t.w.modal.host'
    ]
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    },
    dedupe: ['react', 'react-dom']
  }
})

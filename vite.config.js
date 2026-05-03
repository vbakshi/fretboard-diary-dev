import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { localApiPlugin } from './dev/localApiPlugin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    localApiPlugin({ root: resolve(__dirname) }),
    react(),
    tailwindcss(),
  ],
  // Allow Next.js-style names in .env.local (same values as VITE_* in .env.example).
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})

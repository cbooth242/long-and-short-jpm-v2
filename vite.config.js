import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-source',
      buildStart() {
        // Copy full App.jsx to public/source.txt so CodebaseViewer can fetch it
        const src = path.resolve(__dirname, 'src/App.jsx')
        const dest = path.resolve(__dirname, 'public/source.txt')
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest)
          const lines = fs.readFileSync(src, 'utf8').split('\n').length
          console.log(`✓ source.txt updated: ${lines} lines`)
        }
      }
    }
  ],
  build: { chunkSizeWarningLimit: 2000 }
})

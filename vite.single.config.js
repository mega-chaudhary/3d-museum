
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: '/3d-museum/',
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: {
    outDir: 'dist-single',
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 20000,
  },
})

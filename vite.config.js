import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// During `npm run dev`, the in-page editor saves to public/museum.json through this endpoint.
function usssSave() {
  return {
    name: 'usss-save',
    apply: 'serve',
    configureServer(server) {
      const file = path.resolve(server.config.root, 'public/museum.json')
      // Always serve the latest saved museum.json (it may be created after the server started).
      server.middlewares.use('/museum.json', (req, res, next) => {
        if (req.method !== 'GET' || !fs.existsSync(file)) return next()
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(fs.readFileSync(file))
      })
      server.middlewares.use('/__usss/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('POST only')
        }
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8')
            JSON.parse(body) // validate
            fs.writeFileSync(file, body)
            res.end('ok')
          } catch (e) {
            res.statusCode = 400
            res.end(String(e.message || e))
          }
        })
      })
    },
  }
}

export default defineConfig({
  // Relative asset paths: works at the site root (Vercel, Netlify) and in a sub-folder (GitHub Pages).
  base: './',
  plugins: [react(), usssSave()],
  // don't reload the page when the editor writes museum.json
  server: { watch: { ignored: ['**/public/museum.json'] } },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
})

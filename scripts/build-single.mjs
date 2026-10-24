// Builds one self-contained HTML file (dist-single/memora.html) with the
// character model and photos embedded, so the museum opens without a server.
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const gen = path.join(root, 'src/embed/assets.generated.js')
const stub = fs.readFileSync(gen, 'utf8')
const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

const entries = {}
const dir = path.join(root, 'public/memories')
for (const f of fs.readdirSync(dir)) {
  const ext = path.extname(f).toLowerCase()
  if (!mime[ext]) continue
  entries['memories/' + f] = `data:${mime[ext]};base64,` + fs.readFileSync(path.join(dir, f)).toString('base64')
}
const characters = {}
for (const who of ['him', 'her']) characters[who] = fs.readFileSync(path.join(root, `public/models/${who}.glb`)).toString('base64')
fs.writeFileSync(gen, `export default ${JSON.stringify(entries)}\nexport const characters = ${JSON.stringify(characters)}\n`)
try {
  execSync('npx vite build --config vite.single.config.js', { cwd: root, stdio: 'inherit', env: { ...process.env, VITE_EMBED: '1' } })
} finally {
  fs.writeFileSync(gen, stub)
}

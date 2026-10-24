// Asset resolution. In the normal project, files are served from /public.
// In the single-file build (npm run build:single), photos and the character
// are embedded in the page so it can open from one file or link.
// (In normal builds assets.generated.js is a tiny empty placeholder.)
import embedded, { characters } from '../embed/assets.generated.js'

export const EMBED = import.meta.env.VITE_EMBED === '1'
const map = EMBED ? embedded || {} : {}

// Photos picked in the editor are shown from memory until the page is reloaded.
const local = {}
export const setLocalAsset = (path, url) => (local[path] = url)
// Paths are relative to the page ('memories/x.jpg'), so the museum works from any folder,
// e.g. https://you.github.io/3d-museum/. Older absolute paths ('/memories/x.jpg') still work.
export const assetUrl = (path) => {
  if (!path) return path
  if (/^(data:|blob:|https?:)/.test(path)) return path
  const rel = path.replace(/^\/+/, '')
  return local[path] || local[rel] || map[rel] || map[path] || rel
}
export const embeddedCharacter = (who) => (EMBED ? (characters || {})[who] || '' : '')

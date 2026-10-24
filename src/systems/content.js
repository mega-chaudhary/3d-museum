// ─────────────────────────────────────────────────────────────
// Editable museum content.
// The data files in src/data/ are the defaults. When the museum is opened
// from its shared link, the owner can edit everything in the page; the edits
// are saved next to the page as `museum.json` (+ photos in `photos/`) and are
// loaded here before the museum renders, for every visitor.
// ─────────────────────────────────────────────────────────────
import { MUSEUM } from '../data/museum'
import { HALL_MEMORIES } from '../data/memories'
import { TIMELINE } from '../data/timeline'
import { DESK_LETTER, FRAMED_NOTE } from '../data/letters'
import { FINALE } from '../data/finale'
import { GIFT } from '../data/gifts'

// The page's shareable link (shown after saving).
export const SHARE_URL = 'https://claude.ai/artifact/EtgVoG5x2shox2maA8ZYiV'

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]))
const MEMORY_KEYS = ['image', 'title', 'date', 'caption', 'message']
const TIMELINE_KEYS = ['image', 'date', 'title', 'milestone', 'message']

/** Current content as plain JSON. */
export function snapshotContent() {
  return {
    version: 1,
    museum: pick(MUSEUM, ['title', 'subtitle', 'dedicationHeading', 'dedication', 'dedicationSignature', 'himName', 'herName']),
    memories: HALL_MEMORIES.map((m) => pick(m, MEMORY_KEYS)),
    timeline: TIMELINE.map((t) => pick(t, TIMELINE_KEYS)),
    letter: pick(DESK_LETTER, ['salutation', 'paragraphs', 'closing', 'signature']),
    framedNote: pick(FRAMED_NOTE, MEMORY_KEYS),
    finale: pick(FINALE, ['artwork', 'wallHeading', 'heading', 'paragraphs', 'signature']),
    gift: pick(GIFT, ['title', 'message', 'signature']),
  }
}

const str = (v, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const strs = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 2000)).slice(0, 12) : undefined)
// Photos may be embedded as data URLs (several hundred KB), so they get a much larger limit.
const PHOTO_KEYS = new Set(['image', 'artwork'])
const photo = (v) => (typeof v === 'string' && (v.startsWith('data:image/') || !/^[a-z]+:/i.test(v)) ? v.slice(0, 12_000_000) : undefined)
function assignStrings(target, src, keys) {
  if (!src || typeof src !== 'object') return
  for (const k of keys) {
    const v = PHOTO_KEYS.has(k) ? photo(src[k]) : Array.isArray(target[k]) ? strs(src[k]) : str(src[k])
    if (v !== undefined) target[k] = v
  }
}

/** Apply saved content onto the live data objects (in place, so every module sees it). */
export function applyContent(c) {
  if (!c || typeof c !== 'object') return
  assignStrings(MUSEUM, c.museum, ['title', 'subtitle', 'dedicationHeading', 'dedication', 'dedicationSignature', 'himName', 'herName'])
  ;(c.memories || []).forEach((m, i) => HALL_MEMORIES[i] && assignStrings(HALL_MEMORIES[i], m, MEMORY_KEYS))
  ;(c.timeline || []).forEach((t, i) => TIMELINE[i] && assignStrings(TIMELINE[i], t, TIMELINE_KEYS))
  assignStrings(DESK_LETTER, c.letter, ['salutation', 'paragraphs', 'closing', 'signature'])
  assignStrings(FRAMED_NOTE, c.framedNote, MEMORY_KEYS)
  assignStrings(FINALE, c.finale, ['artwork', 'wallHeading', 'heading', 'paragraphs', 'signature'])
  assignStrings(GIFT, c.gift, ['title', 'message', 'signature'])
}

/** Load museum.json published next to the page (if there is one). Never throws. */
export async function loadContent() {
  try {
    const res = await fetch('museum.json', { cache: 'no-store' })
    if (!res.ok) return false
    applyContent(await res.json())
    return true
  } catch {
    return false
  }
}

/** Resize a photo the visitor picked to a JPEG blob (max 1600 px). */
export async function photoToJpeg(file, max = 1600) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('This photo format cannot be read here. Please use a JPG or PNG.'))
      i.src = url
    })
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * s)
    c.height = Math.round(img.naturalHeight * s)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return await new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.85))
  } finally {
    URL.revokeObjectURL(url)
  }
}

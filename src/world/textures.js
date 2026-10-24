import * as THREE from 'three'

// Procedural textures, generated once on a canvas (no external downloads).
const cache = new Map()
const once = (key, make) => {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

function rand(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// Polished stone floor: 2×2 large tiles per texture, soft veining.
export const marbleTexture = () =>
  once('marble', () => {
    const S = 1024
    const c = document.createElement('canvas')
    c.width = c.height = S
    const g = c.getContext('2d')
    const r = rand(11)
    const tile = S / 2
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++) {
        const shade = 226 + Math.floor(r() * 14)
        g.fillStyle = `rgb(${shade},${shade - 4},${shade - 10})`
        g.fillRect(tx * tile, ty * tile, tile, tile)
      }
    // cloudy variation
    for (let i = 0; i < 260; i++) {
      const x = r() * S
      const y = r() * S
      const rad = 20 + r() * 120
      const grd = g.createRadialGradient(x, y, 0, x, y, rad)
      const a = 0.025 + r() * 0.04
      grd.addColorStop(0, r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(150,140,130,${a})`)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grd
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
    // veins
    g.lineCap = 'round'
    for (let i = 0; i < 18; i++) {
      g.strokeStyle = `rgba(${120 + r() * 40},${115 + r() * 30},${110 + r() * 30},${0.08 + r() * 0.14})`
      g.lineWidth = 0.6 + r() * 2.2
      g.beginPath()
      let x = r() * S
      let y = r() * S
      g.moveTo(x, y)
      for (let k = 0; k < 6; k++) {
        const nx = x + (r() - 0.5) * 360
        const ny = y + (r() - 0.5) * 360
        g.quadraticCurveTo(x + (r() - 0.5) * 200, y + (r() - 0.5) * 200, nx, ny)
        x = nx
        y = ny
      }
      g.stroke()
    }
    // grout
    g.strokeStyle = 'rgba(120,112,102,0.55)'
    g.lineWidth = 3
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(i * tile, 0); g.lineTo(i * tile, S); g.stroke()
      g.beginPath(); g.moveTo(0, i * tile); g.lineTo(S, i * tile); g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  })

// Fine plaster noise for walls (used as a bump-ish color variation).
export const plasterTexture = () =>
  once('plaster', () => {
    const S = 256
    const c = document.createElement('canvas')
    c.width = c.height = S
    const g = c.getContext('2d')
    const img = g.createImageData(S, S)
    const r = rand(5)
    for (let i = 0; i < S * S; i++) {
      const v = 238 + Math.floor((r() - 0.5) * 22)
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = 255
    }
    g.putImageData(img, 0, 0)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })

// Soft radial pool of light, used to fake gallery spotlights on walls.
export const washTexture = () =>
  once('wash', () => {
    const S = 256
    const c = document.createElement('canvas')
    c.width = c.height = S
    const g = c.getContext('2d')
    const grd = g.createRadialGradient(S / 2, S * 0.42, 0, S / 2, S * 0.5, S / 2)
    grd.addColorStop(0, 'rgba(255,240,215,0.85)')
    grd.addColorStop(0.45, 'rgba(255,232,200,0.35)')
    grd.addColorStop(1, 'rgba(255,225,190,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, S, S)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })

// Round soft blob used as a contact shadow under the character.
export const blobTexture = () =>
  once('blob', () => {
    const S = 128
    const c = document.createElement('canvas')
    c.width = c.height = S
    const g = c.getContext('2d')
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    grd.addColorStop(0, 'rgba(0,0,0,0.55)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, S, S)
    return new THREE.CanvasTexture(c)
  })

// Placeholder for a photo that failed to load.
export function missingPhotoTexture(path) {
  return once('missing:' + path, () => {
    const c = document.createElement('canvas')
    c.width = 800
    c.height = 600
    const g = c.getContext('2d')
    const grd = g.createLinearGradient(0, 0, 0, 600)
    grd.addColorStop(0, '#3b3236')
    grd.addColorStop(1, '#1d181a')
    g.fillStyle = grd
    g.fillRect(0, 0, 800, 600)
    g.fillStyle = '#e8dccf'
    g.textAlign = 'center'
    g.font = '600 38px Georgia, serif'
    g.fillText('Photo coming soon', 400, 290)
    g.font = '22px Georgia, serif'
    g.fillStyle = '#a99c90'
    g.fillText(path, 400, 336)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

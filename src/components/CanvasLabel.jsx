import { forwardRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

const FAMILIES = {
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Jost', 'Helvetica Neue', Arial, sans-serif",
  hand: "'Caveat', 'Segoe Script', 'Bradley Hand', cursive",
}

let fontsReady = null
const whenFontsReady = () => {
  if (!fontsReady) {
    fontsReady = document.fonts
      ? Promise.all([
          document.fonts.load("600 64px 'Cormorant Garamond'"),
          document.fonts.load("400 64px 'Cormorant Garamond'"),
          document.fonts.load("italic 400 64px 'Cormorant Garamond'"),
          document.fonts.load("400 64px 'Jost'"),
          document.fonts.load("500 64px 'Jost'"),
          document.fonts.load("400 64px 'Caveat'"),
        ]).catch(() => {})
      : Promise.resolve()
  }
  return fontsReady
}

function wrap(g, text, maxW) {
  const words = text.split(' ')
  const out = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (g.measureText(test).width > maxW && line) {
      out.push(line)
      line = w
    } else line = test
  }
  if (line) out.push(line)
  return out
}

/**
 * Text rendered to a canvas and shown on a plane (crisp, uses web fonts, no font files needed).
 * lines: [{ text, family:'serif'|'sans'|'hand', size, weight, style, color, spacing, gap }]
 */
export const CanvasLabel = forwardRef(function CanvasLabel(
  { width = 2, lines, align = 'center', padding = 40, bg = null, basic = true, opacity = 1, ...props },
  ref,
) {
  const [ver, setVer] = useState(0)
  useEffect(() => {
    let alive = true
    whenFontsReady().then(() => alive && setVer((v) => v + 1))
    return () => { alive = false }
  }, [])

  const { texture, aspect } = useMemo(() => {
    const CW = 1024
    const c = document.createElement('canvas')
    const g = c.getContext('2d')
    const inner = CW - padding * 2
    // layout pass
    const laid = []
    let y = padding
    for (const l of lines) {
      const size = l.size || 48
      const font = `${l.style || 'normal'} ${l.weight || 400} ${size}px ${FAMILIES[l.family || 'serif']}`
      g.font = font
      if (l.spacing) g.letterSpacing = `${l.spacing}px`
      else g.letterSpacing = '0px'
      const rows = l.text ? wrap(g, l.text, inner) : ['']
      y += l.gapBefore || 0
      for (const row of rows) {
        laid.push({ row, font, y: y + size * 0.82, color: l.color || '#222', spacing: l.spacing || 0 })
        y += size * (l.lineHeight || 1.25)
      }
      y += l.gap ?? size * 0.35
    }
    const H = Math.ceil(y + padding * 0.6)
    c.width = CW
    c.height = H
    if (bg) {
      g.fillStyle = bg
      g.fillRect(0, 0, CW, H)
    }
    g.textBaseline = 'alphabetic'
    for (const l of laid) {
      g.font = l.font
      g.letterSpacing = `${l.spacing}px`
      g.fillStyle = l.color
      g.textAlign = align
      const x = align === 'center' ? CW / 2 : align === 'right' ? CW - padding : padding
      g.fillText(l.row, x, l.y)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return { texture: t, aspect: H / CW }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ver, JSON.stringify(lines), align, padding, bg])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh ref={ref} {...props}>
      <planeGeometry args={[width, width * aspect]} />
      {basic ? (
        <meshBasicMaterial map={texture} transparent opacity={opacity} toneMapped={false} depthWrite={opacity >= 1} />
      ) : (
        <meshStandardMaterial map={texture} transparent opacity={opacity} roughness={0.9} />
      )}
    </mesh>
  )
})

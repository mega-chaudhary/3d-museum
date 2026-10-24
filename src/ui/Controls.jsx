import { useEffect, useRef, useState } from 'react'
import { input } from '../systems/runtime'
import { useGame } from '../store/useGame'
import { MUSEUM } from '../data/museum'

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'])

// Keyboard: WASD / arrows move, Shift runs, E interacts, Q waves, 1–4 together actions, Esc closes overlays.
export function useKeyboard() {
  useEffect(() => {
    const typing = (e) => /input|textarea|select/i.test(e.target?.tagName || '')
    const down = (e) => {
      if (typing(e)) return
      if (MOVE_KEYS.has(e.code)) {
        input.keys.add(e.code)
        if (e.code.startsWith('Arrow')) e.preventDefault()
      }
      if (e.repeat) return
      const g = useGame.getState()
      if (e.code === 'KeyE' || e.code === 'Enter') {
        if (g.overlay) {
          if (e.code === 'KeyE') g.closeOverlay()
        } else if (g.started) g.requestInteract()
      }
      if (e.code === 'KeyQ' && g.started) g.requestWave()
      // Together actions with the partner
      if (g.started && !g.overlay) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') g.requestCouple('hold')
        if (e.code === 'Digit2' || e.code === 'Numpad2') g.requestCouple('dance')
        if (e.code === 'Digit3' || e.code === 'Numpad3') g.requestCouple('hug')
        if (e.code === 'Digit4' || e.code === 'Numpad4') g.requestCouple(g.hasRose ? 'give' : 'gift')
      }
      if (e.code === 'Escape' && g.overlay) g.closeOverlay()
    }
    const up = (e) => input.keys.delete(e.code)
    const blur = () => input.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
}

// On-screen joystick for touch devices.
export function Joystick() {
  const base = useRef()
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false })
  const R = 52
  useEffect(() => {
    const el = base.current
    let id = null
    let cx = 0
    let cy = 0
    const set = (e) => {
      let dx = e.clientX - cx
      let dy = e.clientY - cy
      const d = Math.hypot(dx, dy)
      if (d > R) {
        dx = (dx / d) * R
        dy = (dy / d) * R
      }
      input.joyX = dx / R
      input.joyY = -dy / R
      setKnob({ x: dx, y: dy, active: true })
    }
    const down = (e) => {
      if (id !== null) return
      id = e.pointerId
      const r = el.getBoundingClientRect()
      cx = r.left + r.width / 2
      cy = r.top + r.height / 2
      el.setPointerCapture(e.pointerId)
      set(e)
      e.preventDefault()
    }
    const move = (e) => e.pointerId === id && set(e)
    const end = (e) => {
      if (e.pointerId !== id) return
      id = null
      input.joyX = input.joyY = 0
      setKnob({ x: 0, y: 0, active: false })
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
    }
  }, [])
  return (
    <div className="joystick" ref={base} aria-label="Movement joystick" role="application">
      <div className={'joystick-knob' + (knob.active ? ' is-active' : '')} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}

export function TouchButtons() {
  const focus = useGame((s) => s.focus)
  const requestInteract = useGame((s) => s.requestInteract)
  const requestWave = useGame((s) => s.requestWave)
  return (
    <div className="touch-buttons">
      <button className="touch-btn touch-btn--small" onClick={requestWave} aria-label="Wave">
        Wave
      </button>
      <button
        className={'touch-btn touch-btn--main' + (focus ? ' is-ready' : '')}
        onClick={requestInteract}
        disabled={!focus}
        aria-label={focus ? `${focus.verb} ${focus.label}` : 'Interact'}
      >
        {focus ? focus.verb : 'E'}
      </button>
    </div>
  )
}

// Paired actions with the partner. Shown when the two characters are close.
export function TogetherBar() {
  const near = useGame((s) => s.partnerNear)
  const active = useGame((s) => s.coupleActive)
  const hasRose = useGame((s) => s.hasRose)
  const hasGift = useGame((s) => s.hasGift)
  const touch = useGame((s) => s.touch)
  const playAs = useGame((s) => s.playAs)
  const req = useGame((s) => s.requestCouple)
  const wave = useGame((s) => s.requestWave)
  const show = near || active === 'hold'
  if (!show || (active && active !== 'hold')) return null
  const partner = playAs === 'him' ? MUSEUM.herName : MUSEUM.himName
  const items = [
    { key: '1', label: active === 'hold' ? 'Let go' : 'Hold hands', on: () => req('hold'), pressed: active === 'hold' },
    { key: '2', label: 'Dance', on: () => req('dance') },
    { key: '3', label: 'Hug', on: () => req('hug') },
    hasRose ? { key: '4', label: 'Give rose', on: () => req('give') } : hasGift ? { key: '4', label: 'Give gift', on: () => req('gift') } : null,
    touch ? null : { key: 'Q', label: 'Wave', on: wave },
  ].filter(Boolean)
  return (
    <div className={'together' + (touch ? ' together--touch' : '')} role="toolbar" aria-label={`Together with ${partner}`}>
      <span className="together-label">With {partner}</span>
      {items.map((it) => (
        <button key={it.key} className={'together-btn' + (it.pressed ? ' is-on' : '')} onClick={it.on} aria-pressed={it.pressed || undefined}>
          {!touch && <kbd>{it.key}</kbd>}
          {it.label}
        </button>
      ))}
    </div>
  )
}

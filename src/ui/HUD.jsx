import { useEffect, useState } from 'react'
import { useGame } from '../store/useGame'
import { ROOMS } from '../world/layout'
import { Joystick, TouchButtons, TogetherBar } from './Controls'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

function useTransient(value, ms) {
  const [shown, setShown] = useState(null)
  useEffect(() => {
    if (!value) return
    setShown(value)
    const t = setTimeout(() => setShown(null), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return shown
}

export function HUD() {
  const started = useGame((s) => s.started)
  const room = useGame((s) => s.room)
  const focus = useGame((s) => s.focus)
  const overlay = useGame((s) => s.overlay)
  const touch = useGame((s) => s.touch)
  const hasRose = useGame((s) => s.hasRose)
  const fade = useGame((s) => s.fade)
  const toast = useTransient(useGame((s) => s.toast), 3600)
  const banner = useTransient(useGame((s) => s.roomBanner), 3200)
  const modelFailed = useTransient(useGame((s) => (s.modelFailed ? 'mf' : null)), 9000)
  const [help, setHelp] = useState(false)
  const canEdit = useGame((s) => s.canEdit)
  const openEditor = useGame((s) => s.openEditor)
  const locked = useGame((s) => s.pointerLocked)
  const r = ROOMS.find((x) => x.id === room)

  return (
    <div className="hud" aria-live="polite">
      <div className={'fade' + (fade ? ' is-on' : '')} />
      {started && (
        <>
          <div className="hud-top">
            <div className="room-badge">
              <span className="room-badge__num">{ROMAN[r?.index || 1]}</span>
              <span className="room-badge__name">{r?.name}</span>
              <span className="room-badge__count">
                {r?.index} / {ROOMS.length}
              </span>
            </div>
            <div className="hud-actions">
              {canEdit && (
                <button className="help-btn help-btn--edit" onClick={openEditor}>
                  Edit museum
                </button>
              )}
              <button className="help-btn" onClick={() => setHelp((h) => !h)} aria-expanded={help}>
                {help ? 'Close' : 'Controls'}
              </button>
            </div>
          </div>

          {help && (
            <div className="help-card">
              {touch ? (
                <ul>
                  <li><b>Left stick</b> walk · push fully to run</li>
                  <li><b>Drag</b> anywhere else to look around</li>
                  <li><b>Round button</b> interact when it lights up</li>
                  <li><b>Together buttons</b> appear when you stand close</li>
                </ul>
              ) : (
                <ul>
                  <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to walk</li>
                  <li><kbd>Shift</kbd> hold to run</li>
                  <li><b>Click the scene</b>, then move the mouse to look · <kbd>Esc</kbd> frees the mouse</li>
                  <li>Or <b>drag</b> to look · <b>scroll</b> to zoom</li>
                  <li><kbd>E</kbd> interact · <kbd>Q</kbd> wave · <kbd>Esc</kbd> close</li>
                  <li>Close together: <kbd>1</kbd> hold hands <kbd>2</kbd> dance <kbd>3</kbd> hug <kbd>4</kbd> give</li>
                </ul>
              )}
            </div>
          )}

          {banner && !overlay && (
            <div className="room-banner" key={banner.id}>
              <span className="room-banner__num">{ROMAN[banner.index]}</span>
              <span className="room-banner__name">{banner.name}</span>
            </div>
          )}

          {focus && !overlay && !touch && (
            <div className="prompt" key={focus.id + focus.verb}>
              <kbd>E</kbd>
              <span>
                {focus.verb} {focus.label}
              </span>
            </div>
          )}

          {(toast || modelFailed) && !overlay && (
            <div className="toast" key={toast?.id || 'mf'}>
              {toast?.text || 'The character model could not load, so a simple stand-in is used. Check public/models/character.glb.'}
            </div>
          )}

          {hasRose && !overlay && <div className="chip">Holding a rose</div>}

          {!touch && !overlay && !locked && <div className="look-hint">Click the room to look around with your mouse</div>}

          {!overlay && <TogetherBar />}

          {touch && !overlay && (
            <>
              <Joystick />
              <TouchButtons />
            </>
          )}
        </>
      )}
    </div>
  )
}

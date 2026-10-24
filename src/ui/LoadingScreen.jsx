import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useGame } from '../store/useGame'
import { MUSEUM } from '../data/museum'

// Shows real asset-loading progress, then a start card with the controls.
export function LoadingScreen() {
  const { progress, active, item, errors } = useProgress()
  const started = useGame((s) => s.started)
  const start = useGame((s) => s.start)
  const touch = useGame((s) => s.touch)
  const playAs = useGame((s) => s.playAs)
  const setPlayAs = useGame((s) => s.setPlayAs)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setDone(true), 350)
      return () => clearTimeout(t)
    }
    // Never get stuck: allow starting after 25 s even if something is still pending.
    const t = setTimeout(() => setDone(true), 25000)
    return () => clearTimeout(t)
  }, [active, progress])

  if (started) return null
  return (
    <div className="loading">
      <div className="loading-card">
        <p className="loading-eyebrow">{MUSEUM.subtitle}</p>
        <h1 className="loading-title">{MUSEUM.title}</h1>
        {!done ? (
          <>
            <div className="bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <div className="bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="loading-status">
              Preparing the galleries… {Math.round(progress)}%
              {item ? <span className="loading-item">{String(item).split('/').pop()}</span> : null}
            </p>
          </>
        ) : (
          <>
            <ul className="loading-controls">
              {touch ? (
                <>
                  <li>Use the stick on the left to walk. Push it all the way to run.</li>
                  <li>Drag anywhere else to look around.</li>
                  <li>Walk up to things that glow and tap the round button.</li>
                </>
              ) : (
                <>
                  <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk · hold <kbd>Shift</kbd> to run</li>
                  <li>Drag the mouse to look around · scroll to zoom</li>
                  <li>Walk up to things that glow and press <kbd>E</kbd></li>
                </>
              )}
            </ul>
            <div className="who" role="radiogroup" aria-label="Who are you?">
              <p className="who-label">Who are you?</p>
              <div className="who-options">
                {[['him', MUSEUM.himName], ['her', MUSEUM.herName]].map(([id, name]) => (
                  <button key={id} role="radio" aria-checked={playAs === id} className={'who-btn' + (playAs === id ? ' is-on' : '')} onClick={() => setPlayAs(id)}>
                    {name}
                  </button>
                ))}
              </div>
              <p className="who-hint">The other one walks beside you.</p>
            </div>
            {errors.length > 0 && (
              <p className="loading-warn">
                {errors.length} file{errors.length > 1 ? 's' : ''} could not load. The museum will use placeholders.
              </p>
            )}
            <button className="btn btn--primary btn--lg" onClick={start} autoFocus>
              Step inside
            </button>
          </>
        )}
      </div>
    </div>
  )
}

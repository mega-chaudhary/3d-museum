import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { assetUrl } from '../systems/assets'
import { Editor } from './Editor'

function useCloseOnBackdrop() {
  const close = useGame((s) => s.closeOverlay)
  return (e) => {
    if (e.target === e.currentTarget) close()
  }
}

function CloseButton() {
  const close = useGame((s) => s.closeOverlay)
  const ref = useRef()
  useEffect(() => ref.current?.focus(), [])
  return (
    <button ref={ref} className="overlay-close" onClick={close} aria-label="Close">
      <span aria-hidden="true">×</span>
    </button>
  )
}

function Photo({ src, alt }) {
  const [failed, setFailed] = useState(false)
  if (!src) return null
  return failed ? (
    <div className="photo photo--missing">
      <span>Photo coming soon</span>
      <small>{src}</small>
    </div>
  ) : (
    <img className="photo" src={assetUrl(src)} alt={alt} onError={() => setFailed(true)} />
  )
}

// Memory, timeline card and dedication share this layout.
function MemoryCard({ data, kind }) {
  const backdrop = useCloseOnBackdrop()
  const close = useGame((s) => s.closeOverlay)
  return (
    <div className="overlay" onClick={backdrop} role="dialog" aria-modal="true" aria-label={data.title}>
      <article className={'card card--' + kind}>
        <CloseButton />
        {data.image && <Photo src={data.image} alt={data.title} />}
        <div className="card-body">
          {kind === 'timeline' && data.milestone && <p className="eyebrow">{data.milestone}</p>}
          {data.date && <p className="card-date">{data.date}</p>}
          <h2 className="card-title">{data.title}</h2>
          {data.message && <p className="card-message">{data.message}</p>}
          {data.signature && <p className="card-signature">— {data.signature}</p>}
          <button className="btn btn--ghost" onClick={close}>
            Keep walking
          </button>
        </div>
      </article>
    </div>
  )
}

function VoiceMessage({ src }) {
  const [ok, setOk] = useState(null)
  useEffect(() => {
    if (!src) return setOk(false)
    let alive = true
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = () => alive && setOk(true)
    a.onerror = () => {
      if (!alive) return
      setOk(false)
      console.info(`[Memora] No voice message at ${src} — the audio player is hidden.`)
    }
    a.src = src
    return () => {
      alive = false
      a.src = ''
    }
  }, [src])
  if (!ok) return null
  return (
    <div className="voice">
      <p className="eyebrow">A voice message for you</p>
      <audio controls src={src} preload="metadata" />
    </div>
  )
}

function LetterCard({ data }) {
  const backdrop = useCloseOnBackdrop()
  return (
    <div className="overlay" onClick={backdrop} role="dialog" aria-modal="true" aria-label={data.title}>
      <article className="letter">
        <CloseButton />
        <p className="letter-salutation">{data.salutation}</p>
        {data.paragraphs.map((p, i) => (
          <p key={i} className="letter-p">
            {p}
          </p>
        ))}
        <p className="letter-closing">{data.closing}</p>
        <p className="letter-signature">{data.signature}</p>
        <VoiceMessage src={data.audio} />
      </article>
    </div>
  )
}

function FinaleCard({ data }) {
  const g = useGame()
  return (
    <div className="overlay overlay--finale" role="dialog" aria-modal="true" aria-label={data.heading}>
      <article className="finale">
        <CloseButton />
        <p className="eyebrow">The Final Surprise</p>
        <h2 className="finale-heading">{data.heading}</h2>
        {data.paragraphs.map((p, i) => (
          <p key={i} className="finale-p">
            {p}
          </p>
        ))}
        <p className="finale-signature">{data.signature}</p>
        {data.roseNote && <p className="finale-note">{data.roseNote}</p>}
        <div className="finale-actions">
          <button className="btn btn--primary" onClick={g.replay}>
            Replay from the beginning
          </button>
          <button className="btn btn--ghost" onClick={g.returnToEntrance}>
            Return to the entrance
          </button>
          <button className="btn btn--ghost" onClick={g.closeOverlay}>
            Stay in this room
          </button>
        </div>
      </article>
    </div>
  )
}

export function Overlays() {
  const overlay = useGame((s) => s.overlay)
  if (!overlay) return null
  const { type, data } = overlay
  if (type === 'editor') return <Editor />
  if (type === 'letter') return <LetterCard data={data} />
  if (type === 'finale') return <FinaleCard data={data} />
  return <MemoryCard data={data} kind={type} />
}

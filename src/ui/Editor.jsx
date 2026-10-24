import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { snapshotContent, applyContent, photoToJpeg, SHARE_URL } from '../systems/content'
import { assetUrl, setLocalAsset } from '../systems/assets'

// Where "Save" goes:
//  'claude'   – opened from its link in Claude: saves into that link (photos + museum.json)
//  'dev'      – running `npm run dev`: writes public/museum.json into your project
//  'download' – your own hosted site opened with ?edit: downloads museum.json to upload to GitHub
let artifactApi = null
let saveMode = null
export async function detectEditor() {
  const askedToEdit = new URLSearchParams(window.location.search).has('edit')
  if (import.meta.env.DEV) {
    saveMode = 'dev'
    return true
  }
  for (let i = 0; i < 12 && !window.claude?.use; i++) await new Promise((r) => setTimeout(r, 250))
  if (window.claude?.use) {
    try {
      const [art, user] = await Promise.all([window.claude.use('artifact'), window.claude.use('user')])
      const can = art && (user ? await user.canEdit().catch(() => false) : true)
      if (can) {
        artifactApi = art
        saveMode = 'claude'
        return true
      }
    } catch {
      /* not inside Claude */
    }
  }
  if (askedToEdit) {
    saveMode = 'download'
    return true
  }
  return false
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })

// For your own project/site: put every new photo inside museum.json, so it is one file.
async function embedPhotos(content, photos) {
  let json = JSON.stringify(content)
  for (const [path, blob] of Object.entries(photos)) {
    if (json.includes(path)) json = json.split(JSON.stringify(path)).join(JSON.stringify(await blobToDataUrl(blob)))
  }
  return json
}

const TABS = [
  ['text', 'Names & text'],
  ['hall', 'Memory Hall'],
  ['timeline', 'Timeline'],
  ['letter', 'Letter & surprise'],
]

function Field({ label, value, onChange, area, rows = 3, placeholder }) {
  return (
    <label className="ed-field">
      <span>{label}</span>
      {area ? (
        <textarea rows={rows} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}

function PhotoPicker({ src, onPick, label = 'Change photo' }) {
  const input = useRef()
  return (
    <div className="ed-photo">
      <img src={assetUrl(src)} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current.click()}>
        {label}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && onPick(e.target.files[0])} />
    </div>
  )
}

export function Editor() {
  const close = useGame((s) => s.closeOverlay)
  const bumpContent = useGame((s) => s.bumpContent)
  const [tab, setTab] = useState('hall')
  const [c, setC] = useState(() => snapshotContent())
  const [photos, setPhotos] = useState({}) // path -> Blob (new photos to save)
  const [status, setStatus] = useState(null) // { kind: 'busy'|'error'|'saved', text }
  const [copied, setCopied] = useState(false)
  const dirty = useRef(false)

  const update = (fn) => {
    dirty.current = true
    setC((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }
  const pickPhoto = async (slot, file, apply) => {
    try {
      setStatus({ kind: 'busy', text: 'Preparing photo…' })
      const blob = await photoToJpeg(file)
      const path = `photos/${slot}-${Date.now().toString(36)}.jpg`
      setLocalAsset(path, URL.createObjectURL(blob))
      setPhotos((p) => ({ ...p, [path]: blob }))
      update((n) => apply(n, path))
      setStatus(null)
    } catch (e) {
      setStatus({ kind: 'error', text: e.message })
    }
  }

  const finish = () => {
    applyContent(c)
    dirty.current = false
    setPhotos({})
    bumpContent()
    setStatus({ kind: 'saved' })
  }

  const save = async () => {
    if (saveMode === 'dev' || saveMode === 'download') {
      setStatus({ kind: 'busy', text: 'Saving your museum…' })
      try {
        const json = await embedPhotos(c, photos)
        if (saveMode === 'dev') {
          const res = await fetch('/__usss/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json })
          if (!res.ok) throw new Error(await res.text())
        } else {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
          a.download = 'museum.json'
          document.body.appendChild(a)
          a.click()
          a.remove()
        }
        finish()
      } catch (e) {
        setStatus({ kind: 'error', text: 'Saving did not work: ' + (e.message || 'unknown error') })
      }
      return
    }
    if (!artifactApi) return setStatus({ kind: 'error', text: 'Saving is not available here.' })
    setStatus({ kind: 'busy', text: 'Saving your museum…' })
    // only keep photos that are still used
    const used = JSON.stringify(c)
    const files = { 'museum.json': { content: JSON.stringify(c), contentType: 'application/json' } }
    for (const [path, blob] of Object.entries(photos)) if (used.includes(path)) files[path] = { content: blob, contentType: 'image/jpeg' }
    try {
      await artifactApi.publish(files)
      finish()
    } catch (e) {
      const code = e?.code
      const text =
        code === 'conflict' ? 'A newer version was saved somewhere else. The page is reloading to it.'
        : code === 'not_writer' || code === 'not_granted' ? 'Only the owner of this museum can save changes.'
        : code === 'capability_disabled' ? 'Saving is not available while the link is shared publicly. Turn public sharing off, save, then share again.'
        : code === 'too_large' ? 'That is too much to save at once. Try saving after changing fewer photos.'
        : code === 'rate_limited' ? 'Saving too often. Wait a moment and try again.'
        : 'Saving did not work. Please try again.'
      setStatus({ kind: 'error', text })
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL)
      setCopied(true)
    } catch {
      const el = document.getElementById('ed-link')
      const r = document.createRange()
      r.selectNodeContents(el)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(r)
    }
  }

  useEffect(() => {
    const esc = (e) => e.code === 'Escape' && status?.kind !== 'busy' && close()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [close, status])

  if (status?.kind === 'saved') {
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-label="Saved">
        <div className="ed-saved">
          <p className="eyebrow">Saved</p>
          {saveMode === 'claude' && (
            <>
              <h2>Your museum is ready to share</h2>
              <p>Everyone who opens this link now sees your photos and words.</p>
              <div className="ed-link">
                <code id="ed-link">{SHARE_URL}</code>
                <button className="btn btn--primary" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
              </div>
              <ol className="ed-steps">
                <li>Open the <b>Share</b> menu at the top of this page.</li>
                <li>Choose who can view it: add him by email, or turn on a public link.</li>
                <li>Send him the link.</li>
              </ol>
            </>
          )}
          {saveMode === 'dev' && (
            <>
              <h2>Saved into your project</h2>
              <p>Your photos and words are in <code>public/museum.json</code>. To put them online:</p>
              <ol className="ed-steps">
                <li>Push the project to GitHub (commit <code>public/museum.json</code>).</li>
                <li>Vercel or Netlify rebuilds your site automatically.</li>
                <li>Send him your site link, for example <code>usss.vercel.app</code>.</li>
              </ol>
            </>
          )}
          {saveMode === 'download' && (
            <>
              <h2>museum.json downloaded</h2>
              <p>It contains all your photos and words. To publish it:</p>
              <ol className="ed-steps">
                <li>In your GitHub repository, open the <code>public</code> folder.</li>
                <li>Click <b>Add file → Upload files</b>, upload <code>museum.json</code> (replace the old one) and commit.</li>
                <li>Wait about a minute for your site to rebuild, then send him your site link.</li>
              </ol>
            </>
          )}
          <div className="ed-actions">
            <button className="btn btn--ghost" onClick={() => setStatus(null)}>Keep editing</button>
            <button className="btn btn--primary" onClick={close}>Back to the museum</button>
          </div>
        </div>
      </div>
    )
  }

  const memory = (list, key, i, extra = []) => {
    const m = c[list][i]
    const set = (k) => (v) => update((n) => (n[list][i][k] = v))
    return (
      <div className="ed-card" key={i}>
        <PhotoPicker src={m.image} onPick={(f) => pickPhoto(`${key}${i + 1}`, f, (n, path) => (n[list][i].image = path))} />
        <div className="ed-fields">
          <p className="ed-num">{key === 'hall' ? `Frame ${i + 1}` : `Moment ${i + 1}`}</p>
          <Field label="Title" value={m.title} onChange={set('title')} />
          <Field label="Date" value={m.date} onChange={set('date')} />
          {extra.map(([k, label]) => <Field key={k} label={label} value={m[k]} onChange={set(k)} />)}
          <Field label="Message" area value={m.message} onChange={set('message')} />
        </div>
      </div>
    )
  }

  return (
    <div className="overlay overlay--editor" role="dialog" aria-modal="true" aria-label="Edit your museum">
      <section className="editor">
        <header className="ed-head">
          <div>
            <p className="eyebrow">{saveMode === 'dev' ? 'Editing your project' : saveMode === 'download' ? 'Editing (only you see this)' : 'Owner only'}</p>
            <h2>Edit your museum</h2>
          </div>
          <div className="ed-head-actions">
            <button className="btn btn--ghost" onClick={close} disabled={status?.kind === 'busy'}>Close</button>
            <button className="btn btn--primary" onClick={save} disabled={status?.kind === 'busy'}>
              {saveMode === 'dev' ? 'Save to project' : saveMode === 'download' ? 'Save (download museum.json)' : 'Save & get link'}
            </button>
          </div>
        </header>
        <nav className="ed-tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        {status && status.kind !== 'saved' && <p className={'ed-status ed-status--' + status.kind}>{status.text}</p>}
        <div className="ed-body">
          {tab === 'text' && (
            <div className="ed-grid">
              <Field label="His name" value={c.museum.himName} onChange={(v) => update((n) => (n.museum.himName = v))} />
              <Field label="Her name" value={c.museum.herName} onChange={(v) => update((n) => (n.museum.herName = v))} />
              <Field label="Museum title" value={c.museum.title} onChange={(v) => update((n) => (n.museum.title = v))} />
              <Field label="Subtitle" value={c.museum.subtitle} onChange={(v) => update((n) => (n.museum.subtitle = v))} />
              <Field label="Dedication (Grand Entrance wall)" area rows={5} value={c.museum.dedication} onChange={(v) => update((n) => (n.museum.dedication = v))} />
              <Field label="Dedication signature" value={c.museum.dedicationSignature} onChange={(v) => update((n) => (n.museum.dedicationSignature = v))} />
              <Field label="Gift title" value={c.gift.title} onChange={(v) => update((n) => (n.gift.title = v))} />
              <Field label="Message inside the gift" area value={c.gift.message} onChange={(v) => update((n) => (n.gift.message = v))} />
            </div>
          )}
          {tab === 'hall' && c.memories.map((_, i) => memory('memories', 'hall', i, [['caption', 'Short caption']]))}
          {tab === 'timeline' && c.timeline.map((_, i) => memory('timeline', 'timeline', i, [['milestone', 'Milestone']]))}
          {tab === 'letter' && (
            <div className="ed-grid">
              <h3 className="ed-sub">The letter on the desk</h3>
              <Field label="Greeting" value={c.letter.salutation} onChange={(v) => update((n) => (n.letter.salutation = v))} />
              <Field label="Letter (leave an empty line between paragraphs)" area rows={9} value={c.letter.paragraphs.join('\n\n')}
                onChange={(v) => update((n) => (n.letter.paragraphs = v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)))} />
              <Field label="Closing" value={c.letter.closing} onChange={(v) => update((n) => (n.letter.closing = v))} />
              <Field label="Signature" value={c.letter.signature} onChange={(v) => update((n) => (n.letter.signature = v))} />
              <h3 className="ed-sub">The framed note</h3>
              <div className="ed-card">
                <PhotoPicker src={c.framedNote.image} onPick={(f) => pickPhoto('note', f, (n, path) => (n.framedNote.image = path))} />
                <div className="ed-fields">
                  <Field label="Title" value={c.framedNote.title} onChange={(v) => update((n) => (n.framedNote.title = v))} />
                  <Field label="Date" value={c.framedNote.date} onChange={(v) => update((n) => (n.framedNote.date = v))} />
                  <Field label="Message" area value={c.framedNote.message} onChange={(v) => update((n) => (n.framedNote.message = v))} />
                </div>
              </div>
              <h3 className="ed-sub">The final surprise</h3>
              <div className="ed-card">
                <PhotoPicker src={c.finale.artwork} label="Change the artwork" onPick={(f) => pickPhoto('finale', f, (n, path) => (n.finale.artwork = path))} />
                <div className="ed-fields">
                  <Field label="Words on the wall" value={c.finale.wallHeading} onChange={(v) => update((n) => (n.finale.wallHeading = v))} />
                  <Field label="Heading of the secret message" value={c.finale.heading} onChange={(v) => update((n) => (n.finale.heading = v))} />
                  <Field label="Secret message (empty line between paragraphs)" area rows={6} value={c.finale.paragraphs.join('\n\n')}
                    onChange={(v) => update((n) => (n.finale.paragraphs = v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)))} />
                  <Field label="Signature" value={c.finale.signature} onChange={(v) => update((n) => (n.finale.signature = v))} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

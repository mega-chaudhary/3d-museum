import { Component, useEffect, useMemo, useRef } from 'react'
import { createPortal, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { suspend } from 'suspend-react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CHARACTERS, CLIPS, BONES } from '../config/characters'
import { humanoids } from '../systems/runtime'
import { blobTexture } from '../world/textures'
import { RoseModel, GiftBoxModel } from '../components/Props'
import { useGame } from '../store/useGame'
import { EMBED, embeddedCharacter } from '../systems/assets'

// ── Loading ─────────────────────────────────────────────────
// Single-file build: parse the embedded GLB from memory (no network request).
function parseEmbedded(who) {
  const b64 = embeddedCharacter(who)
  if (!b64) return Promise.reject(new Error(`No embedded model for ${who}`))
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Promise((resolve, reject) => {
    const cib = window.createImageBitmap // force <img> texture decoding (works in sandboxed pages)
    try {
      window.createImageBitmap = undefined
      new GLTFLoader().parse(bytes.buffer, '', resolve, reject)
    } finally {
      window.createImageBitmap = cib
    }
  })
}
const useCharacterModel = EMBED ? (who) => suspend(() => parseEmbedded(who), ['usss-character', who]) : (who) => useGLTF(CHARACTERS[who].url)
if (!EMBED) Object.values(CHARACTERS).forEach((c) => useGLTF.preload(c.url))

// ── Animation API ───────────────────────────────────────────
// Wraps an AnimationMixer with crossfades, one-shot clips with callbacks, and
// arm masking for hand-holding (locomotion keeps playing on the rest of the body
// while the holding arm plays its own clip on a separate layer).
const ARM_TRACK = {
  R: /^mixamorigRight(Shoulder|Arm|ForeArm|Hand)/,
  L: /^mixamorigLeft(Shoulder|Arm|ForeArm|Hand)/,
}
const MASKABLE = new Set(['idle', 'walk', 'run'])

export function createAnimApi(scene, animations, cfg) {
  const mixer = new THREE.AnimationMixer(scene)
  const clips = new Map(animations.map((c) => [c.name, c]))
  const actions = new Map()
  const action = (clip) => {
    let a = actions.get(clip.name)
    if (!a) {
      a = mixer.clipAction(clip)
      actions.set(clip.name, a)
    }
    return a
  }
  const masked = (name, side) => {
    const key = `${name}|no${side}`
    if (!clips.has(key)) {
      const src = clips.get(name)
      if (!src) return null
      const m = src.clone()
      m.name = key
      m.tracks = m.tracks.filter((t) => !ARM_TRACK[side].test(t.name))
      clips.set(key, m)
    }
    return clips.get(key)
  }
  let current = null
  let curKey = 'idle'
  let curTs = 1
  let holdSide = null
  let overlay = null
  let pending = null
  const resolve = (key) => {
    const name = CLIPS[key] || key
    if (holdSide && MASKABLE.has(key)) return masked(name, holdSide)
    return clips.get(name) || clips.get(CLIPS.idle)
  }
  const to = (a, fade) => {
    if (current === a) return
    a.enabled = true
    a.reset()
    a.setEffectiveWeight(1)
    a.play()
    if (current) a.crossFadeFrom(current, fade, false)
    else a.fadeIn(fade)
    current = a
  }
  mixer.addEventListener('finished', (e) => {
    if (pending && e.action === pending.a) {
      const cb = pending.cb
      pending = null
      cb()
    }
  })
  const missing = Object.values(CLIPS).filter((n) => !clips.has(n))
  if (missing.length) console.warn(`[usss] ${cfg.id}: clips not found:`, missing.join(', '))

  const bone = (n) => scene.getObjectByName(n)
  const api = {
    who: cfg.id,
    scale: cfg.scale,
    nativeWalk: cfg.nativeSpeed.walk * cfg.scale,
    nativeRun: cfg.nativeSpeed.run * cfg.scale,
    meta: scene.userData?.usss || {},
    scene,
    root: null,
    bones: {
      rightHand: bone(BONES.rightHand),
      leftHand: bone(BONES.leftHand),
      arm: { R: BONES.arm.R.map(bone), L: BONES.arm.L.map(bone) },
    },
    get key() {
      return curKey
    },
    loop(key, ts = 1, fade = 0.24) {
      curKey = key
      curTs = ts
      const clip = resolve(key)
      if (!clip) return
      const a = action(clip)
      a.setLoop(THREE.LoopRepeat, Infinity)
      a.clampWhenFinished = false
      a.setEffectiveTimeScale(ts)
      to(a, fade)
    },
    once(key, onDone, ts = 1) {
      curKey = key
      const clip = clips.get(CLIPS[key] || key)
      if (!clip) {
        setTimeout(onDone, 400)
        return 0.4
      }
      const a = action(clip)
      a.setLoop(THREE.LoopOnce, 1)
      a.clampWhenFinished = true
      a.setEffectiveTimeScale(ts)
      to(a, 0.22)
      pending = { a, cb: onDone }
      return clip.duration / ts
    },
    setTimeScale(ts) {
      curTs = ts
      current?.setEffectiveTimeScale(ts)
    },
    syncTime(t) {
      if (current) current.time = t
    },
    // side: 'R' | 'L' | null
    setHold(side) {
      if (side === holdSide) return
      holdSide = side
      if (MASKABLE.has(curKey)) {
        const keep = curKey
        const clip = resolve(keep)
        if (clip) {
          const a = action(clip)
          a.setLoop(THREE.LoopRepeat, Infinity)
          a.setEffectiveTimeScale(curTs)
          to(a, 0.3)
        }
      }
      if (overlay) {
        overlay.fadeOut(0.3)
        overlay = null
      }
      if (side) {
        const c = clips.get(side === 'R' ? CLIPS.holdRight : CLIPS.holdLeft)
        if (c) {
          overlay = action(c)
          overlay.reset().setLoop(THREE.LoopRepeat, Infinity)
          overlay.setEffectiveWeight(1)
          overlay.fadeIn(0.3).play()
        }
      }
    },
    update(dt) {
      mixer.update(dt)
    },
    dispose() {
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
    },
  }
  api.loop('idle', 1, 0)
  return api
}

// ── Visual pieces ───────────────────────────────────────────
function BlobShadow({ size = 0.9 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={blobTexture()} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// Props held in the right hand. Offsets are in the hand bone's space
// (Mixamo hand bones point +Y along the fingers).
function HandProps({ hand, scale, role }) {
  const rose = useGame((s) => (role === 'player' ? s.hasRose : s.partnerHasRose))
  const gift = useGame((s) => (role === 'player' ? s.hasGift : s.partnerHasGift))
  if (!hand) return null
  const k = 1 / scale
  return createPortal(
    <group scale={k}>
      {rose && <RoseModel position={[0.02, 0.07, 0.03]} rotation={[Math.PI * 0.92, 0, 0.2]} scale={1.1} />}
      {gift && <GiftBoxModel position={[0, 0.1, 0.09]} rotation={[0.2, 0, 0]} size={0.2} />}
    </group>,
    hand,
  )
}

/**
 * A realistic animated character. Registers its animation API in `humanoids[role]`
 * and hands it to `animRef` for the controller.
 */
export function Humanoid({ who, role, rootRef, animRef }) {
  const { scene, animations } = useCharacterModel(who)
  const cfg = CHARACTERS[who]
  const api = useMemo(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.frustumCulled = false
      }
    })
    return createAnimApi(scene, animations, cfg)
  }, [scene, animations, cfg])

  useEffect(() => {
    api.root = rootRef.current
    humanoids[role] = api
    animRef.current = api
    if (window.__memora) window.__memora[role + 'Model'] = api
    return () => {
      if (humanoids[role] === api) humanoids[role] = null
      if (animRef.current === api) animRef.current = null
      api.dispose()
    }
  }, [api, role, rootRef, animRef])

  return (
    <group ref={rootRef}>
      <primitive object={scene} scale={cfg.scale} />
      <BlobShadow />
      <HandProps hand={api.bones.rightHand} scale={cfg.scale} role={role} />
    </group>
  )
}

// ── Fallback ────────────────────────────────────────────────
// If a model file is missing or broken, keep the museum playable with a simple
// stand-in figure that uses the same controller interface.
export function FallbackFigure({ role, rootRef, animRef, color = '#7a3344' }) {
  const body = useRef()
  const st = useRef({ name: 'idle', ts: 1, t: 0 })
  useEffect(() => {
    useGame.getState().setModelFailed()
    const api = {
      who: role,
      scale: 1,
      nativeWalk: 1.4,
      nativeRun: 2.6,
      meta: {},
      bones: { arm: { R: [], L: [] } },
      root: rootRef.current,
      loop(name, ts = 1) { st.current.name = name; st.current.ts = ts },
      setTimeScale(ts) { st.current.ts = ts },
      once(name, onDone) { st.current.name = name; setTimeout(onDone, 800); return 0.8 },
      syncTime() {},
      setHold() {},
      update() {},
      dispose() {},
    }
    humanoids[role] = api
    animRef.current = api
    return () => {
      if (humanoids[role] === api) humanoids[role] = null
    }
  }, [role, rootRef, animRef])
  useFrame((_, dt) => {
    const s = st.current
    s.t += dt * s.ts * 8
    if (!body.current) return
    const moving = s.name === 'walk' || s.name === 'run'
    body.current.position.y = moving ? Math.abs(Math.sin(s.t)) * 0.06 : 0
  })
  return (
    <group ref={rootRef}>
      <group ref={body}>
        <mesh position={[0, 0.85, 0]} castShadow>
          <capsuleGeometry args={[0.24, 0.8, 6, 16]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.2, 20, 16]} />
          <meshStandardMaterial color="#e8c3a5" roughness={0.6} />
        </mesh>
      </group>
      <BlobShadow />
    </group>
  )
}

export class ModelBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.error('[usss] Character model failed to load:', err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

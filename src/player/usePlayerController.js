import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { MOVE } from '../config/characters'
import { playerState, partnerState, cameraState, readMoveInput, interactables, steppers, couple } from '../systems/runtime'
import { resolveCircle } from '../systems/colliders'
import { roomAt } from '../world/layout'
import { useGame } from '../store/useGame'

const TAU = Math.PI * 2
const wrapAngle = (a) => {
  a = (a + Math.PI) % TAU
  if (a < 0) a += TAU
  return a - Math.PI
}
const dampAngle = (a, b, lambda, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-lambda * dt))
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt))

// How far in front of the bench seat point the character's root (feet) stands while
// sitting. The SitDown/SitIdle clips place the hips 0.32 m behind the feet.
export const SEAT_ROOT_OFFSET = 0.32

// Max simulated step per frame. ?maxdt=0.5 in the URL is only for automated tests on very slow GPUs.
const MAX_DT = (() => {
  const v = typeof window !== 'undefined' && parseFloat(new URLSearchParams(window.location.search).get('maxdt'))
  return v > 0 ? Math.min(v, 1) : 0.1
})()
export { MAX_DT }

/**
 * Third-person controller for Character 1 (the player).
 * anim = animation API from <Humanoid> (loop / once / setTimeScale / nativeWalk / nativeRun)
 * rootRef: group that is moved through the world.
 * Runs inside <Director/>'s frame loop so the partner and hand IK update after it.
 */
export function usePlayerController(rootRef, anim) {
  const c = useRef({
    mode: 'free',
    speed: 0,
    animSpeed: 0,
    dir: new THREE.Vector2(0, -1),
    timer: 0,
    gait: 'idle',
    wantInteract: false,
    wantWave: false,
    target: null, // interaction in progress
    fired: false,
    seat: null,
    from: new THREE.Vector3(),
    onceDone: false,
  })

  useEffect(() => {
    if (window.__memora) window.__memora.controller = c.current
  }, [])

  // Listen for command nonces without re-rendering.
  useEffect(() => {
    let last = useGame.getState()
    return useGame.subscribe((s) => {
      if (s.interactNonce !== last.interactNonce) c.current.wantInteract = true
      if (s.waveNonce !== last.waveNonce) c.current.wantWave = true
      if (s.teleport && s.teleport !== last.teleport) {
        const { position, yaw } = s.teleport
        playerState.position.set(position[0], 0, position[2])
        playerState.yaw = yaw
        cameraState.yaw = yaw + Math.PI
        Object.assign(c.current, { mode: 'free', speed: 0, animSpeed: 0, seat: null, target: null, directive: null })
        playerState.seat = null
        anim.current?.loop('idle', 1)
        c.current.gait = 'idle'
      }
      last = s
    })
  }, [anim])

  const step = useRef()
  useEffect(() => {
    const fn = (state, dt) => step.current?.(state, dt)
    steppers.player = fn
    return () => {
      if (steppers.player === fn) steppers.player = null
    }
  }, [])

  step.current = (state, dt) => {
    const ctl = c.current
    const a = anim.current
    if (!a) return
    const g = useGame.getState()
    const p = playerState.position
    const blocked = !!g.overlay || !g.started || g.fade
    const mv = blocked ? { x: 0, y: 0, mag: 0, run: false } : readMoveInput()
    if (blocked) ctl.wantInteract = ctl.wantWave = false
    // Walking hand in hand: no running.
    if (couple.action === 'hold') mv.run = false
    const nativeWalk = a.nativeWalk
    const nativeRun = a.nativeRun

    const setGait = (gait, ts) => {
      if (ctl.gait !== gait) {
        ctl.gait = gait
        a.loop(gait, ts)
      } else a.setTimeScale?.(ts)
    }
    const playOnce = (name, next) => {
      ctl.gait = name
      ctl.onceDone = false
      const dur = a.once(name, () => (ctl.onceDone = true))
      ctl.timer = dur
      ctl.next = next
    }

    // Couple choreography (dance, hug, giving...) takes over the player while it runs.
    if (couple.playerDirective && ctl.mode === 'free') {
      ctl.mode = 'directed'
      ctl.directive = null
    }

    switch (ctl.mode) {
      case 'directed': {
        const d = couple.playerDirective
        ctl.speed = damp(ctl.speed, 0, 12, dt)
        ctl.animSpeed = damp(ctl.animSpeed, 0, 12, dt)
        if (!d) {
          ctl.mode = 'free'
          ctl.directive = null
          setGait('idle', 1)
          break
        }
        if (mv.mag > 0 && d.cancelable) couple.cancel = true
        const face = typeof d.face === 'function' ? d.face() : d.face
        if (face) playerState.yaw = dampAngle(playerState.yaw, Math.atan2(face[0] - p.x, face[1] - p.z), 8, dt)
        if (ctl.directive !== d || ctl.directiveAnim !== d.anim) {
          ctl.directive = d
          ctl.directiveAnim = d.anim
          if (d.once) {
            playOnce(d.anim)
            ctl.onceDone = false
          } else setGait(d.anim, 1)
        }
        if (d.once && ctl.onceDone && !d.doneReported) {
          d.doneReported = true
          d.onDone?.()
        }
        break
      }

      case 'free': {
        if (ctl.wantInteract) {
          ctl.wantInteract = false
          const def = g.focus && interactables.get(g.focus.id)?.current
          if (def && (!def.enabled || def.enabled())) {
            if (def.kind === 'sit') {
              const seat = def.seat(p.x, p.z, partnerState.position)
              ctl.seat = seat
              playerState.seat = seat
              if (couple.action === 'hold') couple.endRequested = true
              ctl.from.copy(p)
              ctl.timer = 0
              ctl.mode = 'toSeat'
              setGait('walk', 1)
              break
            }
            if (couple.action === 'hold') couple.endRequested = true
            ctl.target = def
            ctl.fired = false
            ctl.timer = 0
            ctl.mode = 'turn'
            break
          }
        }
        if (ctl.wantWave) {
          ctl.wantWave = false
          ctl.mode = 'emote'
          playOnce('wave')
          break
        }
        locomotion(ctl, mv, dt, p, setGait, nativeWalk, nativeRun)
        break
      }

      case 'turn': {
        // Face the exhibit, then play the interaction animation.
        ctl.speed = damp(ctl.speed, 0, 12, dt)
        ctl.animSpeed = damp(ctl.animSpeed, 0, 12, dt)
        setGait('idle', 1)
        const fp = ctl.target.facePoint
        if (fp) {
          const want = Math.atan2(fp[0] - p.x, fp[1] - p.z)
          playerState.yaw = dampAngle(playerState.yaw, want, 10, dt)
          ctl.timer += dt
          if (Math.abs(wrapAngle(want - playerState.yaw)) > 0.12 && ctl.timer < 0.6) break
        }
        ctl.mode = 'interact'
        ctl.fired = false
        playOnce(ctl.target.anim || 'interact')
        ctl.fireAt = Math.min(0.55, ctl.timer * 0.5)
        ctl.elapsed = 0
        break
      }

      case 'interact': {
        ctl.elapsed += dt
        if (!ctl.fired && ctl.elapsed >= (ctl.target.fireDelay ?? 0.45)) {
          ctl.fired = true
          ctl.target.onInteract?.()
        }
        if (ctl.onceDone || ctl.elapsed > ctl.timer + 0.1) {
          ctl.mode = 'free'
          setGait('idle', 1)
        } else if (ctl.fired && mv.mag > 0) {
          ctl.mode = 'free' // let the player walk away early
        }
        break
      }

      case 'emote': {
        ctl.speed = damp(ctl.speed, 0, 12, dt)
        if (ctl.onceDone || mv.mag > 0) {
          ctl.mode = 'free'
          ctl.gait = '__'
          locomotion(ctl, mv, dt, p, setGait, nativeWalk, nativeRun)
        }
        break
      }

      case 'toSeat': {
        const s = ctl.seat
        ctl.timer += dt
        const t = Math.min(1, ctl.timer / 0.45)
        const tx = s.x + s.forward[0] * SEAT_ROOT_OFFSET
        const tz = s.z + s.forward[1] * SEAT_ROOT_OFFSET
        p.x = THREE.MathUtils.lerp(ctl.from.x, tx, t)
        p.z = THREE.MathUtils.lerp(ctl.from.z, tz, t)
        playerState.yaw = dampAngle(playerState.yaw, s.yaw, 14, dt)
        if (t >= 1) {
          playerState.yaw = s.yaw
          ctl.mode = 'sitting'
          playOnce('sitDown')
          ctl.sitPhase = 'down'
        }
        break
      }

      case 'sitting': {
        if (ctl.sitPhase === 'down' && ctl.onceDone) {
          ctl.sitPhase = 'idle'
          setGait('sitIdle', 1)
        }
        const wantsUp = mv.mag > 0 || ctl.wantInteract
        ctl.wantInteract = false
        if (wantsUp && ctl.sitPhase === 'idle') {
          ctl.sitPhase = 'up'
          playOnce('standUp')
        }
        if (ctl.sitPhase === 'up' && ctl.onceDone) {
          const s = ctl.seat
          p.x = s.x + s.forward[0] * 0.62
          p.z = s.z + s.forward[1] * 0.62
          ctl.mode = 'free'
          ctl.seat = null
          playerState.seat = null
          setGait('idle', 1)
        }
        break
      }
      default:
        ctl.mode = 'free'
    }

    // Apply transform.
    if (rootRef.current) {
      rootRef.current.position.copy(p)
      rootRef.current.rotation.y = playerState.yaw
    }
    playerState.speed = ctl.animSpeed
    playerState.moving = ctl.animSpeed > 0.2
    playerState.sitting = ctl.mode === 'sitting'
    playerState.sitPhase = ctl.sitPhase
    playerState.mode = ctl.mode

    // Focus detection.
    if (ctl.mode === 'sitting') {
      g.setFocus(ctl.sitPhase === 'idle' ? { id: '__stand', label: '', verb: 'Stand up' } : null)
    } else if (ctl.mode === 'free' && !blocked) {
      let best = null
      let bestScore = Infinity
      const fx = Math.sin(playerState.yaw)
      const fz = Math.cos(playerState.yaw)
      for (const [id, ref] of interactables) {
        const d = ref.current
        if (d.enabled && !d.enabled()) continue
        const dx = d.position[0] - p.x
        const dz = d.position[2] - p.z
        const dist = Math.hypot(dx, dz)
        if (dist > d.radius) continue
        // must be on the visible side of a wall-mounted exhibit (measured from its surface)
        if (d.normal) {
          const sx = d.facePoint ? d.facePoint[0] : d.position[0]
          const sz = d.facePoint ? d.facePoint[1] : d.position[2]
          if ((p.x - sx) * d.normal[0] + (p.z - sz) * d.normal[1] < 0.05) continue
        }
        const facing = dist > 0.01 ? (dx * fx + dz * fz) / dist : 1
        const score = dist - facing * 0.8
        if (score < bestScore) {
          bestScore = score
          best = { id, label: d.label, verb: d.verb }
        }
      }
      g.setFocus(best)
    } else if (ctl.mode !== 'free') {
      if (g.focus) g.setFocus(null)
    }

    // Room tracking.
    const r = roomAt(p.x, p.z)
    if (r && r.id !== g.room) g.setRoom(r.id, { index: r.index, name: r.name })
  }

  return c
}

function locomotion(ctl, mv, dt, p, setGait, nativeWalk, nativeRun) {
  const camYaw = cameraState.yaw
  const fx = -Math.sin(camYaw)
  const fz = -Math.cos(camYaw)
  const rx = Math.cos(camYaw)
  const rz = -Math.sin(camYaw)
  const target = mv.mag
    ? mv.run
      ? MOVE.runSpeed
      : MOVE.walkSpeed * Math.min(1, Math.max(0.45, mv.mag / 0.88))
    : 0
  if (mv.mag) ctl.dir.set(rx * mv.x + fx * mv.y, rz * mv.x + fz * mv.y).normalize()
  ctl.speed = damp(ctl.speed, target, target > ctl.speed ? 7 : 11, dt)
  if (ctl.speed < 0.01) ctl.speed = 0

  const ox = p.x
  const oz = p.z
  // Sub-step so fast movement or a slow frame can never tunnel through a wall.
  const travel = ctl.speed * dt
  const steps = Math.max(1, Math.ceil(travel / 0.12))
  for (let i = 0; i < steps; i++) {
    p.x += (ctl.dir.x * travel) / steps
    p.z += (ctl.dir.y * travel) / steps
    resolveCircle(p, MOVE.radius)
    separate(p, partnerState.position, couple.action === 'hold' || couple.action === 'hug' ? 0.3 : 0.5)
  }
  const actual = Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-4)
  ctl.animSpeed = damp(ctl.animSpeed, Math.min(actual, ctl.speed + 0.05), 14, dt)

  // Only let the camera auto-settle behind the character when walking forward (W / stick up);
  // otherwise strafing would make the camera chase the character in circles.
  playerState.forwardInput = mv.mag > 0 && mv.y > 0.6 && Math.abs(mv.x) < 0.75
  if (mv.mag) {
    const want = Math.atan2(ctl.dir.x, ctl.dir.y)
    playerState.yaw = dampAngle(playerState.yaw, want, 11, dt)
  }

  // Pick a gait with hysteresis and sync the clip rate to ground speed (no foot sliding).
  const s = ctl.animSpeed
  const runEnter = MOVE.walkSpeed * 1.35
  const runExit = MOVE.walkSpeed * 1.15
  let gait
  if (s < 0.12) gait = 'idle'
  else if (ctl.gait === 'run' ? s > runExit : s > runEnter) gait = 'run'
  else gait = 'walk'
  const ts =
    gait === 'walk'
      ? THREE.MathUtils.clamp(s / nativeWalk, 0.55, 2.6)
      : gait === 'run'
        ? THREE.MathUtils.clamp(s / nativeRun, 0.7, 2.6)
        : 1
  setGait(gait, ts)
}

// Keep the two characters from walking through each other.
export function separate(p, other, min) {
  const dx = p.x - other.x
  const dz = p.z - other.z
  const d = Math.hypot(dx, dz)
  if (d > 1e-4 && d < min) {
    p.x = other.x + (dx / d) * min
    p.z = other.z + (dz / d) * min
  }
}

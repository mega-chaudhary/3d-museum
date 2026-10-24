import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { MOVE } from '../config/characters'
import { playerState, partnerState, interactables, steppers, couple } from '../systems/runtime'
import { resolveCircle, segmentHit, pointBlocked } from '../systems/colliders'
import { OPENINGS } from '../world/layout'
import { useGame } from '../store/useGame'
import { SEAT_ROOT_OFFSET, separate } from './usePlayerController'
import { GIFT } from '../data/gifts'

const TAU = Math.PI * 2
const wrapAngle = (a) => {
  a = (a + Math.PI) % TAU
  if (a < 0) a += TAU
  return a - Math.PI
}
const dampAngle = (a, b, l, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-l * dt))
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt))
// Character-space offset (x = character's left, z = forward) → world, for a character at (px,pz) facing yaw.
const local = (px, pz, yaw, lx, lz) => [px + lx * Math.cos(yaw) + lz * Math.sin(yaw), pz - lx * Math.sin(yaw) + lz * Math.cos(yaw)]

const NEAR = 3.2 // how close the partner must be for paired actions (m)
const FOLLOW_SLOT = [-0.95, -0.45] // partner walks at the player's right, slightly behind

/**
 * Character 2: follows the player through the museum, waits and looks at the
 * same things, and performs the paired interactions with correct positioning.
 */
export function usePartnerController(rootRef, anim) {
  const c = useRef({
    gait: 'idle',
    speed: 0,
    animSpeed: 0,
    lastReq: 0,
    lastWave: 0,
    stuckT: 0,
    sidestep: 0,
    playerIdleT: 0,
    sit: null,
    onceDone: false,
    wavePending: -1,
  })

  // Teleports (return to entrance / replay) bring the partner along.
  useEffect(() => {
    let last = useGame.getState()
    c.current.lastReq = last.coupleRequest?.nonce || 0
    c.current.lastWave = last.waveNonce
    return useGame.subscribe((s) => {
      if (s.teleport && s.teleport !== last.teleport) {
        const [x, z] = local(s.teleport.position[0], s.teleport.position[2], s.teleport.yaw, FOLLOW_SLOT[0], FOLLOW_SLOT[1])
        partnerState.position.set(x, 0, z)
        partnerState.yaw = s.teleport.yaw
        endAction(true)
        c.current.sit = null
      }
      last = s
    })
  }, [])

  const step = useRef()
  useEffect(() => {
    const fn = (state, dt) => step.current?.(state, dt)
    steppers.partner = fn
    return () => {
      if (steppers.partner === fn) steppers.partner = null
    }
  }, [])

  step.current = (state, dt) => {
    const a = anim.current
    if (!a) return
    const ctl = c.current
    const g = useGame.getState()
    const P = playerState.position
    const Q = partnerState.position
    const dist = Math.hypot(P.x - Q.x, P.z - Q.z)
    const now = state.clock.elapsedTime

    const setGait = (gait, ts = 1) => {
      if (ctl.gait !== gait) {
        ctl.gait = gait
        a.loop(gait, ts)
      } else a.setTimeScale(ts)
    }
    const playOnce = (name, onDone) => {
      ctl.gait = name
      ctl.onceDone = false
      a.once(name, () => {
        ctl.onceDone = true
        onDone?.()
      })
    }
    const faceTo = (x, z, l = 8) => {
      partnerState.yaw = dampAngle(partnerState.yaw, Math.atan2(x - Q.x, z - Q.z), l, dt)
    }

    // Move toward (tx,tz). Returns remaining distance. Handles doorways, walls and getting stuck.
    const moveTo = (tx, tz, maxSpeed, arriveDist = 0.12) => {
      let [wx, wz] = waypoint(Q.x, Q.z, tx, tz)
      if (ctl.sidestep > 0) {
        ctl.sidestep -= dt
        const dx = wx - Q.x
        const dz = wz - Q.z
        const l = Math.hypot(dx, dz) || 1
        wx = Q.x + (-dz / l) * 1.2 * ctl.sideDir + (dx / l) * 0.3
        wz = Q.z + (dx / l) * 1.2 * ctl.sideDir + (dz / l) * 0.3
      }
      const dx = wx - Q.x
      const dz = wz - Q.z
      const d = Math.hypot(tx - Q.x, tz - Q.z)
      const want = d < arriveDist ? 0 : Math.min(maxSpeed, Math.max(0.5, d * 2.2))
      ctl.speed = damp(ctl.speed, want, want > ctl.speed ? 6 : 10, dt)
      const ox = Q.x
      const oz = Q.z
      const l = Math.hypot(dx, dz)
      if (l > 1e-3 && ctl.speed > 0.01) {
        // never overshoot the target, even on a long frame
        const travel = Math.min(ctl.speed * dt, l)
        const steps = Math.max(1, Math.ceil(travel / 0.12))
        for (let i = 0; i < steps; i++) {
          Q.x += ((dx / l) * travel) / steps
          Q.z += ((dz / l) * travel) / steps
          resolveCircle(Q, MOVE.radius)
          if (!couple.action || couple.action === 'view') separate(Q, P, 0.5)
        }
        partnerState.yaw = dampAngle(partnerState.yaw, Math.atan2(dx, dz), 9, dt)
      }
      const actual = Math.hypot(Q.x - ox, Q.z - oz) / Math.max(dt, 1e-4)
      // stuck detection → short sidestep
      if (want > 0.6 && actual < 0.15) ctl.stuckT += dt
      else ctl.stuckT = Math.max(0, ctl.stuckT - dt)
      if (ctl.stuckT > 0.8) {
        ctl.stuckT = 0
        ctl.sidestep = 0.7
        ctl.sideDir = Math.random() < 0.5 ? -1 : 1
      }
      ctl.animSpeed = damp(ctl.animSpeed, Math.min(actual, ctl.speed + 0.05), 12, dt)
      gaitFromSpeed()
      return d
    }
    const gaitFromSpeed = () => {
      const s = ctl.animSpeed
      let gait
      if (s < 0.12) gait = 'idle'
      else if (ctl.gait === 'run' ? s > MOVE.walkSpeed * 1.15 : s > MOVE.walkSpeed * 1.35) gait = 'run'
      else gait = 'walk'
      const ts = gait === 'walk' ? THREE.MathUtils.clamp(s / a.nativeWalk, 0.55, 2.4) : gait === 'run' ? THREE.MathUtils.clamp(s / a.nativeRun, 0.7, 2.4) : 1
      setGait(gait, ts)
    }

    // ── Start a requested couple action ──
    if (g.coupleRequest && g.coupleRequest.nonce !== ctl.lastReq) {
      ctl.lastReq = g.coupleRequest.nonce
      startAction(g.coupleRequest.action, g, dist)
    }
    if (couple.endRequested) {
      couple.endRequested = false
      if (couple.action === 'hold') endAction()
    }
    if (couple.cancel) {
      couple.cancel = false
      if (couple.action && couple.action !== 'hold') endAction()
    }

    // ── The player waved: wave back ──
    if (g.waveNonce !== ctl.lastWave) {
      ctl.lastWave = g.waveNonce
      if (!couple.action && !ctl.sit && dist < 9) ctl.wavePending = 0.35
    }

    // ── Player sat on a bench: take the other seat ──
    if (!couple.action && playerState.sitting && playerState.seat?.other && dist < 7 && !ctl.sit) {
      const s = playerState.seat
      ctl.sit = { x: s.other.x, z: s.other.z, yaw: s.yaw, forward: s.forward, phase: 'approach' }
      couple.action = 'sit'
    }

    // ── Player opened a memory / letter: come and look at it together ──
    const ov = g.overlay?.type
    if (!couple.action && !ctl.sit && ov && ['memory', 'timeline', 'letter', 'dedication'].includes(ov) && dist < 6) {
      couple.action = 'view'
      couple.phase = 'approach'
      couple.t = 0
    }

    switch (couple.action) {
      case 'hold': {
        const off = holdOffset()
        const [tx, tz] = local(P.x, P.z, playerState.yaw, off[0], off[1])
        if (couple.phase === 'approach') {
          const d = moveTo(tx, tz, MOVE.runSpeed, 0.08)
          couple.t += dt
          if (d < 0.12 || (couple.t > 4 && !pointBlocked(tx, tz, MOVE.radius))) {
            Q.x = tx
            Q.z = tz
            couple.phase = 'perform'
            partnerState.yaw = playerState.yaw
          } else if (couple.t > 4) {
            endAction()
            g.showToast('There is no room beside you here. Try somewhere more open.')
          }
        } else {
          // walk hand in hand: stay locked beside the player, matching their pace
          const ox = Q.x
          const oz = Q.z
          Q.x = damp(Q.x, tx, 14, dt)
          Q.z = damp(Q.z, tz, 14, dt)
          resolveCircle(Q, MOVE.radius)
          if (Math.hypot(Q.x - tx, Q.z - tz) > 0.9) endAction() // squeezed apart by a wall
          partnerState.yaw = dampAngle(partnerState.yaw, playerState.yaw, 10, dt)
          const actual = Math.hypot(Q.x - ox, Q.z - oz) / Math.max(dt, 1e-4)
          ctl.animSpeed = damp(ctl.animSpeed, Math.max(actual, playerState.speed), 12, dt)
          gaitFromSpeed()
        }
        break
      }

      case 'dance':
      case 'hug':
      case 'give':
      case 'gift': {
        const gap = { dance: 1.15, hug: 0.42, give: 0.85, gift: 0.85 }[couple.action]
        if (couple.phase === 'approach') {
          const [tx, tz] = local(P.x, P.z, couple.yaw, 0, gap)
          const d = moveTo(tx, tz, MOVE.runSpeed, 0.06)
          if (d < 0.08 || couple.t > 6) {
            Q.x = tx
            Q.z = tz
            couple.phase = 'perform'
            couple.t = 0
            perform(couple.action, a, playOnce, setGait, g)
          }
          couple.t += dt
        } else {
          ctl.speed = 0
          ctl.animSpeed = 0
          faceTo(P.x, P.z, 12)
          couple.t += dt
          if (couple.action === 'dance' && now - couple.hearts > 4) burstHearts(now)
          if ((couple.action === 'give' || couple.action === 'gift') && !couple.handed && couple.t > 0.95) {
            couple.handed = true
            if (couple.action === 'give') {
              g.giveRose()
              g.showToast(GIFT.roseThanks)
            } else g.giveGift()
            burstHearts(now)
          }
          if (couple.action === 'hug' && !couple.heartsDone && couple.t > 0.7) {
            couple.heartsDone = true
            burstHearts(now)
          }
          if (couple.action === 'gift' && couple.handed && !couple.opened && couple.t > 2.4) {
            couple.opened = true
            g.openOverlay('memory', { id: 'gift', title: GIFT.title, message: GIFT.message, signature: GIFT.signature })
          }
          if (couple.done && couple.t > 0.3) endAction()
        }
        break
      }

      case 'sit': {
        const s = ctl.sit
        if (!s) {
          couple.action = null
          break
        }
        const rx = s.x + s.forward[0] * SEAT_ROOT_OFFSET
        const rz = s.z + s.forward[1] * SEAT_ROOT_OFFSET
        if (s.phase === 'approach') {
          const fx = s.x + s.forward[0] * 0.85
          const fz = s.z + s.forward[1] * 0.85
          const d = moveTo(fx, fz, MOVE.runSpeed, 0.1)
          if (d < 0.15) {
            s.phase = 'slide'
            s.t = 0
            s.from = [Q.x, Q.z]
          }
          if (!playerState.sitting) s.phase = 'leave'
        } else if (s.phase === 'slide') {
          s.t += dt
          const t = Math.min(1, s.t / 0.45)
          Q.x = THREE.MathUtils.lerp(s.from[0], rx, t)
          Q.z = THREE.MathUtils.lerp(s.from[1], rz, t)
          partnerState.yaw = dampAngle(partnerState.yaw, s.yaw, 14, dt)
          setGait('walk', 0.8)
          if (t >= 1) {
            partnerState.yaw = s.yaw
            s.phase = 'down'
            playOnce('sitDown', () => {
              if (s.phase === 'down') {
                s.phase = 'sitting'
                setGait('sitIdle')
              }
            })
          }
        } else if (s.phase === 'down' || s.phase === 'sitting') {
          Q.x = rx
          Q.z = rz
          partnerState.yaw = s.yaw
          if (!playerState.sitting || playerState.sitPhase === 'up') {
            s.phase = 'up'
            playOnce('standUp', () => {
              Q.x = s.x + s.forward[0] * 0.62
              Q.z = s.z + s.forward[1] * 0.62
              ctl.sit = null
              couple.action = null
              setGait('idle')
            })
          }
        } else if (s.phase === 'leave') {
          ctl.sit = null
          couple.action = null
        }
        break
      }

      case 'view': {
        if (!g.overlay) {
          endAction()
          break
        }
        const [tx, tz] = local(P.x, P.z, playerState.yaw, -0.8, -0.05)
        if (couple.phase === 'approach') {
          const d = moveTo(tx, tz, MOVE.runSpeed, 0.1)
          if (d < 0.15 || couple.t > 5) {
            couple.phase = 'perform'
            setGait('admire')
          }
          couple.t += dt
        } else {
          const [lx, lz] = local(P.x, P.z, playerState.yaw, 0, 3)
          faceTo(lx, lz, 6)
        }
        break
      }

      default: {
        // ── Follow ──
        if (ctl.wavePending >= 0) {
          ctl.wavePending -= dt
          faceTo(P.x, P.z, 10)
          ctl.speed = damp(ctl.speed, 0, 10, dt)
          if (ctl.wavePending < 0) playOnce('wave', () => setGait('idle'))
          break
        }
        if (ctl.gait === 'wave' && !ctl.onceDone) {
          faceTo(P.x, P.z, 8)
          break
        }
        // Catch up if left far behind (e.g. the player ran ahead through several rooms).
        if (dist > 12) {
          const [bx, bz] = local(P.x, P.z, playerState.yaw, 0, -1.4)
          Q.set(bx, 0, bz)
          resolveCircle(Q, MOVE.radius)
        }
        const [sx, sz] = local(P.x, P.z, playerState.yaw, FOLLOW_SLOT[0], FOLLOW_SLOT[1])
        const dSlot = Math.hypot(sx - Q.x, sz - Q.z)
        const playerMoving = playerState.moving
        ctl.playerIdleT = playerMoving ? 0 : ctl.playerIdleT + dt
        if (dSlot > (playerMoving ? 0.35 : 0.6) && (dist > 1.3 || playerMoving)) {
          const fast = dist > 4 || playerState.speed > MOVE.walkSpeed * 1.3
          moveTo(sx, sz, fast ? MOVE.runSpeed * 1.05 : MOVE.walkSpeed * 1.1)
        } else {
          ctl.speed = damp(ctl.speed, 0, 10, dt)
          ctl.animSpeed = damp(ctl.animSpeed, 0, 10, dt)
          gaitFromSpeed()
          // Look at what the player is looking at, otherwise turn toward the player once they stop.
          const f = g.focus && interactables.get(g.focus.id)?.current
          if (f?.facePoint) faceTo(f.facePoint[0], f.facePoint[1], 4)
          else if (ctl.playerIdleT > 1.5) faceTo(P.x, P.z, 4)
          else partnerState.yaw = dampAngle(partnerState.yaw, playerState.yaw, 4, dt)
        }
      }
    }

    // apply
    if (rootRef.current) {
      rootRef.current.position.copy(Q)
      rootRef.current.rotation.y = partnerState.yaw
    }
    partnerState.speed = ctl.animSpeed
    partnerState.mode = couple.action || 'follow'
    g.setPartnerNear(dist < NEAR && !ctl.sit)
    g.setCoupleActive(couple.action)
  }

  // ── helpers bound to this controller ──
  function holdOffset() {
    const pm = playerModelMeta()
    const qm = anim.current?.meta || {}
    const pr = pm.holdHandRight || [-0.4, 0.95, 0.17]
    const ql = qm.holdHandLeft || [0.3, 0.8, 0.14]
    const ps = pm.scale || 1
    const qs = anim.current?.scale || 1
    // place the partner so their left hand meets the player's right hand
    return [pr[0] * ps - ql[0] * qs, pr[2] * ps - ql[2] * qs]
  }

  function startAction(action, g, dist) {
    const toast = g.showToast
    if (action === 'hold' && couple.action === 'hold') return endAction()
    if (couple.action && couple.action !== 'view') endAction()
    if (playerState.sitting || ['turn', 'interact', 'toSeat', 'sitting'].includes(playerState.mode)) return
    if (dist > NEAR) return toast('Walk a little closer to each other first.')
    if (action === 'give' && !g.hasRose) return toast('Pick a rose from the vase in the Letter Room first.')
    if (action === 'gift' && !g.hasGift) return toast('Find the gift box first. It is in the Grand Entrance.')
    couple.action = action
    couple.phase = 'approach'
    couple.t = 0
    couple.done = false
    couple.handed = false
    couple.opened = false
    couple.heartsDone = false
    couple.yaw = playerState.yaw
    if (action !== 'hold') {
      // Face-to-face actions need free floor between them: start from the direction the
      // partner is already in and rotate until the spot is clear of walls and furniture.
      const gap = { dance: 1.15, hug: 0.42, give: 0.85, gift: 0.85 }[action]
      const P = playerState.position
      const Q = partnerState.position
      const base = Math.atan2(Q.x - P.x, Q.z - P.z)
      let found = null
      for (const o of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
        const y = base + o
        const [x, z] = local(P.x, P.z, y, 0, gap)
        if (!pointBlocked(x, z, MOVE.radius + 0.05) && segmentHit(P.x, P.z, x, z, 0.1, true) >= 1) {
          found = y
          break
        }
      }
      if (found === null) {
        couple.action = null
        couple.phase = null
        return toast('There is not enough room here. Try somewhere more open.')
      }
      couple.yaw = found
      // the player waits facing the partner while they come over
      couple.playerDirective = { face: () => [partnerState.position.x, partnerState.position.z], anim: 'idle', once: false, cancelable: true }
    }
  }

  function endAction(silent) {
    couple.action = null
    couple.phase = null
    couple.playerDirective = null
    couple.done = false
    c.current.gait = '__'
    if (!silent) anim.current?.loop('idle')
  }
}

function playerModelMeta() {
  const h = window.__memora?.playerModel
  return h ? { ...h.meta, scale: h.scale } : {}
}

function burstHearts(now) {
  couple.hearts = now
  couple.heartsAt.set(
    (playerState.position.x + partnerState.position.x) / 2,
    1.75,
    (playerState.position.z + partnerState.position.z) / 2,
  )
}

// Start the synchronized part of a paired action on both characters.
function perform(action, a, playOnce, setGait) {
  if (action === 'dance') {
    setGait('dance')
    a.syncTime(0)
    couple.playerDirective = {
      face: () => [partnerState.position.x, partnerState.position.z],
      anim: 'dance',
      once: false,
      cancelable: true,
    }
    // start both dances on the same beat
    setTimeout(() => {
      a.syncTime(0)
      window.__memora?.playerModel?.syncTime(0)
    }, 60)
    burstHearts(performance.now() / 1000)
  } else if (action === 'hug') {
    playOnce('hug', () => (couple.done = true))
    couple.playerDirective = { face: () => [partnerState.position.x, partnerState.position.z], anim: 'hug', once: true, cancelable: false }
  } else if (action === 'give' || action === 'gift') {
    playOnce('receive', () => (couple.done = true))
    couple.playerDirective = { face: () => [partnerState.position.x, partnerState.position.z], anim: 'give', once: true, cancelable: false }
  }
}

// Route around walls through the doorway between the two points.
function waypoint(fx, fz, tx, tz) {
  if (segmentHit(fx, fz, tx, tz, 0.22) >= 1) return [tx, tz]
  let best = null
  for (const o of OPENINGS) {
    if (o.axis !== 'x') continue
    if ((o.fixed - fz) * (o.fixed - tz) < 0 || Math.abs(o.fixed - fz) < 0.9) {
      const d = Math.abs(o.fixed - fz) + Math.abs(o.c - fx) * 0.3
      if (!best || d < best.d) best = { o, d }
    }
  }
  if (!best) return [tx, tz]
  const o = best.o
  const side = Math.sign(fz - o.fixed) || 1
  if (Math.abs(fz - o.fixed) > 0.7 && Math.abs(fx - o.c) > o.w / 2 - 0.45) return [o.c, o.fixed + side * 0.6]
  return [o.c, o.fixed - side * 0.9]
}

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { cameraState, playerState } from '../systems/runtime'
import { segmentHit } from '../systems/colliders'
import { roomAt } from '../world/layout'
import { useGame } from '../store/useGame'
import { MAX_DT } from './usePlayerController'

const TAU = Math.PI * 2
const wrap = (a) => {
  a = (a + Math.PI) % TAU
  if (a < 0) a += TAU
  return a - Math.PI
}

// Third-person follow camera: drag (mouse or touch) to orbit, wheel to zoom,
// auto-settles behind the character while walking, never clips through walls.
export function FollowCamera() {
  const { camera, gl, clock, size } = useThree()
  const look = useRef(new THREE.Vector3())
  const desired = useRef(new THREE.Vector3())
  const curDist = useRef(cameraState.distance)
  const ready = useRef(false)

  useEffect(() => {
    if (window.__memora) window.__memora.camera = camera
  }, [camera])

  useEffect(() => {
    const el = gl.domElement
    let drag = null
    const locked = () => document.pointerLockElement === el
    const look = (dx, dy, k) => {
      cameraState.yaw -= dx * k
      cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch + dy * k, -0.15, 1.05)
      cameraState.lastUserInput = clock.elapsedTime
    }
    const down = (e) => {
      const g = useGame.getState()
      if (g.overlay) return
      // Desktop: one click captures the mouse so moving it turns the camera (Esc frees it).
      if (e.pointerType === 'mouse' && e.button === 0 && g.started && !locked() && el.requestPointerLock) {
        try {
          const r = el.requestPointerLock()
          if (r && r.catch) r.catch(() => {})
        } catch {
          /* pointer lock not available here: drag still works */
        }
      }
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
      el.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      if (locked()) {
        look(e.movementX, e.movementY, 0.0026)
        return
      }
      if (!drag || e.pointerId !== drag.id) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.x = e.clientX
      drag.y = e.clientY
      look(dx, dy, e.pointerType === 'touch' ? 0.007 : 0.0045)
    }
    const up = (e) => {
      if (drag && e.pointerId === drag.id) drag = null
    }
    const wheel = (e) => {
      e.preventDefault()
      cameraState.distance = THREE.MathUtils.clamp(cameraState.distance + e.deltaY * 0.003, 2.2, 8)
    }
    const lockChange = () => useGame.getState().setPointerLocked(locked())
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    document.addEventListener('pointerlockchange', lockChange)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
      document.removeEventListener('pointerlockchange', lockChange)
      if (locked()) document.exitPointerLock?.()
    }
  }, [gl, clock])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT)
    const p = playerState.position
    const sitting = playerState.sitting
    const target = new THREE.Vector3(p.x, p.y + (sitting ? 1.05 : 1.45), p.z)

    // Settle behind the character while it walks (unless the user just moved the camera).
    if (playerState.moving && playerState.forwardInput && clock.elapsedTime - cameraState.lastUserInput > 1.4) {
      const behind = playerState.yaw + Math.PI
      const diff = wrap(behind - cameraState.yaw)
      if (Math.abs(diff) < 2.3) cameraState.yaw += diff * Math.min(1, dt * 0.9 * Math.min(1.5, playerState.speed / 1.5))
    }

    const { yaw, pitch } = cameraState
    // Portrait phones see less width, so pull the camera back a little.
    const distance = cameraState.distance * (size.width / size.height < 0.8 ? 1.3 : 1)
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))

    // Wall collision: shorten the boom.
    const ex = target.x + dir.x * distance
    const ez = target.z + dir.z * distance
    const t = segmentHit(target.x, target.z, ex, ez, 0.28)
    let d = t < 1 ? Math.max(0.9, distance * t - 0.1) : distance
    desired.current.copy(target).addScaledVector(dir, d)
    // Ceiling clamp.
    const room = roomAt(desired.current.x, desired.current.z) || roomAt(p.x, p.z)
    if (room) desired.current.y = Math.min(desired.current.y, room.height - 0.35)
    desired.current.y = Math.max(desired.current.y, 0.4)

    if (!ready.current) {
      camera.position.copy(desired.current)
      look.current.copy(target)
      ready.current = true
    }
    const closer = d < curDist.current
    curDist.current = d
    camera.position.lerp(desired.current, 1 - Math.exp(-dt * (closer ? 22 : 7)))
    look.current.lerp(target, 1 - Math.exp(-dt * 12))
    camera.lookAt(look.current)
  })
  return null
}

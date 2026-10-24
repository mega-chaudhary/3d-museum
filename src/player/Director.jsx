import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { steppers, humanoids, couple } from '../systems/runtime'
import { MAX_DT } from './usePlayerController'

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _t = new THREE.Vector3()
const _bp = new THREE.Vector3()
const _hp = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _bw = new THREE.Quaternion()
const _pw = new THREE.Quaternion()

// Rotate `bone` (in world space) so that `end` moves toward `target`.
function ccdStep(bone, end, target, weight) {
  bone.getWorldPosition(_bp)
  end.getWorldPosition(_hp)
  const cur = _a.subVectors(_hp, _bp)
  const want = _b.subVectors(target, _bp)
  if (cur.lengthSq() < 1e-8 || want.lengthSq() < 1e-8) return
  _q.setFromUnitVectors(cur.normalize(), want.normalize())
  if (weight < 1) _q.slerp(new THREE.Quaternion(), 1 - weight)
  bone.getWorldQuaternion(_bw)
  bone.parent.getWorldQuaternion(_pw)
  bone.quaternion.copy(_pw.invert().multiply(_q.multiply(_bw)))
  bone.updateMatrixWorld(true)
}

// Hand-holding IK: bring the player's right hand and the partner's left hand together.
function handHoldIK(p, q, w) {
  const [pArm, pFore, pHand] = p.bones.arm.R
  const [qArm, qFore, qHand] = q.bones.arm.L
  if (!pHand || !qHand) return
  p.root?.updateMatrixWorld(true)
  q.root?.updateMatrixWorld(true)
  const mid = new THREE.Vector3().addVectors(pHand.getWorldPosition(new THREE.Vector3()), qHand.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5)
  for (let i = 0; i < 2; i++) {
    for (const [arm, fore, hand, side] of [[pArm, pFore, pHand, 1], [qArm, qFore, qHand, -1]]) {
      // hands meet slightly apart so the palms touch instead of overlapping
      const target = _t.copy(mid)
      const toHand = hand.getWorldPosition(new THREE.Vector3()).sub(mid)
      toHand.y = 0
      if (toHand.lengthSq() > 1e-6) target.addScaledVector(toHand.normalize(), 0.035)
      ccdStep(fore, hand, target, w)
      ccdStep(arm, hand, target, w * 0.8)
      void side
    }
  }
}

/**
 * Runs every frame in a fixed order: player controller → partner controller →
 * both animation mixers → hand IK. Keeps the two characters perfectly in sync.
 */
export function Director() {
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT)
    steppers.player?.(state, dt)
    steppers.partner?.(state, dt)
    const p = humanoids.player
    const q = humanoids.partner
    const holding = couple.action === 'hold' && couple.phase === 'perform'
    couple.holdBlend += ((holding ? 1 : 0) - couple.holdBlend) * Math.min(1, dt * 6)
    p?.setHold(holding ? 'R' : null)
    q?.setHold(holding ? 'L' : null)
    const adt = Math.min(rawDt, Math.max(MAX_DT, 0.1)) // no jump after a pause
    p?.update(adt)
    q?.update(adt)
    if (couple.holdBlend > 0.02 && p && q) handHoldIK(p, q, couple.holdBlend)
  })
  return null
}

// Floating hearts for hugs, dances and gifts.
export function CoupleHearts({ count = 18 }) {
  const mesh = useRef()
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    g.fillStyle = '#e8435a'
    g.beginPath()
    g.moveTo(32, 56)
    g.bezierCurveTo(4, 36, 6, 10, 22, 10)
    g.bezierCurveTo(28, 10, 32, 16, 32, 20)
    g.bezierCurveTo(32, 16, 36, 10, 42, 10)
    g.bezierCurveTo(58, 10, 60, 36, 32, 56)
    g.fill()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const parts = useMemo(() => Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0 })), [count])
  const last = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame((state, dt) => {
    if (!mesh.current) return
    if (couple.hearts !== last.current) {
      last.current = couple.hearts
      parts.forEach((p, i) => {
        p.x = couple.heartsAt.x + (Math.random() - 0.5) * 0.4
        p.y = couple.heartsAt.y + Math.random() * 0.2
        p.z = couple.heartsAt.z + (Math.random() - 0.5) * 0.4
        p.vx = (Math.random() - 0.5) * 0.35
        p.vy = 0.35 + Math.random() * 0.4
        p.vz = (Math.random() - 0.5) * 0.35
        p.life = 1.6 + Math.random() * 0.8 + i * 0.02
      })
    }
    const cam = state.camera
    parts.forEach((p, i) => {
      p.life -= dt
      const alive = p.life > 0
      if (alive) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
      }
      dummy.position.set(p.x, p.y, p.z)
      dummy.quaternion.copy(cam.quaternion)
      dummy.scale.setScalar(alive ? Math.min(1, p.life) * 0.12 : 0)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

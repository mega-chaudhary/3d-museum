import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FocusMarker, Bench } from '../components/Exhibits'
import { CanvasLabel } from '../components/CanvasLabel'
import { useLoadedTexture } from '../components/useLoadedTexture'
import { RoseModel } from '../components/Props'
import { useInteractable, useColliders } from '../systems/hooks'
import { boxFromCenter } from '../systems/colliders'
import { playerState } from '../systems/runtime'
import { useGame } from '../store/useGame'
import { FINALE } from '../data/finale'
import { ROOM_BY_ID } from '../world/layout'

const ROOM = ROOM_BY_ID.final
const PED = { x: 0, z: -78.2 }
const ART = { z: -85 + 0.2, y: 3.4, w: 3.3, h: 4.3 }
const REVEAL_Z = -71.2 // the visitor must physically walk this far in

// 0 → 1 over the reveal; shared by all reveal animations in the room.
const reveal = { t: 0 }

function useRevealProgress() {
  const revealed = useGame((s) => s.revealed)
  useFrame((_, dt) => {
    const target = revealed ? 1 : 0
    reveal.t = revealed ? Math.min(1, reveal.t + dt / 4.5) : 0
    if (!revealed) reveal.t = target
  })
  return revealed
}

function RevealTrigger() {
  useFrame(() => {
    const s = useGame.getState()
    if (!s.revealed && s.room === 'final' && playerState.position.z < REVEAL_Z) s.setRevealed()
  })
  return null
}

function Artwork() {
  const { texture, aspect } = useLoadedTexture(FINALE.artwork)
  const veil = useRef()
  const veilMat = useRef()
  const dims = useMemo(() => {
    let pw = ART.w - 0.5
    let ph = pw / aspect
    if (ph > ART.h - 0.5) {
      ph = ART.h - 0.5
      pw = ph * aspect
    }
    return { pw, ph, fw: pw + 0.5, fh: ph + 0.5 }
  }, [aspect])
  useFrame(() => {
    const e = 1 - Math.pow(1 - THREE.MathUtils.clamp((reveal.t - 0.1) / 0.6, 0, 1), 3)
    if (veil.current) {
      veil.current.position.y = e * (dims.fh + 1.2)
      veil.current.scale.y = 1 - e * 0.85
    }
    if (veilMat.current) veilMat.current.opacity = 1 - e
  })
  return (
    <group position={[0, ART.y, ART.z]}>
      <mesh position={[0, 0, 0.05]} castShadow>
        <boxGeometry args={[dims.fw, dims.fh, 0.1]} />
        <meshStandardMaterial color="#b38b4a" metalness={0.9} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.101]}>
        <planeGeometry args={[dims.pw + 0.16, dims.ph + 0.16]} />
        <meshStandardMaterial color="#0f0d10" />
      </mesh>
      {texture && (
        <mesh position={[0, 0, 0.103]}>
          <planeGeometry args={[dims.pw, dims.ph]} />
          <meshStandardMaterial map={texture} roughness={0.6} />
        </mesh>
      )}
      {/* velvet veil that lifts away during the reveal */}
      <mesh ref={veil} position={[0, 0, 0.2]}>
        <planeGeometry args={[dims.fw + 0.3, dims.fh + 0.3, 1, 1]} />
        <meshStandardMaterial ref={veilMat} color="#5a1420" roughness={0.85} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Heading() {
  const ref = useRef()
  useFrame(() => {
    if (!ref.current) return
    const o = THREE.MathUtils.clamp((reveal.t - 0.55) / 0.4, 0, 1)
    ref.current.material.opacity = o
    ref.current.position.y = 6.55 - (1 - o) * 0.25
  })
  return (
    <CanvasLabel
      ref={ref}
      width={6}
      position={[0, 6.55, ART.z + 0.02]}
      padding={10}
      opacity={0}
      lines={[{ text: FINALE.wallHeading, family: 'serif', size: 120, style: 'italic', color: '#f3d9b5', gap: 0 }]}
    />
  )
}

function Petals({ count = 140 }) {
  const mesh = useRef()
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 9,
        z: -78 + (Math.random() - 0.5) * 9,
        y: Math.random() * 7,
        s: 0.35 + Math.random() * 0.5,
        r: Math.random() * Math.PI * 2,
        w: 0.5 + Math.random(),
      })),
    [count],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame((state, dt) => {
    if (!mesh.current) return
    const on = reveal.t > 0.45
    mesh.current.visible = on
    if (!on) return
    const t = state.clock.elapsedTime
    data.forEach((p, i) => {
      p.y -= dt * p.s
      if (p.y < 0.02) p.y = 7 + Math.random()
      dummy.position.set(p.x + Math.sin(t * p.w + i) * 0.35, p.y, p.z + Math.cos(t * p.w * 0.7 + i) * 0.35)
      dummy.rotation.set(t * p.w + p.r, t * 0.6 + i, p.r)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[null, null, count]} visible={false}>
      <circleGeometry args={[0.045, 6]} />
      <meshStandardMaterial color="#c21d3a" roughness={0.6} side={THREE.DoubleSide} emissive="#5a0a14" emissiveIntensity={0.5} />
    </instancedMesh>
  )
}

function Pedestal() {
  useColliders([boxFromCenter(PED.x, PED.z, 1.2, 1.2)])
  const revealed = useGame((s) => s.revealed)
  const hasRose = useGame((s) => s.hasRose || s.partnerHasRose)
  const rosePlaced = useGame((s) => s.rosePlaced)
  const focused = useInteractable('finale-pedestal', {
    position: [PED.x, 1.1, PED.z],
    radius: 2.3,
    label: hasRose ? 'the rose here and open the message' : FINALE.pedestalLabel.toLowerCase(),
    verb: hasRose ? 'Place' : 'Open',
    facePoint: [PED.x, PED.z],
    enabled: () => useGame.getState().revealed,
    onInteract: () => {
      const s = useGame.getState()
      const placed = s.hasRose || s.partnerHasRose
      if (placed) s.placeRose()
      s.openOverlay('finale', { ...FINALE, id: 'finale', roseNote: placed || s.rosePlaced ? FINALE.roseMessage : null })
    },
  })
  const ring = useRef()
  useFrame((state) => {
    if (!ring.current) return
    const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 2.2) * 0.5
    ring.current.material.opacity = (revealed ? 0.35 : 0.2 + pulse * 0.45) * (focused ? 1.6 : 1)
  })
  return (
    <group position={[PED.x, 0, PED.z]}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.75, 0.8, 0.12, 40]} />
        <meshStandardMaterial color="#e9e4dc" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.95, 40]} />
        <meshStandardMaterial color="#f2eee8" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.56, 0.52, 0.08, 40]} />
        <meshStandardMaterial color="#e9e4dc" roughness={0.3} />
      </mesh>
      {/* sealed envelope */}
      <group position={[0, 1.13, 0]} rotation={[0, 0.2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.015, 0.27]} />
          <meshStandardMaterial color="#f4e9d6" roughness={0.75} emissive="#ffd9a0" emissiveIntensity={focused ? 0.35 : 0} />
        </mesh>
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.01, 20]} />
          <meshStandardMaterial color="#8e1d2c" roughness={0.35} />
        </mesh>
      </group>
      {rosePlaced && <RoseModel position={[0.18, 1.14, 0.12]} rotation={[Math.PI / 2, 0, -0.9]} scale={1.6} />}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.95, 1.08, 64]} />
        <meshBasicMaterial color="#f3c77a" transparent opacity={0.4} toneMapped={false} depthWrite={false} />
      </mesh>
      <group position={[0, 1.75, 0]}>
        <FocusMarker focused={focused} />
      </group>
    </group>
  )
}

function RevealLights() {
  const pedSpot = useRef()
  const artSpot = useRef()
  const fill = useRef()
  const pedTarget = useMemo(() => new THREE.Object3D(), [])
  const artTarget = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    const e = reveal.t * reveal.t * (3 - 2 * reveal.t)
    if (pedSpot.current) pedSpot.current.intensity = 6 + e * 70
    if (artSpot.current) artSpot.current.intensity = e * 90
    if (fill.current) fill.current.intensity = 3 + e * 6
  })
  return (
    <>
      <primitive object={pedTarget} position={[PED.x, 1, PED.z]} />
      <primitive object={artTarget} position={[0, ART.y, ART.z]} />
      <spotLight ref={pedSpot} position={[0, ROOM.height - 0.3, PED.z + 1.5]} target={pedTarget} angle={0.28} penumbra={0.6} distance={12} decay={1.3} color="#ffe6c8" intensity={6} castShadow={false} />
      <spotLight ref={artSpot} position={[0, ROOM.height - 0.4, -79.5]} target={artTarget} angle={0.42} penumbra={0.55} distance={14} decay={1.3} color="#ffd9b8" intensity={0} />
      <pointLight ref={fill} position={[0, 4, -72]} distance={14} decay={1.6} color="#d7a6b6" intensity={3} />
    </>
  )
}

export function FinalRoom() {
  useRevealProgress()
  return (
    <group>
      {/* dark polished stone floor for this room only */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -77]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#141217" roughness={0.22} metalness={0.25} />
      </mesh>
      <RevealTrigger />
      <Artwork />
      <Heading />
      <Pedestal />
      <Petals />
      <RevealLights />
      <Bench id="bench-final-1" position={[-4.6, 0, -78.2]} rotationY={Math.PI / 2} />
      <Bench id="bench-final-2" position={[4.6, 0, -78.2]} rotationY={-Math.PI / 2} />
    </group>
  )
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CanvasLabel } from '../components/CanvasLabel'
import { FocusMarker, WallWash, Bench } from '../components/Exhibits'
import { useInteractable, useColliders } from '../systems/hooks'
import { boxFromCenter } from '../systems/colliders'
import { useGame } from '../store/useGame'
import { MUSEUM } from '../data/museum'
import { ROOMS } from '../world/layout'
import { Spot } from '../components/Spot'
import { GiftBoxModel } from '../components/Props'
import { GIFT } from '../data/gifts'

const DOOR_W = 3.4
const DOOR_H = 5
export const doorState = { progress: 0 } // 0 closed → 1 open

function DoorLeaf({ side }) {
  // side −1 = left leaf (hinge at −x), +1 = right leaf
  const w = DOOR_W / 2
  const panels = [
    [0, 1.25, 1.6],
    [0, 3.45, 2.1],
  ]
  return (
    <group position={[(-side * w) / 2, DOOR_H / 2, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w - 0.02, DOOR_H - 0.02, 0.12]} />
        <meshStandardMaterial color="#3b2418" roughness={0.55} metalness={0.05} />
      </mesh>
      {[0.07, -0.07].map((z) =>
        panels.map(([x, y, h], i) => (
          <mesh key={z + '-' + i} position={[x, y - DOOR_H / 2, z]}>
            <boxGeometry args={[w - 0.45, h, 0.03]} />
            <meshStandardMaterial color="#4a2e1f" roughness={0.5} />
          </mesh>
        )),
      )}
      {[0.1, -0.1].map((z) => (
        <mesh key={z} position={[side * (w / 2 - 0.22), 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.05, 16]} />
          <meshStandardMaterial color="#c9a45c" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {[0.1, -0.1].map((z) => (
        <mesh key={'h' + z} position={[side * (w / 2 - 0.22), 0, z * 1.4]}>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshStandardMaterial color="#c9a45c" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

function Doors() {
  const doorsOpen = useGame((s) => s.doorsOpen)
  const left = useRef()
  const right = useRef()

  // Closed doors block the doorway; open leaves get small colliders where they rest.
  useColliders([
    boxFromCenter(0, 0, DOOR_W, 0.4, { enabled: () => doorState.progress < 0.6 }),
    boxFromCenter(-1.9, -0.9, 0.3, 1.7, { enabled: () => doorState.progress > 0.9, camera: false }),
    boxFromCenter(1.9, -0.9, 0.3, 1.7, { enabled: () => doorState.progress > 0.9, camera: false }),
  ])

  const focused = useInteractable('entrance-doors', {
    position: [0, 1.6, 0.4],
    normal: [0, 1],
    radius: 2.9,
    label: 'the museum doors',
    verb: 'Open',
    facePoint: [0, 0],
    enabled: () => !useGame.getState().doorsOpen,
    onInteract: () => useGame.getState().openDoors(),
  })

  useFrame((_, dt) => {
    const target = doorsOpen ? 1 : 0
    const speed = doorsOpen ? 0.55 : 2
    doorState.progress = THREE.MathUtils.clamp(
      doorState.progress + Math.sign(target - doorState.progress) * dt * speed,
      0,
      1,
    )
    if (Math.abs(target - doorState.progress) < 0.002) doorState.progress = target
    const e = doorState.progress < 0.5 ? 2 * doorState.progress ** 2 : 1 - (-2 * doorState.progress + 2) ** 2 / 2
    const ang = e * 1.75
    if (left.current) left.current.rotation.y = ang
    if (right.current) right.current.rotation.y = -ang
  })

  return (
    <group>
      <group ref={left} position={[-DOOR_W / 2, 0, 0]}>
        <DoorLeaf side={-1} />
      </group>
      <group ref={right} position={[DOOR_W / 2, 0, 0]}>
        <DoorLeaf side={1} />
      </group>
      <group position={[0, 2.2, 0.5]}>
        <FocusMarker focused={focused} y={0.9} />
      </group>
    </group>
  )
}

function Column({ x, z, h = 6.4 }) {
  useColliders([boxFromCenter(x, z, 0.9, 0.9)], [x, z])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.95, 0.4, 0.95]} />
        <meshStandardMaterial color="#e5ddcf" roughness={0.5} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.36, h - 0.8, 24]} />
        <meshStandardMaterial color="#efe8dc" roughness={0.45} />
      </mesh>
      <mesh position={[0, h - 0.2, 0]} castShadow>
        <boxGeometry args={[0.95, 0.4, 0.95]} />
        <meshStandardMaterial color="#e5ddcf" roughness={0.5} />
      </mesh>
    </group>
  )
}

function Planter({ x, z }) {
  useColliders([boxFromCenter(x, z, 0.8, 0.8)], [x, z])
  const leaves = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2
        return { a, r: 0.15 + (i % 3) * 0.1, y: 1.0 + (i % 4) * 0.22, s: 0.22 + (i % 3) * 0.05 }
      }),
    [],
  )
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.36, 0.28, 0.8, 24]} />
        <meshStandardMaterial color="#2c2a2b" roughness={0.35} metalness={0.3} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} position={[Math.cos(l.a) * l.r, l.y, Math.sin(l.a) * l.r]} scale={[1, 1.4, 1]} castShadow>
          <sphereGeometry args={[l.s, 10, 8]} />
          <meshStandardMaterial color={i % 2 ? '#3f6b3a' : '#4f7d45'} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Chandelier({ position }) {
  const bulbs = useMemo(() => Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2), [])
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.2, 6]} />
        <meshStandardMaterial color="#b8955a" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.1, 0.035, 10, 48]} />
        <meshStandardMaterial color="#c9a45c" metalness={0.9} roughness={0.25} />
      </mesh>
      {bulbs.map((a) => (
        <mesh key={a} position={[Math.cos(a) * 1.1, 0.12, Math.sin(a) * 1.1]}>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshBasicMaterial color="#ffe9c2" toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// Framed floor plan of the museum — drawn from the real layout data.
function FloorPlan(props) {
  const lines = useMemo(() => [{ text: 'Floor plan', family: 'sans', size: 30, color: '#d9c7a3', spacing: 6 }], [])
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 360
    c.height = 900
    const g = c.getContext('2d')
    g.fillStyle = '#1e1b1c'
    g.fillRect(0, 0, 360, 900)
    const sx = (x) => 180 + x * 13
    const sz = (z) => 40 + (16 - z) * 7.8
    g.strokeStyle = '#d9c7a3'
    g.lineWidth = 3
    g.font = "500 22px 'Jost', Arial"
    g.textAlign = 'center'
    for (const r of ROOMS) {
      g.strokeRect(sx(r.minX), sz(r.maxZ), (r.maxX - r.minX) * 13, (r.maxZ - r.minZ) * 7.8)
      g.fillStyle = '#d9c7a3'
      g.fillText(String(r.index), sx((r.minX + r.maxX) / 2), sz((r.minZ + r.maxZ) / 2) + 8)
    }
    g.fillStyle = '#c94a5a'
    g.beginPath()
    g.arc(sx(0), sz(12.5), 7, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#c94a5a'
    g.fillText('You are here', sx(0), sz(12.5) + 32)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group {...props}>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[1.25, 2.85, 0.04]} />
        <meshStandardMaterial color="#b38b4a" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.1, 0.002]}>
        <planeGeometry args={[1.1, 2.5]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <CanvasLabel width={1.1} lines={lines} position={[0, 1.27, 0.004]} padding={10} />
    </group>
  )
}

function Runner() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 512
    const g = c.getContext('2d')
    g.fillStyle = '#6b1f2a'
    g.fillRect(0, 0, 128, 512)
    g.strokeStyle = '#c9a45c'
    g.lineWidth = 4
    g.strokeRect(10, -10, 108, 532)
    g.strokeStyle = 'rgba(201,164,92,0.5)'
    g.lineWidth = 1.5
    g.strokeRect(18, -10, 92, 532)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 4)
    return t
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 7.6]} receiveShadow>
      <planeGeometry args={[2.3, 14.4]} />
      <meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  )
}

function Dedication() {
  const focused = useInteractable('dedication', {
    position: [-8.6, 1.6, 8],
    normal: [1, 0],
    radius: 3,
    label: 'the dedication',
    verb: 'Read',
    facePoint: [-8.8, 8],
    onInteract: () =>
      useGame.getState().openOverlay('dedication', {
        id: 'dedication',
        title: MUSEUM.dedicationHeading,
        message: MUSEUM.dedication,
        signature: MUSEUM.dedicationSignature,
      }),
  })
  return (
    <group position={[-8.79, 2.9, 8]} rotation={[0, Math.PI / 2, 0]}>
      <WallWash position={[0, 0.3, 0.003]} w={6.5} h={5.2} opacity={0.5} />
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[4.3, 3.3, 0.06]} />
        <meshStandardMaterial color="#b38b4a" metalness={0.85} roughness={0.3} emissive="#6b4a1a" emissiveIntensity={focused ? 0.6 : 0} />
      </mesh>
      <mesh position={[0, 0, 0.062]}>
        <planeGeometry args={[4.05, 3.05]} />
        <meshStandardMaterial color="#1d1a1b" roughness={0.8} />
      </mesh>
      <CanvasLabel
        width={3.6}
        position={[0, 0.05, 0.066]}
        padding={50}
        lines={[
          { text: MUSEUM.dedicationHeading.toUpperCase(), family: 'sans', size: 34, color: '#c9a45c', spacing: 12, gap: 34 },
          { text: MUSEUM.dedication, family: 'serif', size: 52, style: 'italic', color: '#efe6d8', lineHeight: 1.35, gap: 34 },
          { text: '— ' + MUSEUM.dedicationSignature, family: 'serif', size: 44, color: '#c9a45c', gap: 0 },
        ]}
      />
      <group position={[0, 2, 0.3]}>
        <FocusMarker focused={focused} />
      </group>
    </group>
  )
}

// A wrapped gift on a small plinth: pick it up, then give it to your partner.
function GiftPlinth({ x = -6.4, z = 4.2 }) {
  useColliders([boxFromCenter(x, z, 0.6, 0.6)], [x, z])
  const taken = useGame((s) => s.hasGift || s.partnerHasGift)
  const focused = useInteractable('gift-box', {
    position: [x, 1, z],
    radius: 1.7,
    label: 'the gift',
    verb: 'Pick up',
    anim: 'pickup',
    fireDelay: 0.75,
    facePoint: [x, z],
    enabled: () => {
      const s = useGame.getState()
      return !s.hasGift && !s.partnerHasGift
    },
    onInteract: () => {
      useGame.getState().pickGift()
      useGame.getState().showToast('You picked up the gift. Give it to them when you are together.')
    },
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.84, 0.5]} />
        <meshStandardMaterial color="#efe8dc" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[0.58, 0.04, 0.58]} />
        <meshStandardMaterial color="#e5ddcf" roughness={0.4} />
      </mesh>
      {!taken && <GiftBoxModel position={[0, 0.98, 0]} rotation={[0, 0.5, 0]} />}
      <group position={[0, 1.45, 0]}>
        <FocusMarker focused={focused} />
      </group>
      <CanvasLabel
        width={0.5}
        position={[0, 0.6, 0.252]}
        padding={10}
        lines={[{ text: GIFT.title.toUpperCase(), family: 'sans', size: 46, weight: 500, color: '#8a6f4a', spacing: 6, gap: 0 }]}
        basic={false}
      />
    </group>
  )
}

export function Entrance() {
  const quality = useGame((s) => s.quality)
  return (
    <group>
      {/* Title above the doors (wall face at z = 0.2) */}
      <CanvasLabel
        width={7.5}
        position={[0, 6.32, 0.215]}
        padding={20}
        lines={[
          { text: MUSEUM.title, family: 'serif', size: 150, weight: 600, color: '#3a2f2a', spacing: 46, gap: 4 },
          { text: '— ' + MUSEUM.subtitle + ' —', family: 'sans', size: 40, weight: 500, color: '#8a6f4a', spacing: 16, gap: 0 },
        ]}
        basic={false}
      />
      <WallWash position={[0, 6.0, 0.205]} w={9} h={3.8} opacity={0.35} />
      <Doors />
      <Column x={-2.8} z={0.75} />
      <Column x={2.8} z={0.75} />
      <Planter x={-4.4} z={1.0} />
      <Planter x={4.4} z={1.0} />
      <Runner />
      <Dedication />
      <FloorPlan position={[8.79, 2.1, 8]} rotation={[0, -Math.PI / 2, 0]} />
      <WallWash position={[8.78, 2.4, 8]} rotation={[0, -Math.PI / 2, 0]} w={3.2} h={4.2} opacity={0.45} />
      <Bench id="bench-entrance" position={[6.2, 0, 8]} rotationY={-Math.PI / 2} length={2.4} />
      <Chandelier position={[0, 6.2, 8]} />
      <GiftPlinth />

      {/* Lighting */}
      <pointLight position={[0, 5.6, 8]} intensity={quality === 'high' ? 51 : 40} distance={18} decay={1.6} color="#ffe2b8" />
      <Spot position={[0, 7.2, 5]} target={[0, 3.5, 0]} angle={0.6} penumbra={0.8} intensity={60} distance={14} decay={1.5} color="#fff0d6" />
      <pointLight position={[-6, 3.5, 8]} intensity={13.5} distance={9} decay={1.6} color="#ffe0b0" />
    </group>
  )
}

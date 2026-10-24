import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { FocusMarker, WallWash, Bench } from '../components/Exhibits'
import { CanvasLabel } from '../components/CanvasLabel'
import { useLoadedTexture } from '../components/useLoadedTexture'
import { useInteractable, useColliders } from '../systems/hooks'
import { boxFromRotated } from '../systems/colliders'
import { useGame } from '../store/useGame'
import { TIMELINE } from '../data/timeline'
import { ROOM_BY_ID } from '../world/layout'

const ROOM = ROOM_BY_ID.timeline
const Z0 = -47.6 // entry
const Z1 = -68.6 // exit

// Panels alternate along the central path, angled toward the visitor.
const SLOTS = [
  { x: -3.4, z: -50.6, rot: 0.75 },
  { x: 3.4, z: -53.8, rot: -0.75 },
  { x: -3.4, z: -57.0, rot: 0.75 },
  { x: 3.4, z: -60.2, rot: -0.75 },
  { x: -3.4, z: -63.4, rot: 0.75 },
  { x: 3.4, z: -66.2, rot: -0.75 },
]

function TimelinePanel({ item, slot, index }) {
  const { texture, aspect } = useLoadedTexture(item.image)
  const { x, z, rot } = slot
  useColliders([boxFromRotated(x, z, 1.9, 0.7, rot)], [x, z, rot])
  const nx = Math.sin(rot)
  const nz = Math.cos(rot)
  const focused = useInteractable(item.id, {
    position: [x + nx * 0.4, 1.4, z + nz * 0.4],
    normal: [nx, nz],
    radius: 2.4,
    label: item.title,
    verb: 'Open',
    facePoint: [x, z],
    onInteract: () => useGame.getState().openOverlay('timeline', item),
  })
  const strip = useRef()
  useFrame((_, dt) => {
    if (!strip.current) return
    const target = focused ? 3 : 1.2
    strip.current.emissiveIntensity += (target - strip.current.emissiveIntensity) * Math.min(1, dt * 6)
  })
  const pw = 1.5
  const ph = Math.min(1.05, pw / aspect)
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.24, 0.7]} />
        <meshStandardMaterial color="#e9e6e1" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.75, 2.45, 0.1]} />
        <meshStandardMaterial color="#1e2126" roughness={0.6} />
      </mesh>
      {/* LED display strip */}
      <mesh position={[0, 2.66, 0.06]}>
        <boxGeometry args={[1.6, 0.025, 0.02]} />
        <meshStandardMaterial ref={strip} color="#fff3dc" emissive="#ffe2b0" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {texture && (
        <mesh position={[0, 2.0, 0.052]}>
          <planeGeometry args={[pw, ph]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
      <CanvasLabel
        width={1.55}
        position={[0, 0.98, 0.053]}
        padding={36}
        align="left"
        lines={[
          { text: item.date.toUpperCase(), family: 'sans', size: 44, weight: 500, color: '#d9b878', spacing: 8, gap: 12 },
          { text: item.title, family: 'serif', size: 86, weight: 600, color: '#f4ede2', lineHeight: 1.05, gap: 14 },
          { text: item.milestone, family: 'serif', size: 50, style: 'italic', color: '#b9b0a6', gap: 0 },
        ]}
      />
      <group position={[0, 3.0, 0.2]}>
        <FocusMarker focused={focused} />
      </group>
      {/* Step number on the floor */}
      <CanvasLabel
        width={0.7}
        position={[0, 0.011, 0.95]}
        rotation={[-Math.PI / 2, 0, 0]}
        padding={8}
        lines={[{ text: String(index + 1).padStart(2, '0'), family: 'serif', size: 140, weight: 600, color: '#b8924f', gap: 0 }]}
        basic={false}
      />
    </group>
  )
}

// The visible path: dark stone runner with brass edges from door to door.
function Path() {
  const len = Z0 - Z1
  return (
    <group position={[0, 0, (Z0 + Z1) / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <planeGeometry args={[1.5, len]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.35} metalness={0.1} />
      </mesh>
      {[-0.76, 0.76].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.008, 0]}>
          <planeGeometry args={[0.05, len]} />
          <meshStandardMaterial color="#c9a45c" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {SLOTS.map((s, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[Math.sign(s.x) * 0.98, 0.009, s.z - (Z0 + Z1) / 2]}>
          <circleGeometry args={[0.07, 20]} />
          <meshBasicMaterial color="#e6c57f" toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function YearMark({ text, position, rotationY }) {
  return (
    <CanvasLabel
      width={4.4}
      position={position}
      rotation={[0, rotationY, 0]}
      padding={0}
      lines={[{ text, family: 'serif', size: 300, weight: 600, color: 'rgba(40,44,50,0.16)', gap: 0 }]}
      basic={false}
    />
  )
}

export function TimelineRoom() {
  const items = TIMELINE.slice(0, SLOTS.length)
  const wallX = 11 - 0.2
  const years = useMemo(() => {
    const ys = [...new Set(items.map((t) => (t.date.match(/\d{4}/) || [])[0]).filter(Boolean))]
    return ys.slice(0, 2)
  }, [items])
  return (
    <group>
      <Path />
      {items.map((t, i) => (
        <TimelinePanel key={t.id} item={t} slot={SLOTS[i]} index={i} />
      ))}
      {years[0] && <YearMark text={years[0]} position={[-wallX + 0.01, 3.2, -54]} rotationY={Math.PI / 2} />}
      {years[1] && <YearMark text={years[1]} position={[wallX - 0.01, 3.2, -62]} rotationY={-Math.PI / 2} />}
      <CanvasLabel
        width={4.2}
        position={[-wallX + 0.01, 3.4, -49.6]}
        rotation={[0, Math.PI / 2, 0]}
        padding={10}
        align="left"
        lines={[
          { text: 'IV', family: 'serif', size: 70, color: '#8a6f4a', gap: 6 },
          { text: 'Our Timeline', family: 'serif', size: 96, weight: 600, color: '#2c2526', gap: 6 },
          { text: 'Follow the path. Every step is a moment.', family: 'sans', size: 36, color: '#7b6f68', gap: 0 },
        ]}
        basic={false}
      />
      <Bench id="bench-timeline-1" position={[-8.2, 0, -58]} rotationY={Math.PI / 2} />
      <Bench id="bench-timeline-2" position={[8.2, 0, -58]} rotationY={-Math.PI / 2} />
      <WallWash position={[0, 2.6, -68.79]} w={6} h={5} opacity={0.35} color="#ffd6b0" />
      <CanvasLabel
        width={3.4}
        position={[0, 4.95, -68.79]}
        padding={14}
        lines={[
          { text: 'V', family: 'serif', size: 64, color: '#8a6f4a', gap: 0 },
          { text: 'THE FINAL SURPRISE', family: 'sans', size: 44, weight: 500, color: '#2c2526', spacing: 12, gap: 0 },
        ]}
        basic={false}
      />
      <pointLight position={[0, 4.6, -52]} intensity={21.6} distance={14} decay={1.5} color="#fff1dc" />
      <pointLight position={[0, 4.6, -61]} intensity={21.6} distance={14} decay={1.5} color="#fff1dc" />
      <pointLight position={[0, 4.6, -67]} intensity={10.8} distance={9} decay={1.6} color="#ffe2c4" />
    </group>
  )
}


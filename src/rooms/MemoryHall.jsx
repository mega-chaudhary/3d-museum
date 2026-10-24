import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PhotoFrame, TrackLight, Bench } from '../components/Exhibits'
import { CanvasLabel } from '../components/CanvasLabel'
import { HALL_MEMORIES } from '../data/memories'
import { ROOM_BY_ID } from '../world/layout'
import { useGame } from '../store/useGame'
import { interactables } from '../systems/runtime'

const ROOM = ROOM_BY_ID.hall
const WALL_X = 4.5 - 0.2 // inner wall face
const FRAME_Y = 1.85

// Frame slots in walking order, alternating walls.
const SLOTS = [
  { x: -WALL_X, z: -5, rot: Math.PI / 2 },
  { x: WALL_X, z: -8.5, rot: -Math.PI / 2 },
  { x: -WALL_X, z: -12, rot: Math.PI / 2 },
  { x: WALL_X, z: -15.5, rot: -Math.PI / 2 },
  { x: -WALL_X, z: -19, rot: Math.PI / 2 },
  { x: WALL_X, z: -22.5, rot: -Math.PI / 2 },
  { x: -WALL_X, z: -26, rot: Math.PI / 2 },
  { x: WALL_X, z: -29.5, rot: -Math.PI / 2 },
]

// One spotlight glides to whichever frame the visitor is looking at.
function FocusSpot() {
  const light = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])
  const pos = useRef(new THREE.Vector3(0, ROOM.height - 0.3, -10))
  useFrame((_, dt) => {
    const focus = useGame.getState().focus
    const def = focus && interactables.get(focus.id)?.current
    const inHall = def && def.position[2] < 0 && def.position[2] > -34 && def.normal
    if (!light.current) return
    const k = 1 - Math.exp(-dt * 5)
    if (inHall) {
      const [fx, , fz] = def.position
      target.position.lerp(new THREE.Vector3(fx - def.normal[0] * 0.2, FRAME_Y, fz), k)
      pos.current.lerp(new THREE.Vector3(fx + def.normal[0] * 2.2, ROOM.height - 0.3, fz), k)
    }
    light.current.position.copy(pos.current)
    light.current.intensity += ((inHall ? 30 : 0) - light.current.intensity) * k
  })
  return (
    <>
      <primitive object={target} />
      <spotLight ref={light} target={target} angle={0.42} penumbra={0.7} distance={9} decay={1.4} intensity={0} color="#ffe6c4" />
    </>
  )
}

function Ceiling() {
  const beams = useMemo(() => Array.from({ length: 10 }, (_, i) => -2 - i * 3.4), [])
  return (
    <group>
      {beams.map((z) => (
        <mesh key={z} position={[0, ROOM.height - 0.2, z]}>
          <boxGeometry args={[9, 0.4, 0.3]} />
          <meshStandardMaterial color="#1f1f22" roughness={0.8} />
        </mesh>
      ))}
      {/* skylight strip */}
      <mesh position={[0, ROOM.height - 0.01, -17]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 33]} />
        <meshBasicMaterial color="#f6efe2" toneMapped={false} />
      </mesh>
    </group>
  )
}

export function MemoryHall() {
  const memories = HALL_MEMORIES.slice(0, SLOTS.length)
  const quality = useGame((s) => s.quality)
  return (
    <group>
      <Ceiling />
      {memories.map((m, i) => {
        const s = SLOTS[i]
        return (
          <group key={m.id}>
            <PhotoFrame
              id={m.id}
              position={[s.x, FRAME_Y, s.z]}
              rotationY={s.rot}
              image={m.image}
              maxW={2.1}
              maxH={1.9}
              title={m.title}
              date={m.date}
              data={m}
              frame={i % 3 === 1 ? 'gold' : 'black'}
            />
            <TrackLight position={[s.x + Math.sin(s.rot) * 1.4, 0, s.z]} rotationY={s.rot + Math.PI} ceilingY={ROOM.height - 0.4} />
          </group>
        )
      })}

      <Bench id="bench-hall-1" position={[0, 0, -12.5]} rotationY={-Math.PI / 2} />
      <Bench id="bench-hall-2" position={[0, 0, -23]} rotationY={Math.PI / 2} />

      {/* Wayfinding over the far doorway */}
      <CanvasLabel
        width={3.2}
        position={[0, 4.78, -33.79]}
        padding={16}
        lines={[
          { text: 'III', family: 'serif', size: 64, color: '#8a6f4a', gap: 0 },
          { text: 'THE LETTER ROOM', family: 'sans', size: 46, weight: 500, color: '#3a2f2a', spacing: 14, gap: 0 },
        ]}
        basic={false}
      />
      {/* Room title just inside the entrance */}
      <CanvasLabel
        width={3.6}
        position={[-WALL_X + 0.01, 3.6, -1.9]}
        rotation={[0, Math.PI / 2, 0]}
        padding={10}
        align="left"
        lines={[
          { text: 'II', family: 'serif', size: 70, color: '#8a6f4a', gap: 6 },
          { text: 'The Memory Hall', family: 'serif', size: 96, weight: 600, color: '#2c2526', gap: 6 },
          { text: 'Walk up to a frame and press E', family: 'sans', size: 36, color: '#7b6f68', spacing: 2, gap: 0 },
        ]}
        basic={false}
      />

      <FocusSpot />
      <pointLight position={[0, 4.4, -6]} intensity={quality === 'high' ? 22 : 30} distance={14} decay={1.5} color="#fff1dc" />
      <pointLight position={[0, 4.4, -17]} intensity={quality === 'high' ? 22 : 30} distance={14} decay={1.5} color="#fff1dc" />
      <pointLight position={[0, 4.4, -28]} intensity={quality === 'high' ? 22 : 30} distance={14} decay={1.5} color="#fff1dc" />
    </group>
  )
}

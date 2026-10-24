import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PhotoFrame, FocusMarker, WallWash } from '../components/Exhibits'
import { CanvasLabel } from '../components/CanvasLabel'
import { Spot } from '../components/Spot'
import { RoseModel } from '../components/Props'
import { useInteractable, useColliders } from '../systems/hooks'
import { boxFromCenter } from '../systems/colliders'
import { useGame } from '../store/useGame'
import { DESK_LETTER, FRAMED_NOTE, FLOWERS } from '../data/letters'
import { ROOM_BY_ID } from '../world/layout'

const ROOM = ROOM_BY_ID.letter
const DESK = { x: 0, z: -41.6, w: 1.9, d: 0.95, h: 0.78 }

function Candle({ position }) {
  const flame = useRef()
  const light = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const f = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.05
    if (flame.current) flame.current.scale.set(1, f, 1)
    if (light.current) light.current.intensity = 2.2 * f
  })
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.12, 16]} />
        <meshStandardMaterial color="#f3ead8" roughness={0.6} />
      </mesh>
      <mesh ref={flame} position={[0, 0.15, 0]}>
        <coneGeometry args={[0.014, 0.05, 10]} />
        <meshBasicMaterial color="#ffcf7a" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.2, 0]} distance={3} decay={2} color="#ffb85a" intensity={3.0} />
    </group>
  )
}

function Desk() {
  useColliders([boxFromCenter(DESK.x, DESK.z, DESK.w + 0.1, DESK.d + 0.1)])
  const focused = useInteractable(DESK_LETTER.id, {
    position: [DESK.x, 1, DESK.z + DESK.d / 2],
    normal: [0, 1],
    radius: 2.1,
    label: 'the letter',
    verb: 'Read',
    facePoint: [DESK.x, DESK.z],
    onInteract: () => useGame.getState().openOverlay('letter', DESK_LETTER),
  })
  const paper = useRef()
  useFrame((_, dt) => {
    if (!paper.current) return
    const target = focused ? 0.55 : 0
    paper.current.emissiveIntensity += (target - paper.current.emissiveIntensity) * Math.min(1, dt * 6)
  })
  return (
    <group position={[DESK.x, 0, DESK.z]}>
      <mesh position={[0, DESK.h - 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[DESK.w, 0.06, DESK.d]} />
        <meshStandardMaterial color="#5a3422" roughness={0.45} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={sx + ',' + sz} position={[sx * (DESK.w / 2 - 0.08), (DESK.h - 0.06) / 2, sz * (DESK.d / 2 - 0.08)]} castShadow>
            <boxGeometry args={[0.07, DESK.h - 0.06, 0.07]} />
            <meshStandardMaterial color="#4a2a1b" roughness={0.5} />
          </mesh>
        )),
      )}
      {/* drawer band */}
      <mesh position={[0, DESK.h - 0.12, 0]}>
        <boxGeometry args={[DESK.w - 0.12, 0.12, DESK.d - 0.12]} />
        <meshStandardMaterial color="#4f2d1e" roughness={0.5} />
      </mesh>
      {/* letter + envelope */}
      <mesh position={[-0.12, DESK.h + 0.002, 0.08]} rotation={[-Math.PI / 2, 0, 0.12]}>
        <planeGeometry args={[0.32, 0.44]} />
        <meshStandardMaterial ref={paper} color="#f6efe0" roughness={0.9} emissive="#ffd9a0" emissiveIntensity={0} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[-0.12 + Math.sin(0.12) * (0.12 - i * 0.05), DESK.h + 0.003, 0.08 - 0.12 + i * 0.05]} rotation={[-Math.PI / 2, 0, 0.12]}>
          <planeGeometry args={[0.24 - (i === 5 ? 0.1 : 0), 0.006]} />
          <meshBasicMaterial color="#6b5140" />
        </mesh>
      ))}
      <mesh position={[0.32, DESK.h + 0.01, 0.02]} rotation={[0, -0.25, 0]} castShadow>
        <boxGeometry args={[0.34, 0.012, 0.22]} />
        <meshStandardMaterial color="#efe2c8" roughness={0.8} />
      </mesh>
      <mesh position={[0.32, DESK.h + 0.02, 0.02]}>
        <cylinderGeometry args={[0.028, 0.028, 0.008, 18]} />
        <meshStandardMaterial color="#8e1d2c" roughness={0.4} />
      </mesh>
      {/* quill */}
      <mesh position={[0.62, DESK.h + 0.02, -0.18]} rotation={[0, 0.6, Math.PI / 2 - 0.15]}>
        <coneGeometry args={[0.02, 0.32, 6]} />
        <meshStandardMaterial color="#efe9df" roughness={0.8} />
      </mesh>
      <Candle position={[-0.7, DESK.h, -0.25]} />
      <group position={[0, 1.55, 0.3]}>
        <FocusMarker focused={focused} />
      </group>
    </group>
  )
}

function Bouquet({ count = 9 }) {
  const roses = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 2) * 0.3
        const r = i === 0 ? 0 : 0.06 + (i % 3) * 0.025
        return { a, r, tilt: i === 0 ? 0 : 0.25 + (i % 3) * 0.08, h: 1.6 + (i % 4) * 0.08 }
      }),
    [count],
  )
  return (
    <group>
      {roses.map((r, i) => (
        <group key={i} position={[Math.cos(r.a) * r.r, 0, Math.sin(r.a) * r.r]} rotation={[Math.sin(r.a) * r.tilt, 0, -Math.cos(r.a) * r.tilt]}>
          <RoseModel scale={r.h} />
        </group>
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={'l' + i} position={[Math.cos(a) * 0.12, 0.42, Math.sin(a) * 0.12]} rotation={[Math.sin(a) * 0.6, a, -Math.cos(a) * 0.6]} scale={[1, 0.25, 0.5]}>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshStandardMaterial color="#365e30" roughness={0.75} />
          </mesh>
        )
      })}
    </group>
  )
}

function FlowerConsole() {
  const x = 5.85
  const z = -40.5
  useColliders([boxFromCenter(x, z, 0.62, 1.7)])
  const hasRose = useGame((s) => s.hasRose)
  const rosePlaced = useGame((s) => s.rosePlaced)
  const focused = useInteractable(FLOWERS.id, {
    position: [x - 0.3, 1, z],
    normal: [-1, 0],
    radius: 2,
    label: 'a rose',
    verb: 'Pick',
    anim: 'pickup',
    fireDelay: 0.9,
    facePoint: [x, z],
    enabled: () => {
      const s = useGame.getState()
      return !s.hasRose && !s.rosePlaced
    },
    onInteract: () => {
      useGame.getState().pickRose()
      useGame.getState().showToast(FLOWERS.pickedMessage)
    },
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.05, 1.6]} />
        <meshStandardMaterial color="#3b2418" roughness={0.45} />
      </mesh>
      {[-0.7, 0.7].map((dz) => (
        <mesh key={dz} position={[0, 0.4, dz]} castShadow>
          <boxGeometry args={[0.45, 0.8, 0.06]} />
          <meshStandardMaterial color="#331f15" roughness={0.5} />
        </mesh>
      ))}
      <group position={[0, 0.845, 0]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.09, 0.4, 24, 1, true]} />
          <meshStandardMaterial color="#d8e6e4" roughness={0.1} metalness={0.1} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.01, 24]} />
          <meshStandardMaterial color="#c8d8d6" roughness={0.2} />
        </mesh>
        <Bouquet count={hasRose || rosePlaced ? 8 : 9} />
        <group position={[0, 1.0, 0]}>
          <FocusMarker focused={focused} />
        </group>
      </group>
      <WallWash position={[0.32, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]} w={2.4} h={2.6} opacity={0.4} color="#ffd6a8" />
    </group>
  )
}

function Bookshelf({ x, z, rotationY }) {
  useColliders([boxFromCenter(x, z, 0.5, 1.6)], [x, z])
  const books = useMemo(() => {
    const out = []
    const colors = ['#6b1f2a', '#2f4a3d', '#c9a45c', '#2b3a55', '#8a5a3c', '#efe6d4', '#3a2a35']
    for (let shelf = 0; shelf < 4; shelf++) {
      let u = -0.7
      let k = shelf * 7
      while (u < 0.66) {
        const w = 0.04 + ((k * 37) % 5) * 0.012
        const h = 0.26 + ((k * 13) % 4) * 0.03
        out.push({ u: u + w / 2, y: 0.32 + shelf * 0.5 + h / 2, w, h, c: colors[k % colors.length] })
        u += w + 0.006
        k++
      }
    }
    return out
  }, [])
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.15, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 2.3, 0.06]} />
        <meshStandardMaterial color="#3a2318" roughness={0.6} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.3 + i * 0.5, 0]}>
          <boxGeometry args={[1.6, 0.04, 0.42]} />
          <meshStandardMaterial color="#4a2d1f" roughness={0.55} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.8, 1.15, 0]}>
          <boxGeometry args={[0.05, 2.3, 0.42]} />
          <meshStandardMaterial color="#3a2318" roughness={0.6} />
        </mesh>
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.u, b.y, 0]}>
          <boxGeometry args={[b.w, b.h, 0.3]} />
          <meshStandardMaterial color={b.c} roughness={0.75} />
        </mesh>
      ))}
    </group>
  )
}

function Rug() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 384
    const g = c.getContext('2d')
    g.fillStyle = '#5d1f27'
    g.fillRect(0, 0, 512, 384)
    g.strokeStyle = '#c9a45c'
    g.lineWidth = 6
    g.strokeRect(18, 18, 476, 348)
    g.lineWidth = 2
    g.strokeRect(34, 34, 444, 316)
    g.strokeStyle = 'rgba(201,164,92,0.55)'
    g.beginPath()
    g.ellipse(256, 192, 120, 80, 0, 0, Math.PI * 2)
    g.stroke()
    g.beginPath()
    g.ellipse(256, 192, 70, 44, 0, 0, Math.PI * 2)
    g.stroke()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, -41]} receiveShadow>
      <planeGeometry args={[5.2, 3.9]} />
      <meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  )
}

function Sconce({ position, rotationY }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.12, 0.3, 0.06]} />
        <meshStandardMaterial color="#b8924f" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.18, 0.14]}>
        <sphereGeometry args={[0.08, 14, 10]} />
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
      </mesh>
      <WallWash position={[0, 0.3, 0.01]} w={1.8} h={2.2} opacity={0.5} color="#ffcf96" />
    </group>
  )
}

export function LetterRoom() {
  const wallW = 6.5 - 0.2
  return (
    <group>
      <Rug />
      <Desk />
      <FlowerConsole />
      <PhotoFrame
        id={FRAMED_NOTE.id}
        position={[-wallW, 1.85, -40.5]}
        rotationY={Math.PI / 2}
        image={FRAMED_NOTE.image}
        maxW={1.5}
        maxH={1.9}
        title={FRAMED_NOTE.title}
        date={FRAMED_NOTE.date}
        data={FRAMED_NOTE}
        frame="gold"
        washColor="#ffd6a8"
        radius={2.3}
      />
      <Bookshelf x={-wallW + 0.25} z={-36.6} rotationY={Math.PI / 2} />
      <Bookshelf x={wallW - 0.25} z={-36.6} rotationY={-Math.PI / 2} />
      <Sconce position={[-wallW, 2.6, -44.3]} rotationY={Math.PI / 2} />
      <Sconce position={[wallW, 2.6, -44.3]} rotationY={-Math.PI / 2} />
      <Sconce position={[-wallW, 2.6, -37.8]} rotationY={Math.PI / 2} />
      <Sconce position={[wallW, 2.6, -37.8]} rotationY={-Math.PI / 2} />

      <CanvasLabel
        width={3}
        position={[0, 4.35, -46.79]}
        padding={14}
        lines={[
          { text: 'IV', family: 'serif', size: 64, color: '#c9a45c', gap: 0 },
          { text: 'OUR TIMELINE', family: 'sans', size: 46, weight: 500, color: '#f1e3cc', spacing: 14, gap: 0 },
        ]}
      />

      <Spot position={[0, ROOM.height - 0.2, -40]} target={[0, DESK.h, DESK.z]} angle={0.5} penumbra={0.9} intensity={26} distance={8} decay={1.5} color="#ffd29a" />
      <pointLight position={[0, 3.6, -38]} intensity={12.2} distance={11} decay={1.6} color="#ffcf9a" />
      <pointLight position={[0, 3.6, -45]} intensity={9.5} distance={10} decay={1.6} color="#ffcf9a" />
    </group>
  )
}

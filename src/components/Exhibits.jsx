import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLoadedTexture } from './useLoadedTexture'
import { CanvasLabel } from './CanvasLabel'
import { washTexture } from '../world/textures'
import { useInteractable, useColliders } from '../systems/hooks'
import { boxFromRotated } from '../systems/colliders'
import { useGame } from '../store/useGame'

const FRAME_COLORS = {
  black: { frame: '#141214', metal: 0.2, rough: 0.45 },
  gold: { frame: '#b38b4a', metal: 0.85, rough: 0.35 },
  walnut: { frame: '#4a2f22', metal: 0.05, rough: 0.55 },
}

// Glow that fades in when an exhibit is focused (the "subtle highlight").
function FocusGlow({ focused, w, h, z = -0.005, color = '#ffd59a' }) {
  const mat = useRef()
  useFrame((_, dt) => {
    if (!mat.current) return
    const target = focused ? 0.55 : 0
    mat.current.opacity += (target - mat.current.opacity) * Math.min(1, dt * 6)
  })
  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial ref={mat} color={color} transparent opacity={0} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

// Floating marker above a focused exhibit.
export function FocusMarker({ focused, y = 0, color = '#f3c77a' }) {
  const ref = useRef()
  useFrame((state, dt) => {
    if (!ref.current) return
    const s = ref.current.scale.x + ((focused ? 1 : 0) - ref.current.scale.x) * Math.min(1, dt * 8)
    ref.current.scale.setScalar(Math.max(0.0001, s))
    ref.current.rotation.y += dt * 1.6
    ref.current.position.y = y + Math.sin(state.clock.elapsedTime * 2.4) * 0.05
  })
  return (
    <mesh ref={ref} position={[0, y, 0]} scale={0.0001}>
      <octahedronGeometry args={[0.07, 0]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

// Fake spotlight pool on the wall behind an exhibit.
export function WallWash({ w = 2.6, h = 3.2, opacity = 0.55, color = '#ffffff', ...props }) {
  return (
    <mesh {...props}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        map={washTexture()}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

// Ceiling track light aimed at a wall (decorative fixture).
export function TrackLight({ position, rotationY = 0, ceilingY }) {
  return (
    <group position={[position[0], ceilingY, position[2]]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.06]} />
        <meshStandardMaterial color="#151517" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, -0.16, 0.05]} rotation={[0.75, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 0.22, 16]} />
        <meshStandardMaterial color="#151517" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.235, 0.135]} rotation={[0.75 + Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 16]} />
        <meshBasicMaterial color="#fff2d8" toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * A framed photograph mounted on a wall. Interactive: walk up and press E.
 * position: centre of the frame on the wall surface; rotationY: frame faces local +Z.
 */
export function PhotoFrame({
  id,
  position,
  rotationY = 0,
  image,
  maxW = 1.8,
  maxH = 1.6,
  title,
  date,
  caption,
  data,
  overlayType = 'memory',
  frame = 'black',
  plaque = true,
  wash = true,
  washColor,
  radius = 2.5,
}) {
  const { texture, aspect } = useLoadedTexture(image)
  const fc = FRAME_COLORS[frame] || FRAME_COLORS.black

  const dims = useMemo(() => {
    const innerW = maxW - 0.36
    const innerH = maxH - 0.36
    let pw = innerW
    let ph = pw / aspect
    if (ph > innerH) {
      ph = innerH
      pw = ph * aspect
    }
    const mat = 0.11
    const border = 0.06
    return { pw, ph, mw: pw + mat * 2, mh: ph + mat * 2, fw: pw + (mat + border) * 2, fh: ph + (mat + border) * 2 }
  }, [aspect, maxW, maxH])

  const nx = Math.sin(rotationY)
  const nz = Math.cos(rotationY)
  const focused = useInteractable(id, {
    position: [position[0] + nx * 0.2, position[1], position[2] + nz * 0.2],
    normal: [nx, nz],
    radius,
    label: title,
    verb: 'View',
    facePoint: [position[0], position[2]],
    onInteract: () => useGame.getState().openOverlay(overlayType, data || { id, image, title, date, message: caption }),
  })

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {wash && <WallWash position={[0, 0.25, 0.004]} w={dims.fw * 2.1} h={dims.fh * 2.1} color={washColor} />}
      <FocusGlow focused={focused} w={dims.fw + 0.18} h={dims.fh + 0.18} z={0.006} />
      <mesh position={[0, 0, 0.035]} castShadow>
        <boxGeometry args={[dims.fw, dims.fh, 0.06]} />
        <meshStandardMaterial color={fc.frame} metalness={fc.metal} roughness={fc.rough} />
      </mesh>
      <mesh position={[0, 0, 0.066]}>
        <planeGeometry args={[dims.mw, dims.mh]} />
        <meshStandardMaterial color="#f7f4ee" roughness={0.9} />
      </mesh>
      {texture && (
        <mesh position={[0, 0, 0.068]}>
          <planeGeometry args={[dims.pw, dims.ph]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
      <group position={[0, dims.fh / 2 + 0.28, 0.1]}>
        <FocusMarker focused={focused} />
      </group>
      {plaque && (title || date) && (
        <group position={[dims.fw / 2 - 0.3, -dims.fh / 2 - 0.22, 0.012]}>
          <mesh position={[0, 0, -0.004]}>
            <boxGeometry args={[0.62, 0.24, 0.01]} />
            <meshStandardMaterial color="#f4f0e8" roughness={0.6} />
          </mesh>
          <CanvasLabel
            width={0.58}
            padding={30}
            position={[0, 0, 0.003]}
            lines={[
              { text: title, family: 'serif', size: 66, weight: 600, color: '#2a2224', gap: 10 },
              { text: date, family: 'sans', size: 40, color: '#7a6d68', spacing: 3, gap: 0 },
            ]}
          />
        </group>
      )}
    </group>
  )
}

/**
 * A gallery bench. Interactive: press E to sit; move to stand up.
 * Sitters face local +Z.
 */
export function Bench({ id, position, rotationY = 0, length = 2.2 }) {
  const [x, , z] = position
  useColliders([boxFromRotated(x, z, length, 0.55, rotationY, { camera: false })], [x, z, rotationY, length])
  const focused = useInteractable(id, {
    position: [x, 0.6, z],
    radius: 1.6,
    label: 'the bench',
    verb: 'Sit on',
    kind: 'sit',
    // Returns the seat nearest the player, plus the other seat for the partner.
    seat: (px, pz) => {
      const c = Math.cos(rotationY)
      const s = Math.sin(rotationY)
      // local seat offsets along the bench's length axis (local X)
      const seats = [-0.5, 0.5].map((lx) => ({ x: x + lx * c, z: z - lx * s }))
      seats.sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz))
      return { x: seats[0].x, z: seats[0].z, other: seats[1], yaw: rotationY, forward: [Math.sin(rotationY), Math.cos(rotationY)] }
    },
  })
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.08, 0.5]} />
        <meshStandardMaterial color={focused ? '#e6cfa6' : '#cdb38c'} roughness={0.6} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (length / 2 - 0.15), 0.2, 0]} castShadow>
          <boxGeometry args={[0.08, 0.4, 0.44]} />
          <meshStandardMaterial color="#1b1a1c" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

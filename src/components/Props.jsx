import * as THREE from 'three'

// Small hand-held props, built from primitives (no external assets).

// A single red rose (stem along +Y, bloom at the top).
export function RoseModel(props) {
  return (
    <group {...props}>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.006, 0.007, 0.34, 6]} />
        <meshStandardMaterial color="#2f5a2a" roughness={0.7} />
      </mesh>
      <mesh position={[0.025, 0.16, 0]} rotation={[0, 0, -0.9]} scale={[1, 0.35, 0.6]}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshStandardMaterial color="#3d6b33" roughness={0.7} />
      </mesh>
      <group position={[0, 0.36, 0]}>
        <mesh scale={[1, 1.15, 1]}>
          <sphereGeometry args={[0.032, 12, 10]} />
          <meshStandardMaterial color="#9e0f22" roughness={0.45} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} rotation={[0.5, (i / 5) * Math.PI * 2, 0]} position={[0, -0.005, 0]} scale={[1, 0.7, 0.45]}>
            <sphereGeometry args={[0.03, 8, 6, 0, Math.PI]} />
            <meshStandardMaterial color="#b3162c" roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// A wrapped gift box with a ribbon and bow (about 22 cm).
export function GiftBoxModel({ size = 0.22, color = '#8e1d2c', ribbon = '#e8c77a', ...props }) {
  const s = size
  return (
    <group {...props}>
      <mesh castShadow>
        <boxGeometry args={[s, s * 0.8, s]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      <mesh position={[0, s * 0.42, 0]} castShadow>
        <boxGeometry args={[s * 1.06, s * 0.08, s * 1.06]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh>
        <boxGeometry args={[s * 0.16, s * 0.82, s * 1.02]} />
        <meshStandardMaterial color={ribbon} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh>
        <boxGeometry args={[s * 1.02, s * 0.82, s * 0.16]} />
        <meshStandardMaterial color={ribbon} metalness={0.6} roughness={0.35} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * s * 0.13, s * 0.5, 0]} rotation={[0, 0, k * 0.6]} scale={[1.4, 0.7, 0.5]}>
          <torusGeometry args={[s * 0.09, s * 0.03, 8, 16]} />
          <meshStandardMaterial color={ribbon} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}


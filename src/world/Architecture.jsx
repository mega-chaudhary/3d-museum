import { useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import { ROOMS, WALLS, WALL_T, OPENINGS, roomSides } from './layout'
import { marbleTexture, plasterTexture } from './textures'
import { boxFromCenter } from '../systems/colliders'
import { useColliders } from '../systems/hooks'
import { useGame } from '../store/useGame'

const rotForNormal = ([nx, nz]) => (nz === 1 ? 0 : nz === -1 ? Math.PI : nx === 1 ? Math.PI / 2 : -Math.PI / 2)

// Box placed against a room side: u0..u1 along the side, y0..y1 height, depth into the room.
function sideBox(side, u0, u1, y0, y1, depth, offset = 0) {
  const len = u1 - u0
  const mid = (u0 + u1) / 2
  const h = y1 - y0
  const [nx, nz] = side.normal
  const d = side.inset + (side.axis === 'x' ? nz : nx) * (offset + depth / 2)
  return side.axis === 'x'
    ? { args: [len, h, depth], position: [mid, y0 + h / 2, d] }
    : { args: [depth, h, len], position: [d, y0 + h / 2, mid] }
}

function sidePlane(side, u0, u1, y0, y1) {
  const len = u1 - u0
  const mid = (u0 + u1) / 2
  const h = y1 - y0
  const [nx, nz] = side.normal
  const d = side.inset + (side.axis === 'x' ? nz : nx) * 0.004
  return {
    args: [len, h],
    position: side.axis === 'x' ? [mid, y0 + h / 2, d] : [d, y0 + h / 2, mid],
    rotation: [0, rotForNormal(side.normal), 0],
  }
}

// Structural walls + their colliders.
function StructuralWalls() {
  const { boxes, colliders } = useMemo(() => {
    const boxes = []
    const colliders = []
    for (const w of WALLS) {
      const axis = w.a[1] === w.b[1] ? 'x' : 'z'
      const fixed = axis === 'x' ? w.a[1] : w.a[0]
      const from = Math.min(axis === 'x' ? w.a[0] : w.a[1], axis === 'x' ? w.b[0] : w.b[1]) - WALL_T / 2
      const to = Math.max(axis === 'x' ? w.a[0] : w.a[1], axis === 'x' ? w.b[0] : w.b[1]) + WALL_T / 2
      const ops = (w.openings || []).slice().sort((a, b) => a.c - b.c)
      const segs = []
      let u = from
      for (const o of ops) {
        segs.push([u, o.c - o.w / 2, 0, w.h, true])
        segs.push([o.c - o.w / 2, o.c + o.w / 2, o.h, w.h, false])
        u = o.c + o.w / 2
      }
      segs.push([u, to, 0, w.h, true])
      for (const [u0, u1, y0, y1, solid] of segs) {
        if (u1 - u0 < 0.01) continue
        const len = u1 - u0
        const mid = (u0 + u1) / 2
        const box =
          axis === 'x'
            ? { args: [len, y1 - y0, WALL_T], position: [mid, (y0 + y1) / 2, fixed] }
            : { args: [WALL_T, y1 - y0, len], position: [fixed, (y0 + y1) / 2, mid] }
        boxes.push(box)
        if (solid) {
          colliders.push(
            axis === 'x' ? boxFromCenter(mid, fixed, len, WALL_T) : boxFromCenter(fixed, mid, WALL_T, len),
          )
        }
      }
    }
    return { boxes, colliders }
  }, [])
  useColliders(colliders)
  return (
    <group>
      {boxes.map((b, i) => (
        <mesh key={i} position={b.position} receiveShadow>
          <boxGeometry args={b.args} />
          <meshStandardMaterial color="#cfc8bd" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// Door casings around every opening, both faces.
function Casings() {
  const parts = useMemo(() => {
    const out = []
    const depth = WALL_T + 0.1
    for (const o of OPENINGS) {
      const jw = 0.24
      const pieces = [
        { u: o.c - o.w / 2 - jw / 2, y: o.h / 2, w: jw, h: o.h },
        { u: o.c + o.w / 2 + jw / 2, y: o.h / 2, w: jw, h: o.h },
        { u: o.c, y: o.h + 0.16, w: o.w + jw * 2 + 0.12, h: 0.32 },
      ]
      for (const p of pieces) {
        out.push(
          o.axis === 'x'
            ? { args: [p.w, p.h, depth], position: [p.u, p.y, o.fixed] }
            : { args: [depth, p.h, p.w], position: [o.fixed, p.y, p.u] },
        )
      }
    }
    return out
  }, [])
  return parts.map((p, i) => (
    <mesh key={i} position={p.position} castShadow receiveShadow>
      <boxGeometry args={p.args} />
      <meshStandardMaterial color="#e6dfd2" roughness={0.55} />
    </mesh>
  ))
}

// Interior wall finish, baseboards and crown moulding, per room.
function RoomShell({ room }) {
  const plaster = plasterTexture()
  const sides = useMemo(() => roomSides(room), [room])
  const map = useMemo(() => {
    const t = plaster.clone()
    t.needsUpdate = true
    t.repeat.set(4, 2)
    return t
  }, [plaster])
  return (
    <group>
      {sides.map((s, si) => (
        <group key={si}>
          {s.solid.map(([u0, u1], i) => {
            const p = sidePlane(s, u0, u1, 0, room.height)
            return (
              <mesh key={'w' + i} position={p.position} rotation={p.rotation} receiveShadow>
                <planeGeometry args={p.args} />
                <meshStandardMaterial color={room.wall} map={map} roughness={0.92} />
              </mesh>
            )
          })}
          {s.above.map((a, i) => {
            const p = sidePlane(s, a.u0, a.u1, a.y0, room.height)
            if (p.args[1] <= 0.01) return null
            return (
              <mesh key={'a' + i} position={p.position} rotation={p.rotation}>
                <planeGeometry args={p.args} />
                <meshStandardMaterial color={room.wall} map={map} roughness={0.92} />
              </mesh>
            )
          })}
          {s.solid.map(([u0, u1], i) => {
            const b = sideBox(s, u0, u1, 0, 0.18, 0.035)
            return (
              <mesh key={'b' + i} position={b.position}>
                <boxGeometry args={b.args} />
                <meshStandardMaterial color={room.trim} roughness={0.5} />
              </mesh>
            )
          })}
          {room.dado &&
            s.solid.map(([u0, u1], i) => {
              const p = sidePlane(s, u0, u1, 0.18, 1.05)
              const rail = sideBox(s, u0, u1, 1.05, 1.11, 0.045)
              return (
                <group key={'d' + i}>
                  <mesh position={p.position} rotation={p.rotation} receiveShadow>
                    <planeGeometry args={p.args} />
                    <meshStandardMaterial color={room.dado} roughness={0.7} polygonOffset polygonOffsetFactor={-1} />
                  </mesh>
                  <mesh position={rail.position}>
                    <boxGeometry args={rail.args} />
                    <meshStandardMaterial color={room.trim} roughness={0.45} />
                  </mesh>
                </group>
              )
            })}
          {(() => {
            const b = sideBox(s, s.from, s.to, room.height - 0.22, room.height, 0.12)
            return (
              <mesh position={b.position}>
                <boxGeometry args={b.args} />
                <meshStandardMaterial color={room.trim} roughness={0.5} />
              </mesh>
            )
          })()}
        </group>
      ))}
      {/* ceiling */}
      <mesh
        position={[(room.minX + room.maxX) / 2, room.height, (room.minZ + room.maxZ) / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[room.maxX - room.minX, room.maxZ - room.minZ]} />
        <meshStandardMaterial color={room.ceiling} roughness={0.95} />
      </mesh>
    </group>
  )
}

function Floor() {
  const quality = useGame((s) => s.quality)
  const tex = marbleTexture()
  const W = 24
  const D = 104
  const map = useMemo(() => {
    const t = tex.clone()
    t.needsUpdate = true
    t.repeat.set(W / 4, D / 4)
    return t
  }, [tex])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 17 - D / 2]} receiveShadow>
      <planeGeometry args={[W, D]} />
      {quality === 'high' ? (
        <MeshReflectorMaterial
          map={map}
          resolution={512}
          blur={[260, 80]}
          mixBlur={1}
          mixStrength={2.4}
          mixContrast={1}
          depthScale={0.6}
          minDepthThreshold={0.6}
          maxDepthThreshold={1.2}
          roughness={0.55}
          metalness={0.05}
          color="#ffffff"
        />
      ) : (
        <meshStandardMaterial map={map} roughness={0.32} metalness={0.05} />
      )}
    </mesh>
  )
}

export function Architecture() {
  return (
    <group>
      <Floor />
      <StructuralWalls />
      <Casings />
      {ROOMS.map((r) => (
        <RoomShell key={r.id} room={r} />
      ))}
    </group>
  )
}

export { sideBox, sidePlane, rotForNormal }

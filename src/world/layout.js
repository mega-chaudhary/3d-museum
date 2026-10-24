// ─────────────────────────────────────────────────────────────
// Museum floor plan (metres). Rooms are connected along −Z:
// Entrance → Memory Hall → Letter Room → Timeline → Final Surprise
// ─────────────────────────────────────────────────────────────
export const WALL_T = 0.4

export const ROOMS = [
  { id: 'entrance', index: 1, name: 'The Grand Entrance', minX: -9, maxX: 9, minZ: 0, maxZ: 16, height: 7.5,
    wall: '#e9e3d9', ceiling: '#d9d2c6', trim: '#cfc6b8', dado: '#ddd3c3' },
  { id: 'hall', index: 2, name: 'The Memory Hall', minX: -4.5, maxX: 4.5, minZ: -34, maxZ: 0, height: 5.5,
    wall: '#efebe5', ceiling: '#2a2a2d', trim: '#d8d2ca', dado: '#e4ded5' },
  { id: 'letter', index: 3, name: 'The Letter Room', minX: -6.5, maxX: 6.5, minZ: -47, maxZ: -34, height: 5,
    wall: '#5a2f35', ceiling: '#2b1a1d', trim: '#b8925a', dado: '#3d1f24' },
  { id: 'timeline', index: 4, name: 'Our Timeline', minX: -11, maxX: 11, minZ: -69, maxZ: -47, height: 5.5,
    wall: '#e4e6e8', ceiling: '#303236', trim: '#c9ccd0' },
  { id: 'final', index: 5, name: 'The Final Surprise', minX: -8, maxX: 8, minZ: -85, maxZ: -69, height: 8,
    wall: '#17171d', ceiling: '#0d0d11', trim: '#3a3540' },
]

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]))

// Structural walls. a/b are [x, z] endpoints on an axis-aligned line.
// openings: c = centre along the wall, w = width, h = height.
export const WALLS = [
  { a: [-9, 16], b: [9, 16], h: 7.5 },
  { a: [-9, 0], b: [-9, 16], h: 7.5 },
  { a: [9, 0], b: [9, 16], h: 7.5 },
  { a: [-9, 0], b: [9, 0], h: 7.5, openings: [{ c: 0, w: 3.4, h: 5, door: true }] },
  { a: [-4.5, -34], b: [-4.5, 0], h: 5.5 },
  { a: [4.5, -34], b: [4.5, 0], h: 5.5 },
  { a: [-6.5, -34], b: [6.5, -34], h: 5.5, openings: [{ c: 0, w: 2.8, h: 3.8 }] },
  { a: [-6.5, -47], b: [-6.5, -34], h: 5.5 },
  { a: [6.5, -47], b: [6.5, -34], h: 5.5 },
  { a: [-11, -47], b: [11, -47], h: 5.5, openings: [{ c: 0, w: 2.8, h: 3.6 }] },
  { a: [-11, -69], b: [-11, -47], h: 5.5 },
  { a: [11, -69], b: [11, -47], h: 5.5 },
  { a: [-11, -69], b: [11, -69], h: 8, openings: [{ c: 0, w: 3.0, h: 4.2 }] },
  { a: [-8, -85], b: [-8, -69], h: 8 },
  { a: [8, -85], b: [8, -69], h: 8 },
  { a: [-8, -85], b: [8, -85], h: 8 },
]

// Openings as world data: { axis:'x'|'z', fixed, c, w, h }
// axis 'x' = wall runs along X (constant z = fixed).
export const OPENINGS = WALLS.flatMap((w) => {
  const axis = w.a[1] === w.b[1] ? 'x' : 'z'
  const fixed = axis === 'x' ? w.a[1] : w.a[0]
  return (w.openings || []).map((o) => ({ ...o, axis, fixed }))
})

export function roomAt(x, z) {
  for (const r of ROOMS) if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return r
  return null
}

// Interior sides of a room with opening cut-outs, used for wall skins, trims and baseboards.
export function roomSides(room) {
  const t = WALL_T / 2
  const sides = [
    { axis: 'x', fixed: room.minZ, inset: room.minZ + t, from: room.minX, to: room.maxX, normal: [0, 1] },
    { axis: 'x', fixed: room.maxZ, inset: room.maxZ - t, from: room.minX, to: room.maxX, normal: [0, -1] },
    { axis: 'z', fixed: room.minX, inset: room.minX + t, from: room.minZ, to: room.maxZ, normal: [1, 0] },
    { axis: 'z', fixed: room.maxX, inset: room.maxX - t, from: room.minZ, to: room.maxZ, normal: [-1, 0] },
  ]
  return sides.map((s) => {
    const from = s.from + t
    const to = s.to - t
    const ops = OPENINGS.filter((o) => o.axis === s.axis && Math.abs(o.fixed - s.fixed) < 0.01 && o.c > from && o.c < to)
      .sort((a, b) => a.c - b.c)
    const solid = []
    const above = []
    let u = from
    for (const o of ops) {
      const l = o.c - o.w / 2
      const r = o.c + o.w / 2
      if (l > u) solid.push([u, l])
      above.push({ u0: l, u1: r, y0: o.h })
      u = r
    }
    if (u < to) solid.push([u, to])
    return { ...s, from, to, solid, above, openings: ops }
  })
}

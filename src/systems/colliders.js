// 2D (XZ plane) axis-aligned box colliders.
// Each collider: { minX, maxX, minZ, maxZ, enabled?: () => boolean, camera?: boolean }
const colliders = new Set()

export function addCollider(c) {
  colliders.add(c)
  return () => colliders.delete(c)
}

export function boxFromCenter(x, z, w, d, extra = {}) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, ...extra }
}

// Rotated furniture → conservative AABB.
export function boxFromRotated(x, z, w, d, rotY, extra = {}) {
  const c = Math.abs(Math.cos(rotY))
  const s = Math.abs(Math.sin(rotY))
  return boxFromCenter(x, z, w * c + d * s, w * s + d * c, extra)
}

const active = (c) => !c.enabled || c.enabled()

// Push a circle (pos.x, pos.z, r) out of every collider. Mutates pos.
export function resolveCircle(pos, r) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false
    for (const c of colliders) {
      if (!active(c)) continue
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX))
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ))
      const dx = pos.x - cx
      const dz = pos.z - cz
      const d2 = dx * dx + dz * dz
      if (d2 >= r * r) continue
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2)
        const push = r - d
        pos.x += (dx / d) * push
        pos.z += (dz / d) * push
      } else {
        // Centre is inside the box: push out along the shallowest axis.
        const left = pos.x - c.minX
        const right = c.maxX - pos.x
        const back = pos.z - c.minZ
        const front = c.maxZ - pos.z
        const m = Math.min(left, right, back, front)
        if (m === left) pos.x = c.minX - r
        else if (m === right) pos.x = c.maxX + r
        else if (m === back) pos.z = c.minZ - r
        else pos.z = c.maxZ + r
      }
      moved = true
    }
    if (!moved) break
  }
}

// Fraction t in [0,1] along segment a→b where it first hits a wall collider (inflated by pad).
export function segmentHit(ax, az, bx, bz, pad = 0.2, all = false) {
  let best = 1
  const dx = bx - ax
  const dz = bz - az
  for (const c of colliders) {
    if ((!all && c.camera === false) || !active(c)) continue
    const minX = c.minX - pad
    const maxX = c.maxX + pad
    const minZ = c.minZ - pad
    const maxZ = c.maxZ + pad
    // start inside → ignore (player is never inside a wall)
    if (ax > minX && ax < maxX && az > minZ && az < maxZ) continue
    let t0 = 0
    let t1 = 1
    const clip = (p, q) => {
      if (Math.abs(p) < 1e-9) return q >= 0
      const r = q / p
      if (p < 0) {
        if (r > t1) return false
        if (r > t0) t0 = r
      } else {
        if (r < t0) return false
        if (r < t1) t1 = r
      }
      return true
    }
    if (clip(-dx, ax - minX) && clip(dx, maxX - ax) && clip(-dz, az - minZ) && clip(dz, maxZ - az)) {
      if (t0 < best) best = t0
    }
  }
  return best
}

// Is a circle at (x, z) overlapping any active collider (walls and furniture)?
export function pointBlocked(x, z, r) {
  for (const c of colliders) {
    if (!active(c)) continue
    const cx = Math.max(c.minX, Math.min(x, c.maxX))
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ))
    if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true
  }
  return false
}

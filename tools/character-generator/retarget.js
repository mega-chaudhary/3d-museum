// Retarget Mixamo-rig animation clips between skeletons with different rest poses
// (T-pose source → A-pose target) and different bone orientations.
//
// Method: (1) align the target's rest pose to the source's rest pose by aiming each
// bone along the source bone's direction; (2) for every frame, apply the source bone's
// world-space rotation change (relative to its rest) to the aligned target bone;
// (3) convert back to local rotations. Hip motion is scaled by leg length and kept
// in place horizontally.
import * as THREE from 'three'

const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()
const _v = new THREE.Vector3()
const _v2 = new THREE.Vector3()

export function bonesOf(root) {
  const map = new Map()
  root.traverse((o) => { if (o.isBone) map.set(o.name, o) })
  return map
}

// First child bone that continues the chain (prefer the one that exists in both rigs).
function chainChild(bone, filter) {
  const kids = bone.children.filter((c) => c.isBone && filter(c.name))
  if (!kids.length) return null
  // Prefer "obvious" continuations
  const pref = kids.find((k) => /Spine|Neck|Head$|ForeArm|Hand$|Leg$|Foot$|ToeBase|Arm$/.test(k.name) && !/Thumb|Index|Middle|Ring|Pinky|Eye/.test(k.name))
  return pref || kids[0]
}

function hierarchyOrder(rootBone) {
  const out = []
  const walk = (b) => { out.push(b); b.children.forEach((c) => c.isBone && walk(c)) }
  walk(rootBone)
  return out
}

function worldQuat(o, out) { return o.getWorldQuaternion(out) }

/** Build a retargeting context for one source rig → one target rig. */
export function createRetargeter(srcRoot, tgtRoot) {
  srcRoot.updateMatrixWorld(true)
  tgtRoot.updateMatrixWorld(true)
  const src = bonesOf(srcRoot)
  const tgt = bonesOf(tgtRoot)
  const shared = (n) => src.has(n) && tgt.has(n)
  const tgtHips = tgt.get('mixamorigHips')
  const order = hierarchyOrder(tgtHips).filter((b) => src.has(b.name))

  // Save target rest locals so we can restore them.
  const tgtRestLocal = new Map([...tgt].map(([n, b]) => [n, b.quaternion.clone()]))
  const srcRestWorld = new Map()
  for (const [n, b] of src) srcRestWorld.set(n, worldQuat(b, new THREE.Quaternion()))

  // (1) Align target rest pose to source rest pose by bone directions.
  for (const b of order) {
    const sb = src.get(b.name)
    const sc = chainChild(sb, (n) => shared(n))
    const tc = sc && tgt.get(sc.name)
    if (!sc || !tc) continue
    tgtRoot.updateMatrixWorld(true)
    const sDir = sc.getWorldPosition(new THREE.Vector3()).sub(sb.getWorldPosition(new THREE.Vector3())).normalize()
    const tDir = tc.getWorldPosition(new THREE.Vector3()).sub(b.getWorldPosition(new THREE.Vector3())).normalize()
    if (sDir.lengthSq() < 1e-8 || tDir.lengthSq() < 1e-8) continue
    const delta = new THREE.Quaternion().setFromUnitVectors(tDir, sDir)
    const bw = worldQuat(b, new THREE.Quaternion())
    const newWorld = delta.multiply(bw)
    const parentWorld = b.parent ? worldQuat(b.parent, new THREE.Quaternion()) : new THREE.Quaternion()
    b.quaternion.copy(parentWorld.invert().multiply(newWorld))
    b.updateMatrixWorld(true)
  }
  tgtRoot.updateMatrixWorld(true)
  const tgtAlignedWorld = new Map()
  for (const b of order) tgtAlignedWorld.set(b.name, worldQuat(b, new THREE.Quaternion()))
  // restore
  for (const [n, q] of tgtRestLocal) tgt.get(n).quaternion.copy(q)
  tgtRoot.updateMatrixWorld(true)

  // Hip heights for scaling root motion.
  const srcHipsRestW = src.get('mixamorigHips').getWorldPosition(new THREE.Vector3())
  const tgtHipsRestW = tgtHips.getWorldPosition(new THREE.Vector3())
  const srcGround = new THREE.Box3().setFromObject(srcRoot).min.y
  const scale = (tgtHipsRestW.y - 0) / Math.max(1e-6, srcHipsRestW.y - srcGround)

  /**
   * Retarget a clip. Returns a new AnimationClip for the target rig.
   * opts.fps (30), opts.inPlace (true): drop horizontal hip travel.
   */
  function retarget(clip, opts = {}) {
    const fps = opts.fps ?? 30
    const inPlace = opts.inPlace ?? true
    const mixer = new THREE.AnimationMixer(srcRoot)
    const action = mixer.clipAction(clip)
    action.play()
    const frames = Math.max(2, Math.round(clip.duration * fps) + 1)
    const times = new Float32Array(frames)
    const quatData = new Map(order.map((b) => [b.name, new Float32Array(frames * 4)]))
    const hipPos = new Float32Array(frames * 3)
    const tgtWorld = new Map()
    const hipsParentInv = new THREE.Matrix4()
    for (let f = 0; f < frames; f++) {
      const t = Math.min(clip.duration, f / fps)
      times[f] = t
      mixer.setTime(t)
      srcRoot.updateMatrixWorld(true)
      // world rotations for target
      for (const b of order) {
        const sw = worldQuat(src.get(b.name), _q)
        const rest = srcRestWorld.get(b.name)
        // delta = sw * rest^-1 ; target = delta * aligned
        const delta = _q2.copy(sw).multiply(rest.clone().invert())
        tgtWorld.set(b.name, delta.multiply(tgtAlignedWorld.get(b.name)).clone())
      }
      // convert to locals down the hierarchy
      for (const b of order) {
        const w = tgtWorld.get(b.name)
        let parentW
        if (b.parent && tgtWorld.has(b.parent.name)) parentW = tgtWorld.get(b.parent.name)
        else parentW = b.parent ? worldQuat(b.parent, new THREE.Quaternion()) : new THREE.Quaternion()
        const local = parentW.clone().invert().multiply(w)
        local.toArray(quatData.get(b.name), f * 4)
      }
      // hips position
      const sp = src.get('mixamorigHips').getWorldPosition(_v)
      const d = _v2.copy(sp).sub(srcHipsRestW).multiplyScalar(scale)
      if (inPlace) { d.x = 0; d.z = 0 }
      const tw = tgtHipsRestW.clone().add(d)
      hipsParentInv.copy(tgtHips.parent.matrixWorld).invert()
      tw.applyMatrix4(hipsParentInv)
      tw.toArray(hipPos, f * 3)
    }
    mixer.stopAllAction()
    mixer.uncacheRoot(srcRoot)
    // reset source to rest
    const tracks = [new THREE.VectorKeyframeTrack('mixamorigHips.position', times, hipPos)]
    for (const b of order) tracks.push(new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, quatData.get(b.name)))
    return new THREE.AnimationClip(opts.name || clip.name, clip.duration, tracks)
  }

  return { retarget, scale }
}

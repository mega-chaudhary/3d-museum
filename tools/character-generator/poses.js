// Keyframed skeletal animations authored directly on the character skeleton.
// Poses are described as world-space bone directions in character space
// (character faces +Z, +Y up, character's LEFT side is +X). Each pose is solved by
// aiming bones (parents first) and stored as local bone rotations → AnimationClip.
import * as THREE from 'three'
import { bonesOf } from './retarget.js'

const CHILD = {
  Arm: 'ForeArm', ForeArm: 'Hand', UpLeg: 'Leg', Leg: 'Foot', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head',
}

function snapshot(bones) {
  const m = new Map()
  for (const [n, b] of bones) m.set(n, { q: b.quaternion.clone(), p: b.position.clone() })
  return m
}
function restore(bones, snap) {
  for (const [n, s] of snap) { const b = bones.get(n); b.quaternion.copy(s.q); b.position.copy(s.p) }
}

function aim(root, bones, name, dir) {
  const b = bones.get('mixamorig' + name)
  const short = name.replace(/^(Left|Right)/, '')
  const childName = 'mixamorig' + name.replace(short, CHILD[short])
  const c = bones.get(childName)
  if (!b || !c) return
  root.updateMatrixWorld(true)
  const bp = b.getWorldPosition(new THREE.Vector3())
  const cur = c.getWorldPosition(new THREE.Vector3()).sub(bp).normalize()
  // character space → world (root may be rotated)
  const want = new THREE.Vector3(...dir).normalize().applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()))
  const delta = new THREE.Quaternion().setFromUnitVectors(cur, want)
  const bw = b.getWorldQuaternion(new THREE.Quaternion())
  const pw = b.parent.getWorldQuaternion(new THREE.Quaternion())
  b.quaternion.copy(pw.invert().multiply(delta.multiply(bw)))
  b.updateMatrixWorld(true)
}

// Rotate a bone about a character-space axis (degrees), keeping children attached.
function turn(root, bones, name, axis, deg) {
  const b = bones.get('mixamorig' + name)
  if (!b) return
  root.updateMatrixWorld(true)
  const ax = new THREE.Vector3(...axis).normalize().applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()))
  const delta = new THREE.Quaternion().setFromAxisAngle(ax, THREE.MathUtils.degToRad(deg))
  const bw = b.getWorldQuaternion(new THREE.Quaternion())
  const pw = b.parent.getWorldQuaternion(new THREE.Quaternion())
  b.quaternion.copy(pw.invert().multiply(delta.multiply(bw)))
  b.updateMatrixWorld(true)
}

const ORDER = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg']

/**
 * Solve a pose on top of the base (idle) pose.
 * spec: { aims: {BoneName: [x,y,z]}, turns: [[BoneName, axis, deg]], hipsY: delta, hipsZ: delta }
 */
export function solvePose(root, bones, base, spec) {
  restore(bones, base)
  const hips = bones.get('mixamorigHips')
  if (spec.hipsY || spec.hipsZ) {
    const wp = hips.getWorldPosition(new THREE.Vector3())
    wp.y += spec.hipsY || 0
    wp.z += spec.hipsZ || 0
    root.updateMatrixWorld(true)
    hips.position.copy(hips.parent.worldToLocal(wp))
  }
  for (const [n, axis, deg] of spec.turnsFirst || []) turn(root, bones, n, axis, deg)
  for (const n of ORDER) if (spec.aims?.[n]) aim(root, bones, n, spec.aims[n])
  for (const [n, axis, deg] of spec.turns || []) turn(root, bones, n, axis, deg)
  return snapshot(bones)
}

const mirrorDir = ([x, y, z]) => [-x, y, z]
export function mirrorSpec(spec) {
  const aims = {}
  for (const [k, v] of Object.entries(spec.aims || {})) {
    const nk = k.startsWith('Left') ? k.replace('Left', 'Right') : k.startsWith('Right') ? k.replace('Right', 'Left') : k
    aims[nk] = mirrorDir(v)
  }
  return { ...spec, aims }
}

/** Build a clip from keyframes [{t, pose(snapshot)}], affecting only `onlyBones` if given. */
export function clipFromKeys(name, keys, bones, onlyBones) {
  const names = onlyBones ? onlyBones.map((n) => 'mixamorig' + n) : [...bones.keys()]
  const times = new Float32Array(keys.map((k) => k.t))
  const tracks = []
  for (const n of names) {
    if (!bones.has(n)) continue
    const qv = new Float32Array(keys.length * 4)
    keys.forEach((k, i) => k.pose.get(n).q.toArray(qv, i * 4))
    tracks.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times, qv))
  }
  if (!onlyBones || onlyBones.includes('Hips')) {
    const pv = new Float32Array(keys.length * 3)
    keys.forEach((k, i) => k.pose.get('mixamorigHips').p.toArray(pv, i * 3))
    tracks.push(new THREE.VectorKeyframeTrack('mixamorigHips.position', times, pv))
  }
  return new THREE.AnimationClip(name, keys[keys.length - 1].t, tracks)
}

const ARM_R = ['RightShoulder', 'RightArm', 'RightForeArm', 'RightHand']
const ARM_L = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand']

// ── Pose library ────────────────────────────────────────────
const P = {
  wave1: { aims: { RightArm: [-0.62, 0.72, 0.3], RightForeArm: [-0.35, 0.93, 0.1] }, turns: [['Head', [0, 0, 1], -4]] },
  wave2: { aims: { RightArm: [-0.62, 0.72, 0.3], RightForeArm: [0.12, 0.98, 0.15] }, turns: [['Head', [0, 0, 1], -4]] },
  hug: {
    aims: { LeftArm: [0.45, 0.05, 0.9], LeftForeArm: [-0.8, 0.08, 0.6], RightArm: [-0.45, 0.05, 0.9], RightForeArm: [0.8, 0.08, 0.6] },
    turns: [['Spine1', [1, 0, 0], 6], ['Head', [0, 1, 0], 12], ['Head', [1, 0, 0], 8]],
  },
  holdR: { aims: { RightArm: [-0.3, -0.93, 0.2], RightForeArm: [-0.45, -0.8, 0.4] } },
  give: { aims: { RightArm: [-0.12, -0.3, 0.95], RightForeArm: [0.08, -0.05, 1] }, turns: [['Spine1', [1, 0, 0], 4]] },
  receive: {
    aims: { LeftArm: [0.18, -0.5, 0.85], LeftForeArm: [-0.25, 0.05, 0.97], RightArm: [-0.18, -0.5, 0.85], RightForeArm: [0.25, 0.05, 0.97] },
    turns: [['Head', [1, 0, 0], 10]],
  },
  bend: {
    hipsY: -0.32, hipsZ: -0.12,
    aims: { LeftUpLeg: [0.12, -0.55, 0.83], LeftLeg: [0.02, -0.95, -0.3], RightUpLeg: [-0.12, -0.55, 0.83], RightLeg: [-0.02, -0.95, -0.3],
      RightArm: [-0.15, -0.75, 0.65], RightForeArm: [-0.05, -0.85, 0.5] },
    turnsFirst: [['Spine', [1, 0, 0], 22], ['Spine1', [1, 0, 0], 16], ['Spine2', [1, 0, 0], 10]],
  },
  sit: {
    hipsY: null, // filled per character from bench height
    aims: { LeftUpLeg: [0.1, -0.05, 1], LeftLeg: [0.02, -1, 0.06], RightUpLeg: [-0.1, -0.05, 1], RightLeg: [-0.02, -1, 0.06],
      LeftArm: [0.18, -0.9, 0.35], LeftForeArm: [0.05, -0.25, 0.97], RightArm: [-0.18, -0.9, 0.35], RightForeArm: [-0.05, -0.25, 0.97] },
  },
  admire: { turns: [['Head', [1, 0, 0], -8], ['Neck', [1, 0, 0], -4]], aims: { LeftArm: [0.2, -0.95, -0.2], RightArm: [-0.2, -0.95, -0.2], LeftForeArm: [-0.4, -0.5, -0.75], RightForeArm: [0.4, -0.5, -0.75] } },
}

/**
 * Build all authored clips for one character.
 * root: character scene; base: snapshot of the idle pose; seatHeight: bench seat top (m)
 */
export function buildAuthoredClips(root, seatHeight = 0.48) {
  const bones = bonesOf(root)
  const base = snapshot(bones)
  const hips = bones.get('mixamorigHips')
  root.updateMatrixWorld(true)
  const hipsH = hips.getWorldPosition(new THREE.Vector3()).y
  const S = (spec) => solvePose(root, bones, base, spec)
  const idle = S({})
  const clips = []

  const w1 = S(P.wave1), w2 = S(P.wave2)
  clips.push(clipFromKeys('Wave', [
    { t: 0, pose: idle }, { t: 0.35, pose: w1 }, { t: 0.6, pose: w2 }, { t: 0.85, pose: w1 }, { t: 1.1, pose: w2 },
    { t: 1.35, pose: w1 }, { t: 1.6, pose: w2 }, { t: 2.0, pose: idle },
  ], bones, [...ARM_R, 'Head', 'Neck']))

  const hug = S(P.hug)
  clips.push(clipFromKeys('Hug', [{ t: 0, pose: idle }, { t: 0.5, pose: hug }, { t: 3.2, pose: hug }, { t: 3.7, pose: idle }], bones, [...ARM_R, ...ARM_L, 'Spine1', 'Neck', 'Head']))

  const holdR = S(P.holdR)
  const holdL = S(mirrorSpec(P.holdR))
  clips.push(clipFromKeys('HoldHandRight', [{ t: 0, pose: holdR }, { t: 1, pose: holdR }], bones, ARM_R))
  clips.push(clipFromKeys('HoldHandLeft', [{ t: 0, pose: holdL }, { t: 1, pose: holdL }], bones, ARM_L))

  const give = S(P.give)
  clips.push(clipFromKeys('Give', [{ t: 0, pose: idle }, { t: 0.6, pose: give }, { t: 1.7, pose: give }, { t: 2.2, pose: idle }], bones, [...ARM_R, 'Spine1']))
  const recv = S(P.receive)
  clips.push(clipFromKeys('Receive', [{ t: 0, pose: idle }, { t: 0.6, pose: recv }, { t: 1.7, pose: recv }, { t: 2.2, pose: idle }], bones, [...ARM_R, ...ARM_L, 'Head']))

  const bend = S(P.bend)
  clips.push(clipFromKeys('PickUp', [{ t: 0, pose: idle }, { t: 0.6, pose: bend }, { t: 0.9, pose: bend }, { t: 1.6, pose: idle }], bones))

  const sitSpec = { ...P.sit, hipsY: seatHeight + 0.06 - hipsH, hipsZ: -0.32 }
  const sit = S(sitSpec)
  const halfway = S({ ...sitSpec, hipsY: sitSpec.hipsY * 0.55, hipsZ: -0.18, aims: { ...sitSpec.aims, LeftUpLeg: [0.1, -0.5, 0.86], RightUpLeg: [-0.1, -0.5, 0.86], LeftLeg: [0.02, -0.97, -0.2], RightLeg: [-0.02, -0.97, -0.2] }, turnsFirst: [['Spine', [1, 0, 0], 14]] })
  const sitBreath = S({ ...sitSpec, turns: [['Spine1', [1, 0, 0], 2]] })
  clips.push(clipFromKeys('SitDown', [{ t: 0, pose: idle }, { t: 0.5, pose: halfway }, { t: 1.0, pose: sit }], bones))
  clips.push(clipFromKeys('SitIdle', [{ t: 0, pose: sit }, { t: 1.8, pose: sitBreath }, { t: 3.6, pose: sit }], bones))
  clips.push(clipFromKeys('StandUp', [{ t: 0, pose: sit }, { t: 0.5, pose: halfway }, { t: 1.0, pose: idle }], bones))

  const adm = S(P.admire)
  clips.push(clipFromKeys('Admire', [{ t: 0, pose: idle }, { t: 0.7, pose: adm }, { t: 3, pose: adm }], bones, [...ARM_R, ...ARM_L, 'Head', 'Neck']))

  // hand positions in the hold pose (character space), used at runtime to place the couple
  restore(bones, holdR); root.updateMatrixWorld(true)
  const handR = bones.get('mixamorigRightHand').getWorldPosition(new THREE.Vector3())
  restore(bones, holdL); root.updateMatrixWorld(true)
  const handL = bones.get('mixamorigLeftHand').getWorldPosition(new THREE.Vector3())
  restore(bones, base); root.updateMatrixWorld(true)
  return { clips, meta: { holdHandRight: handR.toArray(), holdHandLeft: handL.toArray(), hipsHeight: hipsH } }
}

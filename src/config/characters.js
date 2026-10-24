// ─────────────────────────────────────────────────────────────
// The two characters.
// Both are realistic MakeHuman/MPFB2 humans (CC0) on a Mixamo-compatible
// skeleton, styled after the reference image and generated with humanforge.
// Animations are baked into each GLB (see public/models/README.md).
// ─────────────────────────────────────────────────────────────
export const CHARACTERS = {
  him: {
    id: 'him',
    url: 'models/him.glb',
    scale: 1, // 1.77 m
    // Ground speed of the Walk / Run clips at playback rate 1 (m/s, measured from the feet).
    nativeSpeed: { walk: 1.485, run: 2.591 },
  },
  her: {
    id: 'her',
    url: 'models/her.glb',
    scale: 1.06, // 1.51 m model → about 1.60 m
    nativeSpeed: { walk: 1.186, run: 2.16 },
  },
}

// Animation clip names inside the GLBs.
export const CLIPS = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  dance: 'Dance',
  wave: 'Wave',
  hug: 'Hug',
  holdRight: 'HoldHandRight',
  holdLeft: 'HoldHandLeft',
  give: 'Give',
  receive: 'Receive',
  interact: 'Give', // reaching toward doors / exhibits
  pickup: 'PickUp',
  sitDown: 'SitDown',
  sitIdle: 'SitIdle',
  standUp: 'StandUp',
  admire: 'Admire',
}

// Player movement (metres per second) and collision radius (metres).
export const MOVE = { walkSpeed: 1.45, runSpeed: 3.1, radius: 0.3 }

// Bone names used for props and hand-holding IK.
export const BONES = {
  rightHand: 'mixamorigRightHand',
  leftHand: 'mixamorigLeftHand',
  arm: { R: ['mixamorigRightArm', 'mixamorigRightForeArm', 'mixamorigRightHand'], L: ['mixamorigLeftArm', 'mixamorigLeftForeArm', 'mixamorigLeftHand'] },
}

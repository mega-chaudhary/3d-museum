import * as THREE from 'three'

// Mutable per-frame state shared between systems without React re-renders.
export const playerState = {
  position: new THREE.Vector3(0, 0, 12.5),
  yaw: Math.PI, // facing direction (rotation around Y); 0 faces +Z
  speed: 0,
  moving: false,
}

// The partner character (Character 2), driven by usePartnerController.
export const partnerState = {
  position: new THREE.Vector3(1.0, 0, 13.2),
  yaw: Math.PI,
  speed: 0,
  mode: 'follow',
}

// Per-frame update order is driven by <Director/>: player → partner → animation mixers → hand IK.
export const steppers = { player: null, partner: null }
// Animation APIs of the loaded characters: { player, partner }
export const humanoids = { player: null, partner: null }

// Couple interaction state (shared by both controllers and the HUD).
export const couple = {
  action: null, // 'hold' | 'dance' | 'hug' | 'give' | 'gift' | 'wave' | 'view' | 'sit'
  phase: null, // 'approach' | 'perform'
  t: 0,
  holdBlend: 0, // 0..1, drives hand IK
  playerDirective: null, // { face:[x,z], anim, once, onDone }
  hearts: 0, // timestamp of the latest hearts burst
  heartsAt: new THREE.Vector3(),
}

export const cameraState = {
  yaw: 0, // camera orbit angle around the player; 0 = camera sits on +Z side
  pitch: 0.32,
  distance: 4.4,
  lastUserInput: -10,
}

// Keyboard + joystick input. Joystick values are in [-1, 1].
export const input = {
  keys: new Set(),
  joyX: 0,
  joyY: 0,
}

export function readMoveInput() {
  const k = input.keys
  let x = 0
  let y = 0
  if (k.has('KeyW') || k.has('ArrowUp')) y += 1
  if (k.has('KeyS') || k.has('ArrowDown')) y -= 1
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1
  let run = k.has('ShiftLeft') || k.has('ShiftRight')
  if (x || y) {
    const l = Math.hypot(x, y)
    return { x: x / l, y: y / l, mag: 1, run }
  }
  const jm = Math.hypot(input.joyX, input.joyY)
  if (jm > 0.12) {
    const m = Math.min(1, jm)
    return { x: input.joyX / jm, y: input.joyY / jm, mag: m, run: m > 0.88 }
  }
  return { x: 0, y: 0, mag: 0, run: false }
}

// ── Interactables ───────────────────────────────────────────
// id → ref.current = { position:[x,y,z], radius, label, verb, enabled?, facePoint?, onInteract, kind? }
export const interactables = new Map()

// ── Debug hook for automated tests ──────────────────────────
if (typeof window !== 'undefined') window.__memora = { playerState, partnerState, couple, humanoids, cameraState, input, interactables }

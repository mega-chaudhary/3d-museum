import { create } from 'zustand'

// Quality: ?quality=low or ?quality=high in the URL overrides auto-detection.
const isLowEnd = () => {
  if (typeof window === 'undefined') return false
  const q = new URLSearchParams(window.location.search).get('quality')
  if (q === 'low') return true
  if (q === 'high') return false
  return window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600
}

const START = { position: [0, 0, 12.5], yaw: Math.PI }

export const useGame = create((set, get) => ({
  quality: isLowEnd() ? 'low' : 'high',
  touch: typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,

  started: false, // player pressed Start on the intro card
  playAs: 'him', // which character the player controls; the other is the partner
  partnerNear: false,
  coupleActive: null, // the couple action in progress (for the HUD)
  coupleRequest: null, // { action, nonce }
  hasGift: false,
  canEdit: false, // the owner can edit the museum in the page (shared link only)
  contentVersion: 0,
  pointerLocked: false,
  partnerHasRose: false,
  partnerHasGift: false,
  modelFailed: false,

  room: 'entrance',
  focus: null, // { id, label, verb }
  overlay: null, // { type, data }

  doorsOpen: false,
  revealed: false,
  hasRose: false,
  rosePlaced: false,
  viewed: {},

  toast: null, // { id, text }
  roomBanner: null, // { id, index, name }
  fade: false,

  // one-shot command channels for the player controller
  interactNonce: 0,
  waveNonce: 0,
  teleport: null, // { nonce, position, yaw }

  start: () => set({ started: true }),
  setPlayAs: (who) => set({ playAs: who }),
  setCanEdit: (v) => set({ canEdit: v }),
  setPointerLocked: (v) => get().pointerLocked !== v && set({ pointerLocked: v }),
  bumpContent: () => set((s) => ({ contentVersion: s.contentVersion + 1 })),
  openEditor: () => {
    if (document.pointerLockElement) document.exitPointerLock?.()
    set({ overlay: { type: 'editor', data: {} } })
  },
  setPartnerNear: (v) => get().partnerNear !== v && set({ partnerNear: v }),
  setCoupleActive: (a) => get().coupleActive !== a && set({ coupleActive: a }),
  requestCouple: (action) => {
    if (get().overlay || !get().started) return
    set((s) => ({ coupleRequest: { action, nonce: (s.coupleRequest?.nonce || 0) + 1 } }))
  },
  giveRose: () => set({ hasRose: false, partnerHasRose: true }),
  pickGift: () => set({ hasGift: true }),
  giveGift: () => set({ hasGift: false, partnerHasGift: true }),
  setModelFailed: () => set({ modelFailed: true }),
  setFocus: (focus) => {
    const cur = get().focus
    if ((cur && focus && cur.id === focus.id && cur.verb === focus.verb && cur.label === focus.label) || (!cur && !focus)) return
    set({ focus })
  },
  setRoom: (room, info) => set({ room, roomBanner: { id: Date.now(), ...info } }),
  requestInteract: () => {
    if (get().overlay) return
    set((s) => ({ interactNonce: s.interactNonce + 1 }))
  },
  requestWave: () => {
    if (get().overlay) return
    set((s) => ({ waveNonce: s.waveNonce + 1 }))
  },
  openOverlay: (type, data) => {
    if (document.pointerLockElement) document.exitPointerLock?.()
    return set((s) => ({ overlay: { type, data }, viewed: data?.id ? { ...s.viewed, [data.id]: true } : s.viewed }))
  },
  closeOverlay: () => set({ overlay: null }),
  showToast: (text) => set({ toast: { id: Date.now(), text } }),
  openDoors: () => set({ doorsOpen: true }),
  setRevealed: () => set({ revealed: true }),
  pickRose: () => set({ hasRose: true }),
  placeRose: () => set({ hasRose: false, partnerHasRose: false, rosePlaced: true }),

  // Fade to black, move the player, fade back in.
  travel: (position, yaw, after) => {
    set({ fade: true, overlay: null })
    setTimeout(() => {
      after?.()
      set((s) => ({ teleport: { nonce: (s.teleport?.nonce || 0) + 1, position, yaw } }))
      setTimeout(() => set({ fade: false }), 250)
    }, 450)
  },
  returnToEntrance: () => get().travel([0, 0, 6], Math.PI),
  replay: () =>
    get().travel(START.position, START.yaw, () =>
      set({ doorsOpen: false, revealed: false, hasRose: false, rosePlaced: false, viewed: {}, hasGift: false, partnerHasRose: false, partnerHasGift: false }),
    ),
}))

export const START_POSE = START

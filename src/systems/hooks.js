import { useEffect, useRef } from 'react'
import { interactables } from './runtime'
import { addCollider } from './colliders'
import { useGame } from '../store/useGame'

// Register an interactable. `def` may change every render; the latest is always used.
// def = { position:[x,y,z], radius, label, verb, onInteract, enabled?: () => bool, facePoint?:[x,z], kind? }
export function useInteractable(id, def) {
  const ref = useRef(def)
  ref.current = def
  useEffect(() => {
    interactables.set(id, ref)
    return () => {
      interactables.delete(id)
      if (useGame.getState().focus?.id === id) useGame.getState().setFocus(null)
    }
  }, [id])
  return useGame((s) => s.focus?.id === id)
}

// Register one or many colliders for the lifetime of the component.
export function useColliders(list, deps = []) {
  useEffect(() => {
    const removers = list.map(addCollider)
    return () => removers.forEach((r) => r())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

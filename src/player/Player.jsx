import { Suspense, useEffect, useRef } from 'react'
import { usePlayerController } from './usePlayerController'
import { Humanoid, FallbackFigure, ModelBoundary } from './Humanoid'
import { playerState } from '../systems/runtime'
import { useGame } from '../store/useGame'

// Character 1: controlled by the player (keyboard / joystick).
export function Player() {
  const playAs = useGame((s) => s.playAs)
  const root = useRef()
  const anim = useRef(null)
  usePlayerController(root, anim)
  useEffect(() => {
    if (root.current) root.current.position.copy(playerState.position)
  })
  return (
    <ModelBoundary key={playAs} fallback={<FallbackFigure role="player" rootRef={root} animRef={anim} color="#7a3344" />}>
      <Suspense fallback={null}>
        <Humanoid who={playAs} role="player" rootRef={root} animRef={anim} />
      </Suspense>
    </ModelBoundary>
  )
}

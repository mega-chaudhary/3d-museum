import { Suspense, useRef } from 'react'
import { usePartnerController } from './usePartnerController'
import { Humanoid, FallbackFigure, ModelBoundary } from './Humanoid'
import { useGame } from '../store/useGame'

// Character 2: the partner, driven by AI and the couple interactions.
export function Partner() {
  const playAs = useGame((s) => s.playAs)
  const who = playAs === 'him' ? 'her' : 'him'
  const root = useRef()
  const anim = useRef(null)
  usePartnerController(root, anim)
  return (
    <ModelBoundary key={who} fallback={<FallbackFigure role="partner" rootRef={root} animRef={anim} color="#2f4a6a" />}>
      <Suspense fallback={null}>
        <Humanoid who={who} role="partner" rootRef={root} animRef={anim} />
      </Suspense>
    </ModelBoundary>
  )
}

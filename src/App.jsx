import { Museum } from './world/Museum'
import { HUD } from './ui/HUD'
import { Overlays } from './ui/Overlays'
import { LoadingScreen } from './ui/LoadingScreen'
import { useKeyboard } from './ui/Controls'
import { Fragment, useEffect } from 'react'
import { useGame } from './store/useGame'
import { detectEditor } from './ui/Editor'

// Expose the store for automated tests / debugging in the console.
if (typeof window !== 'undefined' && window.__memora) window.__memora.store = useGame

export default function App() {
  useKeyboard()
  const contentVersion = useGame((s) => s.contentVersion)
  // Show the owner-only editor when the museum is opened from its link in Claude.
  useEffect(() => {
    detectEditor().then((can) => useGame.getState().setCanEdit(can))
  }, [])
  return (
    <div className="app">
      {/* Re-mount the 3D museum and HUD after the owner saves, so new photos and words appear. */}
      <Fragment key={contentVersion}>
        <Museum />
        <HUD />
      </Fragment>
      <Overlays />
      <LoadingScreen />
    </div>
  )
}

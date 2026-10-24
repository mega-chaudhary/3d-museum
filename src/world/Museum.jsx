import { Canvas } from '@react-three/fiber'
import { Architecture } from './Architecture'
import { Lighting } from './Lighting'
import { Entrance } from '../rooms/Entrance'
import { MemoryHall } from '../rooms/MemoryHall'
import { LetterRoom } from '../rooms/LetterRoom'
import { TimelineRoom } from '../rooms/TimelineRoom'
import { FinalRoom } from '../rooms/FinalRoom'
import { Player } from '../player/Player'
import { Partner } from '../player/Partner'
import { Director, CoupleHearts } from '../player/Director'
import { FollowCamera } from '../player/FollowCamera'
import { useGame } from '../store/useGame'

export function Museum() {
  const quality = useGame((s) => s.quality)
  const high = quality === 'high'
  // Pause 3D rendering while the editor is open: it frees the page for photo processing.
  const editing = useGame((s) => s.overlay?.type === 'editor')
  return (
    <Canvas
      className="scene"
      shadows={high}
      frameloop={editing ? 'never' : 'always'}
      dpr={high ? [1, 1.75] : [1, 1.3]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 52, near: 0.1, far: 140, position: [0, 2.6, 17] }}
    >
      <color attach="background" args={['#0f0d0e']} />
      <fog attach="fog" args={['#14110f', 28, 70]} />
      <Lighting />
      <Architecture />
      <Entrance />
      <MemoryHall />
      <LetterRoom />
      <TimelineRoom />
      <FinalRoom />
      <Player />
      <Partner />
      <Director />
      <CoupleHearts />
      <FollowCamera />
    </Canvas>
  )
}

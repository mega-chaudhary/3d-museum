import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { playerState } from '../systems/runtime'
import { useGame } from '../store/useGame'

// Shadow-casting key light that follows the player (small frustum = crisp, cheap shadows).
function FollowShadowLight() {
  const light = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    const p = playerState.position
    if (!light.current) return
    light.current.position.set(p.x + 2.5, 9, p.z + 3.5)
    target.position.set(p.x, 0, p.z)
    target.updateMatrixWorld()
  })
  return (
    <>
      <primitive object={target} />
      <directionalLight
        ref={light}
        target={target}
        intensity={0.55}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  )
}

export function Lighting() {
  const quality = useGame((s) => s.quality)
  return (
    <>
      <hemisphereLight args={['#fff6ea', '#5a4e44', quality === 'high' ? 0.36 : 0.52]} />
      <ambientLight intensity={0.08} />
      {quality === 'high' && <FollowShadowLight />}
      {/* Soft studio environment for reflections on floors, frames and brass. Rendered once, no downloads. */}
      <Environment frames={1} resolution={128} environmentIntensity={0.28}>
        <color attach="background" args={['#2a2522']} />
        <Lightformer form="rect" intensity={2} color="#fff1dd" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 40, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffe2c0" position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[30, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffe2c0" position={[8, 3, 0]} rotation-y={-Math.PI / 2} scale={[30, 3, 1]} />
      </Environment>
    </>
  )
}

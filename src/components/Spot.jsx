import { useMemo } from 'react'
import * as THREE from 'three'

// SpotLight with a real target object (so it actually aims where you ask).
export function Spot({ position, target = [0, 0, 0], ...props }) {
  const t = useMemo(() => new THREE.Object3D(), [])
  return (
    <>
      <primitive object={t} position={target} />
      <spotLight position={position} target={t} {...props} />
    </>
  )
}

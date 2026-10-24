import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { missingPhotoTexture } from '../world/textures'
import { assetUrl } from '../systems/assets'

const loader = new THREE.TextureLoader() // uses DefaultLoadingManager → counted by the loading screen
const memo = new Map()

// Loads a photo; never throws. Falls back to a "Photo coming soon" texture if the file is missing.
export function useLoadedTexture(url) {
  const [state, setState] = useState(() => memo.get(url) || { texture: null, aspect: 4 / 3, failed: false })
  useEffect(() => {
    if (memo.has(url)) {
      setState(memo.get(url))
      return
    }
    let alive = true
    loader.load(
      assetUrl(url),
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 8
        const s = { texture: t, aspect: t.image.width / t.image.height, failed: false }
        memo.set(url, s)
        if (alive) setState(s)
      },
      undefined,
      () => {
        console.warn(`[Memora] Missing image: ${url} — showing a placeholder.`)
        const s = { texture: missingPhotoTexture(url), aspect: 4 / 3, failed: true }
        memo.set(url, s)
        if (alive) setState(s)
      },
    )
    return () => {
      alive = false
    }
  }, [url])
  return state
}

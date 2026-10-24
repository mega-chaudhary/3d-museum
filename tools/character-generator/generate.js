// usss character generator: builds the two characters with humanforge (CC0 MakeHuman
// assets), recolours their outfits, retargets Mixamo idle/walk/run/dance clips, authors
// the paired-interaction clips, and exports GLB files with everything baked in.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HumanAvatar, loadHumanPackage } from 'humanforge/human'
import { exportHumanGLB } from 'humanforge/human/export'
import { WebIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { resample, prune, dedup } from '@gltf-transform/functions'
import { HIM, HER, HIM_EXPRESSION, HER_EXPRESSION, ASSETS, ANIMATION_SOURCES } from './characters.js'
import { createRetargeter } from './retarget.js'
import { buildAuthoredClips } from './poses.js'

const log = (m) => { const el = document.getElementById('log'); el.textContent += '\n' + m; el.scrollTop = 1e9 }
const canvas = document.getElementById('c')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
renderer.outputColorSpace = THREE.SRGBColorSpace
const scene = new THREE.Scene(); scene.background = new THREE.Color('#8a8580')
scene.add(new THREE.HemisphereLight('#ffffff', '#776655', 1.4))
const key = new THREE.DirectionalLight('#fff4e8', 2.4); key.position.set(1.5, 3, 4); scene.add(key)
const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50)
const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
const render = () => { resize(); renderer.render(scene, camera) }
camera.position.set(0, 1.0, 5.2); camera.lookAt(0, 0.9, 0)

const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255
const shade = (base, l, mid, amt) => base.map((c) => Math.max(0, Math.min(255, c * (1 + (l - mid) * amt))))

// Recolour one garment texture by UV region, with blurred luminance and an optional dilated mask.
function recolor(avatar, id, fn, maskFn) {
  avatar.group.traverse((o) => {
    if (!o.isMesh || !o.material?.map || !o.name.includes(id)) return
    const img = o.material.map.image
    const w = img.width, h = img.height
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, w, h)
    const bc = document.createElement('canvas'); bc.width = w; bc.height = h
    const bg = bc.getContext('2d'); bg.filter = 'blur(10px)'; bg.drawImage(img, 0, 0)
    const bd = bg.getImageData(0, 0, w, h).data
    let mask = null
    if (maskFn) {
      const raw = new Uint8Array(w * h)
      for (let i = 0; i < w * h; i++) raw[i] = maskFn(d.data[i * 4], d.data[i * 4 + 1], d.data[i * 4 + 2]) ? 1 : 0
      mask = new Uint8Array(w * h); const R = 7
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!raw[y * w + x]) continue
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const yy = y + dy, xx = x + dx
          if (yy >= 0 && yy < h && xx >= 0 && xx < w) mask[yy * w + xx] = 1
        }
      }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const out = fn(x / w, y / h, [d.data[i], d.data[i + 1], d.data[i + 2]], lum(bd[i], bd[i + 1], bd[i + 2]), w, mask ? mask[y * w + x] : 0)
      if (out) { d.data[i] = out[0]; d.data[i + 1] = out[1]; d.data[i + 2] = out[2] }
    }
    g.putImageData(d, 0, 0)
    const t = new THREE.CanvasTexture(cv)
    t.flipY = o.material.map.flipY; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = o.material.map.wrapS; t.wrapT = o.material.map.wrapT
    t.userData = { ...o.material.map.userData }
    o.material.map = t; o.material.needsUpdate = true
  })
}

async function build(pkg, config, expression, isHer) {
  const avatar = new HumanAvatar(pkg)
  await avatar.setConfig(config)
  for (const [k, v] of Object.entries(expression)) avatar.setExpression(k, v)
  if (isHer && config.clothes.includes('female_casualsuit01')) {
    const cream = config.topColor || [238, 229, 214]
    recolor(avatar, 'female_casualsuit01', (u, v, px, bl, w) => {
      if (u < 0.73 && v > 0.42) return null // denim
      const rib = 1 + 0.035 * Math.sin(u * w * 0.9)
      return shade(cream, bl, 0.42, 0.5).map((c) => Math.min(255, c * rib))
    })
  }
  if (!isHer && config.clothes.includes('male_casualsuit05')) {
    const brown = config.jacketColor || [60, 44, 35], white = config.shirtColor || [236, 234, 230]
    recolor(avatar, 'male_casualsuit05', (u, v, [r, g, b], bl, w, shirt) => {
      if (u < 0.6 && v > 0.55) return null // denim
      if (r + g + b < 24 && !shirt) return null
      if (shirt) return shade(white, bl, 0.4, 0.2)
      return shade(brown, lum(r, g, b), 0.33, 0.85)
    }, (r, g, b) => r > g * 1.25 && r > 55)
  }
  return avatar
}

const state = { him: null, her: null, staticGlb: {}, final: {} }
const $ = (id) => document.getElementById(id)

$('build').onclick = async () => {
  $('build').disabled = true
  try {
    log('Loading MakeHuman assets…')
    const assetsUrl = new URLSearchParams(location.search).get('assets') || ASSETS
    const pkg = await loadHumanPackage(assetsUrl, { textureSize: '1k' })
    log('Building Him…'); state.him = await build(pkg, HIM, HIM_EXPRESSION, false)
    log('Building Her…'); state.her = await build(pkg, HER, HER_EXPRESSION, true)
    state.him.group.position.x = -0.45; state.her.group.position.x = 0.45
    scene.add(state.him.group, state.her.group); render()
    for (const k of ['him', 'her']) {
      const a = state[k]; const pos = a.group.position.clone(); a.group.position.set(0, 0, 0)
      state.staticGlb[k] = await exportHumanGLB(a); a.group.position.copy(pos)
      log(`Exported ${k} (${(state.staticGlb[k].length / 1e6).toFixed(1)} MB, no animations yet)`)
    }
    $('bake').disabled = false
  } catch (e) { log('Error: ' + e.message); console.error(e) }
  $('build').disabled = false
}

$('bake').onclick = async () => {
  $('bake').disabled = true
  try {
    const loader = new GLTFLoader()
    const parse = (u8) => new Promise((res, rej) => loader.parse(u8.slice().buffer, '', res, rej))
    for (const who of ['him', 'her']) {
      log(`Animating ${who}…`)
      const tgt = await parse(state.staticGlb[who])
      const xbot = await loader.loadAsync(ANIMATION_SOURCES.locomotion)
      const rt = createRetargeter(xbot.scene, tgt.scene)
      const pick = (g, n) => g.animations.find((a) => a.name === n)
      const idle = rt.retarget(pick(xbot, 'idle'), { name: 'Idle' })
      const walk = rt.retarget(pick(xbot, 'walk'), { name: 'Walk' })
      const run = rt.retarget(pick(xbot, 'run'), { name: 'Run' })
      const dancer = await loader.loadAsync(ANIMATION_SOURCES.dance)
      const dance = createRetargeter(dancer.scene, tgt.scene).retarget(pick(dancer, 'SambaDance'), { name: 'Dance' })
      const m = new THREE.AnimationMixer(tgt.scene); m.clipAction(idle).play(); m.setTime(0); tgt.scene.updateMatrixWorld(true); m.stopAllAction(); m.uncacheRoot(tgt.scene)
      const authored = buildAuthoredClips(tgt.scene, 0.48)
      const clips = [idle, walk, run, dance, ...authored.clips]
      // write the clips into the exported GLB
      const io = new WebIO().registerExtensions(ALL_EXTENSIONS)
      const doc = await io.readBinary(state.staticGlb[who])
      const root = doc.getRoot(); const buffer = root.listBuffers()[0]
      const byName = new Map(root.listNodes().map((n) => [n.getName().replace(/[:.]/g, ''), n]))
      for (const clip of clips) {
        const anim = doc.createAnimation(clip.name)
        for (const t of clip.tracks) {
          const [bone, prop] = t.name.split('.')
          const node = byName.get(bone); if (!node) continue
          const path = prop === 'quaternion' ? 'rotation' : prop === 'position' ? 'translation' : null; if (!path) continue
          const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(t.times)).setBuffer(buffer)
          const output = doc.createAccessor().setType(path === 'rotation' ? 'VEC4' : 'VEC3').setArray(new Float32Array(t.values)).setBuffer(buffer)
          const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR')
          anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(sampler))
        }
      }
      root.getDefaultScene().setExtras({ usss: { character: who, ...authored.meta } })
      await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune())
      state.final[who] = await io.writeBinary(doc)
      log(`${who}.glb ready (${(state.final[who].length / 1e6).toFixed(1)} MB, ${clips.length} animations)`)
    }
    $('dlHim').disabled = $('dlHer').disabled = false
  } catch (e) { log('Error: ' + e.message); console.error(e) }
  $('bake').disabled = false
}

const download = (who) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([state.final[who]], { type: 'model/gltf-binary' }))
  a.download = `${who}.glb`; a.click()
}
$('dlHim').onclick = () => download('him')
$('dlHer').onclick = () => download('her')
window.addEventListener('resize', render)
render()

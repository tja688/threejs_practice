import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ToonOutlinePipeline } from './core/pipeline.js'
import { enableAllLayers } from './core/layers.js'
import './style.css'

const canvas = document.createElement('canvas')
document.body.appendChild(canvas)

const clearColor = 0x080b16
const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
  alpha: false,
})
renderer.setClearColor(clearColor, 1)
renderer.setPixelRatio(maxPixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NoToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.shadowMap.autoUpdate = false
renderer.shadowMap.needsUpdate = true

// Paint a solid frame immediately so the tab never looks "stuck loading".
renderer.clear()

const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0x0a1020, 26, 96)

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.5, 300)
camera.position.set(16.5, 12.5, 18.5)
enableAllLayers(camera)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(-0.4, 1.5, -0.3)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.enablePan = false
controls.minDistance = 12
controls.maxDistance = 48
controls.minPolarAngle = 0.12
controls.maxPolarAngle = Math.PI * 0.47
controls.rotateSpeed = 0.75
controls.zoomSpeed = 0.8
controls.update()

const pipeline = new ToonOutlinePipeline(renderer, scene, camera, {
  clearColor,
  outlineColor: 0x080c18,
  outlineStrength: 0.9,
  thickness: 1.2,
  depthBias: 0.014,
  normalBias: 0.34,
  vignette: 0.6,
})
pipeline.setSize(window.innerWidth, window.innerHeight)

function resize() {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setSize(width, height)
  pipeline.setSize(width, height)
}
window.addEventListener('resize', resize)

const timer = new THREE.Timer()
timer.connect(document)

let world = null
let shadowFrames = 0
let ready = false
let outlineWarmup = 0

function animate(timestamp) {
  timer.update(timestamp)
  const delta = Math.min(timer.getDelta(), 0.1)
  const time = timer.getElapsed()

  controls.update()
  if (world) world.update(time, delta)

  if (shadowFrames > 0) {
    renderer.shadowMap.needsUpdate = true
    shadowFrames -= 1
  }

  if (ready) {
    // First frames skip the outline pass so something visible lands ASAP.
    const outlines = outlineWarmup >= 2
    if (!outlines) outlineWarmup += 1
    pipeline.render({ outlines })
  } else {
    renderer.setRenderTarget(null)
    renderer.clear()
  }
}

renderer.setAnimationLoop(animate)

async function boot() {
  // Yield to the browser so the first clear() is visible before the heavy build.
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

  const { buildWorld } = await import('./world/index.js')
  world = buildWorld(scene, camera)

  // Smaller first-shadow cost; refresh a couple of frames after geometry lands.
  scene.traverse((object) => {
    if (object.isDirectionalLight && object.castShadow && object.shadow?.mapSize) {
      object.shadow.mapSize.set(1024, 1024)
    }
  })

  shadowFrames = 3
  ready = true
  renderer.shadowMap.needsUpdate = true
}

boot().catch((error) => {
  console.error('[konbini] failed to build scene', error)
})

if (import.meta.env.DEV) {
  window.__diorama = { scene, camera, controls, renderer, get world() { return world } }
}

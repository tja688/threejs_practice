import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ToonOutlinePipeline } from './core/pipeline.js'
import { enableAllLayers } from './core/layers.js'
import { buildWorld } from './world/index.js'
import './style.css'

const canvas = document.createElement('canvas')
document.body.appendChild(canvas)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NoToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
// The diorama is static, so the shadow map only needs refreshing on the first frames.
renderer.shadowMap.autoUpdate = false
renderer.shadowMap.needsUpdate = true

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
controls.minDistance = 9
controls.maxDistance = 48
controls.minPolarAngle = 0.12
controls.maxPolarAngle = Math.PI * 0.47
controls.rotateSpeed = 0.75
controls.zoomSpeed = 0.8
controls.update()

const world = buildWorld(scene, camera)

const pipeline = new ToonOutlinePipeline(renderer, scene, camera, {
  clearColor: 0x080b16,
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  pipeline.setSize(width, height)
}
window.addEventListener('resize', resize)

const clock = new THREE.Clock()
let shadowFrames = 3

function animate() {
  const delta = Math.min(clock.getDelta(), 0.1)
  const time = clock.getElapsedTime()

  controls.update()
  world.update(time, delta)

  if (shadowFrames > 0) {
    renderer.shadowMap.needsUpdate = true
    shadowFrames -= 1
  }

  pipeline.render()
}

renderer.setAnimationLoop(animate)

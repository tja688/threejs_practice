import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './style.css'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)
camera.position.set(2, 2, 4)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(5, 8, 5)
scene.add(directionalLight)

const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ color: 0x4fc3f7 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

const grid = new THREE.GridHelper(10, 10)
scene.add(grid)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

function animate() {
  requestAnimationFrame(animate)
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
  controls.update()
  renderer.render(scene, camera)
}

animate()

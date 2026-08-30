import * as THREE from 'three'
import { PALETTE } from '../core/palette.js'
import { markAsEffect } from '../core/layers.js'
import { buildBase } from './base.js'
import { buildStore } from './store.js'
import { buildInterior } from './interior.js'
import { buildProps } from './props.js'
import { buildNeighbors } from './neighbors.js'
import { createRain } from '../effects/rain.js'
import { createDrips } from '../effects/drips.js'
import { createGlassRain } from '../effects/glassRain.js'
import { createWetGround } from '../effects/puddles.js'

const backdropVertex = /* glsl */ `
varying vec3 vPosition;
void main() {
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const backdropFragment = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
varying vec3 vPosition;

void main() {
  float h = clamp(normalize(vPosition).y * 0.5 + 0.5, 0.0, 1.0);
  vec3 color = mix(uBottom, uTop, pow(h, 0.85));
  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function backdrop() {
  const material = new THREE.ShaderMaterial({
    vertexShader: backdropVertex,
    fragmentShader: backdropFragment,
    uniforms: {
      uTop: { value: new THREE.Color(PALETTE.skyTop) },
      uBottom: { value: new THREE.Color(PALETTE.skyBottom) },
      toneMappingExposure: { value: 1 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16), material)
  mesh.renderOrder = -10
  markAsEffect(mesh)
  return mesh
}

function lighting(root) {
  const hemisphere = new THREE.HemisphereLight(0x35507f, 0x090d16, 0.9)
  root.add(hemisphere)

  const ambient = new THREE.AmbientLight(PALETTE.ambient, 0.9)
  root.add(ambient)

  const moon = new THREE.DirectionalLight(PALETTE.moon, 1.15)
  moon.position.set(-11, 15, 9)
  moon.target.position.set(0, 0.5, -0.5)
  moon.castShadow = true
  moon.shadow.mapSize.set(2048, 2048)
  moon.shadow.camera.left = -15
  moon.shadow.camera.right = 15
  moon.shadow.camera.top = 15
  moon.shadow.camera.bottom = -15
  moon.shadow.camera.near = 1
  moon.shadow.camera.far = 45
  moon.shadow.bias = -0.0009
  moon.shadow.normalBias = 0.022
  root.add(moon, moon.target)

  // Cool fill from the opposite side so silhouettes stay readable.
  const fill = new THREE.DirectionalLight(0x4a6ea8, 0.35)
  fill.position.set(12, 8, -10)
  root.add(fill)
}

/**
 * Assembles the whole diorama and returns a ticker for the animated bits.
 */
export function buildWorld(scene, camera) {
  const updates = []
  const reflections = []
  const ctx = {
    camera,
    addUpdate: (fn) => updates.push(fn),
    addReflection: (source) => reflections.push(source),
    reflections,
  }

  const root = new THREE.Group()
  root.name = 'diorama'

  root.add(backdrop())
  lighting(root)

  root.add(buildBase())
  root.add(buildNeighbors())

  const store = buildStore(ctx)
  store.add(buildInterior(ctx))
  root.add(store)

  root.add(buildProps(ctx))

  // Weather last: the wet ground needs every registered light source.
  root.add(createRain(ctx))
  root.add(createDrips(ctx))
  root.add(createGlassRain(ctx))
  root.add(createWetGround(ctx))

  scene.add(root)

  return {
    root,
    update(time, delta) {
      for (let i = 0; i < updates.length; i += 1) updates[i](time, delta)
    },
  }
}

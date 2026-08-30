import * as THREE from 'three'
import { markAsEffect } from '../core/layers.js'
import { LAYOUT } from '../world/layout.js'
import { group } from '../world/helpers.js'

const S = LAYOUT.store

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uColumns;
uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUv;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  return fract(p * (p + p));
}

void main() {
  float columns = uColumns;
  float cx = floor(vUv.x * columns);
  float fx = fract(vUv.x * columns);

  float seed = hash11(cx);
  float speed = 0.10 + seed * 0.16;
  float t = fract(uTime * speed + seed * 7.13);
  float dropY = 1.0 - t;

  // Beaded head with a thin trail left behind it.
  float dy = vUv.y - dropY;
  float head = exp(-pow((dy) / 0.012, 2.0));
  float trail = step(0.0, dy) * exp(-dy * 7.0) * 0.35;

  float lateral = 0.5 + (hash11(cx + 3.7) - 0.5) * 0.55;
  float band = exp(-pow((fx - lateral) / 0.16, 2.0));

  float streak = (head + trail) * band;

  // Static condensation speckle so the glass never looks dry.
  float speckle = step(0.982, hash11(floor(vUv.x * 160.0) + floor(vUv.y * 220.0) * 31.0)) * 0.5;

  float alpha = clamp(streak + speckle, 0.0, 1.0) * uOpacity;
  if (alpha < 0.005) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`

function sheet(width, height, columns) {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColumns: { value: columns },
      uColor: { value: new THREE.Color(0xdff0ff) },
      uOpacity: { value: 0.5 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
  mesh.renderOrder = 4
  markAsEffect(mesh)
  return mesh
}

/** Rain sliding down the shop windows. */
export function createGlassRain(ctx) {
  const g = group('glass-rain')
  const bottom = S.floor + 0.18
  const top = S.floor + 2.28
  const height = top - bottom

  const front = sheet(S.maxX - S.minX - 0.4, height, 22)
  front.position.set((S.minX + S.maxX) / 2, (bottom + top) / 2, S.maxZ + 0.015)
  g.add(front)

  const side = sheet(2.3, height, 12)
  side.rotation.y = Math.PI / 2
  side.position.set(S.maxX + 0.015, (bottom + top) / 2, 0.2)
  g.add(side)

  const materials = [front.material, side.material]
  ctx.addUpdate((time) => {
    materials.forEach((material) => {
      material.uniforms.uTime.value = time
    })
  })

  return g
}

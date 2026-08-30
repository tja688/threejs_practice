import * as THREE from 'three'
import { rainStreakTexture } from '../core/materials.js'
import { markAsEffect } from '../core/layers.js'
import { makeRandom } from '../world/helpers.js'

const vertexShader = /* glsl */ `
attribute float aPhase;
attribute float aSpeed;
attribute float aScale;

uniform float uTime;
uniform float uTop;
uniform float uHeight;
uniform float uSize;
uniform vec2 uWind;

varying float vAlpha;

void main() {
  float fall = fract(aPhase + uTime * aSpeed);
  vec3 transformed = position;
  transformed.y = uTop - fall * uHeight;
  transformed.x += fall * uWind.x;
  transformed.z += fall * uWind.y;

  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * aScale * (190.0 / max(-mvPosition.z, 0.1));

  // Fade in at the top of the column and out as drops reach the ground.
  vAlpha = smoothstep(0.0, 0.05, fall) * smoothstep(-1.2, 1.4, transformed.y);
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uOpacity;

varying float vAlpha;

void main() {
  vec4 texel = texture2D(uTexture, gl_PointCoord);
  float alpha = texel.a * vAlpha * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`

/**
 * Falling rain as animated point sprites. One draw call, no CPU work per frame.
 */
export function createRain(ctx, options = {}) {
  const count = options.count ?? 3200
  const spread = options.spread ?? 26
  const top = options.top ?? 13
  const height = options.height ?? 15

  const random = makeRandom(9182734)
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const speeds = new Float32Array(count)
  const scales = new Float32Array(count)

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (random() - 0.5) * spread
    positions[i * 3 + 1] = 0
    positions[i * 3 + 2] = (random() - 0.5) * spread
    phases[i] = random()
    speeds[i] = 0.22 + random() * 0.16
    scales[i] = 0.65 + random() * 0.75
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4, 0), 30)

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: top },
      uHeight: { value: height },
      uSize: { value: options.size ?? 1.2 },
      uWind: { value: new THREE.Vector2(1.5, 0.7) },
      uTexture: { value: rainStreakTexture() },
      uColor: { value: new THREE.Color(0xbcd8f5) },
      uOpacity: { value: options.opacity ?? 0.34 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 5
  markAsEffect(points)

  ctx.addUpdate((time) => {
    material.uniforms.uTime.value = time
  })

  return points
}

import * as THREE from 'three'
import { markAsEffect } from '../core/layers.js'
import { group } from '../world/helpers.js'
import { LAYOUT, SIDEWALK_Y } from '../world/layout.js'

const MAX_LIGHTS = 8

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
#define MAX_LIGHTS ${MAX_LIGHTS}

uniform float uTime;
uniform vec2 uCamera;
uniform vec3 uLightPos[MAX_LIGHTS];
uniform vec3 uLightColor[MAX_LIGHTS];
uniform vec3 uLightParams[MAX_LIGHTS]; // strength, radius, unused
uniform vec3 uBaseColor;
uniform float uMode;      // 0 = thin sheen over the whole road, 1 = puddle
uniform float uOpacity;
uniform float uRippleAmount;

varying vec2 vUv;
varying vec3 vWorld;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Expanding rings, one per grid cell, staggered by a per-cell hash.
float ripples(vec2 p, float time) {
  float total = 0.0;
  for (int i = 0; i < 2; i++) {
    float scale = 1.7 + float(i) * 2.4;
    vec2 sp = p * scale + float(i) * 17.3;
    vec2 cell = floor(sp);
    vec2 f = fract(sp);
    float seed = hash21(cell + float(i) * 31.7);
    vec2 center = vec2(hash21(cell + 3.1), hash21(cell + 7.7));
    float phase = fract(time * (0.45 + seed * 0.35) + seed);
    float radius = phase * 0.55;
    float d = distance(f, center);
    float ring = exp(-pow((d - radius) * 46.0, 2.0)) * (1.0 - phase);
    total += ring;
  }
  return total;
}

void main() {
  vec3 color = uBaseColor;
  float reflection = 0.0;
  vec3 tint = vec3(0.0);

  for (int i = 0; i < MAX_LIGHTS; i++) {
    float strength = uLightParams[i].x;
    if (strength <= 0.001) continue;
    float radius = uLightParams[i].y;
    vec2 lightXZ = uLightPos[i].xz;
    vec2 delta = vWorld.xz - lightXZ;
    vec2 dir = normalize(uCamera - lightXZ + vec2(0.0001));
    float along = dot(delta, dir);
    float across = dot(delta, vec2(-dir.y, dir.x));
    float w = radius * 0.34;
    float l = radius * 1.9;
    float smear = exp(-(across * across) / (w * w)) * exp(-(along * along) / (l * l));
    // Wobble the reflection as if the surface were disturbed.
    smear *= 0.75 + 0.25 * sin(vWorld.z * 6.0 + vWorld.x * 4.0 + uTime * 1.4);
    reflection += smear * strength;
    tint += uLightColor[i] * smear * strength;
  }

  color += tint * 1.35;

  float ripple = ripples(vWorld.xz, uTime) * uRippleAmount;
  color += vec3(0.55, 0.68, 0.85) * ripple * 0.34;

  float alpha;
  if (uMode < 0.5) {
    alpha = clamp(reflection * 1.5, 0.0, 1.0) * uOpacity;
  } else {
    // Organic puddle outline.
    vec2 centered = (vUv - 0.5) * 2.0;
    float wobble = sin(atan(centered.y, centered.x) * 3.0 + hash21(floor(vWorld.xz * 0.5)) * 6.0) * 0.14;
    float mask = 1.0 - smoothstep(0.62 + wobble, 0.98 + wobble, length(centered));
    alpha = mask * uOpacity * (0.55 + reflection * 1.4 + ripple * 0.6);
  }

  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function makeUniforms(reflections, options) {
  const positions = []
  const colors = []
  const params = []
  for (let i = 0; i < MAX_LIGHTS; i += 1) {
    const source = reflections[i]
    positions.push(new THREE.Vector3(source ? source.x : 0, 0, source ? source.z : 0))
    colors.push(new THREE.Color(source ? source.color : 0x000000))
    params.push(new THREE.Vector3(source ? source.strength : 0, source ? source.radius : 1, 0))
  }
  return {
    uTime: { value: 0 },
    uCamera: { value: new THREE.Vector2(10, 10) },
    uLightPos: { value: positions },
    uLightColor: { value: colors },
    uLightParams: { value: params },
    uBaseColor: { value: new THREE.Color(options.baseColor) },
    uMode: { value: options.mode },
    uOpacity: { value: options.opacity },
    uRippleAmount: { value: options.ripple },
    toneMappingExposure: { value: 1 },
  }
}

/**
 * Wet ground: one large sheen that smears every light source along the asphalt,
 * plus a handful of puddles with rain rings.
 */
export function createWetGround(ctx) {
  const g = group('wet-ground')
  // Brightest sources first: only the first MAX_LIGHTS make it into the shader.
  const reflections = [...ctx.reflections].sort((a, b) => b.strength - a.strength).slice(0, MAX_LIGHTS)

  const materials = []

  const sheenMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: makeUniforms(reflections, {
      baseColor: 0x0a1020,
      mode: 0,
      opacity: 0.85,
      ripple: 0.0,
    }),
    transparent: true,
    depthWrite: false,
  })
  materials.push(sheenMaterial)

  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(LAYOUT.baseHalf * 2, LAYOUT.baseHalf * 2, 1, 1), sheenMaterial)
  sheen.rotation.x = -Math.PI / 2
  sheen.position.y = 0.02
  sheen.renderOrder = 2
  markAsEffect(sheen)
  g.add(sheen)

  // Puddles: [x, z, width, depth, y]
  const puddles = [
    [4.6, 1.4, 2.6, 2.0, 0.024],
    [7.2, -2.6, 3.0, 2.2, 0.024],
    [4.2, 6.4, 2.4, 2.6, 0.024],
    [6.0, 4.4, 3.4, 2.4, 0.024],
    [-1.4, 5.2, 2.8, 2.0, 0.024],
    [1.2, 2.35, 1.7, 1.2, SIDEWALK_Y + 0.028],
    [-2.2, 2.1, 1.5, 1.0, SIDEWALK_Y + 0.028],
    [-4.2, 1.9, 1.3, 0.9, SIDEWALK_Y + 0.028],
    [2.6, -1.1, 1.2, 1.6, SIDEWALK_Y + 0.028],
    [-6.8, 0.6, 2.0, 1.4, SIDEWALK_Y + 0.024],
    [3.5, -6.2, 2.2, 1.8, 0.024],
    [8.0, 7.4, 2.6, 2.2, 0.024],
  ]

  puddles.forEach(([x, z, w, d, y], i) => {
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: makeUniforms(reflections, {
        baseColor: 0x0b1222,
        mode: 1,
        opacity: 0.92,
        ripple: 1.0,
      }),
      transparent: true,
      depthWrite: false,
    })
    materials.push(material)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material)
    mesh.rotation.x = -Math.PI / 2
    mesh.rotation.z = i * 0.7
    mesh.position.set(x, y, z)
    mesh.renderOrder = 3
    markAsEffect(mesh)
    g.add(mesh)
  })

  const cameraXZ = new THREE.Vector2()
  ctx.addUpdate((time) => {
    cameraXZ.set(ctx.camera.position.x, ctx.camera.position.z)
    materials.forEach((material) => {
      material.uniforms.uTime.value = time
      material.uniforms.uCamera.value.copy(cameraXZ)
    })
  })

  return g
}

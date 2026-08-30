import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { EFFECT_LAYER } from './layers.js'

/**
 * Cel pipeline that cannot wipe the scene to white.
 *
 *  1. Beauty is always drawn straight to the canvas (the thing you look at).
 *  2. A half-res normal pass feeds a transparent overlay that only darkens
 *     detected edges. If that shader/FBO fails, the diorama is still visible.
 *
 * Depth textures are intentionally unused: an incomplete depth FBO is a
 * common reason a fullscreen blit samples the default white texture.
 */

const overlayVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`

const overlayFragment = /* glsl */ `
uniform sampler2D tNormal;
uniform vec2 uResolution;
uniform vec3 uOutlineColor;
uniform float uOutlineStrength;
uniform float uThickness;
uniform float uNormalBias;
uniform float uVignette;

varying vec2 vUv;

void main() {
  vec2 texel = uThickness / max(uResolution, vec2(1.0));

  vec3 n0 = texture2D(tNormal, vUv).rgb;
  vec3 nx1 = texture2D(tNormal, vUv + vec2(texel.x, 0.0)).rgb;
  vec3 nx2 = texture2D(tNormal, vUv - vec2(texel.x, 0.0)).rgb;
  vec3 ny1 = texture2D(tNormal, vUv + vec2(0.0, texel.y)).rgb;
  vec3 ny2 = texture2D(tNormal, vUv - vec2(0.0, texel.y)).rgb;
  float normalDelta = length(nx1 - n0) + length(nx2 - n0) + length(ny1 - n0) + length(ny2 - n0);
  float empty = step(length(n0), 0.001);
  float edge = smoothstep(uNormalBias, uNormalBias * 2.4, normalDelta);
  edge *= 1.0 - empty;
  edge = clamp(edge * uOutlineStrength, 0.0, 1.0);

  vec2 centered = vUv - 0.5;
  float vignette = dot(centered, centered) * uVignette;

  // Premultiplied dark ink + slight vignette. Alpha 0 where there is no edge
  // so a broken draw cannot replace the scene with white.
  vec3 ink = uOutlineColor;
  float alpha = max(edge, vignette * 0.35);
  gl_FragColor = vec4(ink * alpha, alpha);
}
`

export class ToonOutlinePipeline {
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.clearColor = new THREE.Color(options.clearColor ?? 0x05070f)
    this.enabled = true

    this.normalMaterial = new THREE.MeshNormalMaterial()
    this.normalClearColor = new THREE.Color(0x000000)

    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    const width = Math.max(1, size.x)
    const height = Math.max(1, size.y)

    this.normalTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    })
    this.normalTarget.texture.colorSpace = THREE.NoColorSpace

    this.overlayMaterial = new THREE.ShaderMaterial({
      vertexShader: overlayVertex,
      fragmentShader: overlayFragment,
      uniforms: {
        tNormal: { value: this.normalTarget.texture },
        uResolution: { value: new THREE.Vector2(width, height) },
        uOutlineColor: { value: new THREE.Color(options.outlineColor ?? 0x0a0e1c) },
        uOutlineStrength: { value: options.outlineStrength ?? 0.92 },
        uThickness: { value: options.thickness ?? 1.15 },
        uNormalBias: { value: options.normalBias ?? 0.32 },
        uVignette: { value: options.vignette ?? 0.55 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.NormalBlending,
      premultipliedAlpha: true,
    })

    this.quad = new FullScreenQuad(this.overlayMaterial)
  }

  setSize(width, height) {
    const pixelRatio = this.renderer.getPixelRatio()
    const w = Math.max(1, Math.floor(Math.max(width, 1) * pixelRatio))
    const h = Math.max(1, Math.floor(Math.max(height, 1) * pixelRatio))
    const nw = Math.max(1, Math.floor(w * 0.5))
    const nh = Math.max(1, Math.floor(h * 0.5))
    this.normalTarget.setSize(nw, nh)
    this.overlayMaterial.uniforms.uResolution.value.set(nw, nh)
  }

  /**
   * @param {{ outlines?: boolean }} [options]
   */
  render(options = {}) {
    const outlines = options.outlines !== false && this.enabled
    const { renderer, scene, camera } = this
    const previousAutoClear = renderer.autoClear
    const previousTarget = renderer.getRenderTarget()

    camera.layers.enable(EFFECT_LAYER)
    scene.overrideMaterial = null
    renderer.setClearColor(this.clearColor, 1)
    renderer.setRenderTarget(null)
    renderer.autoClear = true
    renderer.clear()
    renderer.render(scene, camera)

    if (!outlines) {
      renderer.autoClear = previousAutoClear
      renderer.setRenderTarget(previousTarget)
      return
    }

    camera.layers.disable(EFFECT_LAYER)
    scene.overrideMaterial = this.normalMaterial
    renderer.setClearColor(this.normalClearColor, 1)
    renderer.setRenderTarget(this.normalTarget)
    renderer.clear()
    renderer.render(scene, camera)

    scene.overrideMaterial = null
    camera.layers.enable(EFFECT_LAYER)

    renderer.setRenderTarget(null)
    renderer.autoClear = false
    this.quad.render(renderer)

    renderer.autoClear = previousAutoClear
    renderer.setRenderTarget(previousTarget)
  }

  disableOutlines() {
    this.enabled = false
  }

  dispose() {
    this.normalTarget.dispose()
    this.overlayMaterial.dispose()
    this.quad.dispose()
    this.normalMaterial.dispose()
  }
}

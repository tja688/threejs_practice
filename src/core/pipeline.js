import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { EFFECT_LAYER } from './layers.js'

/**
 * Cel outline on top of a scene that is already on the canvas.
 *
 * The beauty pass always draws straight to the drawing buffer. A half-res
 * normal pass then drives a transparent overlay that only writes ink on
 * detected edges. Non-edge fragments are discarded so a blending/alpha
 * mismatch cannot replace the diorama with black or white.
 *
 * This matters because the canvas is created with `alpha: false`: writing
 * `vec4(0,0,0,0)` without blending still stomps RGB to black. The original
 * composite blit had the opposite failure mode — an opaque fullscreen
 * triangle sampling Three's default 1×1 white texture.
 */

const overlayVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
  float alpha = max(edge, vignette * 0.35);

  if (alpha < 0.02) discard;

  gl_FragColor = vec4(uOutlineColor, alpha);
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
      fog: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      premultipliedAlpha: false,
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
    const previousClear = renderer.getClearColor(new THREE.Color())
    const previousAlpha = renderer.getClearAlpha()

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
      renderer.setClearColor(previousClear, previousAlpha)
      return
    }

    camera.layers.disable(EFFECT_LAYER)
    scene.overrideMaterial = this.normalMaterial
    renderer.setClearColor(this.normalClearColor, 1)
    renderer.setRenderTarget(this.normalTarget)

    const gl = renderer.getContext()
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      this.enabled = false
      scene.overrideMaterial = null
      camera.layers.enable(EFFECT_LAYER)
      renderer.setRenderTarget(null)
      renderer.autoClear = previousAutoClear
      renderer.setClearColor(previousClear, previousAlpha)
      return
    }

    renderer.clear()
    renderer.render(scene, camera)

    scene.overrideMaterial = null
    camera.layers.enable(EFFECT_LAYER)

    renderer.setRenderTarget(null)
    renderer.autoClear = false
    this.quad.render(renderer)

    renderer.autoClear = previousAutoClear
    renderer.setRenderTarget(previousTarget)
    renderer.setClearColor(previousClear, previousAlpha)
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

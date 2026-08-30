import * as THREE from 'three'
import { EFFECT_LAYER } from './layers.js'

/**
 * Two-buffer cel pipeline.
 *
 *  1. normal + depth pass  : the scene rendered with MeshNormalMaterial,
 *                            effects layer excluded.
 *  2. beauty pass          : the scene as-is.
 *  3. composite            : sobel-ish edge detection over depth + normals gives
 *                            a clean ink outline, plus a soft vignette.
 */

const compositeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const compositeFragment = /* glsl */ `
#include <packing>

uniform sampler2D tDiffuse;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
uniform vec3 uOutlineColor;
uniform float uOutlineStrength;
uniform float uThickness;
uniform float uDepthBias;
uniform float uNormalBias;
uniform float uVignette;
uniform float toneMappingExposure;

varying vec2 vUv;

float linearDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).x;
  if (z >= 1.0) return 1.0;
  float viewZ = perspectiveDepthToViewZ(z, uNear, uFar);
  return viewZToOrthographicDepth(viewZ, uNear, uFar);
}

void main() {
  vec4 base = texture2D(tDiffuse, vUv);
  vec2 texel = uThickness / uResolution;

  float d0 = linearDepth(vUv);
  float dx1 = linearDepth(vUv + vec2(texel.x, 0.0));
  float dx2 = linearDepth(vUv - vec2(texel.x, 0.0));
  float dy1 = linearDepth(vUv + vec2(0.0, texel.y));
  float dy2 = linearDepth(vUv - vec2(0.0, texel.y));
  float depthDelta = abs(dx1 - d0) + abs(dx2 - d0) + abs(dy1 - d0) + abs(dy2 - d0);
  float relative = depthDelta / max(d0, 0.02);
  float depthEdge = smoothstep(uDepthBias, uDepthBias * 3.0, relative);

  vec3 n0 = texture2D(tNormal, vUv).rgb;
  vec3 nx1 = texture2D(tNormal, vUv + vec2(texel.x, 0.0)).rgb;
  vec3 nx2 = texture2D(tNormal, vUv - vec2(texel.x, 0.0)).rgb;
  vec3 ny1 = texture2D(tNormal, vUv + vec2(0.0, texel.y)).rgb;
  vec3 ny2 = texture2D(tNormal, vUv - vec2(0.0, texel.y)).rgb;
  float normalDelta = length(nx1 - n0) + length(nx2 - n0) + length(ny1 - n0) + length(ny2 - n0);
  float normalEdge = smoothstep(uNormalBias, uNormalBias * 2.4, normalDelta);
  normalEdge *= step(d0, 0.999);

  float edge = clamp(max(depthEdge, normalEdge * 0.85), 0.0, 1.0) * uOutlineStrength;

  vec3 color = base.rgb;
  vec3 ink = mix(uOutlineColor, color * 0.3, 0.22);
  color = mix(color, ink, edge);

  vec2 centered = vUv - 0.5;
  color *= 1.0 - dot(centered, centered) * uVignette;

  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export class ToonOutlinePipeline {
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.clearColor = new THREE.Color(options.clearColor ?? 0x05070f)

    this.normalMaterial = new THREE.MeshNormalMaterial()
    this.normalClearColor = new THREE.Color(0x000000)

    const size = renderer.getDrawingBufferSize(new THREE.Vector2())

    this.beautyTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    })
    this.beautyTarget.texture.colorSpace = THREE.LinearSRGBColorSpace

    const depthTexture = new THREE.DepthTexture(size.x, size.y)
    depthTexture.format = THREE.DepthFormat
    depthTexture.type = THREE.UnsignedIntType
    depthTexture.minFilter = THREE.NearestFilter
    depthTexture.magFilter = THREE.NearestFilter

    this.normalTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
      depthTexture,
    })
    this.normalTarget.texture.colorSpace = THREE.LinearSRGBColorSpace

    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: compositeVertex,
      fragmentShader: compositeFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDiffuse: { value: this.beautyTarget.texture },
        tNormal: { value: this.normalTarget.texture },
        tDepth: { value: depthTexture },
        uResolution: { value: new THREE.Vector2(size.x, size.y) },
        uNear: { value: camera.near },
        uFar: { value: camera.far },
        uOutlineColor: { value: new THREE.Color(options.outlineColor ?? 0x0a0e1c) },
        uOutlineStrength: { value: options.outlineStrength ?? 0.92 },
        uThickness: { value: options.thickness ?? 1.15 },
        uDepthBias: { value: options.depthBias ?? 0.012 },
        uNormalBias: { value: options.normalBias ?? 0.32 },
        uVignette: { value: options.vignette ?? 0.55 },
        toneMappingExposure: { value: renderer.toneMappingExposure },
      },
    })

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compositeMaterial)
    this.quad.frustumCulled = false
    this.quadScene = new THREE.Scene()
    this.quadScene.add(this.quad)
    this.quadCamera = new THREE.Camera()
  }

  setSize(width, height) {
    const pixelRatio = this.renderer.getPixelRatio()
    const w = Math.max(1, Math.floor(width * pixelRatio))
    const h = Math.max(1, Math.floor(height * pixelRatio))
    // Outline edges are soft; half-res normals keep ink look with far less fill-rate cost.
    const nw = Math.max(1, Math.floor(w * 0.5))
    const nh = Math.max(1, Math.floor(h * 0.5))
    this.beautyTarget.setSize(w, h)
    this.normalTarget.setSize(nw, nh)
    this.compositeMaterial.uniforms.uResolution.value.set(nw, nh)
  }

  /**
   * @param {{ outlines?: boolean }} [options]
   * When outlines are disabled, renders the beauty pass straight to the canvas
   * (used for the first couple of frames so the diorama appears immediately).
   */
  render(options = {}) {
    const outlines = options.outlines !== false
    const { renderer, scene, camera } = this
    const previousClear = renderer.getClearColor(new THREE.Color())
    const previousAlpha = renderer.getClearAlpha()

    renderer.setClearColor(this.clearColor, 1)

    if (!outlines) {
      camera.layers.enable(EFFECT_LAYER)
      scene.overrideMaterial = null
      renderer.setRenderTarget(null)
      renderer.clear()
      renderer.render(scene, camera)
      renderer.setClearColor(previousClear, previousAlpha)
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
    renderer.setClearColor(this.clearColor, 1)
    renderer.setRenderTarget(this.beautyTarget)
    renderer.clear()
    renderer.render(scene, camera)

    this.compositeMaterial.uniforms.uNear.value = camera.near
    this.compositeMaterial.uniforms.uFar.value = camera.far
    this.compositeMaterial.uniforms.toneMappingExposure.value = renderer.toneMappingExposure

    renderer.setRenderTarget(null)
    renderer.render(this.quadScene, this.quadCamera)

    renderer.setClearColor(previousClear, previousAlpha)
  }

  dispose() {
    this.beautyTarget.dispose()
    this.normalTarget.dispose()
    this.compositeMaterial.dispose()
    this.quad.geometry.dispose()
    this.normalMaterial.dispose()
  }
}

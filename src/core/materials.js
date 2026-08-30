import * as THREE from 'three'

/**
 * Shared material helpers for the cel-shaded look.
 * Materials are cached by key so the whole diorama compiles only a handful of
 * shader programs.
 */

let gradientTexture = null

function getGradientMap() {
  if (gradientTexture) return gradientTexture
  // Four hard steps: deep shadow, shadow, mid, light.
  const data = new Uint8Array([54, 108, 186, 255])
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  gradientTexture = tex
  return tex
}

const cache = new Map()

function cached(key, factory) {
  let material = cache.get(key)
  if (!material) {
    material = factory()
    cache.set(key, material)
  }
  return material
}

/** Cel-shaded surface material. */
export function toon(color, options = {}) {
  const {
    emissive = 0x000000,
    emissiveIntensity = 1,
    transparent = false,
    opacity = 1,
    side = THREE.FrontSide,
    map = null,
    fresh = false,
  } = options

  const key = `toon|${color}|${emissive}|${emissiveIntensity}|${transparent}|${opacity}|${side}|${map ? map.uuid : 0}`
  const build = () =>
    new THREE.MeshToonMaterial({
      color,
      emissive,
      emissiveIntensity,
      transparent,
      opacity,
      side,
      map,
      gradientMap: getGradientMap(),
    })

  return fresh ? build() : cached(key, build)
}

/** Flat, self-lit material used for signs, lamps and light boxes. */
export function unlit(color, options = {}) {
  const { transparent = false, opacity = 1, side = THREE.FrontSide, map = null, fresh = false } = options
  const key = `unlit|${color}|${transparent}|${opacity}|${side}|${map ? map.uuid : 0}`
  const build = () =>
    new THREE.MeshBasicMaterial({ color, transparent, opacity, side, map, toneMapped: true })
  return fresh ? build() : cached(key, build)
}

/** Window glass: barely there, so the interior stays readable. */
export function glass(options = {}) {
  const { color = 0x9ad4ff, opacity = 0.13 } = options
  return cached(`glass|${color}|${opacity}`, () =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
}

let glowTexture = null

/** Soft radial falloff used for neon bleed and lamp halos. */
export function getGlowTexture() {
  if (glowTexture) return glowTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0.0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.16)')
  gradient.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  glowTexture = new THREE.CanvasTexture(canvas)
  glowTexture.colorSpace = THREE.SRGBColorSpace
  return glowTexture
}

/** Additive halo sprite. Cheap stand-in for bloom. */
export function makeGlow(color, size, opacity = 0.6) {
  const material = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(size, size, 1)
  return sprite
}

/** Additive quad halo, for glows that should stay flat against a wall. */
export function makeGlowPlane(color, width, height, opacity = 0.5) {
  const material = new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
}

const textureCache = new Map()

function canvasTexture(key, width, height, draw) {
  if (textureCache.has(key)) return textureCache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  draw(ctx, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  textureCache.set(key, texture)
  return texture
}

function hashRandom(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/**
 * Abstract poster art: colour field, headline bars and a product blob.
 * Font-independent on purpose, it reads as Japanese signage at model scale.
 */
export function posterTexture(seed, palette) {
  return canvasTexture(`poster|${seed}`, 128, 180, (ctx, w, h) => {
    const rnd = hashRandom(seed * 7919 + 13)
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = palette.accent
    ctx.fillRect(0, 0, w, h * 0.22)

    ctx.globalAlpha = 0.9
    ctx.fillStyle = palette.blob
    ctx.beginPath()
    ctx.ellipse(w * 0.5, h * 0.52, w * 0.3, h * 0.19, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // headline glyph blocks
    ctx.fillStyle = palette.ink
    for (let i = 0; i < 4; i += 1) {
      const bw = w * (0.1 + rnd() * 0.08)
      ctx.fillRect(w * 0.1 + i * w * 0.2, h * 0.06, bw, h * 0.1)
    }
    // body copy bars
    ctx.fillStyle = palette.ink
    ctx.globalAlpha = 0.75
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(w * 0.14, h * (0.74 + i * 0.045), w * (0.3 + rnd() * 0.42), h * 0.022)
    }
    ctx.globalAlpha = 1
    ctx.strokeStyle = palette.ink
    ctx.lineWidth = 3
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3)
  })
}

/** Shelf goods sheet: rows of colourful packages seen through the window. */
export function goodsTexture(seed) {
  return canvasTexture(`goods|${seed}`, 128, 64, (ctx, w, h) => {
    const rnd = hashRandom(seed * 104729 + 7)
    ctx.fillStyle = '#efe9dd'
    ctx.fillRect(0, 0, w, h)
    const hues = [12, 32, 48, 96, 200, 220, 340]
    const cols = 10
    for (let i = 0; i < cols; i += 1) {
      const hue = hues[Math.floor(rnd() * hues.length)]
      ctx.fillStyle = `hsl(${hue}, ${45 + rnd() * 35}%, ${55 + rnd() * 25}%)`
      const cw = w / cols
      ctx.fillRect(i * cw + 1, h * 0.1, cw - 2, h * 0.85)
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.fillRect(i * cw + 2, h * 0.3, cw - 4, h * 0.12)
    }
  })
}

/** Magazine covers, seen edge-on from the street. */
export function magazineTexture(seed) {
  return canvasTexture(`mag|${seed}`, 96, 128, (ctx, w, h) => {
    const rnd = hashRandom(seed * 31337 + 3)
    ctx.fillStyle = `hsl(${Math.floor(rnd() * 360)}, 55%, 68%)`
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(w * 0.08, h * 0.06, w * 0.84, h * 0.16)
    ctx.fillStyle = `hsl(${Math.floor(rnd() * 360)}, 60%, 45%)`
    ctx.beginPath()
    ctx.ellipse(w * 0.5, h * 0.58, w * 0.3, h * 0.24, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(20,20,30,0.6)'
    for (let i = 0; i < 3; i += 1) ctx.fillRect(w * 0.12, h * (0.82 + i * 0.05), w * (0.3 + rnd() * 0.5), h * 0.02)
  })
}

/** Rain streak sprite used by the falling rain particles. */
export function rainStreakTexture() {
  return canvasTexture('rain-streak', 32, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.35, 'rgba(210,235,255,0.75)')
    gradient.addColorStop(0.75, 'rgba(255,255,255,0.95)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(w * 0.42, 0, w * 0.16, h)
  })
}

export function disposeMaterialCaches() {
  cache.forEach((material) => material.dispose())
  cache.clear()
  textureCache.forEach((texture) => texture.dispose())
  textureCache.clear()
}

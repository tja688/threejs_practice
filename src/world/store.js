import * as THREE from 'three'
import { PALETTE } from '../core/palette.js'
import { glass, makeGlow, makeGlowPlane, posterTexture, toon, unlit } from '../core/materials.js'
import { markAsEffect } from '../core/layers.js'
import { LAYOUT } from './layout.js'
import { box, boxBetween, cylinder, group } from './helpers.js'

const S = LAYOUT.store
const FLOOR = S.floor
const TOP = FLOOR + S.wallHeight // 3.41
const PARAPET = TOP + S.parapet
const GLASS_BOTTOM = FLOOR + 0.16
const GLASS_TOP = FLOOR + 2.3
const DOOR_HALF = 0.6
const DOOR_TOP = FLOOR + 2.0

function shell() {
  const g = group('store-shell')
  const wall = toon(PALETTE.storeWall)
  const wallShade = toon(PALETTE.storeWallShade)
  const trim = toon(PALETTE.storeTrim)

  // Back and left walls, plus the solid rear part of the right wall.
  g.add(boxBetween(S.minX, S.maxX, FLOOR - 0.36, TOP, S.minZ, S.minZ + 0.16, wall))
  g.add(boxBetween(S.minX, S.minX + 0.16, FLOOR - 0.36, TOP, S.minZ, S.maxZ, wall))
  g.add(boxBetween(S.maxX - 0.16, S.maxX, FLOOR - 0.36, TOP, S.minZ, -1.15, wall))

  // Corner posts of the glazed facade.
  g.add(boxBetween(S.minX, S.minX + 0.28, FLOOR, TOP, S.maxZ - 0.18, S.maxZ, wallShade))
  g.add(boxBetween(S.maxX - 0.28, S.maxX, FLOOR, TOP, S.maxZ - 0.18, S.maxZ, wallShade))
  g.add(boxBetween(S.maxX - 0.18, S.maxX, FLOOR, TOP, -1.3, -1.1, wallShade))

  // Sill under the glazing and header above it.
  g.add(boxBetween(S.minX, S.maxX, FLOOR - 0.36, GLASS_BOTTOM, S.maxZ - 0.16, S.maxZ, trim))
  g.add(boxBetween(S.minX, S.maxX, GLASS_TOP, TOP, S.maxZ - 0.16, S.maxZ, wall))
  g.add(boxBetween(S.maxX - 0.16, S.maxX, FLOOR - 0.36, GLASS_BOTTOM, -1.15, S.maxZ, trim))
  g.add(boxBetween(S.maxX - 0.16, S.maxX, GLASS_TOP, TOP, -1.15, S.maxZ, wall))

  // Brand stripe and small light boxes on the band above the glazing.
  g.add(boxBetween(S.minX, S.maxX, GLASS_TOP + 0.42, GLASS_TOP + 0.5, S.maxZ, S.maxZ + 0.02, unlit(PALETTE.brandGreen)))
  g.add(boxBetween(S.maxX, S.maxX + 0.02, GLASS_TOP + 0.42, GLASS_TOP + 0.5, -1.15, S.maxZ, unlit(PALETTE.brandGreen)))
  for (let i = 0; i < 3; i += 1) {
    const x = -2.6 + i * 1.35
    g.add(boxBetween(x, x + 0.6, GLASS_TOP + 0.12, GLASS_TOP + 0.36, S.maxZ, S.maxZ + 0.03, unlit(0xfff3dc)))
  }
  for (let i = 0; i < 2; i += 1) {
    const z = -0.7 + i * 1.2
    g.add(boxBetween(S.maxX, S.maxX + 0.03, GLASS_TOP + 0.12, GLASS_TOP + 0.36, z, z + 0.55, unlit(0xfff3dc)))
  }

  // Roof deck, parapet and a service door on the back wall.
  g.add(boxBetween(S.minX, S.maxX, TOP, TOP + 0.14, S.minZ, S.maxZ, toon(PALETTE.roofDeck)))
  const p = 0.14
  g.add(boxBetween(S.minX, S.maxX, TOP, PARAPET, S.maxZ - p, S.maxZ, wall))
  g.add(boxBetween(S.minX, S.maxX, TOP, PARAPET, S.minZ, S.minZ + p, wall))
  g.add(boxBetween(S.minX, S.minX + p, TOP, PARAPET, S.minZ, S.maxZ, wall))
  g.add(boxBetween(S.maxX - p, S.maxX, TOP, PARAPET, S.minZ, S.maxZ, wall))

  const backDoor = boxBetween(-2.6, -1.7, FLOOR, FLOOR + 2.0, S.minZ - 0.06, S.minZ, toon(PALETTE.metalDark))
  g.add(backDoor)

  // Side elevation: downpipe, meter box, condenser and a hanging banner.
  const pipe = cylinder(0.055, 0.055, TOP - LAYOUT.curbHeight, toon(PALETTE.metalDark), 8)
  pipe.position.set(S.maxX + 0.07, LAYOUT.curbHeight + (TOP - LAYOUT.curbHeight) / 2, S.minZ + 0.35)
  g.add(pipe)
  g.add(box(0.14, 0.46, 0.34, toon(PALETTE.metal), [S.maxX + 0.09, FLOOR + 1.55, -2.95]))
  const condenser = group('side-ac')
  condenser.add(box(0.36, 0.52, 0.74, toon(PALETTE.metal), [0, 0, 0]))
  condenser.add(box(0.04, 0.34, 0.34, toon(PALETTE.metalDark), [0.19, 0, 0]))
  condenser.position.set(S.maxX + 0.2, FLOOR + 0.9, -2.2)
  g.add(condenser)
  const banner = boxBetween(S.maxX + 0.02, S.maxX + 0.06, FLOOR + 1.1, FLOOR + 2.3, -1.75, -1.35, unlit(0xf2f6fb))
  banner.castShadow = false
  g.add(banner)
  g.add(boxBetween(S.maxX + 0.01, S.maxX + 0.07, FLOOR + 1.75, FLOOR + 1.95, -1.72, -1.38, unlit(PALETTE.brandOrange)))
  g.add(boxBetween(S.maxX + 0.01, S.maxX + 0.07, FLOOR + 1.35, FLOOR + 1.55, -1.72, -1.38, unlit(PALETTE.brandGreen)))

  // Rooftop plant.
  for (let i = 0; i < 2; i += 1) {
    const unit = group('roof-ac')
    unit.add(box(0.9, 0.62, 0.44, toon(PALETTE.metal), [0, 0.31, 0]))
    const fan = cylinder(0.22, 0.22, 0.06, toon(PALETTE.metalDark), 12)
    fan.rotation.x = Math.PI / 2
    fan.position.set(0, 0.34, 0.24)
    unit.add(fan)
    unit.position.set(-2.5 + i * 1.25, TOP + 0.14, -2.1)
    g.add(unit)
  }
  const duct = cylinder(0.16, 0.16, 0.7, toon(PALETTE.metal), 10)
  duct.position.set(0.4, TOP + 0.5, -2.4)
  g.add(duct)
  const antenna = cylinder(0.03, 0.03, 1.3, toon(PALETTE.metalDark), 6)
  antenna.position.set(1.0, TOP + 0.8, -2.9)
  g.add(antenna)

  return g
}

function glazing() {
  const g = group('store-glazing')
  const mullion = toon(PALETTE.storeTrim)
  const glassMaterial = glass({ opacity: 0.1 })

  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(S.maxX - S.minX - 0.56, GLASS_TOP - GLASS_BOTTOM),
    glassMaterial,
  )
  front.position.set((S.minX + S.maxX) / 2, (GLASS_BOTTOM + GLASS_TOP) / 2, S.maxZ - 0.08)
  markAsEffect(front)
  g.add(front)

  const side = new THREE.Mesh(
    new THREE.PlaneGeometry(S.maxZ - 0.18 - -1.1, GLASS_TOP - GLASS_BOTTOM),
    glassMaterial,
  )
  side.rotation.y = Math.PI / 2
  side.position.set(S.maxX - 0.08, (GLASS_BOTTOM + GLASS_TOP) / 2, (-1.1 + S.maxZ - 0.18) / 2)
  markAsEffect(side)
  g.add(side)

  // Vertical mullions on the front, skipping the doorway.
  const posts = [-3.0, -2.05, -1.1, DOOR_HALF + 0.02, 1.12]
  posts.forEach((x) => {
    g.add(boxBetween(x - 0.05, x + 0.05, GLASS_BOTTOM, GLASS_TOP, S.maxZ - 0.14, S.maxZ - 0.02, mullion))
  })
  const sidePosts = [-1.0, 0.05, 1.05]
  sidePosts.forEach((z) => {
    g.add(boxBetween(S.maxX - 0.14, S.maxX - 0.02, GLASS_BOTTOM, GLASS_TOP, z - 0.05, z + 0.05, mullion))
  })
  // Doorway frame.
  g.add(boxBetween(-DOOR_HALF - 0.08, DOOR_HALF + 0.08, DOOR_TOP, DOOR_TOP + 0.12, S.maxZ - 0.16, S.maxZ, mullion))
  g.add(boxBetween(-DOOR_HALF - 0.08, DOOR_HALF + 0.08, FLOOR - 0.36, FLOOR + 0.02, S.maxZ - 0.16, S.maxZ, mullion))

  return g
}

function automaticDoor(ctx) {
  const g = group('auto-door')
  const frame = toon(PALETTE.storeTrim)
  const pane = glass({ opacity: 0.16 })

  const panels = [-1, 1].map((dir) => {
    const panel = group('door-panel')
    const w = DOOR_HALF
    const h = DOOR_TOP - FLOOR - 0.04
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, h - 0.12), pane)
    sheet.position.set(0, 0, 0.005)
    markAsEffect(sheet)
    panel.add(sheet)
    panel.add(boxBetween(-w / 2, -w / 2 + 0.05, -h / 2, h / 2, -0.03, 0.03, frame))
    panel.add(boxBetween(w / 2 - 0.05, w / 2, -h / 2, h / 2, -0.03, 0.03, frame))
    panel.add(boxBetween(-w / 2, w / 2, h / 2 - 0.05, h / 2, -0.03, 0.03, frame))
    panel.add(boxBetween(-w / 2, w / 2, -h / 2, -h / 2 + 0.09, -0.03, 0.03, frame))
    // A single mid rail with the usual warning sticker.
    panel.add(boxBetween(-w / 2, w / 2, -0.02, 0.03, -0.02, 0.02, unlit(PALETTE.brandOrange)))
    panel.position.set(dir * (w / 2), FLOOR + 0.02 + h / 2, S.maxZ - 0.09)
    panel.userData.dynamic = true
    return { panel, dir, closedX: dir * (w / 2), openX: dir * (w / 2 + w - 0.02) }
  })
  panels.forEach(({ panel }) => g.add(panel))

  // Warm light spilling out of the doorway.
  const spill = new THREE.PointLight(PALETTE.interiorWarm, 0, 4.6, 2)
  spill.position.set(0, FLOOR + 1.1, S.maxZ + 0.35)
  g.add(spill)

  const spillGlow = makeGlowPlane(0xffd9a4, 2.6, 2.4, 0.0)
  spillGlow.position.set(0, FLOOR + 0.9, S.maxZ + 0.02)
  markAsEffect(spillGlow)
  g.add(spillGlow)

  let phase = 0 // 0 closed, 1 opening, 2 held, 3 closing
  let timer = 4
  let openness = 0

  ctx.addUpdate((_, delta) => {
    timer -= delta
    if (phase === 0 && timer <= 0) {
      phase = 1
      timer = 0
    } else if (phase === 1) {
      openness = Math.min(1, openness + delta * 1.6)
      if (openness >= 1) {
        phase = 2
        timer = 2.4
      }
    } else if (phase === 2 && timer <= 0) {
      phase = 3
    } else if (phase === 3) {
      openness = Math.max(0, openness - delta * 1.3)
      if (openness <= 0) {
        phase = 0
        timer = 7 + Math.random() * 7
      }
    }
    const eased = openness * openness * (3 - 2 * openness)
    panels.forEach(({ panel, closedX, openX }) => {
      panel.position.x = THREE.MathUtils.lerp(closedX, openX, eased)
    })
    spill.intensity = 0.55 + eased * 1.35
    spillGlow.material.opacity = 0.1 + eased * 0.3
  })

  ctx.addReflection({ x: 0, z: S.maxZ + 0.5, color: 0xffcf94, strength: 0.5, radius: 1.5 })
  return g
}

function awning(ctx) {
  const g = group('awning')
  const shellMaterial = toon(PALETTE.awning)
  const stripe = toon(PALETTE.awningStripe)
  const y = LAYOUT.awning.height
  const outZ = S.maxZ + LAYOUT.awning.depth
  const outX = S.maxX + LAYOUT.awning.depth

  // Canopy over the entrance and around the corner.
  g.add(boxBetween(S.minX - 0.08, outX, y, y + 0.12, S.maxZ, outZ, shellMaterial))
  g.add(boxBetween(S.maxX, outX, y, y + 0.12, -1.3, S.maxZ, shellMaterial))
  // Fascia.
  g.add(boxBetween(S.minX - 0.08, outX, y - 0.2, y, outZ - 0.1, outZ, stripe))
  g.add(boxBetween(outX - 0.1, outX, y - 0.2, y, -1.3, outZ, stripe))
  // Brand stripe on the fascia.
  g.add(boxBetween(S.minX - 0.08, outX, y - 0.16, y - 0.1, outZ - 0.11, outZ - 0.095, unlit(PALETTE.brandGreen)))
  g.add(boxBetween(outX - 0.11, outX - 0.095, y - 0.16, y - 0.1, -1.3, outZ, unlit(PALETTE.brandGreen)))

  // Recessed strip lights under the canopy.
  const lightStrip = unlit(0xfff2d6)
  const strip1 = boxBetween(S.minX, S.maxX, y - 0.02, y, S.maxZ + 0.45, S.maxZ + 0.62, lightStrip)
  const strip2 = boxBetween(S.maxX + 0.45, S.maxX + 0.62, y - 0.02, y, -1.2, S.maxZ, lightStrip)
  strip1.castShadow = false
  strip2.castShadow = false
  g.add(strip1, strip2)

  const halo1 = makeGlowPlane(0xffe2b0, 4.8, 1.4, 0.3)
  halo1.rotation.x = Math.PI / 2
  halo1.position.set(-1.0, y - 0.08, S.maxZ + 0.55)
  const halo2 = makeGlowPlane(0xffe2b0, 1.4, 2.8, 0.28)
  halo2.rotation.x = Math.PI / 2
  halo2.position.set(S.maxX + 0.55, y - 0.08, 0.1)
  markAsEffect(halo1)
  markAsEffect(halo2)
  g.add(halo1, halo2)

  // Slim posts holding the canopy edge.
  const post = toon(PALETTE.metalDark)
  ;[
    [S.minX + 0.1, outZ - 0.15],
    [outX - 0.15, outZ - 0.15],
    [outX - 0.15, -1.15],
  ].forEach(([x, z]) => {
    const p = cylinder(0.055, 0.055, y - 0.2, post, 8)
    p.position.set(x, LAYOUT.curbHeight + (y - 0.2) / 2, z)
    g.add(p)
  })

  ctx.addReflection({ x: -1.0, z: S.maxZ + 0.8, color: 0xffd9a4, strength: 0.42, radius: 2.2 })
  return g
}

function signBand(ctx) {
  const g = group('sign-band')
  const faceMaterial = unlit(PALETTE.signWhite, { fresh: true })
  const y0 = TOP + 0.06
  const y1 = PARAPET - 0.06

  const front = boxBetween(S.minX - 0.04, S.maxX + 0.04, y0, y1, S.maxZ + 0.02, S.maxZ + 0.08, faceMaterial)
  const side = boxBetween(S.maxX + 0.02, S.maxX + 0.08, y0, y1, S.minZ + 0.6, S.maxZ + 0.08, faceMaterial)
  front.castShadow = false
  side.castShadow = false
  g.add(front, side)

  // Green / orange / red band, the universal konbini livery.
  const stripes = [PALETTE.brandGreen, PALETTE.brandOrange, PALETTE.brandRed]
  stripes.forEach((color, i) => {
    const h = 0.07
    const yy = y0 + 0.06 + i * (h + 0.02)
    g.add(boxBetween(S.minX - 0.05, S.maxX + 0.05, yy, yy + h, S.maxZ + 0.081, S.maxZ + 0.09, unlit(color)))
    g.add(boxBetween(S.maxX + 0.081, S.maxX + 0.09, yy, yy + h, S.minZ + 0.6, S.maxZ + 0.09, unlit(color)))
  })

  // Logo blocks standing in for the shop name.
  const logo = unlit(PALETTE.brandGreen)
  for (let i = 0; i < 5; i += 1) {
    const w = 0.3
    const x = -2.0 + i * 0.44
    g.add(boxBetween(x, x + w, y0 + 0.3, y1 - 0.06, S.maxZ + 0.081, S.maxZ + 0.095, logo))
  }
  for (let i = 0; i < 3; i += 1) {
    const z = -0.3 + i * 0.44
    g.add(boxBetween(S.maxX + 0.081, S.maxX + 0.095, y0 + 0.3, y1 - 0.06, z, z + 0.3, logo))
  }

  const glowFront = makeGlowPlane(0xfff0cf, 6.4, 1.9, 0.42)
  glowFront.position.set((S.minX + S.maxX) / 2, (y0 + y1) / 2, S.maxZ + 0.2)
  const glowSide = makeGlowPlane(0xfff0cf, 5.2, 1.9, 0.36)
  glowSide.rotation.y = Math.PI / 2
  glowSide.position.set(S.maxX + 0.2, (y0 + y1) / 2, 0.1)
  markAsEffect(glowFront)
  markAsEffect(glowSide)
  g.add(glowFront, glowSide)

  // Slow breathing plus the occasional tired flicker.
  let nextFlicker = 6
  let flickerLeft = 0
  ctx.addUpdate((time, delta) => {
    nextFlicker -= delta
    if (nextFlicker <= 0) {
      flickerLeft = 0.26
      nextFlicker = 7 + Math.random() * 9
    }
    let level = 0.94 + Math.sin(time * 1.7) * 0.03
    if (flickerLeft > 0) {
      flickerLeft -= delta
      level *= 0.45 + Math.random() * 0.55
    }
    faceMaterial.color.setHex(PALETTE.signWhite).multiplyScalar(level)
    glowFront.material.opacity = 0.42 * level
    glowSide.material.opacity = 0.36 * level
  })

  ctx.addReflection({ x: -1.0, z: S.maxZ + 1.6, color: 0xfff0cf, strength: 0.55, radius: 3.0 })
  return g
}

/** Free standing illuminated sign out on the pavement. */
function poleSign(ctx) {
  const g = group('pole-sign')
  const post = cylinder(0.09, 0.09, 3.9, toon(PALETTE.metalDark), 10)
  post.position.set(0, LAYOUT.curbHeight + 1.95, 0)
  g.add(post)

  const faceMaterial = unlit(0xfff6e2, { fresh: true })
  const boxSign = box(0.16, 1.5, 1.05, faceMaterial, [0, LAYOUT.curbHeight + 3.2, 0])
  g.add(boxSign)
  g.add(box(0.2, 0.14, 1.15, toon(PALETTE.storeTrim), [0, LAYOUT.curbHeight + 3.98, 0]))
  g.add(box(0.2, 0.14, 1.15, toon(PALETTE.storeTrim), [0, LAYOUT.curbHeight + 2.42, 0]))
  for (let i = 0; i < 3; i += 1) {
    const yy = LAYOUT.curbHeight + 2.62 + i * 0.16
    g.add(box(0.19, 0.1, 0.75, unlit([PALETTE.brandGreen, PALETTE.brandOrange, PALETTE.brandRed][i]), [0, yy, 0]))
  }
  for (let i = 0; i < 3; i += 1) {
    g.add(box(0.19, 0.42, 0.2, unlit(PALETTE.brandGreen), [0, LAYOUT.curbHeight + 3.5, -0.32 + i * 0.32]))
  }

  const glow = makeGlow(0xffeec8, 1.9, 0.42)
  glow.position.set(0, LAYOUT.curbHeight + 3.2, 0)
  markAsEffect(glow)
  g.add(glow)

  ctx.addUpdate((time) => {
    const level = 0.9 + Math.sin(time * 2.3 + 1.2) * 0.05
    faceMaterial.color.setHex(0xfff6e2).multiplyScalar(level)
    glow.material.opacity = 0.4 * level
  })

  g.position.set(2.32, 0, 0.5)
  ctx.addReflection({ x: 2.6, z: 0.5, color: 0xffeec8, strength: 0.6, radius: 1.8 })
  return g
}

/**
 * The pool of warm light the shop throws onto the wet pavement.
 * Painted in rather than lit, so it stays clean and cheap.
 */
function lightSpill() {
  const g = group('light-spill')
  const y = LAYOUT.curbHeight + 0.05

  const front = makeGlowPlane(0xffd6a0, 6.6, 3.4, 0.62)
  front.rotation.x = -Math.PI / 2
  front.position.set((S.minX + S.maxX) / 2 + 0.1, y, S.maxZ + 1.15)
  g.add(front)

  const side = makeGlowPlane(0xffd6a0, 3.2, 4.6, 0.42)
  side.rotation.x = -Math.PI / 2
  side.position.set(S.maxX + 1.1, y, 0.1)
  g.add(side)

  const doorway = makeGlowPlane(0xffe3ba, 3.0, 3.0, 0.5)
  doorway.rotation.x = -Math.PI / 2
  doorway.position.set(0, y + 0.005, S.maxZ + 1.0)
  g.add(doorway)

  // Glare on the glazing plus a hazy halo, so the shop glows like a lantern.
  const glareFront = makeGlowPlane(0xffdcac, 5.6, 3.0, 0.13)
  glareFront.position.set((S.minX + S.maxX) / 2, FLOOR + 1.25, S.maxZ + 0.06)
  const glareSide = makeGlowPlane(0xffdcac, 3.4, 3.0, 0.1)
  glareSide.rotation.y = Math.PI / 2
  glareSide.position.set(S.maxX + 0.06, FLOOR + 1.25, 0.15)
  g.add(glareFront, glareSide)

  const hazeFront = makeGlowPlane(0xffcf94, 11.0, 7.0, 0.06)
  hazeFront.position.set((S.minX + S.maxX) / 2, FLOOR + 1.9, S.maxZ + 1.9)
  const hazeSide = makeGlowPlane(0xffcf94, 8.0, 7.0, 0.05)
  hazeSide.rotation.y = Math.PI / 2
  hazeSide.position.set(S.maxX + 1.9, FLOOR + 1.9, 0.1)
  g.add(hazeFront, hazeSide)

  markAsEffect(g)
  return g
}

/** Posters and light boxes stuck to the inside of the glazing. */
function windowGraphics() {
  const g = group('window-graphics')
  const specs = [
    { seed: 3, x: -2.6, z: S.maxZ - 0.12, ry: 0, w: 0.62, h: 0.86, y: FLOOR + 1.55 },
    { seed: 8, x: -1.55, z: S.maxZ - 0.12, ry: 0, w: 0.5, h: 0.72, y: FLOOR + 1.75 },
    { seed: 12, x: S.maxX - 0.12, z: 0.55, ry: -Math.PI / 2, w: 0.55, h: 0.8, y: FLOOR + 1.6 },
  ]
  const palettes = [
    { bg: '#f6f1e2', accent: '#e35b4a', ink: '#2c3244', blob: '#f0b04a' },
    { bg: '#eef6f7', accent: '#3f9f68', ink: '#28303f', blob: '#8fd6a8' },
    { bg: '#fdf3e7', accent: '#3f77c0', ink: '#242c3c', blob: '#f2a2b4' },
  ]
  specs.forEach((spec, i) => {
    const material = unlit(0xffffff, { map: posterTexture(spec.seed, palettes[i % palettes.length]), fresh: true })
    material.side = THREE.DoubleSide
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), material)
    mesh.position.set(spec.x, spec.y, spec.z)
    mesh.rotation.y = spec.ry
    g.add(mesh)
  })
  return g
}

export function buildStore(ctx) {
  const g = group('store')
  g.add(shell())
  g.add(glazing())
  g.add(automaticDoor(ctx))
  g.add(awning(ctx))
  g.add(signBand(ctx))
  g.add(poleSign(ctx))
  g.add(windowGraphics())
  g.add(lightSpill())
  return g
}

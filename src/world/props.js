import * as THREE from 'three'
import { PALETTE } from '../core/palette.js'
import { makeGlow, makeGlowPlane, posterTexture, toon, unlit } from '../core/materials.js'
import { markAsEffect } from '../core/layers.js'
import { LAYOUT, SIDEWALK_Y } from './layout.js'
import { box, boxBetween, cableCurve, cylinder, group, makeRandom, tube } from './helpers.js'

const S = LAYOUT.store
const random = makeRandom(77713)
const Y = SIDEWALK_Y + 0.02

/** Pair of vending machines guarding the mouth of the alley. */
function vendingMachines(ctx) {
  const g = group('vending')
  const bodies = [
    { x: -4.62, color: PALETTE.vendingRed, accent: 0xffe9a8 },
    { x: -3.78, color: PALETTE.vendingBlue, accent: 0xd9f3ff },
  ]

  bodies.forEach(({ x, color, accent }, index) => {
    const unit = group('vending-unit')
    const w = 0.78
    const h = 1.86
    const d = 0.66
    unit.add(box(w, h, d, toon(color), [0, h / 2, 0]))
    // Glowing product display.
    const face = box(w - 0.12, h * 0.5, 0.03, unlit(accent), [0, h * 0.62, d / 2 + 0.005])
    face.castShadow = false
    unit.add(face)
    // Drink rows behind the glass.
    const bottleGeometry = new THREE.BoxGeometry(0.08, 0.14, 0.02)
    const bottles = new THREE.InstancedMesh(bottleGeometry, toon(0xffffff), 24)
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    for (let i = 0; i < 24; i += 1) {
      dummy.position.set(-0.24 + (i % 6) * 0.096, h * 0.78 - Math.floor(i / 6) * 0.18, d / 2 + 0.03)
      dummy.updateMatrix()
      bottles.setMatrixAt(i, dummy.matrix)
      c.setHSL(random(), 0.6, 0.62)
      bottles.setColorAt(i, c)
    }
    bottles.instanceMatrix.needsUpdate = true
    if (bottles.instanceColor) bottles.instanceColor.needsUpdate = true
    bottles.castShadow = false
    unit.add(bottles)
    // Buttons, coin slot, pick-up flap.
    unit.add(box(w - 0.16, 0.06, 0.02, unlit(0xff6a5c), [0, h * 0.34, d / 2 + 0.01]))
    unit.add(box(0.1, 0.24, 0.02, toon(PALETTE.metal), [w / 2 - 0.14, h * 0.24, d / 2 + 0.01]))
    unit.add(box(w - 0.2, 0.16, 0.03, toon(PALETTE.metalDark), [0, 0.28, d / 2 + 0.01]))
    unit.add(box(w, 0.1, d, toon(PALETTE.metalDark), [0, h + 0.05, 0]))

    const glow = makeGlowPlane(accent, 1.9, 2.1, 0.4)
    glow.position.set(0, h * 0.6, d / 2 + 0.12)
    markAsEffect(glow)
    unit.add(glow)

    unit.position.set(x, SIDEWALK_Y, 0.98)
    g.add(unit)
    ctx.addReflection({ x, z: 1.7, color: accent, strength: index === 0 ? 0.5 : 0.42, radius: 1.4 })
  })

  const light = new THREE.PointLight(0xd9ecff, 4.5, 4.5, 2)
  light.position.set(-4.2, SIDEWALK_Y + 1.5, 1.6)
  g.add(light)

  // Recycling bin between the machines.
  const bin = cylinder(0.22, 0.2, 0.72, toon(PALETTE.metal), 10)
  bin.position.set(-3.2, SIDEWALK_Y + 0.36, 1.9)
  g.add(bin)
  const binTop = cylinder(0.24, 0.24, 0.06, toon(PALETTE.brandGreen), 10)
  binTop.position.set(-3.2, SIDEWALK_Y + 0.75, 1.9)
  g.add(binTop)

  return g
}

/** Everything crowded around the entrance. */
function entranceProps() {
  const g = group('entrance')

  // Door mat.
  const mat = boxBetween(-0.85, 0.85, Y, Y + 0.02, S.maxZ + 0.06, S.maxZ + 0.85, toon(0x2b3247))
  mat.castShadow = false
  g.add(mat)
  const matEdge = boxBetween(-0.9, 0.9, Y, Y + 0.015, S.maxZ + 0.02, S.maxZ + 0.9, toon(0x1e2436))
  matEdge.castShadow = false
  g.add(matEdge)

  // Umbrella stand with a few forgotten umbrellas.
  const stand = group('umbrella-stand')
  stand.add(box(0.5, 0.62, 0.26, toon(PALETTE.metal), [0, 0.31, 0]))
  stand.add(box(0.52, 0.04, 0.28, toon(PALETTE.metalDark), [0, 0.62, 0]))
  const umbrellaColors = [0x4f6fbf, 0xc75f6a, 0x8f93a8]
  umbrellaColors.forEach((color, i) => {
    const shaft = cylinder(0.02, 0.02, 0.86, toon(color), 6)
    shaft.position.set(-0.16 + i * 0.16, 0.66, 0.0)
    shaft.rotation.z = (i - 1) * 0.09
    stand.add(shaft)
    const cap = cylinder(0.055, 0.02, 0.14, toon(color), 8)
    cap.position.set(-0.16 + i * 0.16 - (i - 1) * 0.05, 1.08, 0)
    stand.add(cap)
  })
  stand.position.set(-1.3, SIDEWALK_Y, S.maxZ + 0.3)
  g.add(stand)

  // Sorted bins, the classic konbini pair.
  ;[
    { x: 1.0, color: PALETTE.trashGreen },
    { x: 1.55, color: PALETTE.trashBlue },
  ].forEach(({ x, color }) => {
    const bin = group('bin')
    bin.add(box(0.46, 0.78, 0.42, toon(color), [0, 0.39, 0]))
    bin.add(box(0.5, 0.08, 0.46, toon(PALETTE.metalDark), [0, 0.8, 0]))
    bin.add(box(0.26, 0.03, 0.24, unlit(0x11151f), [0, 0.85, 0]))
    bin.position.set(x, SIDEWALK_Y, S.maxZ + 0.5)
    g.add(bin)
  })

  // Newspaper / promo stand.
  const stand2 = group('promo')
  stand2.add(box(0.55, 0.9, 0.3, toon(0xe8ecf3), [0, 0.45, 0]))
  const promoMaterial = unlit(0xffffff, {
    map: posterTexture(31, { bg: '#fdf6e6', accent: '#3f9f68', ink: '#2b3040', blob: '#f4b45a' }),
    fresh: true,
  })
  const promo = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.6), promoMaterial)
  promo.position.set(0, 0.62, 0.16)
  stand2.add(promo)
  stand2.position.set(-2.45, SIDEWALK_Y, S.maxZ + 0.42)
  stand2.rotation.y = 0.22
  g.add(stand2)

  return g
}

/** Bicycle parked against the corner of the shop. */
function bicycle() {
  const g = group('bicycle')
  const frameMaterial = toon(PALETTE.bikeFrame)
  const metal = toon(PALETTE.metal)

  const wheelGeometry = new THREE.TorusGeometry(0.29, 0.028, 6, 18)
  ;[-0.52, 0.52].forEach((x) => {
    const wheel = new THREE.Mesh(wheelGeometry, toon(0x1f2536))
    wheel.position.set(x, 0.29, 0)
    wheel.castShadow = true
    g.add(wheel)
    const hub = cylinder(0.03, 0.03, 0.06, metal, 8)
    hub.rotation.x = Math.PI / 2
    hub.position.set(x, 0.29, 0)
    g.add(hub)
  })

  const bar = (x1, y1, x2, y2, r = 0.022) => {
    const from = new THREE.Vector3(x1, y1, 0)
    const to = new THREE.Vector3(x2, y2, 0)
    const length = from.distanceTo(to)
    const mesh = cylinder(r, r, length, frameMaterial, 6)
    mesh.position.copy(from.clone().lerp(to, 0.5))
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      to.clone().sub(from).normalize(),
    )
    return mesh
  }
  g.add(bar(-0.52, 0.29, 0.05, 0.32))
  g.add(bar(0.05, 0.32, 0.42, 0.78))
  g.add(bar(-0.52, 0.29, 0.3, 0.72))
  g.add(bar(0.3, 0.72, 0.42, 0.78))
  g.add(bar(0.52, 0.29, 0.42, 0.78))
  g.add(bar(0.05, 0.32, 0.02, 0.62))

  const saddle = box(0.22, 0.06, 0.1, toon(0x21283a), [0.0, 0.68, 0])
  g.add(saddle)
  const handle = cylinder(0.018, 0.018, 0.42, metal, 6)
  handle.rotation.x = Math.PI / 2
  handle.position.set(0.44, 0.82, 0)
  g.add(handle)
  const basket = box(0.3, 0.22, 0.26, toon(PALETTE.metal), [0.52, 0.72, 0])
  g.add(basket)
  const basketInner = box(0.24, 0.16, 0.2, toon(0x2a3145), [0.52, 0.74, 0])
  g.add(basketInner)

  g.position.set(1.05, SIDEWALK_Y, 2.35)
  g.rotation.y = -0.35
  g.rotation.z = 0.07
  return g
}

function streetLamp(x, z, rotationY, withLight, ctx) {
  const g = group('street-lamp')
  const pole = cylinder(0.07, 0.09, 4.4, toon(PALETTE.pole), 10)
  pole.position.set(0, SIDEWALK_Y + 2.2, 0)
  g.add(pole)
  const arm = cylinder(0.05, 0.05, 0.9, toon(PALETTE.pole), 8)
  arm.rotation.z = Math.PI / 2
  arm.position.set(0.42, SIDEWALK_Y + 4.3, 0)
  g.add(arm)
  const head = box(0.6, 0.14, 0.3, toon(PALETTE.metalDark), [0.82, SIDEWALK_Y + 4.22, 0])
  g.add(head)
  const lens = box(0.5, 0.05, 0.24, unlit(0xfff0c8), [0.82, SIDEWALK_Y + 4.14, 0])
  lens.castShadow = false
  g.add(lens)

  const glow = makeGlow(0xffdca2, 2.6, 0.45)
  glow.position.set(0.82, SIDEWALK_Y + 4.1, 0)
  markAsEffect(glow)
  g.add(glow)

  if (withLight) {
    const light = new THREE.PointLight(PALETTE.lampWarm, 12, 9, 2)
    light.position.set(0.82, SIDEWALK_Y + 4.0, 0)
    g.add(light)
  }

  g.position.set(x, 0, z)
  g.rotation.y = rotationY
  const dir = new THREE.Vector3(0.82, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)
  ctx.addReflection({ x: x + dir.x, z: z + dir.z, color: 0xffdca2, strength: 0.5, radius: 2.0 })
  return g
}

/** Concrete utility pole with transformers, brackets and a name plate. */
function utilityPole(x, z, options = {}) {
  const g = group('utility-pole')
  const height = options.height ?? 7.2
  const pole = cylinder(0.11, 0.16, height, toon(PALETTE.concrete), 10)
  pole.position.set(0, SIDEWALK_Y + height / 2, 0)
  g.add(pole)

  const armMaterial = toon(PALETTE.metalDark)
  ;[0, 0.55].forEach((offset, i) => {
    const arm = box(0.06, 0.06, 1.7 - i * 0.35, armMaterial, [0, SIDEWALK_Y + height - 0.5 - offset, 0])
    g.add(arm)
    for (let k = -1; k <= 1; k += 1) {
      if (k === 0) continue
      const insulator = cylinder(0.045, 0.045, 0.12, toon(0x8d99b3), 6)
      insulator.position.set(0, SIDEWALK_Y + height - 0.4 - offset, k * (0.75 - i * 0.16))
      g.add(insulator)
    }
  })

  if (options.transformer !== false) {
    const can = cylinder(0.2, 0.2, 0.5, toon(PALETTE.metal), 10)
    can.position.set(0.24, SIDEWALK_Y + height - 1.5, 0)
    g.add(can)
    const can2 = cylinder(0.2, 0.2, 0.5, toon(PALETTE.metal), 10)
    can2.position.set(-0.24, SIDEWALK_Y + height - 1.5, 0)
    g.add(can2)
  }

  if (options.plate) {
    const plate = box(0.03, 0.22, 0.8, unlit(0x2f5fa8), [0.13, SIDEWALK_Y + 2.5, 0])
    g.add(plate)
    const text = box(0.02, 0.06, 0.56, unlit(0xf2f6ff), [0.15, SIDEWALK_Y + 2.5, 0])
    text.castShadow = false
    g.add(text)
  }

  if (options.lamp) {
    const bracket = box(0.5, 0.06, 0.06, toon(PALETTE.metalDark), [0.28, SIDEWALK_Y + 4.6, 0])
    g.add(bracket)
    const lamp = box(0.34, 0.12, 0.22, toon(PALETTE.metalDark), [0.5, SIDEWALK_Y + 4.52, 0])
    g.add(lamp)
    const lens = box(0.28, 0.04, 0.18, unlit(0xfff0c8), [0.5, SIDEWALK_Y + 4.45, 0])
    lens.castShadow = false
    g.add(lens)
    const glow = makeGlow(0xffdca2, 2.0, 0.35)
    glow.position.set(0.5, SIDEWALK_Y + 4.42, 0)
    markAsEffect(glow)
    g.add(glow)
  }

  g.position.set(x, 0, z)
  g.rotation.y = options.rotationY ?? 0
  g.userData.topY = SIDEWALK_Y + height - 0.5
  return g
}

function overheadCables(poles) {
  const g = group('cables')
  const material = toon(0x11151f)
  const link = (a, b, offsets) => {
    offsets.forEach((offset) => {
      const from = new THREE.Vector3(a.position.x, a.userData.topY + offset.y, a.position.z + offset.z)
      const to = new THREE.Vector3(b.position.x, b.userData.topY + offset.y, b.position.z + offset.z)
      const sag = from.distanceTo(to) * 0.06
      g.add(tube(cableCurve(from, to, sag, 10), 0.022, material, 14))
    })
  }
  const offsets = [
    { y: 0.1, z: -0.75 },
    { y: 0.1, z: 0.75 },
    { y: -0.45, z: -0.55 },
    { y: -0.45, z: 0.55 },
  ]
  link(poles.corner, poles.south, offsets)
  link(poles.corner, poles.far, offsets)
  link(poles.corner, poles.north, offsets)
  return g
}

/** Road signs at the corner. */
function roadSigns() {
  const g = group('signs')
  const poleMaterial = toon(PALETTE.pole)

  // Inverted red triangle: stop.
  const stop = group('stop-sign')
  const stopPole = cylinder(0.045, 0.045, 2.4, poleMaterial, 8)
  stopPole.position.set(0, SIDEWALK_Y + 1.2, 0)
  stop.add(stopPole)
  const triangle = new THREE.Shape()
  triangle.moveTo(-0.34, 0.3)
  triangle.lineTo(0.34, 0.3)
  triangle.lineTo(0, -0.32)
  triangle.closePath()
  const face = new THREE.Mesh(new THREE.ShapeGeometry(triangle), unlit(0xd8453f))
  face.position.set(0, SIDEWALK_Y + 2.3, 0.03)
  const rim = new THREE.Mesh(new THREE.ShapeGeometry(triangle), unlit(0xf6f2e8))
  rim.scale.setScalar(1.12)
  rim.position.set(0, SIDEWALK_Y + 2.3, 0.02)
  stop.add(rim, face)
  stop.position.set(2.75, 0, 2.05)
  stop.rotation.y = Math.PI * 0.85
  g.add(stop)

  // Blue circular speed sign plus a rectangular direction plate.
  const info = group('info-sign')
  const infoPole = cylinder(0.045, 0.045, 2.8, poleMaterial, 8)
  infoPole.position.set(0, SIDEWALK_Y + 1.4, 0)
  info.add(infoPole)
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), unlit(0x2f5fa8))
  disc.position.set(0, SIDEWALK_Y + 2.6, 0.03)
  const discRim = new THREE.Mesh(new THREE.CircleGeometry(0.31, 20), unlit(0xf2f6ff))
  discRim.position.set(0, SIDEWALK_Y + 2.6, 0.02)
  const digits = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.13), unlit(0xf6f8ff))
  digits.position.set(0, SIDEWALK_Y + 2.6, 0.04)
  info.add(discRim, disc, digits)
  const plate = box(0.9, 0.2, 0.03, unlit(0x2f6f4f), [0.1, SIDEWALK_Y + 2.05, 0])
  info.add(plate)
  info.position.set(2.05, 0, 2.85)
  info.rotation.y = Math.PI * 1.25
  g.add(info)

  return g
}

/** Painted steel guardrail sections. */
function guardrail(x, z, length, rotationY) {
  const g = group('guardrail')
  const metal = toon(0xb9c2d4)
  const post = toon(PALETTE.metalDark)
  const count = Math.max(2, Math.round(length / 1.4))
  for (let i = 0; i <= count; i += 1) {
    const p = cylinder(0.045, 0.045, 0.7, post, 6)
    p.position.set(-length / 2 + (i * length) / count, SIDEWALK_Y + 0.35, 0)
    g.add(p)
  }
  const rail = box(length, 0.16, 0.06, metal, [0, SIDEWALK_Y + 0.62, 0])
  g.add(rail)
  const rail2 = box(length, 0.06, 0.05, metal, [0, SIDEWALK_Y + 0.4, 0])
  g.add(rail2)
  g.position.set(x, 0, z)
  g.rotation.y = rotationY
  return g
}

function bollards() {
  const g = group('bollards')
  const positions = [
    [2.7, 2.7],
    [2.35, 1.55],
    [1.55, 2.35],
    [2.95, -0.6],
    [-0.6, 2.95],
  ]
  positions.forEach(([x, z]) => {
    const post = cylinder(0.07, 0.08, 0.78, toon(0xd9b34a), 8)
    post.position.set(x, SIDEWALK_Y + 0.39, z)
    g.add(post)
    const band = cylinder(0.082, 0.082, 0.07, unlit(0xf6f2e8), 8)
    band.position.set(x, SIDEWALK_Y + 0.62, z)
    g.add(band)
  })
  return g
}

/** Community notice board with a little roof. */
function bulletinBoard() {
  const g = group('bulletin')
  const wood = toon(0x6d5a45)
  g.add(box(1.5, 0.9, 0.1, toon(0x3c4459), [0, 1.25, 0]))
  g.add(box(1.62, 0.08, 0.16, wood, [0, 1.76, 0]))
  g.add(box(1.62, 0.08, 0.16, wood, [0, 0.76, 0]))
  g.add(box(1.7, 0.06, 0.34, wood, [0, 1.86, 0.09]))
  ;[-0.45, 0.0, 0.45].forEach((x, i) => {
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.54),
      unlit(0xffffff, {
        map: posterTexture(41 + i, { bg: '#f4efe2', accent: '#4a72b8', ink: '#2a3040', blob: '#e28d6a' }),
        fresh: true,
      }),
    )
    poster.position.set(x, 1.26, 0.06)
    g.add(poster)
  })
  ;[-0.6, 0.6].forEach((x) => {
    const post = box(0.09, 1.5, 0.09, wood, [x, 0.75, 0])
    g.add(post)
  })
  g.position.set(-5.6, SIDEWALK_Y, 2.55)
  g.rotation.y = Math.PI
  return g
}

/** Far-corner traffic signal, slowly cycling in the background. */
function trafficLight(ctx) {
  const g = group('traffic-light')
  const pole = cylinder(0.08, 0.1, 5.2, toon(PALETTE.pole), 10)
  pole.position.set(0, SIDEWALK_Y + 2.6, 0)
  g.add(pole)
  const arm = box(2.0, 0.08, 0.08, toon(PALETTE.pole), [-1.0, SIDEWALK_Y + 5.0, 0])
  g.add(arm)

  const head = group('signal-head')
  head.add(box(1.3, 0.38, 0.22, toon(PALETTE.metalDark), [0, 0, 0]))
  head.add(box(1.34, 0.08, 0.3, toon(PALETTE.metalDark), [0, 0.2, 0.05]))
  const lampMaterials = [
    unlit(PALETTE.signalGreen, { fresh: true }),
    unlit(PALETTE.signalAmber, { fresh: true }),
    unlit(PALETTE.signalRed, { fresh: true }),
  ]
  const glows = []
  lampMaterials.forEach((material, i) => {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), material)
    lamp.position.set(-0.4 + i * 0.4, 0, -0.12)
    lamp.rotation.y = Math.PI
    head.add(lamp)
    const glow = makeGlow(
      [PALETTE.signalGreen, PALETTE.signalAmber, PALETTE.signalRed][i],
      0.85,
      0,
    )
    glow.position.set(-0.4 + i * 0.4, 0, -0.22)
    markAsEffect(glow)
    head.add(glow)
    glows.push(glow)
  })
  head.position.set(-1.9, SIDEWALK_Y + 4.8, 0)
  g.add(head)

  // Pedestrian signal lower down.
  const ped = group('ped-signal')
  ped.add(box(0.3, 0.6, 0.18, toon(PALETTE.metalDark), [0, 0, 0]))
  const pedMaterial = unlit(PALETTE.signalRed, { fresh: true })
  const pedLamp = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.22), pedMaterial)
  pedLamp.position.set(0, 0.13, -0.1)
  pedLamp.rotation.y = Math.PI
  ped.add(pedLamp)
  ped.position.set(0.0, SIDEWALK_Y + 3.1, -0.2)
  g.add(ped)

  const cycle = [
    { duration: 6.5, on: 0 },
    { duration: 1.6, on: 1 },
    { duration: 6.0, on: 2 },
  ]
  const base = [0.16, 0.16, 0.16]
  ctx.addUpdate((time) => {
    const total = cycle.reduce((sum, step) => sum + step.duration, 0)
    let t = time % total
    let active = 0
    for (const step of cycle) {
      if (t < step.duration) {
        active = step.on
        break
      }
      t -= step.duration
    }
    lampMaterials.forEach((material, i) => {
      const on = i === active
      const level = on ? 0.92 + Math.sin(time * 8) * 0.04 : base[i]
      material.color.setHex([PALETTE.signalGreen, PALETTE.signalAmber, PALETTE.signalRed][i]).multiplyScalar(level)
      glows[i].material.opacity = on ? 0.55 : 0.0
    })
    pedMaterial.color
      .setHex(active === 2 ? PALETTE.signalGreen : PALETTE.signalRed)
      .multiplyScalar(0.85)
  })

  g.position.set(9.5, 0, 9.5)
  g.rotation.y = Math.PI * 0.25
  ctx.addReflection({ x: 8.0, z: 8.0, color: 0xff8a8a, strength: 0.3, radius: 2.4 })
  return g
}

/** Damp clutter in the alley beside the shop. */
function alleyProps(ctx) {
  const g = group('alley-props')
  const a = LAYOUT.alley
  const midX = (a.minX + a.maxX) / 2

  // Bare bulb over a service door.
  const bulbHolder = box(0.16, 0.1, 0.2, toon(PALETTE.metalDark), [a.maxX + 0.12, SIDEWALK_Y + 2.5, -0.6])
  g.add(bulbHolder)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), unlit(0xffd7a0))
  bulb.position.set(a.maxX + 0.12, SIDEWALK_Y + 2.42, -0.6)
  g.add(bulb)
  const bulbGlow = makeGlow(0xffc98a, 1.5, 0.4)
  bulbGlow.position.copy(bulb.position)
  markAsEffect(bulbGlow)
  g.add(bulbGlow)
  ctx.addReflection({ x: midX, z: -0.6, color: 0xffc98a, strength: 0.35, radius: 1.1 })

  // Air conditioning units bolted to the shop wall.
  for (let i = 0; i < 2; i += 1) {
    const unit = group('alley-ac')
    unit.add(box(0.34, 0.5, 0.74, toon(PALETTE.metal), [0, 0, 0]))
    const grille = box(0.03, 0.34, 0.34, toon(PALETTE.metalDark), [-0.18, 0, 0])
    unit.add(grille)
    unit.position.set(a.maxX + 0.19, SIDEWALK_Y + 1.5 + i * 0.9, -2.2 - i * 1.5)
    g.add(unit)
  }

  // Stacked drink crates and a couple of buckets.
  for (let i = 0; i < 4; i += 1) {
    const crate = box(0.44, 0.24, 0.36, toon(i % 2 ? 0x3f6f9f : 0x9f5a3f), [
      midX + (i % 2 ? 0.12 : -0.1),
      SIDEWALK_Y + 0.12 + i * 0.25,
      -3.6,
    ])
    crate.rotation.y = (random() - 0.5) * 0.24
    g.add(crate)
  }
  const bucket = cylinder(0.16, 0.13, 0.3, toon(0x4c5570), 10)
  bucket.position.set(midX - 0.25, SIDEWALK_Y + 0.15, -1.7)
  g.add(bucket)
  const bucket2 = cylinder(0.14, 0.11, 0.26, toon(0x3f4a63), 10)
  bucket2.position.set(midX + 0.3, SIDEWALK_Y + 0.13, -2.6)
  g.add(bucket2)

  // Dumpster at the far end.
  const dumpster = box(1.2, 0.8, 0.7, toon(0x3b6b52), [midX, SIDEWALK_Y + 0.4, -5.4])
  dumpster.rotation.y = Math.PI / 2
  g.add(dumpster)
  const lid = box(1.24, 0.08, 0.74, toon(0x2f5744), [midX, SIDEWALK_Y + 0.84, -5.4])
  lid.rotation.y = Math.PI / 2
  g.add(lid)

  // Pipework running down the wall.
  const pipe = cylinder(0.05, 0.05, 3.2, toon(PALETTE.metalDark), 8)
  pipe.position.set(a.maxX + 0.08, SIDEWALK_Y + 1.6, -4.6)
  g.add(pipe)

  return g
}

/** Fenced yard behind the shop. */
function backYard() {
  const g = group('back-yard')
  const fence = toon(0x4b5570)
  for (let x = -3.2; x <= 1.2; x += 0.55) {
    const post = box(0.07, 1.15, 0.07, fence, [x, SIDEWALK_Y + 0.57, -4.35])
    g.add(post)
  }
  g.add(box(4.6, 0.07, 0.06, fence, [-1.0, SIDEWALK_Y + 1.1, -4.35]))
  g.add(box(4.6, 0.07, 0.06, fence, [-1.0, SIDEWALK_Y + 0.55, -4.35]))

  const canister = cylinder(0.16, 0.16, 0.7, toon(0xb8c0d0), 10)
  canister.position.set(-0.4, SIDEWALK_Y + 0.35, -3.8)
  g.add(canister)
  const canister2 = cylinder(0.16, 0.16, 0.7, toon(0xb8c0d0), 10)
  canister2.position.set(-0.05, SIDEWALK_Y + 0.35, -3.8)
  g.add(canister2)

  for (let i = 0; i < 3; i += 1) {
    const crate = box(0.5, 0.26, 0.4, toon(i % 2 ? 0x8f5f3f : 0x3f5f8f), [
      -2.4,
      SIDEWALK_Y + 0.13 + i * 0.27,
      -3.9,
    ])
    g.add(crate)
  }

  const acUnit = box(0.8, 0.6, 0.42, toon(PALETTE.metal), [0.7, SIDEWALK_Y + 0.3, -3.7])
  g.add(acUnit)
  return g
}

function planters() {
  const g = group('planters')
  ;[
    [-3.05, 2.75],
    [-2.4, 2.9],
  ].forEach(([x, z], i) => {
    const pot = cylinder(0.2, 0.16, 0.36, toon(0x6f5a4c), 10)
    pot.position.set(x, SIDEWALK_Y + 0.18, z)
    g.add(pot)
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), toon(0x3e6b4b))
    bush.position.set(x, SIDEWALK_Y + 0.5 + i * 0.04, z)
    bush.castShadow = true
    g.add(bush)
  })
  return g
}

/** Parking sign at the entrance to the shop's little car park. */
function parkingSign() {
  const g = group('parking-sign')
  const pole = cylinder(0.05, 0.05, 2.5, toon(PALETTE.pole), 8)
  pole.position.set(0, SIDEWALK_Y + 1.25, 0)
  g.add(pole)
  const face = box(0.62, 0.62, 0.06, unlit(0xf4f8ff), [0, SIDEWALK_Y + 2.35, 0])
  g.add(face)
  const letter = box(0.3, 0.34, 0.03, unlit(0x2f5fa8), [0, SIDEWALK_Y + 2.35, 0.05])
  g.add(letter)
  const notch = box(0.12, 0.14, 0.04, unlit(0xf4f8ff), [0.0, SIDEWALK_Y + 2.32, 0.07])
  g.add(notch)
  g.position.set(-5.35, 0, 2.6)
  g.rotation.y = Math.PI * 0.9
  return g
}

export function buildProps(ctx) {
  const g = group('props')

  g.add(vendingMachines(ctx))
  g.add(entranceProps())
  g.add(bicycle())
  g.add(streetLamp(2.55, -5.6, Math.PI, true, ctx))
  g.add(streetLamp(9.35, 4.6, Math.PI * 0.5, false, ctx))

  const cornerPole = utilityPole(2.72, 2.72, { plate: true, lamp: true, rotationY: Math.PI * 1.25 })
  const southPole = utilityPole(2.72, -8.4, { transformer: false, rotationY: Math.PI })
  const northPole = utilityPole(-2.0, 9.6, { transformer: false, height: 6.6 })
  const farPole = utilityPole(9.6, -0.8, { transformer: false, height: 6.8, rotationY: Math.PI * 0.5 })
  g.add(cornerPole, southPole, northPole, farPole)
  g.add(overheadCables({ corner: cornerPole, south: southPole, north: northPole, far: farPole }))

  g.add(roadSigns())
  g.add(guardrail(-3.0, 8.98, 6.0, 0))
  g.add(guardrail(4.2, 8.98, 3.6, 0))
  g.add(guardrail(8.98, -4.0, 6.4, Math.PI / 2))
  g.add(bollards())
  g.add(bulletinBoard())
  g.add(trafficLight(ctx))
  g.add(alleyProps(ctx))
  g.add(backYard())
  g.add(planters())
  g.add(parkingSign())

  return g
}

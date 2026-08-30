import * as THREE from 'three'
import { PALETTE } from '../core/palette.js'
import { toon, unlit } from '../core/materials.js'
import { markAsEffect } from '../core/layers.js'
import { LAYOUT, SIDEWALK_Y } from './layout.js'
import { box, boxBetween, cylinder, group, slab } from './helpers.js'

const { baseHalf: H, blockEdge: E, cornerRadius: R, roadFar: F } = LAYOUT

/** Block outline: square corner rounded where the two streets meet. */
function blockShape(inset = 0) {
  const e = E - inset
  const r = Math.max(0.05, R - inset)
  const shape = new THREE.Shape()
  shape.moveTo(-H, -H)
  shape.lineTo(e, -H)
  shape.lineTo(e, e - r)
  shape.absarc(e - r, e - r, r, 0, Math.PI / 2, false)
  shape.lineTo(-H, e)
  shape.closePath()
  return shape
}

function markingsGroup() {
  const paint = toon(PALETTE.paint, { emissive: 0x5c6b8c, emissiveIntensity: 0.55 })
  const paintDim = toon(PALETTE.paintDim, { emissive: 0x3d4864, emissiveIntensity: 0.4 })
  const g = group('markings')
  const y = 0.012

  // Zebra crossing over the north-south street (walk along +X).
  for (let i = 0; i < 5; i += 1) {
    const z = -1.75 + i * 0.78
    const stripe = box(4.6, y, 0.44, paint, [6.0, y / 2, z])
    stripe.castShadow = false
    g.add(stripe)
  }
  // Zebra crossing over the east-west street (walk along +Z).
  for (let i = 0; i < 5; i += 1) {
    const x = -1.75 + i * 0.78
    const stripe = box(0.44, y, 4.6, paint, [x, y / 2, 6.0])
    stripe.castShadow = false
    g.add(stripe)
  }

  // Stop bars just before each crossing.
  const stopA = box(4.6, y, 0.22, paintDim, [6.0, y / 2, 2.1])
  const stopB = box(0.22, y, 4.6, paintDim, [2.1, y / 2, 6.0])
  stopA.castShadow = false
  stopB.castShadow = false
  g.add(stopA, stopB)

  // Dashed centre lines, interrupted by the junction.
  for (let z = -10.4; z < 1.6; z += 2.1) {
    const dash = box(0.14, y, 1.25, paintDim, [6.0, y / 2, z])
    dash.castShadow = false
    g.add(dash)
  }
  for (let x = -10.4; x < 1.6; x += 2.1) {
    const dash = box(1.25, y, 0.14, paintDim, [x, y / 2, 6.0])
    dash.castShadow = false
    g.add(dash)
  }

  // Edge lines hugging the kerb.
  const edgeA = box(0.1, y, 13.6, paintDim, [E + 0.62, y / 2, -4.2])
  const edgeB = box(13.6, y, 0.1, paintDim, [-4.2, y / 2, E + 0.62])
  edgeA.castShadow = false
  edgeB.castShadow = false
  g.add(edgeA, edgeB)

  return g
}

function gutterGroup() {
  const g = group('gutter')
  const channel = toon(PALETTE.drain)
  const grate = toon(PALETTE.metalDark)
  const w = LAYOUT.gutterWidth

  const along = boxBetween(E, E + w, 0.0, 0.03, -H, E - R, channel)
  const across = boxBetween(-H, E - R, 0.0, 0.03, E, E + w, channel)
  along.castShadow = false
  across.castShadow = false
  g.add(along, across)

  // Grate covers with slots.
  const positions = [
    [E + w / 2, -6.4, 0],
    [E + w / 2, -0.6, 0],
    [-6.4, E + w / 2, 1],
    [-1.2, E + w / 2, 1],
  ]
  positions.forEach(([x, z, axis]) => {
    const holder = group('grate')
    const frame = box(axis === 0 ? w : 0.9, 0.05, axis === 0 ? 0.9 : w, grate, [0, 0.03, 0])
    holder.add(frame)
    for (let i = 0; i < 5; i += 1) {
      const o = -0.32 + i * 0.16
      const slot = box(
        axis === 0 ? w * 0.8 : 0.06,
        0.02,
        axis === 0 ? 0.06 : w * 0.8,
        toon(0x0c1018),
        axis === 0 ? [0, 0.056, o] : [o, 0.056, 0],
      )
      slot.castShadow = false
      holder.add(slot)
    }
    holder.position.set(x, 0, z)
    g.add(holder)
  })

  return g
}

function parkingGroup() {
  const { minX, maxX, minZ, maxZ } = LAYOUT.parking
  const g = group('parking')
  const asphalt = toon(PALETTE.asphaltDry)
  const paint = toon(PALETTE.paintDim, { emissive: 0x39435e, emissiveIntensity: 0.4 })

  const apron = boxBetween(minX, maxX, SIDEWALK_Y - 0.06, SIDEWALK_Y + 0.005, minZ, maxZ, asphalt)
  apron.castShadow = false
  g.add(apron)

  // Dropped kerb ramp at the entrance.
  const ramp = boxBetween(minX + 0.3, maxX - 0.3, 0.0, SIDEWALK_Y, E - 0.55, E + 0.05, asphalt)
  ramp.castShadow = false
  g.add(ramp)

  // Three bays, lines drawn perpendicular to the street.
  const y = SIDEWALK_Y + 0.012
  for (let i = 0; i <= 3; i += 1) {
    const x = minX + 0.45 + i * 1.55
    const line = box(0.1, 0.014, 3.4, paint, [x, y, 0.55])
    line.castShadow = false
    g.add(line)
    if (i < 3) {
      const stop = box(1.1, 0.13, 0.16, toon(PALETTE.concrete), [x + 0.775, SIDEWALK_Y + 0.06, -0.85])
      g.add(stop)
    }
  }
  const head = box(5.0, 0.014, 0.1, paint, [minX + 0.45 + 2.325, y, -1.15])
  head.castShadow = false
  g.add(head)

  return g
}

function tactilePaving() {
  // Yellow guidance tiles along the pavement, a very Japanese detail.
  const material = toon(0xd9a63f, { emissive: 0x5a4415, emissiveIntensity: 0.45 })
  const geometry = new THREE.BoxGeometry(0.36, 0.03, 0.36)
  const tiles = []
  for (let z = -8.6; z <= 2.4; z += 0.44) tiles.push([E - 0.75, z])
  for (let x = -8.6; x <= 2.4; x += 0.44) tiles.push([x, E - 0.75])
  const mesh = new THREE.InstancedMesh(geometry, material, tiles.length)
  const dummy = new THREE.Object3D()
  tiles.forEach(([x, z], i) => {
    dummy.position.set(x, SIDEWALK_Y + 0.015, z)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.receiveShadow = true
  return mesh
}

export function buildBase() {
  const g = group('base')

  // Plinth: dark body, lighter foot, asphalt cap.
  const plinth = boxBetween(-H, H, -LAYOUT.plinthDepth, -0.07, -H, H, toon(PALETTE.plinth))
  const foot = box(
    H * 2 + 0.5,
    0.22,
    H * 2 + 0.5,
    toon(PALETTE.plinthTrim),
    [0, -LAYOUT.plinthDepth + 0.11, 0],
  )
  const road = boxBetween(-H, H, -0.07, 0, -H, H, toon(PALETTE.asphalt))
  road.castShadow = false
  g.add(plinth, foot, road)

  // Pavement block with a rounded street corner, plus a lighter kerb band.
  const kerb = slab(blockShape(0), SIDEWALK_Y, toon(PALETTE.curb))
  const pavement = slab(blockShape(0.2), SIDEWALK_Y + 0.02, toon(PALETTE.sidewalk))
  g.add(kerb, pavement)

  // Pavement expansion joints.
  const joint = toon(PALETTE.sidewalkLine)
  for (let i = -9; i <= 1; i += 1) {
    const line = box(0.05, 0.01, 3.6, joint, [i * 1.2, SIDEWALK_Y + 0.026, 1.4])
    line.castShadow = false
    g.add(line)
  }

  // Far pavements on the opposite sides of both streets.
  const farA = boxBetween(F, H, 0, SIDEWALK_Y, -H, H, toon(PALETTE.curb))
  const farB = boxBetween(-H, F, 0, SIDEWALK_Y, F, H, toon(PALETTE.curb))
  const farATop = boxBetween(F + 0.2, H, SIDEWALK_Y, SIDEWALK_Y + 0.02, -H, H, toon(PALETTE.sidewalk))
  const farBTop = boxBetween(-H, F + 0.2, SIDEWALK_Y, SIDEWALK_Y + 0.02, F + 0.2, H, toon(PALETTE.sidewalk))
  g.add(farA, farB, farATop, farBTop)

  // Manhole and a couple of utility covers.
  const manhole = cylinder(0.42, 0.42, 0.03, toon(PALETTE.metalDark), 16)
  manhole.position.set(5.4, 0.015, -3.6)
  const cover = cylinder(0.26, 0.26, 0.03, toon(PALETTE.metalDark), 12)
  cover.position.set(1.9, SIDEWALK_Y + 0.02, -0.4)
  g.add(manhole, cover)

  g.add(markingsGroup(), gutterGroup(), parkingGroup(), tactilePaving())

  // Faint neon-tinted sheen so the wet asphalt is never flat black.
  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(H * 2, H * 2),
    unlit(0x1a2f52, { transparent: true, opacity: 0.16 }),
  )
  sheen.rotation.x = -Math.PI / 2
  sheen.position.y = 0.004
  sheen.renderOrder = -1
  markAsEffect(sheen)
  g.add(sheen)

  return g
}

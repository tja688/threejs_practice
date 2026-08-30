import * as THREE from 'three'
import { PALETTE } from '../core/palette.js'
import { makeGlowPlane, toon, unlit } from '../core/materials.js'
import { markAsEffect } from '../core/layers.js'
import { LAYOUT, SIDEWALK_Y } from './layout.js'
import { box, boxBetween, cylinder, group, makeRandom } from './helpers.js'

const random = makeRandom(5150)

function litWindow(width, height, warm) {
  const material = warm
    ? unlit(0xffd9a0)
    : unlit(0x2a3550)
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
  return pane
}

/** Two storey building on the far side of the alley. */
function neighborBuilding() {
  const N = LAYOUT.neighbor
  const g = group('neighbor')
  const wall = toon(PALETTE.neighborWall)
  const wall2 = toon(PALETTE.neighborWall2)

  g.add(boxBetween(N.minX, N.maxX, 0, N.height, N.minZ, N.maxZ, wall))
  // Storey band and roof parapet.
  g.add(boxBetween(N.minX - 0.06, N.maxX + 0.06, 2.5, 2.72, N.minZ, N.maxZ + 0.06, wall2))
  g.add(boxBetween(N.minX - 0.08, N.maxX + 0.08, N.height, N.height + 0.3, N.minZ, N.maxZ + 0.08, wall2))

  // Shuttered ground-floor shop facing the street.
  const shutter = boxBetween(N.minX + 0.6, N.maxX - 0.5, SIDEWALK_Y, SIDEWALK_Y + 2.1, N.maxZ, N.maxZ + 0.08, toon(PALETTE.shutter))
  g.add(shutter)
  for (let i = 0; i < 9; i += 1) {
    const line = boxBetween(
      N.minX + 0.6,
      N.maxX - 0.5,
      SIDEWALK_Y + 0.16 + i * 0.22,
      SIDEWALK_Y + 0.2 + i * 0.22,
      N.maxZ + 0.08,
      N.maxZ + 0.1,
      toon(0x2f3850),
    )
    line.castShadow = false
    g.add(line)
  }
  const oldSign = boxBetween(N.minX + 0.5, N.maxX - 0.4, SIDEWALK_Y + 2.2, SIDEWALK_Y + 2.62, N.maxZ, N.maxZ + 0.12, toon(0x55405a))
  g.add(oldSign)
  const oldSignFace = boxBetween(N.minX + 0.7, N.maxX - 0.6, SIDEWALK_Y + 2.28, SIDEWALK_Y + 2.54, N.maxZ + 0.12, N.maxZ + 0.14, unlit(0x9b7fb0))
  oldSignFace.castShadow = false
  g.add(oldSignFace)

  // Upper windows, a couple of them still awake.
  const frame = toon(0x39425c)
  for (let floor = 0; floor < 2; floor += 1) {
    for (let i = 0; i < 4; i += 1) {
      const x = N.minX + 0.9 + i * 1.25
      const y = 3.1 + floor * 1.15
      g.add(boxBetween(x - 0.42, x + 0.42, y - 0.46, y + 0.46, N.maxZ, N.maxZ + 0.07, frame))
      const warm = random() > 0.55
      const pane = litWindow(0.7, 0.74, warm)
      pane.position.set(x, y, N.maxZ + 0.09)
      g.add(pane)
      if (warm) {
        const glow = makeGlowPlane(0xffcf94, 1.5, 1.5, 0.22)
        glow.position.set(x, y, N.maxZ + 0.2)
        markAsEffect(glow)
        g.add(glow)
      }
    }
  }

  // Rooftop clutter: tank, aerials and a laundry pole.
  const tank = box(1.1, 0.8, 1.0, toon(0x8f99b3), [N.minX + 1.6, N.height + 0.7, -6.4])
  g.add(tank)
  ;[
    [N.minX + 1.6, -6.4],
    [N.minX + 1.62, -6.4],
  ].forEach(([x, z], i) => {
    const leg = cylinder(0.06, 0.06, 0.4, toon(PALETTE.metalDark), 6)
    leg.position.set(x + i * 0.6, N.height + 0.2, z)
    g.add(leg)
  })
  const aerial = cylinder(0.03, 0.03, 1.6, toon(PALETTE.metalDark), 6)
  aerial.position.set(N.maxX - 1.2, N.height + 1.1, -3.4)
  g.add(aerial)
  for (let i = 0; i < 3; i += 1) {
    const cross = box(0.6, 0.03, 0.03, toon(PALETTE.metalDark), [N.maxX - 1.2, N.height + 0.9 + i * 0.28, -3.4])
    g.add(cross)
  }
  ;[-1, 1].forEach((side) => {
    const post = cylinder(0.045, 0.045, 0.9, toon(PALETTE.metal), 6)
    post.position.set(N.minX + 3.4, N.height + 0.75, -8.4 + side * 1.1)
    g.add(post)
  })
  const rail = cylinder(0.025, 0.025, 2.2, toon(PALETTE.metal), 6)
  rail.rotation.x = Math.PI / 2
  rail.position.set(N.minX + 3.4, N.height + 1.15, -8.4)
  g.add(rail)

  // Alley-facing side: pipes, meter box, air conditioners.
  const pipe = cylinder(0.07, 0.07, N.height - 0.4, toon(PALETTE.metalDark), 8)
  pipe.position.set(N.maxX + 0.1, (N.height - 0.4) / 2, -3.0)
  g.add(pipe)
  const meter = box(0.16, 0.5, 0.4, toon(PALETTE.metal), [N.maxX + 0.12, SIDEWALK_Y + 1.5, -2.0])
  g.add(meter)
  for (let i = 0; i < 2; i += 1) {
    const ac = box(0.36, 0.5, 0.72, toon(PALETTE.metal), [N.maxX + 0.2, 1.5 + i * 2.0, -4.6 - i * 1.2])
    g.add(ac)
  }
  // Outside staircase silhouette.
  for (let i = 0; i < 7; i += 1) {
    const step = box(0.7, 0.06, 0.3, toon(PALETTE.metalDark), [N.maxX - 0.4, 0.7 + i * 0.33, -7.6 + i * 0.32])
    g.add(step)
  }

  return g
}

/** Low block closing the scene behind the shop. */
function backBuilding() {
  const B = LAYOUT.backBuilding
  const g = group('back-building')
  const wall = toon(0x2f374d)
  g.add(boxBetween(B.minX, B.maxX, 0, B.height, B.minZ, B.maxZ, wall))
  g.add(boxBetween(B.minX - 0.08, B.maxX + 0.08, B.height, B.height + 0.26, B.minZ, B.maxZ + 0.08, toon(0x39425c)))

  for (let floor = 0; floor < 2; floor += 1) {
    for (let i = 0; i < 3; i += 1) {
      const x = B.minX + 0.9 + i * 1.5
      const y = 1.5 + floor * 1.5
      g.add(boxBetween(x - 0.36, x + 0.36, y - 0.4, y + 0.4, B.maxZ, B.maxZ + 0.07, toon(0x39425c)))
      const warm = random() > 0.6
      const pane = litWindow(0.6, 0.64, warm)
      pane.position.set(x, y, B.maxZ + 0.09)
      g.add(pane)
      if (warm) {
        const glow = makeGlowPlane(0xffcf94, 1.3, 1.3, 0.18)
        glow.position.set(x, y, B.maxZ + 0.2)
        markAsEffect(glow)
        g.add(glow)
      }
    }
  }

  const tank = cylinder(0.42, 0.42, 0.8, toon(0x8f99b3), 12)
  tank.position.set(0.4, B.height + 0.6, -7.0)
  g.add(tank)
  return g
}

/** Low walls and hedges on the far pavements, so the streets read as continuing. */
function farSideDressing() {
  const g = group('far-side')
  const wall = toon(0x39425c)
  const hedge = toon(0x2f5744)

  g.add(boxBetween(-LAYOUT.baseHalf, LAYOUT.baseHalf, SIDEWALK_Y, SIDEWALK_Y + 0.75, 10.55, 10.85, wall))
  g.add(boxBetween(10.55, 10.85, SIDEWALK_Y, SIDEWALK_Y + 0.75, -LAYOUT.baseHalf, 10.55, wall))

  for (let x = -9.6; x < 8.4; x += 1.4) {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), hedge)
    bush.position.set(x, SIDEWALK_Y + 0.75, 10.7)
    bush.scale.set(1, 0.7, 0.8)
    bush.castShadow = true
    g.add(bush)
  }
  for (let z = -9.6; z < 9.6; z += 1.4) {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), hedge)
    bush.position.set(10.7, SIDEWALK_Y + 0.75, z)
    bush.scale.set(0.8, 0.7, 1)
    bush.castShadow = true
    g.add(bush)
  }

  // A dim vending machine across the road keeps the far pavement alive.
  const unit = group('far-vending')
  unit.add(box(0.76, 1.8, 0.6, toon(0x8f4f4a), [0, 0.9, 0]))
  const face = box(0.62, 0.9, 0.03, unlit(0xffe1a8), [0, 1.15, 0.31])
  face.castShadow = false
  unit.add(face)
  const glow = makeGlowPlane(0xffdca2, 1.8, 2.0, 0.28)
  glow.position.set(0, 1.1, 0.45)
  markAsEffect(glow)
  unit.add(glow)
  unit.position.set(6.6, SIDEWALK_Y, 9.4)
  unit.rotation.y = Math.PI
  g.add(unit)

  return g
}

export function buildNeighbors() {
  const g = group('neighbors')
  g.add(neighborBuilding())
  g.add(backBuilding())
  g.add(farSideDressing())
  return g
}

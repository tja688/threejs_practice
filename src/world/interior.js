import * as THREE from 'three'
import { PALETTE } from '../core/palette.js'
import {
  glass,
  goodsTexture,
  magazineTexture,
  makeGlowPlane,
  posterTexture,
  toon,
  unlit,
} from '../core/materials.js'
import { markAsEffect } from '../core/layers.js'
import { box, boxBetween, group, makeRandom } from './helpers.js'

const IN = {
  minX: -3.22,
  maxX: 1.22,
  minZ: -3.02,
  maxZ: 1.3,
  floor: 0.37,
  ceiling: 3.02,
}

const random = makeRandom(20240816)

function shellAndLight(ctx) {
  const g = group('interior-shell')

  const floor = boxBetween(IN.minX, IN.maxX, IN.floor - 0.02, IN.floor, IN.minZ, IN.maxZ, toon(PALETTE.floorIndoor))
  floor.castShadow = false
  g.add(floor)

  // Guidance stripe by the entrance.
  const guide = boxBetween(-0.75, 0.75, IN.floor, IN.floor + 0.006, 0.55, 0.68, unlit(PALETTE.floorGuide))
  guide.castShadow = false
  g.add(guide)

  const ceiling = boxBetween(IN.minX, IN.maxX, IN.ceiling, IN.ceiling + 0.1, IN.minZ, IN.maxZ, toon(PALETTE.ceiling))
  ceiling.castShadow = false
  g.add(ceiling)

  // Recessed strip lights.
  const strip = unlit(0xfffaf0)
  for (let i = 0; i < 4; i += 1) {
    const z = IN.minZ + 0.55 + i * 1.05
    const panel = boxBetween(IN.minX + 0.3, IN.maxX - 0.3, IN.ceiling - 0.05, IN.ceiling, z - 0.11, z + 0.11, strip)
    panel.castShadow = false
    g.add(panel)
    const halo = makeGlowPlane(0xfff3d8, 4.2, 1.1, 0.22)
    halo.rotation.x = Math.PI / 2
    halo.position.set(-1.0, IN.ceiling - 0.09, z)
    markAsEffect(halo)
    g.add(halo)
  }

  const lightA = new THREE.PointLight(PALETTE.interiorWarm, 9, 7.5, 2)
  lightA.position.set(-1.7, IN.ceiling - 0.35, -1.4)
  const lightB = new THREE.PointLight(0xfff0dc, 9, 7.5, 2)
  lightB.position.set(0.2, IN.ceiling - 0.35, 0.55)
  g.add(lightA, lightB)
  ctx.interiorLights = [lightA, lightB]

  return g
}

/** Walk-in drink coolers along the back wall: the cold blue heart of the shop. */
function drinkCoolers() {
  const g = group('coolers')
  const frame = toon(PALETTE.cooler)
  const inner = unlit(0xdff3ff)
  const bottleGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.2, 6)
  const bottleMaterial = toon(0xffffff, { emissive: 0x27405c, emissiveIntensity: 0.5 })

  const units = 3
  const width = 1.0
  const startX = -2.75
  const bottles = []

  for (let u = 0; u < units; u += 1) {
    const x0 = startX + u * (width + 0.06)
    const x1 = x0 + width
    const z0 = IN.minZ
    const z1 = IN.minZ + 0.58
    g.add(boxBetween(x0, x1, IN.floor, IN.floor + 2.05, z0, z1 - 0.5, frame))
    g.add(boxBetween(x0, x0 + 0.07, IN.floor, IN.floor + 2.05, z0, z1, frame))
    g.add(boxBetween(x1 - 0.07, x1, IN.floor, IN.floor + 2.05, z0, z1, frame))
    g.add(boxBetween(x0, x1, IN.floor + 1.98, IN.floor + 2.05, z0, z1, frame))
    g.add(boxBetween(x0, x1, IN.floor, IN.floor + 0.14, z0, z1, frame))

    // Backlit interior.
    const back = boxBetween(x0 + 0.07, x1 - 0.07, IN.floor + 0.14, IN.floor + 1.98, z0 + 0.02, z0 + 0.06, inner)
    back.castShadow = false
    g.add(back)

    // Shelves of bottles.
    for (let s = 0; s < 4; s += 1) {
      const y = IN.floor + 0.28 + s * 0.44
      const shelf = boxBetween(x0 + 0.07, x1 - 0.07, y - 0.03, y, z0 + 0.04, z1 - 0.5, frame)
      shelf.castShadow = false
      g.add(shelf)
      for (let b = 0; b < 8; b += 1) {
        bottles.push([x0 + 0.14 + b * 0.105, y + 0.1, z0 + 0.14])
        if (s > 0) bottles.push([x0 + 0.14 + b * 0.105, y + 0.1, z0 + 0.3])
      }
    }

    // Glass door with a warm reflection line.
    const door = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.1, 1.8), glass({ color: 0xbfe9ff, opacity: 0.2 }))
    door.position.set((x0 + x1) / 2, IN.floor + 1.08, z1 - 0.48)
    markAsEffect(door)
    g.add(door)

    const glow = makeGlowPlane(PALETTE.coolerGlow, width * 1.6, 2.6, 0.3)
    glow.position.set((x0 + x1) / 2, IN.floor + 1.1, z1 - 0.4)
    markAsEffect(glow)
    g.add(glow)
  }

  const mesh = new THREE.InstancedMesh(bottleGeometry, bottleMaterial, bottles.length)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const hues = [0.02, 0.09, 0.15, 0.32, 0.55, 0.62, 0.92]
  bottles.forEach((position, i) => {
    dummy.position.set(position[0], position[1], position[2])
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    color.setHSL(hues[Math.floor(random() * hues.length)], 0.55, 0.68)
    mesh.setColorAt(i, color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.castShadow = false
  g.add(mesh)

  return g
}

/** Open chilled case: bento boxes, onigiri and sandwiches. */
function bentoCase() {
  const g = group('bento')
  const frame = toon(PALETTE.shelf)
  const x0 = 0.15
  const x1 = 1.2
  const z0 = IN.minZ
  const z1 = IN.minZ + 0.72

  g.add(boxBetween(x0, x1, IN.floor, IN.floor + 0.5, z0, z1, frame))
  g.add(boxBetween(x0, x1, IN.floor + 0.5, IN.floor + 1.9, z0, z0 + 0.12, frame))
  g.add(boxBetween(x0, x0 + 0.07, IN.floor + 0.5, IN.floor + 1.9, z0, z1, frame))
  g.add(boxBetween(x1 - 0.07, x1, IN.floor + 0.5, IN.floor + 1.9, z0, z1, frame))
  const canopy = boxBetween(x0, x1, IN.floor + 1.82, IN.floor + 1.9, z0, z1, frame)
  g.add(canopy)
  const tube = boxBetween(x0 + 0.07, x1 - 0.07, IN.floor + 1.76, IN.floor + 1.82, z0 + 0.12, z1 - 0.05, unlit(0xfff6e0))
  tube.castShadow = false
  g.add(tube)

  // Three tiers of packaged food.
  const foodGeometry = new THREE.BoxGeometry(0.17, 0.07, 0.24)
  const foodMaterial = toon(0xffffff)
  const slots = []
  for (let tier = 0; tier < 3; tier += 1) {
    const y = IN.floor + 0.55 + tier * 0.42
    const shelf = boxBetween(x0 + 0.07, x1 - 0.07, y - 0.03, y, z0 + 0.1, z1 - 0.06, frame)
    shelf.castShadow = false
    g.add(shelf)
    for (let i = 0; i < 5; i += 1) {
      slots.push([x0 + 0.16 + i * 0.19, y + 0.04, z0 + 0.3])
      slots.push([x0 + 0.16 + i * 0.19, y + 0.04, z0 + 0.55])
    }
  }
  const mesh = new THREE.InstancedMesh(foodGeometry, foodMaterial, slots.length)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  slots.forEach((position, i) => {
    dummy.position.set(position[0], position[1], position[2])
    dummy.rotation.y = (random() - 0.5) * 0.1
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    color.setHSL(0.05 + random() * 0.12, 0.35 + random() * 0.3, 0.7)
    mesh.setColorAt(i, color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  g.add(mesh)

  const glow = makeGlowPlane(0xffe6bb, 1.6, 1.8, 0.22)
  glow.position.set((x0 + x1) / 2, IN.floor + 1.1, z1 + 0.1)
  markAsEffect(glow)
  g.add(glow)

  return g
}

/** Two gondola runs of snacks and instant noodles down the middle. */
function gondolaShelves() {
  const g = group('shelves')
  const frame = toon(PALETTE.shelf)
  const foot = toon(PALETTE.shelfDark)

  const rows = [
    { z: -2.0, seed: 1 },
    { z: -0.75, seed: 2 },
  ]
  rows.forEach(({ z, seed }) => {
    const x0 = -2.85
    const x1 = 1.1
    const depth = 0.46
    g.add(boxBetween(x0, x1, IN.floor, IN.floor + 0.12, z - depth / 2, z + depth / 2, foot))
    g.add(boxBetween(x0, x1, IN.floor + 0.12, IN.floor + 1.45, z - 0.03, z + 0.03, frame))
    g.add(boxBetween(x0, x0 + 0.05, IN.floor, IN.floor + 1.45, z - depth / 2, z + depth / 2, frame))
    g.add(boxBetween(x1 - 0.05, x1, IN.floor, IN.floor + 1.45, z - depth / 2, z + depth / 2, frame))
    g.add(boxBetween(x0, x1, IN.floor + 1.4, IN.floor + 1.45, z - depth / 2, z + depth / 2, frame))

    for (let level = 0; level < 4; level += 1) {
      const y = IN.floor + 0.2 + level * 0.32
      const shelf = boxBetween(x0, x1, y, y + 0.03, z - depth / 2, z + depth / 2, frame)
      shelf.castShadow = false
      g.add(shelf)
      // Goods, front and back of the run.
      ;[1, -1].forEach((side) => {
        const goods = boxBetween(
          x0 + 0.06,
          x1 - 0.06,
          y + 0.03,
          y + 0.26,
          z + side * 0.1,
          z + side * (depth / 2 - 0.02),
          toon(0xffffff, { map: goodsTexture(seed * 10 + level * 2 + (side > 0 ? 0 : 1)) }),
        )
        goods.castShadow = false
        g.add(goods)
      })
      // Price rail.
      const rail = boxBetween(x0, x1, y + 0.03, y + 0.07, z + depth / 2 - 0.01, z + depth / 2 + 0.01, unlit(0xf5f2e8))
      rail.castShadow = false
      g.add(rail)
    }
  })

  // Hanging aisle signs.
  const signMaterial = unlit(0xf3f7ff)
  rows.forEach(({ z }, i) => {
    const sign = boxBetween(-1.2, 0.3, IN.ceiling - 0.55, IN.ceiling - 0.3, z - 0.02, z + 0.02, signMaterial)
    sign.castShadow = false
    g.add(sign)
    const bar = boxBetween(-0.5, -0.46, IN.ceiling - 0.3, IN.ceiling, z - 0.01, z + 0.01, toon(PALETTE.metal))
    g.add(bar)
    if (i === 0) {
      const accent = boxBetween(-1.2, 0.3, IN.ceiling - 0.55, IN.ceiling - 0.5, z - 0.03, z + 0.03, unlit(PALETTE.brandGreen))
      accent.castShadow = false
      g.add(accent)
    }
  })

  return g
}

/** Counter run along the left wall: register, coffee, oden, hot snacks. */
function counter(ctx) {
  const g = group('counter')
  const body = toon(PALETTE.counter)
  const metal = toon(PALETTE.metal)
  const x0 = IN.minX
  const x1 = IN.minX + 0.75
  const z0 = -0.55
  const z1 = 1.15

  g.add(boxBetween(x0, x1, IN.floor, IN.floor + 0.92, z0, z1, body))
  g.add(boxBetween(x0, x1 + 0.06, IN.floor + 0.92, IN.floor + 0.98, z0 - 0.04, z1 + 0.04, toon(PALETTE.wood)))

  // Register + card terminal.
  g.add(box(0.34, 0.2, 0.3, toon(0xe8ecf2), [x0 + 0.42, IN.floor + 1.08, z1 - 0.35]))
  const screen = box(0.03, 0.22, 0.28, unlit(0x8fe3ff), [x0 + 0.6, IN.floor + 1.3, z1 - 0.35])
  screen.rotation.z = -0.12
  g.add(screen)

  // Coffee machine.
  g.add(box(0.4, 0.55, 0.42, toon(0x3a4258), [x0 + 0.38, IN.floor + 1.25, z0 + 0.42]))
  g.add(box(0.42, 0.06, 0.44, unlit(0xffc98a), [x0 + 0.38, IN.floor + 1.05, z0 + 0.42]))

  // Oden pot: stainless tray with a warm glow.
  const oden = group('oden')
  oden.add(box(0.5, 0.28, 0.62, metal, [0, 0.14, 0]))
  const soup = box(0.42, 0.03, 0.54, unlit(0xe8a95e), [0, 0.29, 0])
  oden.add(soup)
  oden.position.set(x0 + 0.4, IN.floor + 0.98, z1 - 0.9)
  g.add(oden)

  // Hot snack case on the counter.
  const caseGroup = group('hot-case')
  caseGroup.add(box(0.44, 0.4, 0.5, toon(0xe9edf3), [0, 0.2, 0]))
  const caseGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34), glass({ color: 0xffe0b0, opacity: 0.25 }))
  caseGlass.position.set(0.23, 0.22, 0)
  caseGlass.rotation.y = Math.PI / 2
  markAsEffect(caseGlass)
  caseGroup.add(caseGlass)
  caseGroup.position.set(x0 + 0.4, IN.floor + 0.98, z0 + 0.05)
  g.add(caseGroup)

  // Cigarette shelving and a menu light box on the wall behind.
  const rack = boxBetween(x0 - 0.02, x0 + 0.22, IN.floor + 1.1, IN.floor + 2.35, z0, z1, toon(PALETTE.shelfDark))
  g.add(rack)
  const packGeometry = new THREE.BoxGeometry(0.02, 0.11, 0.07)
  const packMaterial = toon(0xffffff)
  const packs = []
  for (let row = 0; row < 5; row += 1) {
    for (let i = 0; i < 18; i += 1) {
      packs.push([x0 + 0.24, IN.floor + 1.2 + row * 0.24, z0 + 0.06 + i * 0.09])
    }
  }
  const packMesh = new THREE.InstancedMesh(packGeometry, packMaterial, packs.length)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  packs.forEach((position, i) => {
    dummy.position.set(position[0], position[1], position[2])
    dummy.updateMatrix()
    packMesh.setMatrixAt(i, dummy.matrix)
    color.setHSL(random(), 0.3, 0.72)
    packMesh.setColorAt(i, color)
  })
  packMesh.instanceMatrix.needsUpdate = true
  if (packMesh.instanceColor) packMesh.instanceColor.needsUpdate = true
  packMesh.castShadow = false
  g.add(packMesh)

  const menuMaterial = unlit(0xffffff, {
    map: posterTexture(21, { bg: '#fff8ea', accent: '#e2653f', ink: '#2b3040', blob: '#f7c85c' }),
    fresh: true,
  })
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), menuMaterial)
  menu.rotation.y = Math.PI / 2
  menu.position.set(x0 + 0.24, IN.floor + 2.55, z1 - 0.6)
  g.add(menu)

  ctx.addReflection({ x: -3.0, z: 1.0, color: 0xffd8a0, strength: 0.2, radius: 1.2 })
  return g
}

/** Magazine rack facing the street window. */
function magazineRack() {
  const g = group('magazines')
  const frame = toon(PALETTE.shelfDark)
  const x0 = -3.0
  const x1 = -1.35
  const z = 1.02

  g.add(boxBetween(x0, x1, IN.floor, IN.floor + 0.1, z - 0.2, z + 0.2, frame))
  g.add(boxBetween(x0, x0 + 0.05, IN.floor, IN.floor + 1.3, z - 0.2, z + 0.2, frame))
  g.add(boxBetween(x1 - 0.05, x1, IN.floor, IN.floor + 1.3, z - 0.2, z + 0.2, frame))

  for (let tier = 0; tier < 3; tier += 1) {
    const y = IN.floor + 0.22 + tier * 0.42
    const shelf = boxBetween(x0, x1, y, y + 0.03, z - 0.2, z + 0.2, frame)
    shelf.castShadow = false
    g.add(shelf)
    for (let i = 0; i < 6; i += 1) {
      const cover = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.33),
        unlit(0xffffff, { map: magazineTexture(tier * 7 + i), fresh: true }),
      )
      cover.position.set(x0 + 0.18 + i * 0.27, y + 0.19, z + 0.19)
      cover.rotation.x = -0.22
      g.add(cover)
    }
  }
  return g
}

/** Ice cream chest freezer near the window. */
function freezer() {
  const g = group('freezer')
  const shell = toon(0xe3ecf4)
  const x0 = 0.3
  const x1 = 1.15
  const z0 = -1.35
  const z1 = -0.35
  g.add(boxBetween(x0, x1, IN.floor, IN.floor + 0.85, z0, z1, shell))
  g.add(boxBetween(x0 - 0.04, x1 + 0.04, IN.floor + 0.85, IN.floor + 0.9, z0 - 0.04, z1 + 0.04, toon(PALETTE.metal)))
  const lid = boxBetween(x0 + 0.05, x1 - 0.05, IN.floor + 0.86, IN.floor + 0.88, z0 + 0.05, z1 - 0.05, unlit(0xd8f2ff))
  lid.castShadow = false
  g.add(lid)
  const glow = makeGlowPlane(0xbfe9ff, 1.3, 1.3, 0.2)
  glow.rotation.x = -Math.PI / 2
  glow.position.set((x0 + x1) / 2, IN.floor + 0.95, (z0 + z1) / 2)
  markAsEffect(glow)
  g.add(glow)
  // Sale banner hanging above.
  const banner = boxBetween(x0, x1, IN.floor + 1.5, IN.floor + 1.78, z0 + 0.4, z0 + 0.42, unlit(PALETTE.brandOrange))
  banner.castShadow = false
  g.add(banner)
  return g
}

/** Staff door, lockers and stacked crates in the back corner. */
function backOfHouse() {
  const g = group('back-of-house')
  const door = boxBetween(-3.2, -2.5, IN.floor, IN.floor + 2.0, IN.minZ, IN.minZ + 0.06, toon(0xd4d9e2))
  g.add(door)
  const sign = boxBetween(-3.05, -2.65, IN.floor + 1.72, IN.floor + 1.88, IN.minZ + 0.06, IN.minZ + 0.08, unlit(PALETTE.brandGreen))
  sign.castShadow = false
  g.add(sign)
  for (let i = 0; i < 3; i += 1) {
    g.add(boxBetween(-3.2, -2.86, IN.floor + i * 0.62, IN.floor + 0.58 + i * 0.62, -2.4, -1.95, toon(PALETTE.shelfDark)))
  }
  for (let i = 0; i < 3; i += 1) {
    const crate = box(0.34, 0.2, 0.3, toon(i % 2 ? PALETTE.brandOrange : PALETTE.vendingBlue), [
      -3.0,
      IN.floor + 0.1 + i * 0.21,
      -1.5,
    ])
    crate.rotation.y = (random() - 0.5) * 0.2
    g.add(crate)
  }
  return g
}

export function buildInterior(ctx) {
  const g = group('interior')
  g.add(shellAndLight(ctx))
  g.add(drinkCoolers())
  g.add(bentoCase())
  g.add(gondolaShelves())
  g.add(counter(ctx))
  g.add(magazineRack())
  g.add(freezer())
  g.add(backOfHouse())
  return g
}

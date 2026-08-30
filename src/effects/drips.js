import * as THREE from 'three'
import { getGlowTexture } from '../core/materials.js'
import { markAsEffect } from '../core/layers.js'
import { LAYOUT, SIDEWALK_Y } from '../world/layout.js'
import { group, makeRandom } from '../world/helpers.js'

const S = LAYOUT.store

/**
 * Water running off the canopy edge: a falling bead plus a splash ring that
 * blinks when it lands.
 */
export function createDrips(ctx) {
  const g = group('drips')
  const random = makeRandom(4242)

  const edgeY = LAYOUT.awning.height - 0.2
  const groundY = SIDEWALK_Y + 0.03
  const spots = []

  for (let i = 0; i < 9; i += 1) {
    spots.push({ x: S.minX + 0.2 + i * 0.55, z: S.maxZ + LAYOUT.awning.depth - 0.04 })
  }
  for (let i = 0; i < 4; i += 1) {
    spots.push({ x: S.maxX + LAYOUT.awning.depth - 0.04, z: S.maxZ - 0.25 - i * 0.6 })
  }

  const beadGeometry = new THREE.BoxGeometry(0.022, 0.13, 0.022)
  const beadMaterial = new THREE.MeshBasicMaterial({
    color: 0xa8ccec,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  })
  const beads = new THREE.InstancedMesh(beadGeometry, beadMaterial, spots.length)
  beads.frustumCulled = false
  markAsEffect(beads)
  g.add(beads)

  const splashMaterial = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color: 0x9fc8ee,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const splashes = spots.map((spot) => {
    const sprite = new THREE.Sprite(splashMaterial.clone())
    sprite.position.set(spot.x, groundY, spot.z)
    sprite.scale.set(0.4, 0.4, 1)
    markAsEffect(sprite)
    g.add(sprite)
    return sprite
  })

  const phases = spots.map(() => random())
  const speeds = spots.map(() => 0.42 + random() * 0.3)
  const dummy = new THREE.Object3D()
  const fallHeight = edgeY - groundY

  ctx.addUpdate((time) => {
    spots.forEach((spot, i) => {
      const t = (phases[i] + time * speeds[i]) % 1
      const drop = t * t // gravity
      const y = edgeY - drop * fallHeight
      dummy.position.set(spot.x, y, spot.z)
      dummy.scale.set(1, 0.7 + t * 1.6, 1)
      dummy.updateMatrix()
      beads.setMatrixAt(i, dummy.matrix)

      const landed = Math.max(0, t - 0.86) / 0.14
      const sprite = splashes[i]
      sprite.material.opacity = landed > 0 ? (1 - landed) * 0.5 : 0
      const s = 0.18 + landed * 0.55
      sprite.scale.set(s, s, 1)
    })
    beads.instanceMatrix.needsUpdate = true
  })

  return g
}

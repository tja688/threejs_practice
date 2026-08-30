import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * The diorama is built from a few hundred small static boxes. Merging every
 * batch that shares a material collapses those into a handful of draw calls,
 * which matters here because the outline pipeline renders the scene twice.
 *
 * Anything that moves, is instanced, or lives on the effects layer is skipped.
 * Materials are reused as-is, so animated colours keep working.
 */
export function mergeStatic(root) {
  root.updateMatrixWorld(true)

  const buckets = new Map()

  root.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh || object.isSkinnedMesh) return
    if (object.isSprite || object.isPoints) return
    if (Array.isArray(object.material)) return
    if (object.layers.mask !== 1) return
    if (!object.geometry || !object.geometry.attributes.position) return

    for (let node = object; node; node = node.parent) {
      if (node.userData.dynamic) return
    }

    const key = `${object.material.uuid}|${object.castShadow ? 1 : 0}|${object.receiveShadow ? 1 : 0}`
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { material: object.material, castShadow: object.castShadow, receiveShadow: object.receiveShadow, meshes: [] }
      buckets.set(key, bucket)
    }
    bucket.meshes.push(object)
  })

  let merged = 0
  buckets.forEach((bucket) => {
    if (bucket.meshes.length < 2) return

    const geometries = bucket.meshes.map((mesh) => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
      geometry.applyMatrix4(mesh.matrixWorld)
      for (const name of Object.keys(geometry.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') geometry.deleteAttribute(name)
      }
      if (!geometry.attributes.uv) {
        const count = geometry.attributes.position.count
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2))
      }
      return geometry
    })

    const combined = mergeGeometries(geometries, false)
    geometries.forEach((geometry) => geometry.dispose())
    if (!combined) return

    const mesh = new THREE.Mesh(combined, bucket.material)
    mesh.castShadow = bucket.castShadow
    mesh.receiveShadow = bucket.receiveShadow
    mesh.matrixAutoUpdate = false
    root.add(mesh)

    bucket.meshes.forEach((original) => {
      original.removeFromParent()
      original.geometry.dispose()
    })
    merged += bucket.meshes.length
  })

  return merged
}

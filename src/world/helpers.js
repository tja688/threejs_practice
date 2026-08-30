import * as THREE from 'three'

/** Box mesh with shadows on by default. */
export function box(width, height, depth, material, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  if (position) mesh.position.set(position[0], position[1], position[2])
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** Box defined by its bounds, handy for architecture. */
export function boxBetween(x0, x1, y0, y1, z0, z1, material) {
  const mesh = box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), material)
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  return mesh
}

export function cylinder(radiusTop, radiusBottom, height, material, segments = 12) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** Extrude a 2D shape (x, z) upward into a slab whose top sits at `height`. */
export function slab(shape, height, material) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, height, 0)
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function group(name, children = []) {
  const g = new THREE.Group()
  g.name = name
  children.forEach((child) => child && g.add(child))
  return g
}

/** Deterministic pseudo random, so the scene is identical on every reload. */
export function makeRandom(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Sagging cable between two points. */
export function cableCurve(from, to, sag = 0.6, segments = 12) {
  const points = []
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const point = from.clone().lerp(to, t)
    point.y -= Math.sin(Math.PI * t) * sag
    points.push(point)
  }
  return new THREE.CatmullRomCurve3(points)
}

export function tube(curve, radius, material, tubular = 24) {
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubular, radius, 5, false), material)
  mesh.castShadow = false
  return mesh
}

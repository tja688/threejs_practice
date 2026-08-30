// Everything cel-shaded lives on the default layer and receives an outline.
// Transparent / additive effects (rain, glass, glow sprites, backdrop) live on
// EFFECT_LAYER so the outline pass can ignore them.
export const EFFECT_LAYER = 3

export function markAsEffect(object) {
  object.traverse((child) => child.layers.set(EFFECT_LAYER))
  return object
}

/** The main camera has to see the effects layer as well as the default one. */
export function enableAllLayers(camera) {
  camera.layers.enable(EFFECT_LAYER)
  return camera
}

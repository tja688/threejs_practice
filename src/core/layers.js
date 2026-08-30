// Everything cel-shaded lives on the default layer and receives an outline.
// Transparent / additive effects (rain, glass, glow sprites, backdrop) live on
// EFFECT_LAYER so the outline pass can ignore them.
export const DEFAULT_LAYER = 0
export const EFFECT_LAYER = 3

export function setLayerDeep(object, layer) {
  object.traverse((child) => child.layers.set(layer))
  return object
}

export function markAsEffect(object) {
  return setLayerDeep(object, EFFECT_LAYER)
}

/** The main camera has to see the effects layer as well as the default one. */
export function enableAllLayers(camera) {
  camera.layers.enable(EFFECT_LAYER)
  return camera
}

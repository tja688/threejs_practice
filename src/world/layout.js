/**
 * All world coordinates in metres, y = 0 is the asphalt.
 * The diorama is a square plinth; the street corner opens toward +X / +Z and
 * the convenience store sits in the middle of the block.
 */
export const LAYOUT = {
  baseHalf: 11,
  plinthDepth: 1.35,

  curbHeight: 0.34,
  blockEdge: 3.2, // curb line of the block on +X and +Z
  cornerRadius: 1.05,
  roadFar: 8.8, // far curb on the opposite side of both streets
  gutterWidth: 0.42,

  store: {
    minX: -3.4,
    maxX: 1.4,
    minZ: -3.2,
    maxZ: 1.4,
    wallHeight: 3.05,
    parapet: 0.62,
    floor: 0.36,
  },

  alley: { minX: -4.95, maxX: -3.4, minZ: -8.6, maxZ: 1.4 },

  neighbor: { minX: -10.4, maxX: -4.95, minZ: -10.4, maxZ: -1.7, height: 4.7 },

  backBuilding: { minX: -3.4, maxX: 1.4, minZ: -10.4, maxZ: -5.1, height: 4.3 },

  parking: { minX: -10.4, maxX: -5.0, minZ: -1.3, maxZ: 3.2 },

  awning: { depth: 1.25, height: 2.72 },
}

export const SIDEWALK_Y = LAYOUT.curbHeight

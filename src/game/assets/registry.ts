/**
 * Central asset registry — components reference these, never raw paths.
 *
 * Credits:
 * - kenney/*: Car Kit + Racing Kit by Kenney (kenney.nl), CC0 / public domain.
 * - grandTrack: "Race Track - C .001 - 3.3km" by Kristo.V (Sketchfab),
 *   CC Attribution-NonCommercial. Car prop removed, draco-compressed.
 */
export const MODELS = {
  grandTrack: '/models/track_grand.glb',
  carRace: '/models/kenney/race.glb',
  carKart: '/models/kenney/kart-ooli.glb',
  carFiretruck: '/models/kenney/firetruck.glb',
  carTractor: '/models/kenney/tractor.glb',
  roadStraight: '/models/kenney/roadStraight.glb',
  roadCornerSmall: '/models/kenney/roadCornerSmall.glb',
  roadCornerLarge: '/models/kenney/roadCornerLarge.glb',
  roadStart: '/models/kenney/roadStart.glb',
  treeLarge: '/models/kenney/treeLarge.glb',
  treeSmall: '/models/kenney/treeSmall.glb',
  grandStand: '/models/kenney/grandStand.glb',
  grandStandRound: '/models/kenney/grandStandRound.glb',
  grandStandCovered: '/models/kenney/grandStandCovered.glb',
  flagCheckers: '/models/kenney/flagCheckersSmall.glb',
  tire: '/models/kenney/debris-tire.glb',
  pylon: '/models/kenney/pylon.glb',
  tentLong: '/models/kenney/tentLong.glb',
  bannerTowerGreen: '/models/kenney/bannerTowerGreen.glb',
  bannerTowerRed: '/models/kenney/bannerTowerRed.glb',
} as const

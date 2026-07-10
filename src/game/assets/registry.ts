/**
 * Central asset registry — components reference these, never raw paths.
 *
 * Credits:
 * - car: "Orion Skylark GT" by dark_igorek (Sketchfab), CC Attribution.
 *   Compressed from the original via gltf-transform (draco + webp @1k).
 * - grandTrack: "Race Track - C .001 - 3.3km" by Kristo.V (Sketchfab),
 *   CC Attribution-NonCommercial. Car prop removed, draco-compressed.
 */
export const MODELS = {
  car: '/models/car.glb',
  grandTrack: '/models/track_grand.glb',
} as const

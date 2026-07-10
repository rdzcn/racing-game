import { nearestCenterlineIndex, type TrackData, type Vec2 } from './trackGeometry'

export interface SceneryPlacement extends Vec2 {
  /** uniform scale jitter so instances don't look cloned */
  scale: number
  rotationY: number
}

/** Deterministic PRNG (mulberry32) — same seed, same forest, every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Scatter positions across the map, rejecting anything too close to the
 * road (clearance) or outside the bounds. Deterministic for a given seed.
 */
export function generatePlacements(
  track: TrackData,
  count: number,
  options: { bound: number; clearance: number; seed: number },
): SceneryPlacement[] {
  const { bound, clearance, seed } = options
  const rand = mulberry32(seed)
  const placements: SceneryPlacement[] = []
  const limit = track.halfWidth + track.curbWidth + clearance
  const limitSq = limit * limit

  let attempts = 0
  const maxAttempts = count * 50
  while (placements.length < count && attempts < maxAttempts) {
    attempts++
    const x = (rand() * 2 - 1) * bound
    const z = (rand() * 2 - 1) * bound
    const i = nearestCenterlineIndex(track, x, z)
    const dx = track.centerline[i].x - x
    const dz = track.centerline[i].z - z
    if (dx * dx + dz * dz < limitSq) continue // too close to the road
    placements.push({ x, z, scale: 0.7 + rand() * 0.7, rotationY: rand() * Math.PI * 2 })
  }
  return placements
}

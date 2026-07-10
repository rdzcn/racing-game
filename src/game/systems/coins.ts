import type { TrackData, Vec2 } from './trackGeometry'

/** Coins sit on the track centerline at the configured gate slots. */
export function coinPositions(track: TrackData, coinSlots: number[]): Vec2[] {
  return coinSlots.map((slot) => {
    const g = track.gates[slot % track.gates.length]
    return { x: g.x, z: g.z }
  })
}

/**
 * Index of an uncollected coin within pickup radius of the car, or -1.
 * Call per frame; allocation-free.
 */
export function checkCoinPickup(
  positions: Vec2[],
  collected: readonly boolean[],
  x: number,
  z: number,
  radius: number,
): number {
  const r2 = radius * radius
  for (let i = 0; i < positions.length; i++) {
    if (collected[i]) continue
    const dx = positions[i].x - x
    const dz = positions[i].z - z
    if (dx * dx + dz * dz <= r2) return i
  }
  return -1
}

import type { Gate } from './trackGeometry'

/** Extra tolerance (m) added on top of the track's physical half-width when
 * checking gate crossings. Real racing lines commonly clip a curb or drift
 * onto the grass — especially through tight chicanes — and missing just one
 * intermediate gate stalls lap counting until the loop comes all the way
 * back around (very noticeable on the start/finish gate). Narrower,
 * technical tracks (e.g. Forest Kart Loop's chicane right after the start)
 * need this most, since their bare track-width radius leaves almost no
 * margin for error. */
const GATE_MARGIN = 4

/** Gate-crossing detection radius for a track — its physical width (from
 * centerline to the outer curb edge) plus `GATE_MARGIN`. Shared by
 * `RaceTracker` and tests so both stay in sync. */
export function gateRadius(track: { halfWidth: number; curbWidth: number }): number {
  return track.halfWidth + track.curbWidth + GATE_MARGIN
}

/**
 * Lap tracking via ordered checkpoint gates. Only the *next* expected gate
 * counts, and only when crossed moving in the track direction — so cutting
 * across the infield or driving the loop backwards can't complete a lap.
 */
export interface LapProgress {
  /** index of the gate that must be crossed next */
  nextGate: number
  /** gate 0 crossed at least once — the race clock is running */
  started: boolean
  /** signed distance along the current gate's tangent from the last frame
   * we were within its lateral/longitudinal box, or null if we don't have a
   * baseline yet (just entered the box, or the gate just advanced). Used to
   * detect the exact frame the car crosses the gate's line, rather than
   * merely being "near" it. */
  prevLongitudinal: number | null
}

export function createLapProgress(): LapProgress {
  return { nextGate: 0, started: false, prevLongitudinal: null }
}

export type GateEvent = 'none' | 'started' | 'gate' | 'lap'

/**
 * Call once per frame with car position + velocity. Mutates `progress`
 * (allocation-free) and reports what happened.
 */
export function processGateCrossing(
  progress: LapProgress,
  gates: Gate[],
  x: number,
  z: number,
  vx: number,
  vz: number,
  radius: number,
): GateEvent {
  const g = gates[progress.nextGate]
  const dx = x - g.x
  const dz = z - g.z
  // Treat the gate as a box, not a circle: check the lateral (perpendicular
  // to travel) and longitudinal (along travel) offsets independently. A
  // circular check (dx*dx + dz*dz <= radius*radius) sounds right but its
  // diagonal reach collapses to nearly nothing right at the track edges —
  // exactly where real racing lines cross checkpoints on wide turns and
  // chicanes — which made lap counting flaky (worse on narrower/technical
  // tracks). Independent thresholds keep the full lateral tolerance
  // regardless of how far ahead/behind the gate's sample point the car is.
  const lateral = dx * -g.tz + dz * g.tx
  const longitudinal = dx * g.tx + dz * g.tz
  if (Math.abs(lateral) > radius || Math.abs(longitudinal) > radius) {
    progress.prevLongitudinal = null // left the box — forget the baseline
    return 'none'
  }

  const prev = progress.prevLongitudinal
  progress.prevLongitudinal = longitudinal

  // must be moving with the track direction, not reversing through the gate
  if (vx * g.tx + vz * g.tz <= 0) return 'none'

  // Only count the exact frame the car crosses the gate's line (longitudinal
  // flips from behind to at/ahead), not merely being somewhere in the box —
  // being "near" the gate isn't the same as reaching it, and a proximity-only
  // check fires up to `radius` meters early, which is very visible on the
  // start/finish line (race "finishing" before the car reaches it) and threw
  // off recorded lap times.
  const justCrossed = longitudinal >= 0 && (prev === null || prev < 0)
  if (!justCrossed) return 'none'

  if (progress.nextGate === 0) {
    progress.nextGate = gates.length > 1 ? 1 : 0
    progress.prevLongitudinal = null
    if (!progress.started) {
      progress.started = true
      return 'started'
    }
    return 'lap'
  }
  progress.nextGate = (progress.nextGate + 1) % gates.length
  progress.prevLongitudinal = null
  return 'gate'
}

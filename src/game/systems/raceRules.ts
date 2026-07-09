import type { Gate } from './trackGeometry'

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
}

export function createLapProgress(): LapProgress {
  return { nextGate: 0, started: false }
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
  if (dx * dx + dz * dz > radius * radius) return 'none'
  // must be moving with the track direction, not reversing through the gate
  if (vx * g.tx + vz * g.tz <= 0) return 'none'

  if (progress.nextGate === 0) {
    progress.nextGate = gates.length > 1 ? 1 : 0
    if (!progress.started) {
      progress.started = true
      return 'started'
    }
    return 'lap'
  }
  progress.nextGate = (progress.nextGate + 1) % gates.length
  return 'gate'
}

/**
 * Per-frame values the DOM layer may display but must not re-render on.
 * Written by the vehicle controller every physics step; the HUD samples it
 * on its own low-frequency tick. Deliberately NOT a zustand store.
 *
 * Indexed per player (0 = P1, 1 = P2) — 2-player mode runs two independent
 * cars/physics worlds in parallel, so a single shared record would have one
 * car's numbers stomp the other's.
 */
export interface PlayerTelemetry {
  speedKmh: number
  /** signed, m/s — negative when reversing (drives wheel spin) */
  forwardSpeedMs: number
  /** -1..1 steering input (drives front-wheel visuals) */
  steer: number
}

function makeTelemetry(): PlayerTelemetry {
  return { speedKmh: 0, forwardSpeedMs: 0, steer: 0 }
}

export const telemetry: readonly [PlayerTelemetry, PlayerTelemetry] = [
  makeTelemetry(),
  makeTelemetry(),
]

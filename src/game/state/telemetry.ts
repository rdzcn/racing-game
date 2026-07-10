/**
 * Per-frame values the DOM layer may display but must not re-render on.
 * Written by the vehicle controller every physics step; the HUD samples it
 * on its own low-frequency tick. Deliberately NOT a zustand store.
 */
export const telemetry = {
  speedKmh: 0,
  /** signed, m/s — negative when reversing (drives wheel spin) */
  forwardSpeedMs: 0,
  /** -1..1 steering input (drives front-wheel visuals) */
  steer: 0,
}

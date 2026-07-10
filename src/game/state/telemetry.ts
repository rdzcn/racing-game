/**
 * Per-frame values the DOM layer may display but must not re-render on.
 * Written by the vehicle controller every physics step; the HUD samples it
 * on its own low-frequency tick. Deliberately NOT a zustand store.
 */
export const telemetry = {
  speedKmh: 0,
}

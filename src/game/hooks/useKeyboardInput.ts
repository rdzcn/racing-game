import { useEffect, useState } from 'react'
import { createKeyboardInput, type ControlScheme } from '../systems/input'
import type { DriveInput } from '../systems/vehicle'

/**
 * React binding for the keyboard input source. Returns a stable object
 * mutated in place by the source — read it in useFrame, never in render.
 * `scheme` picks which keys drive this instance — 'both' (default) for
 * single-player, 'wasd'/'arrows' when two of these run side by side.
 */
export function useKeyboardInput(scheme: ControlScheme = 'both'): Readonly<DriveInput> {
  // useState (never set) gives a render-safe stable object identity
  const [state] = useState<DriveInput>(() => ({ throttle: 0, steer: 0 }))

  useEffect(() => {
    const source = createKeyboardInput(window, state, scheme)
    return () => source.dispose()
  }, [state, scheme])

  return state
}

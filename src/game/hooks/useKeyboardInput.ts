import { useEffect, useState } from 'react'
import { createKeyboardInput } from '../systems/input'
import type { DriveInput } from '../systems/vehicle'

/**
 * React binding for the keyboard input source. Returns a stable object
 * mutated in place by the source — read it in useFrame, never in render.
 */
export function useKeyboardInput(): Readonly<DriveInput> {
  // useState (never set) gives a render-safe stable object identity
  const [state] = useState<DriveInput>(() => ({ throttle: 0, steer: 0 }))

  useEffect(() => {
    const source = createKeyboardInput(window, state)
    return () => source.dispose()
  }, [state])

  return state
}

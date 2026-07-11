import type { DriveInput } from './vehicle'

export interface InputSource {
  /** Mutated in place — safe to read every frame without allocation */
  state: DriveInput
  dispose(): void
}

/** Which keys drive a car — 'both' (single-player) accepts either scheme,
 * 'wasd'/'arrows' split the keyboard between two simultaneous players. */
export type ControlScheme = 'wasd' | 'arrows' | 'both'

interface SchemeKeys {
  up: Set<string>
  down: Set<string>
  left: Set<string>
  right: Set<string>
}

const SCHEME_KEYS: Record<ControlScheme, SchemeKeys> = {
  wasd: {
    up: new Set(['KeyW']),
    down: new Set(['KeyS']),
    left: new Set(['KeyA']),
    right: new Set(['KeyD']),
  },
  arrows: {
    up: new Set(['ArrowUp']),
    down: new Set(['ArrowDown']),
    left: new Set(['ArrowLeft']),
    right: new Set(['ArrowRight']),
  },
  both: {
    up: new Set(['ArrowUp', 'KeyW']),
    down: new Set(['ArrowDown', 'KeyS']),
    left: new Set(['ArrowLeft', 'KeyA']),
    right: new Set(['ArrowRight', 'KeyD']),
  },
}

/**
 * Arrow-key / WASD input source. Kept independent of React and the vehicle
 * controller so a gamepad source can be swapped in without touching either.
 * `scheme` lets two of these run side by side (P1 on WASD, P2 on arrows)
 * without either stealing the other's key presses.
 */
export function createKeyboardInput(
  target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  state: DriveInput = { throttle: 0, steer: 0 },
  scheme: ControlScheme = 'both',
): InputSource {
  const keys = SCHEME_KEYS[scheme]
  const isGameKey = (code: string) =>
    keys.up.has(code) || keys.down.has(code) || keys.left.has(code) || keys.right.has(code)

  const pressed = new Set<string>()
  state.throttle = 0
  state.steer = 0

  const axis = (pos: Set<string>, neg: Set<string>) => {
    let v = 0
    for (const code of pressed) {
      if (pos.has(code)) v += 1
      else if (neg.has(code)) v -= 1
    }
    return Math.max(-1, Math.min(1, v))
  }

  const recompute = () => {
    state.throttle = axis(keys.up, keys.down)
    state.steer = axis(keys.left, keys.right)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isGameKey(e.code)) return
    e.preventDefault() // arrows scroll the page otherwise
    pressed.add(e.code)
    recompute()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (!isGameKey(e.code)) return
    pressed.delete(e.code)
    recompute()
  }
  const onBlur = () => {
    pressed.clear()
    recompute()
  }

  target.addEventListener('keydown', onKeyDown as EventListener)
  target.addEventListener('keyup', onKeyUp as EventListener)
  target.addEventListener('blur', onBlur)

  return {
    state,
    dispose() {
      target.removeEventListener('keydown', onKeyDown as EventListener)
      target.removeEventListener('keyup', onKeyUp as EventListener)
      target.removeEventListener('blur', onBlur)
    },
  }
}

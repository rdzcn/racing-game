import type { DriveInput } from './vehicle'

export interface InputSource {
  /** Mutated in place — safe to read every frame without allocation */
  state: DriveInput
  dispose(): void
}

const THROTTLE_UP = new Set(['ArrowUp', 'KeyW'])
const THROTTLE_DOWN = new Set(['ArrowDown', 'KeyS'])
const STEER_LEFT = new Set(['ArrowLeft', 'KeyA'])
const STEER_RIGHT = new Set(['ArrowRight', 'KeyD'])

const isGameKey = (code: string) =>
  THROTTLE_UP.has(code) || THROTTLE_DOWN.has(code) || STEER_LEFT.has(code) || STEER_RIGHT.has(code)

/**
 * Arrow-key / WASD input source. Kept independent of React and the vehicle
 * controller so a gamepad source can be swapped in without touching either.
 */
export function createKeyboardInput(
  target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  state: DriveInput = { throttle: 0, steer: 0 },
): InputSource {
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
    state.throttle = axis(THROTTLE_UP, THROTTLE_DOWN)
    state.steer = axis(STEER_LEFT, STEER_RIGHT)
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

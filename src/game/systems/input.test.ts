import { describe, expect, it } from 'vitest'
import { createKeyboardInput } from './input'

const press = (code: string) =>
  new KeyboardEvent('keydown', { code, cancelable: true })
const release = (code: string) => new KeyboardEvent('keyup', { code })

describe('createKeyboardInput', () => {
  it('maps arrows and WASD to throttle/steer axes', () => {
    const input = createKeyboardInput(window)
    window.dispatchEvent(press('ArrowUp'))
    window.dispatchEvent(press('ArrowLeft'))
    expect(input.state).toEqual({ throttle: 1, steer: 1 })

    window.dispatchEvent(release('ArrowUp'))
    window.dispatchEvent(press('KeyS'))
    expect(input.state).toEqual({ throttle: -1, steer: 1 })
    input.dispose()
  })

  it('opposite keys cancel; keyup restores', () => {
    const input = createKeyboardInput(window)
    window.dispatchEvent(press('ArrowLeft'))
    window.dispatchEvent(press('ArrowRight'))
    expect(input.state.steer).toBe(0)
    window.dispatchEvent(release('ArrowRight'))
    expect(input.state.steer).toBe(1)
    input.dispose()
  })

  it('clears all input on window blur (no stuck keys)', () => {
    const input = createKeyboardInput(window)
    window.dispatchEvent(press('ArrowUp'))
    window.dispatchEvent(new Event('blur'))
    expect(input.state).toEqual({ throttle: 0, steer: 0 })
    input.dispose()
  })

  it('prevents default on game keys only', () => {
    const input = createKeyboardInput(window)
    const arrow = press('ArrowUp')
    const other = press('KeyQ')
    window.dispatchEvent(arrow)
    window.dispatchEvent(other)
    expect(arrow.defaultPrevented).toBe(true)
    expect(other.defaultPrevented).toBe(false)
    input.dispose()
  })

  it('stops listening after dispose', () => {
    const input = createKeyboardInput(window)
    input.dispose()
    window.dispatchEvent(press('ArrowUp'))
    expect(input.state.throttle).toBe(0)
  })
})

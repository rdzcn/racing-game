import { describe, expect, it } from 'vitest'
import { vehicleTuning as t } from '../config'
import { driveForceScalar, lateralGripImpulse, yawVelocity } from './vehicle'

describe('driveForceScalar', () => {
  it('accelerates forward under max speed', () => {
    expect(driveForceScalar(10, 1, t)).toBe(t.engineForce)
  })

  it('applies no force at or beyond max speed', () => {
    expect(driveForceScalar(t.maxSpeed, 1, t)).toBe(0)
    expect(driveForceScalar(t.maxSpeed + 5, 1, t)).toBe(0)
  })

  it('brakes/reverses with negative throttle, clamped at reverse max', () => {
    expect(driveForceScalar(10, -1, t)).toBe(-t.engineForce)
    expect(driveForceScalar(-t.maxReverseSpeed, -1, t)).toBe(0)
  })

  it('coasts to a stop: drag opposes motion, none near standstill', () => {
    expect(driveForceScalar(10, 0, t)).toBe(-t.coastDrag)
    expect(driveForceScalar(-5, 0, t)).toBe(t.coastDrag)
    expect(driveForceScalar(0.1, 0, t)).toBe(0)
  })
})

describe('yawVelocity', () => {
  it('is zero at standstill (no tank turning)', () => {
    expect(yawVelocity(1, 0, t)).toBe(0)
  })

  it('ramps with speed and saturates at full effectiveness', () => {
    const half = yawVelocity(1, t.steerFullEffectSpeed / 2, t)
    const full = yawVelocity(1, t.steerFullEffectSpeed, t)
    const beyond = yawVelocity(1, t.steerFullEffectSpeed * 3, t)
    expect(half).toBeCloseTo(t.steerRate / 2)
    expect(full).toBeCloseTo(t.steerRate)
    expect(beyond).toBeCloseTo(t.steerRate)
  })

  it('flips steering direction in reverse', () => {
    expect(Math.sign(yawVelocity(1, 10, t))).toBe(1)
    expect(Math.sign(yawVelocity(1, -10, t))).toBe(-1)
  })
})

describe('lateralGripImpulse', () => {
  const out = { x: 0, y: 0, z: 0 }

  it('opposes lateral velocity, leaves forward and vertical alone', () => {
    // car facing -z, sliding sideways +x while moving forward and falling
    const vel = { x: 4, y: -2, z: -10 }
    const fwd = { x: 0, y: 0, z: -1 }
    lateralGripImpulse(vel, fwd, 2, 0.05, t, out)
    expect(out.x).toBeLessThan(0) // cancels +x slide
    expect(out.y).toBe(0) // gravity untouched
    expect(out.z).toBeCloseTo(0) // forward motion untouched
  })

  it('never overshoots: correction factor capped at full cancellation', () => {
    const vel = { x: 4, y: 0, z: 0 }
    const fwd = { x: 0, y: 0, z: -1 }
    const mass = 2
    lateralGripImpulse(vel, fwd, mass, 10 /* huge dt */, t, out)
    // impulse/mass must not exceed the lateral velocity itself
    expect(Math.abs(out.x / mass)).toBeLessThanOrEqual(4)
  })
})

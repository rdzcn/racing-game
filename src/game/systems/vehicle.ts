import type { VehicleTuning } from '../config'

export interface DriveInput {
  /** -1..1 — positive = accelerate forward */
  throttle: number
  /** -1..1 — positive = steer left */
  steer: number
}

export interface Vec3Like {
  x: number
  y: number
  z: number
}

/**
 * Scalar drive force along the car's forward axis.
 * Arcade rules: throttle against current motion acts as brake (engineForce),
 * released throttle applies coast drag, speed is clamped at both ends.
 */
export function driveForceScalar(
  forwardSpeed: number,
  throttle: number,
  t: VehicleTuning,
): number {
  if (throttle > 0) {
    return forwardSpeed >= t.maxSpeed ? 0 : throttle * t.engineForce
  }
  if (throttle < 0) {
    return forwardSpeed <= -t.maxReverseSpeed ? 0 : throttle * t.engineForce
  }
  // coasting: drag opposing motion, dead zone near standstill to avoid jitter
  if (Math.abs(forwardSpeed) < 0.2) return 0
  return -Math.sign(forwardSpeed) * t.coastDrag
}

/**
 * Yaw angular velocity from steering input. Effectiveness ramps with speed
 * (no tank-turning at standstill) and flips sign in reverse, like a real car.
 */
export function yawVelocity(steer: number, forwardSpeed: number, t: VehicleTuning): number {
  const effectiveness = Math.min(Math.abs(forwardSpeed) / t.steerFullEffectSpeed, 1)
  return steer * t.steerRate * effectiveness * Math.sign(forwardSpeed || 1)
}

/**
 * Pitch/roll angular velocity that rights the car toward world-up.
 * `up` is the body's up axis in world space (unit). Damps existing tumble and
 * adds correction along the axis that rotates `up` toward (0,1,0) — the
 * cross product up × worldUp = (-up.z, 0, up.x). Yaw is untouched.
 */
export function uprightedAngvel(
  up: Vec3Like,
  angvelX: number,
  angvelZ: number,
  dt: number,
  t: VehicleTuning,
): { x: number; z: number } {
  const damp = Math.max(0, 1 - t.uprightDamping * dt)
  return {
    x: angvelX * damp - up.z * t.uprightStrength,
    z: angvelZ * damp + up.x * t.uprightStrength,
  }
}

/**
 * Velocity-proportional drag impulse for driving on grass (off-track).
 * Slows the car to a crawl without stopping it — forgiving, no hard walls.
 */
export function offTrackDragImpulse(
  velocity: Vec3Like,
  mass: number,
  dt: number,
  t: VehicleTuning,
  out: Vec3Like,
): Vec3Like {
  const k = Math.min(t.offTrackDrag * dt, 1) * mass
  out.x = -velocity.x * k
  out.y = 0
  out.z = -velocity.z * k
  return out
}

/**
 * Impulse cancelling a fraction of lateral (sideways) velocity this step —
 * arcade grip that stops the car sliding like a hockey puck.
 * `forward` must be normalized. Returns a newly-filled `out` (no allocation).
 */
export function lateralGripImpulse(
  velocity: Vec3Like,
  forward: Vec3Like,
  mass: number,
  dt: number,
  t: VehicleTuning,
  out: Vec3Like,
): Vec3Like {
  const fs = velocity.x * forward.x + velocity.y * forward.y + velocity.z * forward.z
  // lateral = velocity - forward * forwardSpeed (horizontal only — leave gravity alone)
  const latX = velocity.x - forward.x * fs
  const latZ = velocity.z - forward.z * fs
  const k = Math.min(t.grip * dt, 1) * mass
  out.x = -latX * k
  out.y = 0
  out.z = -latZ * k
  return out
}

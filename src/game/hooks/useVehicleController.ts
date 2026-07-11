import { useRef, type RefObject } from 'react'
import { Quaternion, Vector3 } from 'three'
import { useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { vehicleTuning } from '../config'
import { telemetry } from '../state/telemetry'
import {
  driveForceScalar,
  lateralGripImpulse,
  offTrackDragImpulse,
  uprightedAngvel,
  yawVelocity,
  type Vec3Like,
} from '../systems/vehicle'
import { isOffTrack, respawnPose, type Pose, type TrackData } from '../systems/trackGeometry'
import { useKeyboardInput } from './useKeyboardInput'

const FORWARD = new Vector3(0, 0, -1)
const UP = new Vector3(0, 1, 0)
/** stuck on the roof/side longer than this → respawn */
const FLIPPED_TIMEOUT = 1.5

/**
 * Applies drive/steer/grip forces to the car body each physics step.
 * Runs in useBeforePhysicsStep (fixed timestep) so tuning is frame-rate independent.
 * `track` is optional — without it there's no off-track handling and respawn
 * falls back to the world origin.
 */
export function useVehicleController(
  carRef: RefObject<RapierRigidBody | null>,
  track?: TrackData,
) {
  const input = useKeyboardInput()

  // reused across steps — no per-frame allocation
  const quat = useRef(new Quaternion()).current
  const forward = useRef(new Vector3()).current
  const up = useRef(new Vector3()).current
  const impulse = useRef<Vec3Like>({ x: 0, y: 0, z: 0 }).current
  const flippedFor = useRef(0)

  useBeforePhysicsStep((world) => {
    const body = carRef.current
    if (!body) return
    const dt = world.timestep
    const pos = body.translation()
    const killPlaneY = track?.def.killPlaneY ?? -10

    // kid-safety: fell off the world → put the car back on the track
    if (pos.y < killPlaneY) {
      respawn(body, track, pos.x, pos.z)
      return
    }

    const rot = body.rotation()
    quat.set(rot.x, rot.y, rot.z, rot.w)
    forward.copy(FORWARD).applyQuaternion(quat)
    forward.y = 0
    forward.normalize()
    up.copy(UP).applyQuaternion(quat)

    // flipped onto roof/side and staying there → respawn (self-righting below
    // handles glancing hits; this catches the hopeless cases)
    flippedFor.current = up.y < 0.15 ? flippedFor.current + dt : 0
    if (flippedFor.current > FLIPPED_TIMEOUT) {
      flippedFor.current = 0
      respawn(body, track, pos.x, pos.z)
      return
    }

    const vel = body.linvel()
    const forwardSpeed = vel.x * forward.x + vel.z * forward.z
    const mass = body.mass()
    telemetry.speedKmh = Math.hypot(vel.x, vel.z) * 3.6
    telemetry.forwardSpeedMs = forwardSpeed
    telemetry.steer = input.steer

    // drive (impulse = force * dt)
    const f = driveForceScalar(forwardSpeed, input.throttle, vehicleTuning) * dt
    impulse.x = forward.x * f
    impulse.y = 0
    impulse.z = forward.z * f
    body.applyImpulse(impulse, true)

    // steer: command yaw rate directly (arcade); pitch/roll get damped +
    // self-righting correction so crests and jumps can't flip the car for good
    const angvel = body.angvel()
    const upright = uprightedAngvel(up, angvel.x, angvel.z, dt, vehicleTuning)
    body.setAngvel(
      { x: upright.x, y: yawVelocity(input.steer, forwardSpeed, vehicleTuning), z: upright.z },
      true,
    )

    // grip: cancel sideways slide
    lateralGripImpulse(vel, forward, mass, dt, vehicleTuning, impulse)
    body.applyImpulse(impulse, true)

    // grass is slow (but never a dead end)
    if (track && isOffTrack(track, pos.x, pos.z)) {
      offTrackDragImpulse(vel, mass, dt, vehicleTuning, impulse)
      body.applyImpulse(impulse, true)
    }
  })
}

function respawn(body: RapierRigidBody, track: TrackData | undefined, x: number, z: number) {
  const pose: Pose = track ? respawnPose(track, x, z) : { x: 0, y: 0, z: 0, yaw: 0 }
  body.setTranslation({ x: pose.x, y: pose.y + 1.5, z: pose.z }, true)
  body.setRotation({ x: 0, y: Math.sin(pose.yaw / 2), z: 0, w: Math.cos(pose.yaw / 2) }, true)
  body.setLinvel({ x: 0, y: 0, z: 0 }, true)
  body.setAngvel({ x: 0, y: 0, z: 0 }, true)
}

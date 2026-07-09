import { useRef, type RefObject } from 'react'
import { Quaternion, Vector3 } from 'three'
import { useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { KILL_PLANE_Y, carConfig, vehicleTuning } from '../config'
import {
  driveForceScalar,
  lateralGripImpulse,
  offTrackDragImpulse,
  yawVelocity,
  type Vec3Like,
} from '../systems/vehicle'
import { isOffTrack, respawnPose, type TrackData } from '../systems/trackGeometry'
import { useKeyboardInput } from './useKeyboardInput'

const FORWARD = new Vector3(0, 0, -1)

/**
 * Applies drive/steer/grip forces to the car body each physics step.
 * Runs in useBeforePhysicsStep (fixed timestep) so tuning is frame-rate independent.
 * `track` is optional — without it there's no off-track drag and respawn goes to spawnPosition.
 */
export function useVehicleController(
  carRef: RefObject<RapierRigidBody | null>,
  track?: TrackData,
) {
  const input = useKeyboardInput()

  // reused across steps — no per-frame allocation
  const quat = useRef(new Quaternion()).current
  const forward = useRef(new Vector3()).current
  const impulse = useRef<Vec3Like>({ x: 0, y: 0, z: 0 }).current

  useBeforePhysicsStep((world) => {
    const body = carRef.current
    if (!body) return
    const dt = world.timestep
    const pos = body.translation()

    // kid-safety: fell off the world → put the car back on the track
    if (pos.y < KILL_PLANE_Y) {
      const spawnY = carConfig.spawnPosition[1]
      const pose = track
        ? respawnPose(track, pos.x, pos.z)
        : { x: carConfig.spawnPosition[0], z: carConfig.spawnPosition[2], yaw: 0 }
      body.setTranslation({ x: pose.x, y: spawnY, z: pose.z }, true)
      body.setRotation({ x: 0, y: Math.sin(pose.yaw / 2), z: 0, w: Math.cos(pose.yaw / 2) }, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      return
    }

    const rot = body.rotation()
    quat.set(rot.x, rot.y, rot.z, rot.w)
    forward.copy(FORWARD).applyQuaternion(quat)
    forward.y = 0
    forward.normalize()

    const vel = body.linvel()
    const forwardSpeed = vel.x * forward.x + vel.z * forward.z
    const mass = body.mass()

    // drive (impulse = force * dt)
    const f = driveForceScalar(forwardSpeed, input.throttle, vehicleTuning) * dt
    impulse.x = forward.x * f
    impulse.y = 0
    impulse.z = forward.z * f
    body.applyImpulse(impulse, true)

    // steer: command yaw rate directly (arcade), keep physics-owned x/z tumble
    const angvel = body.angvel()
    body.setAngvel(
      { x: angvel.x, y: yawVelocity(input.steer, forwardSpeed, vehicleTuning), z: angvel.z },
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

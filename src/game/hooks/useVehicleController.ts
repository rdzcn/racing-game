import { useRef, type RefObject } from 'react'
import { Quaternion, Vector3 } from 'three'
import { useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { KILL_PLANE_Y, carConfig, vehicleTuning } from '../config'
import { driveForceScalar, lateralGripImpulse, yawVelocity, type Vec3Like } from '../systems/vehicle'
import { useKeyboardInput } from './useKeyboardInput'

const FORWARD = new Vector3(0, 0, -1)

/**
 * Applies drive/steer/grip forces to the car body each physics step.
 * Runs in useBeforePhysicsStep (fixed timestep) so tuning is frame-rate independent.
 */
export function useVehicleController(carRef: RefObject<RapierRigidBody | null>) {
  const input = useKeyboardInput()

  // reused across steps — no per-frame allocation
  const quat = useRef(new Quaternion()).current
  const forward = useRef(new Vector3()).current
  const impulse = useRef<Vec3Like>({ x: 0, y: 0, z: 0 }).current

  useBeforePhysicsStep((world) => {
    const body = carRef.current
    if (!body) return
    const dt = world.timestep

    // kid-safety: fell off the world → respawn at spawn point
    if (body.translation().y < KILL_PLANE_Y) {
      const [sx, sy, sz] = carConfig.spawnPosition
      body.setTranslation({ x: sx, y: sy, z: sz }, true)
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
  })
}

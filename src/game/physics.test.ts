import RAPIER from '@dimforge/rapier3d-compat'
import { beforeAll, describe, expect, it } from 'vitest'
import { SPAWN_HEIGHT, getCar, vehicleTuning } from './config'

const car = getCar('race')
import {
  driveForceScalar,
  lateralGripImpulse,
  offTrackDragImpulse,
  yawVelocity,
} from './systems/vehicle'

// Headless mirror of the CP1 scene: fixed ground cuboid + dynamic car body.
// Verifies the car drops from spawn and comes to rest on the ground.
describe('car physics settling', () => {
  beforeAll(async () => {
    await RAPIER.init()
  })

  it('drops from spawn and rests on the ground', () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })

    // ground: 200x200, top face at y=0 (as in Ground.tsx)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(100, 0.5, 100).setTranslation(0, -0.5, 0),
    )

    const [sx, sy, sz] = [0, SPAWN_HEIGHT, 0]
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(sx, sy, sz),
    )
    const [hx, hy, hz] = car.colliderHalfExtents
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body)

    for (let i = 0; i < 300; i++) world.step()

    const pos = body.translation()
    const vel = body.linvel()

    // resting on ground: bottom of collider touching y=0
    expect(pos.y).toBeCloseTo(hy, 1)
    // settled, not bouncing or falling through
    expect(Math.abs(vel.y)).toBeLessThan(0.01)
    expect(pos.y).toBeGreaterThan(0)
  })
})

// Headless mirror of useVehicleController: same impulse/angvel application,
// stepped in raw rapier. Validates the drive/steer/grip integration without a canvas.
describe('vehicle controller simulation', () => {
  function makeCarWorld() {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(100, 0.5, 100).setTranslation(0, -0.5, 0),
    )
    const [hx, hy, hz] = car.colliderHalfExtents
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, hy, 0)
        .setAngularDamping(2)
        .setLinearDamping(0.1),
    )
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body)
    return { world, body }
  }

  function stepWithInput(
    world: RAPIER.World,
    body: RAPIER.RigidBody,
    throttle: number,
    steer: number,
    steps: number,
    offTrack = false,
  ) {
    const out = { x: 0, y: 0, z: 0 }
    for (let i = 0; i < steps; i++) {
      const dt = world.timestep
      const rot = body.rotation()
      // forward = (0,0,-1) rotated by yaw (tests keep car level, so yaw-only is exact)
      const yaw = 2 * Math.atan2(rot.y, rot.w)
      const fwd = { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) }
      const vel = body.linvel()
      const fs = vel.x * fwd.x + vel.z * fwd.z

      const f = driveForceScalar(fs, throttle, vehicleTuning) * dt
      body.applyImpulse({ x: fwd.x * f, y: 0, z: fwd.z * f }, true)
      const av = body.angvel()
      body.setAngvel({ x: av.x, y: yawVelocity(steer, fs, vehicleTuning), z: av.z }, true)
      lateralGripImpulse(vel, fwd, body.mass(), dt, vehicleTuning, out)
      body.applyImpulse(out, true)
      if (offTrack) {
        offTrackDragImpulse(body.linvel(), body.mass(), dt, vehicleTuning, out)
        body.applyImpulse(out, true)
      }
      world.step()
    }
  }

  it('accelerates forward under throttle and clamps below max speed', () => {
    const { world, body } = makeCarWorld()
    stepWithInput(world, body, 1, 0, 120) // ~2s
    const midSpeed = -body.linvel().z // forward is -z
    expect(midSpeed).toBeGreaterThan(5)

    stepWithInput(world, body, 1, 0, 1200) // ~20s, reach terminal
    const topSpeed = -body.linvel().z
    expect(topSpeed).toBeGreaterThan(15)
    expect(topSpeed).toBeLessThanOrEqual(vehicleTuning.maxSpeed + 1)
  })

  it('steers into a curve without sliding sideways', () => {
    const { world, body } = makeCarWorld()
    stepWithInput(world, body, 1, 0, 120) // get up to speed
    stepWithInput(world, body, 1, 1, 60) // steer left ~1s
    const rot = body.rotation()
    const yaw = 2 * Math.atan2(rot.y, rot.w)
    expect(yaw).toBeGreaterThan(0.5) // turned left noticeably

    // grip: velocity stays aligned with heading (small slip angle)
    const vel = body.linvel()
    const speed = Math.hypot(vel.x, vel.z)
    const fwd = { x: -Math.sin(yaw), z: -Math.cos(yaw) }
    const alignment = (vel.x * fwd.x + vel.z * fwd.z) / speed
    // mid-turn slip angle stays modest (~<25°) — drifts a little, doesn't skate
    expect(alignment).toBeGreaterThan(0.9)
  })

  it('crawls on grass: off-track terminal speed is a fraction of on-track', () => {
    const { world, body } = makeCarWorld()
    stepWithInput(world, body, 1, 0, 600, true) // full throttle on grass, ~10s
    const grassSpeed = Math.hypot(body.linvel().x, body.linvel().z)
    expect(grassSpeed).toBeGreaterThan(2) // still moving — no dead ends
    expect(grassSpeed).toBeLessThan(vehicleTuning.maxSpeed * 0.5)
  })

  it('bounces off a tire barrier back toward the road', () => {
    const { world, body } = makeCarWorld()
    // barrier wall like TireBarriers: thin bouncy cuboid 10m ahead (-z), across the path
    const wall = RAPIER.ColliderDesc.cuboid(6, 0.7, 0.45)
      .setTranslation(0, 0.7, -10)
      .setRestitution(0.55)
      .setFriction(0.2)
    world.createCollider(wall)

    stepWithInput(world, body, 1, 0, 60) // accelerate toward it (~1s)
    // approach + impact with throttle released, tracking the rebound
    let maxBackVel = -Infinity
    let minZ = Infinity
    for (let i = 0; i < 120; i++) {
      stepWithInput(world, body, 0, 0, 1)
      maxBackVel = Math.max(maxBackVel, body.linvel().z)
      minZ = Math.min(minZ, body.translation().z)
    }
    // did not pass through the wall
    expect(minZ).toBeGreaterThan(-10)
    // bounced: at some point clearly moving back away from the wall (+z)
    expect(maxBackVel).toBeGreaterThan(2)
  })

  it('coasts to a near-stop when throttle is released', () => {
    const { world, body } = makeCarWorld()
    stepWithInput(world, body, 1, 0, 120)
    stepWithInput(world, body, 0, 0, 1500) // ~25s coasting
    expect(Math.hypot(body.linvel().x, body.linvel().z)).toBeLessThan(0.5)
  })
})

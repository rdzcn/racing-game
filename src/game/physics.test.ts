import RAPIER from '@dimforge/rapier3d-compat'
import { beforeAll, describe, expect, it } from 'vitest'
import { carConfig } from './config'

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

    const [sx, sy, sz] = carConfig.spawnPosition
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(sx, sy, sz),
    )
    const [hx, hy, hz] = carConfig.colliderHalfExtents
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

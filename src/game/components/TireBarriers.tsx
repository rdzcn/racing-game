import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { BarrierSegment } from '../systems/decorations'

const HEIGHT = 1.4
const THICKNESS = 0.9
/** bouncy — hitting the tires thumps you back onto the road */
const RESTITUTION = 0.55

/**
 * Invisible physics wall following the tire lines. The tires themselves are
 * instanced visuals; the actual collision is this smooth chain of cuboids —
 * predictable bounce instead of chaotic per-tire deflection.
 */
export function TireBarriers({ barriers }: { barriers: BarrierSegment[] }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      {barriers.map((b, i) => (
        <CuboidCollider
          key={i}
          args={[b.length / 2, HEIGHT / 2, THICKNESS / 2]}
          position={[b.x, HEIGHT / 2, b.z]}
          rotation={[0, b.rotationY, 0]}
          restitution={RESTITUTION}
          friction={0.2}
        />
      ))}
    </RigidBody>
  )
}

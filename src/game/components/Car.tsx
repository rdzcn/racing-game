import { forwardRef } from 'react'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { carConfig } from '../config'

/**
 * Car rigid body. Renders the .glb model when configured, otherwise a
 * procedural box-car placeholder. Render-only — driving forces are applied
 * by useVehicleController (CP2) via the forwarded rigid-body ref.
 */
export const Car = forwardRef<RapierRigidBody>(function Car(_, ref) {
  const [hx, hy, hz] = carConfig.colliderHalfExtents
  return (
    <RigidBody
      ref={ref}
      colliders={false}
      position={carConfig.spawnPosition}
      angularDamping={2}
      linearDamping={0.1}
    >
      <CuboidCollider args={[hx, hy, hz]} />
      <BoxCar />
    </RigidBody>
  )
})

/** Placeholder until a real model lands in public/models/ (see carConfig.modelPath). */
function BoxCar() {
  return (
    <group scale={carConfig.scale}>
      {/* body */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.8, 0.6, 3.8]} />
        <meshStandardMaterial color="#d92222" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* cabin */}
      <mesh castShadow position={[0, 0.5, -0.3]}>
        <boxGeometry args={[1.4, 0.5, 1.6]} />
        <meshStandardMaterial color="#222831" metalness={0.4} roughness={0.2} />
      </mesh>
    </group>
  )
}

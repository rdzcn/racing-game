import { CuboidCollider, RigidBody } from '@react-three/rapier'

const SIZE = 200

export function Ground() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[SIZE / 2, 0.5, SIZE / 2]} position={[0, -0.5, 0]} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#4a7a3a" roughness={1} />
      </mesh>
    </RigidBody>
  )
}

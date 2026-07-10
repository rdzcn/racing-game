import { CuboidCollider, RigidBody } from '@react-three/rapier'

/** Flat grass + the ground collider (top face at y=0). The plane renders a
 * hair lower so road tiles sitting at y=0 don't z-fight with it. */
export function Ground({ size = 200 }: { size?: number }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[size / 2, 0.5, size / 2]} position={[0, -0.5, 0]} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#4a7a3a" roughness={1} />
      </mesh>
    </RigidBody>
  )
}

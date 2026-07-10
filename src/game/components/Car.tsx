import { Component, Suspense, forwardRef, useEffect, type ReactNode, type Ref } from 'react'
import { Mesh, type Group } from 'three'
import { useGLTF } from '@react-three/drei'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { carConfig } from '../config'

interface CarProps {
  /** Start pose (e.g. track start line). Defaults to carConfig.spawnPosition, facing -z. */
  spawn?: { position: [number, number, number]; yaw: number }
  /** The car's rendered (interpolated) transform — what the camera should follow. */
  visualRef?: Ref<Group>
}

/**
 * Car rigid body. Renders the .glb from carConfig when configured, otherwise
 * (or while loading / on load failure) the procedural box-car. Render-only —
 * driving forces are applied by useVehicleController via the forwarded ref.
 */
export const Car = forwardRef<RapierRigidBody, CarProps>(function Car({ spawn, visualRef }, ref) {
  const [hx, hy, hz] = carConfig.colliderHalfExtents
  return (
    <RigidBody
      ref={ref}
      colliders={false}
      position={spawn?.position ?? carConfig.spawnPosition}
      rotation={[0, spawn?.yaw ?? 0, 0]}
      angularDamping={2}
      linearDamping={0.1}
    >
      <CuboidCollider args={[hx, hy, hz]} />
      <group ref={visualRef}>
        {carConfig.modelPath ? (
          <ModelErrorBoundary fallback={<BoxCar />}>
            <Suspense fallback={<BoxCar />}>
              <CarModel path={carConfig.modelPath} />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <BoxCar />
        )}
      </group>
    </RigidBody>
  )
})

function CarModel({ path }: { path: string }) {
  const { scene } = useGLTF(path)

  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = true
    })
  }, [scene])

  return (
    <primitive
      object={scene}
      scale={carConfig.scale}
      position={carConfig.offset}
      rotation={[0, carConfig.rotationY, 0]}
    />
  )
}

if (carConfig.modelPath) useGLTF.preload(carConfig.modelPath)

/** Fallback while the model loads or if it's missing/broken. */
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

/** Minimal error boundary — render errors from a broken/missing .glb fall back to the box-car. */
class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.warn('Car model failed to load, using box-car fallback:', error.message)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

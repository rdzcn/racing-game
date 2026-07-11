import {
  Component,
  Suspense,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type Ref,
} from 'react'
import { Mesh, Object3D, type Group } from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { cars, type CarDefinition } from '../config'
import { telemetry } from '../state/telemetry'

const MAX_WHEEL_STEER = 0.35 // rad, visual front-wheel deflection at full lock

interface CarProps {
  def: CarDefinition
  /** Start pose (e.g. track start line) */
  spawn?: { position: [number, number, number]; yaw: number }
  /** The car's rendered (interpolated) transform — what the camera should follow. */
  visualRef?: Ref<Group>
  /** Which telemetry slot (wheel spin/steer visuals) this car reads from */
  playerIndex?: 0 | 1
}

/**
 * Car rigid body. Renders the Kenney model for the selected car definition
 * (box-car fallback while loading / on failure). Render-only — driving forces
 * are applied by useVehicleController via the forwarded rigid-body ref.
 */
export const Car = forwardRef<RapierRigidBody, CarProps>(function Car(
  { def, spawn, visualRef, playerIndex = 0 },
  ref,
) {
  const [hx, hy, hz] = def.colliderHalfExtents
  return (
    <RigidBody
      ref={ref}
      colliders={false}
      position={spawn?.position ?? [0, 2, 0]}
      rotation={[0, spawn?.yaw ?? 0, 0]}
      angularDamping={2}
      linearDamping={0.1}
    >
      <CuboidCollider args={[hx, hy, hz]} />
      <group ref={visualRef}>
        <ModelErrorBoundary fallback={<BoxCar />}>
          <Suspense fallback={<BoxCar />}>
            <CarModel def={def} playerIndex={playerIndex} />
          </Suspense>
        </ModelErrorBoundary>
      </group>
    </RigidBody>
  )
})

/**
 * Kenney car models ship their wheels as named child nodes
 * (wheel-front-left, ...) — we animate those directly: all wheels spin with
 * forward speed, front wheels yaw with steering input.
 */
interface WheelRef {
  node: Object3D
  radius: number
  front: boolean
}

function CarModel({ def, playerIndex = 0 }: { def: CarDefinition; playerIndex?: 0 | 1 }) {
  const { scene } = useGLTF(def.modelPath)
  // useGLTF caches the parsed scene by URL — in 2-player mode both canvases
  // load the same model, and a three.js object can only have one parent, so
  // inserting the cached scene directly would silently steal it out of
  // whichever canvas mounted first. Clone per instance so each car gets its
  // own copy of the graph (geometries/materials are still shared, which is
  // fine — only the node graph needs to be independent).
  const carScene = useMemo(() => scene.clone(true), [scene])
  const wheels = useRef<WheelRef[]>([])
  const t = telemetry[playerIndex]

  useEffect(() => {
    const found: WheelRef[] = []
    carScene.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = true
      if (o.name.startsWith('wheel')) {
        o.rotation.order = 'YXZ' // steer (y) applied before spin (x)
        found.push({ node: o, radius: Math.max(o.position.y, 0.1), front: o.name.includes('front') })
      }
    })
    wheels.current = found
    return () => {
      wheels.current = []
    }
  }, [carScene])

  useFrame((_, dt) => {
    // model-local spin rate from world forward speed (model is scaled by def.scale).
    // Mutating three.js scene nodes inside useFrame is the idiomatic r3f pattern.
    for (const w of wheels.current) {
      // eslint-disable-next-line react-hooks/immutability
      w.node.rotation.x += (t.forwardSpeedMs / (w.radius * def.scale)) * dt
      if (w.front) w.node.rotation.y = t.steer * MAX_WHEEL_STEER
    }
  })

  return (
    <primitive
      object={carScene}
      scale={def.scale}
      position={[0, -def.colliderHalfExtents[1], 0]}
      rotation={[0, def.rotationY, 0]}
    />
  )
}

for (const c of cars) useGLTF.preload(c.modelPath)

/** Fallback while a model loads or if it's missing/broken. */
function BoxCar() {
  return (
    <group>
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.8, 0.6, 3.8]} />
        <meshStandardMaterial color="#d92222" metalness={0.6} roughness={0.35} />
      </mesh>
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

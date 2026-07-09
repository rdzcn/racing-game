import { Suspense, useRef } from 'react'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { Car } from './Car'
import { ChaseCamera } from './ChaseCamera'
import { Ground } from './Ground'
import { Lights } from './Lights'
import { VehicleController } from './VehicleController'

export function GameScene() {
  const carRef = useRef<RapierRigidBody>(null)

  return (
    <Suspense fallback={null}>
      <Lights />
      <ChaseCamera targetRef={carRef} />
      <Physics>
        <Ground />
        <Car ref={carRef} />
        <VehicleController carRef={carRef} />
      </Physics>
    </Suspense>
  )
}

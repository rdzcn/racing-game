import { Suspense, useMemo, useRef } from 'react'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { carConfig, trackConfig } from '../config'
import { buildTrack } from '../systems/trackGeometry'
import { Car } from './Car'
import { ChaseCamera } from './ChaseCamera'
import { Ground } from './Ground'
import { Lights } from './Lights'
import { Track } from './Track'
import { VehicleController } from './VehicleController'

export function GameScene() {
  const carRef = useRef<RapierRigidBody>(null)
  const track = useMemo(() => buildTrack(trackConfig), [])
  const spawn = useMemo(
    () => ({
      position: [track.start.x, carConfig.spawnPosition[1], track.start.z] as [
        number,
        number,
        number,
      ],
      yaw: track.start.yaw,
    }),
    [track],
  )

  return (
    <Suspense fallback={null}>
      <Lights />
      <ChaseCamera targetRef={carRef} />
      <Physics>
        <Ground />
        <Track data={track} />
        <Car ref={carRef} spawn={spawn} />
        <VehicleController carRef={carRef} track={track} />
      </Physics>
    </Suspense>
  )
}

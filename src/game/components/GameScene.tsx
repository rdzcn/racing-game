import { Suspense, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { carConfig, trackConfig } from '../config'
import { useRaceStore } from '../state/raceStore'
import { buildTrack } from '../systems/trackGeometry'
import { Car } from './Car'
import { ChaseCamera } from './ChaseCamera'
import { Coins } from './Coins'
import { Effects } from './Effects'
import { Ground } from './Ground'
import { Lights } from './Lights'
import { RaceTracker } from './RaceTracker'
import { ResetHandler } from './ResetHandler'
import { Scenery } from './Scenery'
import { SkyAndEnvironment } from './SkyAndEnvironment'
import { Track } from './Track'
import { VehicleController } from './VehicleController'

export function GameScene() {
  const carRef = useRef<RapierRigidBody>(null)
  const carVisualRef = useRef<Group>(null)
  const status = useRaceStore((s) => s.status)
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
      <SkyAndEnvironment />
      <Scenery track={track} />
      <Effects />
      <ChaseCamera targetRef={carVisualRef} />
      <RaceTracker carRef={carRef} track={track} />
      <Physics paused={status !== 'playing'}>
        <Ground />
        <Track data={track} />
        <Coins carRef={carRef} track={track} />
        <Car ref={carRef} visualRef={carVisualRef} spawn={spawn} />
        <VehicleController carRef={carRef} track={track} />
        <ResetHandler carRef={carRef} spawn={spawn} />
      </Physics>
    </Suspense>
  )
}

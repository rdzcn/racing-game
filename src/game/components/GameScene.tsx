import { Suspense, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { carConfig, getTrack } from '../config'
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
  const trackId = useRaceStore((s) => s.selectedTrackId)

  const def = getTrack(trackId)
  const track = useMemo(() => buildTrack(def), [def])
  const spawn = useMemo(
    () => ({
      position: [track.start.x, track.start.y + carConfig.spawnPosition[1], track.start.z] as [
        number,
        number,
        number,
      ],
      yaw: track.start.yaw,
    }),
    [track],
  )
  const isFlatTrack = def.source.kind === 'waypoints'

  return (
    <Suspense fallback={null}>
      <Lights />
      <SkyAndEnvironment />
      <Effects />
      <ChaseCamera targetRef={carVisualRef} />
      <RaceTracker carRef={carRef} track={track} />
      {/* key remounts physics bodies/colliders cleanly on track change */}
      <Physics key={def.id} paused={status !== 'playing'}>
        {isFlatTrack && <Ground />}
        {isFlatTrack && <Scenery track={track} />}
        <Track data={track} />
        <Coins carRef={carRef} track={track} />
        <Car ref={carRef} visualRef={carVisualRef} spawn={spawn} />
        <VehicleController carRef={carRef} track={track} />
        <ResetHandler carRef={carRef} spawn={spawn} />
      </Physics>
    </Suspense>
  )
}

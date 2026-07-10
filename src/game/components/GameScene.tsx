import { Suspense, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { SPAWN_HEIGHT, getCar, getTrack } from '../config'
import { useRaceStore } from '../state/raceStore'
import { buildTrack } from '../systems/trackGeometry'
import { Car } from './Car'
import { ChaseCamera } from './ChaseCamera'
import { Coins } from './Coins'
import { Decorations } from './Decorations'
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
  const carId = useRaceStore((s) => s.selectedCarId)

  const def = getTrack(trackId)
  const carDef = getCar(carId)
  const track = useMemo(() => buildTrack(def), [def])
  const spawn = useMemo(
    () => ({
      position: [track.start.x, track.start.y + SPAWN_HEIGHT, track.start.z] as [
        number,
        number,
        number,
      ],
      yaw: track.start.yaw,
    }),
    [track],
  )
  const isFlatTrack = def.source.kind !== 'centerline'

  return (
    <Suspense fallback={null}>
      {/* distance haze — sells scale on the big tracks */}
      <fog attach="fog" args={['#cfe0ec', 150, Math.max(450, (def.groundSize ?? 200) * 1.1)]} />
      <Lights followRef={carVisualRef} />
      <SkyAndEnvironment />
      <Effects />
      <ChaseCamera targetRef={carVisualRef} />
      <RaceTracker carRef={carRef} track={track} />
      {/* key remounts physics bodies/colliders cleanly on track change */}
      <Physics key={`${def.id}:${carDef.id}`} paused={status !== 'playing'}>
        {isFlatTrack && <Ground size={def.groundSize ?? 200} />}
        {isFlatTrack && (
          <Scenery
            track={track}
            bound={(def.groundSize ?? 200) / 2 - 10}
            startProps={def.source.kind === 'waypoints'}
          />
        )}
        <Track data={track} />
        <Decorations track={track} />
        <Coins carRef={carRef} track={track} />
        <Car ref={carRef} def={carDef} visualRef={carVisualRef} spawn={spawn} />
        <VehicleController carRef={carRef} track={track} />
        <ResetHandler carRef={carRef} spawn={spawn} />
      </Physics>
    </Suspense>
  )
}

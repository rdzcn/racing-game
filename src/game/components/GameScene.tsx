import { Suspense, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { SPAWN_HEIGHT, getCar, getTrack } from '../config'
import { useRaceStore } from '../state/raceStore'
import { generateDressing } from '../systems/decorations'
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
import { TireBarriers } from './TireBarriers'
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
  const dressing = useMemo(() => generateDressing(track), [track])
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
        <Ground size={def.groundSize ?? 200} />
        <Scenery
          track={track}
          bound={(def.groundSize ?? 200) / 2 - 10}
          startProps={def.source.kind === 'waypoints'}
        />
        <Track data={track} />
        <Decorations decorations={dressing.decorations} />
        <TireBarriers barriers={dressing.barriers} />
        <Coins carRef={carRef} track={track} />
        <Car ref={carRef} def={carDef} visualRef={carVisualRef} spawn={spawn} />
        <VehicleController carRef={carRef} track={track} />
        <ResetHandler carRef={carRef} spawn={spawn} />
      </Physics>
    </Suspense>
  )
}

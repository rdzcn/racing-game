import { Suspense, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { SPAWN_HEIGHT, defaultCarId, getCar, getTrack } from '../config'
import type { ControlScheme } from '../systems/input'
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

/** One full 3D scene for one player's car. In 2-player mode two of these
 * mount side by side (each in its own <Canvas>), fully independent physics
 * worlds — simplest way to split-screen while staying in the declarative
 * r3f model. */
export function GameScene({
  playerIndex = 0,
  scheme = 'both',
}: {
  playerIndex?: 0 | 1
  scheme?: ControlScheme
}) {
  const carRef = useRef<RapierRigidBody>(null)
  const carVisualRef = useRef<Group>(null)
  const status = useRaceStore((s) => s.status)
  const trackId = useRaceStore((s) => s.selectedTrackId)
  const carId = useRaceStore((s) => s.players[playerIndex]?.carId ?? defaultCarId)

  const def = getTrack(trackId)
  const carDef = getCar(carId)
  const track = useMemo(() => buildTrack(def), [def])
  const dressed = def.dressing !== false
  const dressing = useMemo(
    () => (dressed ? generateDressing(track) : { decorations: [], barriers: [] }),
    [track, dressed],
  )
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
      <RaceTracker carRef={carRef} track={track} playerIndex={playerIndex} />
      {/* key remounts physics bodies/colliders cleanly on track change */}
      <Physics key={`${def.id}:${carDef.id}`} paused={status !== 'playing'}>
        <Ground size={def.groundSize ?? 200} />
        {dressed && (
          <Scenery
            track={track}
            bound={(def.groundSize ?? 200) / 2 - 10}
            startProps={def.source.kind === 'waypoints'}
          />
        )}
        <Track data={track} />
        <Decorations decorations={dressing.decorations} />
        <TireBarriers barriers={dressing.barriers} />
        <Coins carRef={carRef} track={track} playerIndex={playerIndex} />
        <Car ref={carRef} def={carDef} visualRef={carVisualRef} spawn={spawn} playerIndex={playerIndex} />
        <VehicleController carRef={carRef} track={track} scheme={scheme} playerIndex={playerIndex} />
        <ResetHandler carRef={carRef} spawn={spawn} />
      </Physics>
    </Suspense>
  )
}

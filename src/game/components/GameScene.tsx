import { Suspense, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { SPAWN_HEIGHT, defaultCarId, getCar, getTrack } from '../config'
import type { ControlScheme } from '../systems/input'
import { getSeason } from '../seasons'
import { useRaceStore } from '../state/raceStore'
import { useSettingsStore } from '../state/settingsStore'
import { generateDressing } from '../systems/decorations'
import { buildTrack } from '../systems/trackGeometry'
import { EndlessRoad } from '../systems/endlessRoad'
import { Car } from './Car'
import { ChaseCamera } from './ChaseCamera'
import { Coins } from './Coins'
import { Decorations } from './Decorations'
import { Effects } from './Effects'
import { EndlessWorld } from './EndlessWorld'
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
  const road = useMemo(
    () => (def.source.kind === 'endless' ? new EndlessRoad(def.source.seed, def.width) : null),
    [def],
  )
  const track = useMemo(() => (road ? road.trackFacade(def) : buildTrack(def)), [def, road])
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
  const season = getSeason(useSettingsStore((s) => s.season))

  return (
    <Suspense fallback={null}>
      {/* distance haze — sells scale on the big tracks; color follows season */}
      <fog
        attach="fog"
        args={[season.fogColor, 150, Math.max(450, (def.groundSize ?? 200) * 1.1)]}
      />
      <Lights followRef={carVisualRef} />
      <SkyAndEnvironment />
      <Effects />
      <ChaseCamera targetRef={carVisualRef} />
      {!road && <RaceTracker carRef={carRef} track={track} playerIndex={playerIndex} />}
      {/* key remounts physics bodies/colliders cleanly on track change */}
      <Physics key={`${def.id}:${carDef.id}`} paused={status !== 'playing'}>
        {road ? (
          <EndlessWorld road={road} cars={[{ carRef, playerIndex }]} />
        ) : (
          <>
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
            <Coins cars={[{ carRef, playerIndex }]} track={track} />
          </>
        )}
        <Car ref={carRef} def={carDef} visualRef={carVisualRef} spawn={spawn} playerIndex={playerIndex} />
        <VehicleController carRef={carRef} track={track} scheme={scheme} playerIndex={playerIndex} />
        <ResetHandler carRef={carRef} spawn={spawn} />
      </Physics>
    </Suspense>
  )
}

import { Suspense, useMemo, useRef } from 'react'
import { Object3D, PerspectiveCamera, Quaternion, Vector3, type Group } from 'three'
import { useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { SPAWN_HEIGHT, defaultCarId, getCar, getTrack } from '../config'
import { getSeason } from '../seasons'
import { useRaceStore } from '../state/raceStore'
import { useSettingsStore } from '../state/settingsStore'
import { generateDressing } from '../systems/decorations'
import { EndlessRoad } from '../systems/endlessRoad'
import { buildTrack } from '../systems/trackGeometry'
import { EndlessWorld } from './EndlessWorld'
import { Car } from './Car'
import { ChaseCamera } from './ChaseCamera'
import { Coins } from './Coins'
import { Decorations } from './Decorations'
import { Ground } from './Ground'
import { Lights } from './Lights'
import { RaceTracker } from './RaceTracker'
import { ResetHandler } from './ResetHandler'
import { Scenery } from './Scenery'
import { SkyAndEnvironment } from './SkyAndEnvironment'
import { SplitScreenCameras } from './SplitScreenCameras'
import { TireBarriers } from './TireBarriers'
import { Track } from './Track'
import { VehicleController } from './VehicleController'

/** how far apart (m) the two cars spawn, either side of the start line's centerline */
const SPAWN_LATERAL_OFFSET = 3

/**
 * Both players' cars in one physics world / one scene, so each can actually
 * see and collide with the other's car. Mounts once inside a single
 * <Canvas>; <SplitScreenCameras> renders the shared scene twice (once per
 * player's chase camera) into top/bottom halves of that canvas.
 *
 * Note: postprocessing (<Effects />/bloom) is skipped here — EffectComposer
 * assumes one full-canvas render with one default camera, which conflicts
 * with the manual dual-viewport render loop below.
 */
export function TwoPlayerScene() {
  const car0Ref = useRef<RapierRigidBody>(null)
  const car1Ref = useRef<RapierRigidBody>(null)
  const visual0Ref = useRef<Group>(null)
  const visual1Ref = useRef<Group>(null)
  const camera0Ref = useRef<PerspectiveCamera>(null)
  const camera1Ref = useRef<PerspectiveCamera>(null)

  const status = useRaceStore((s) => s.status)
  const trackId = useRaceStore((s) => s.selectedTrackId)
  const carId0 = useRaceStore((s) => s.players[0]?.carId ?? defaultCarId)
  const carId1 = useRaceStore((s) => s.players[1]?.carId ?? defaultCarId)

  const def = getTrack(trackId)
  const carDef0 = getCar(carId0)
  const carDef1 = getCar(carId1)
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

  const spawns = useMemo(() => {
    const { x, y, z, yaw } = track.start
    const right = new Vector3(1, 0, 0).applyQuaternion(
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
    )
    const offset = Math.min(track.halfWidth * 0.6, SPAWN_LATERAL_OFFSET)
    const at = (side: 1 | -1) =>
      ({
        position: [
          x + right.x * offset * side,
          y + SPAWN_HEIGHT,
          z + right.z * offset * side,
        ] as [number, number, number],
        yaw,
      }) as const
    return [at(-1), at(1)]
  }, [track])

  // shadow-casting sun follows the midpoint between the two cars rather than
  // either one alone, so neither player's area falls out of the shadow frustum
  const followTarget = useMemo(() => new Object3D(), [])
  const followTargetRef = useMemo(() => ({ current: followTarget }), [followTarget])
  const tmpA = useRef(new Vector3()).current
  const tmpB = useRef(new Vector3()).current
  useFrame(() => {
    const a = visual0Ref.current
    const b = visual1Ref.current
    if (!a || !b) return
    a.getWorldPosition(tmpA)
    b.getWorldPosition(tmpB)
    followTarget.position.addVectors(tmpA, tmpB).multiplyScalar(0.5)
  })

  const season = getSeason(useSettingsStore((s) => s.season))

  return (
    <Suspense fallback={null}>
      <fog
        attach="fog"
        args={[season.fogColor, 150, Math.max(450, (def.groundSize ?? 200) * 1.1)]}
      />
      <Lights followRef={followTargetRef} />
      <SkyAndEnvironment />
      <perspectiveCamera ref={camera0Ref} fov={50} near={0.1} far={2000} />
      <perspectiveCamera ref={camera1Ref} fov={50} near={0.1} far={2000} />
      <ChaseCamera targetRef={visual0Ref} cameraRef={camera0Ref} />
      <ChaseCamera targetRef={visual1Ref} cameraRef={camera1Ref} />
      <SplitScreenCameras topCameraRef={camera0Ref} bottomCameraRef={camera1Ref} />
      {!road && <RaceTracker carRef={car0Ref} track={track} playerIndex={0} />}
      {!road && <RaceTracker carRef={car1Ref} track={track} playerIndex={1} />}
      {/* key remounts physics bodies/colliders cleanly on track/car change */}
      <Physics key={`${def.id}:${carDef0.id}:${carDef1.id}`} paused={status !== 'playing'}>
        {road ? (
          <EndlessWorld
            road={road}
            cars={[
              { carRef: car0Ref, playerIndex: 0 },
              { carRef: car1Ref, playerIndex: 1 },
            ]}
          />
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
            <Coins
              cars={[
                { carRef: car0Ref, playerIndex: 0 },
                { carRef: car1Ref, playerIndex: 1 },
              ]}
              track={track}
            />
          </>
        )}
        <Car ref={car0Ref} def={carDef0} visualRef={visual0Ref} spawn={spawns[0]} playerIndex={0} />
        <Car ref={car1Ref} def={carDef1} visualRef={visual1Ref} spawn={spawns[1]} playerIndex={1} />
        <VehicleController carRef={car0Ref} track={track} scheme="wasd" playerIndex={0} />
        <VehicleController carRef={car1Ref} track={track} scheme="arrows" playerIndex={1} />
        <ResetHandler carRef={car0Ref} spawn={spawns[0]} />
        <ResetHandler carRef={car1Ref} spawn={spawns[1]} />
      </Physics>
    </Suspense>
  )
}

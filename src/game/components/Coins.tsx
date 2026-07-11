import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import type { RapierRigidBody } from '@react-three/rapier'
import { useRaceStore } from '../state/raceStore'
import { checkCoinPickup, coinPositions } from '../systems/coins'
import type { TrackData } from '../systems/trackGeometry'

const PICKUP_RADIUS = 2.5
const COIN_Y = 1.1

/** Spinning collectible coins on the track. Detection is distance-based —
 * cheaper than physics sensors and consistent with our on/off-track logic. */
export function Coins({
  carRef,
  track,
  playerIndex = 0,
}: {
  carRef: RefObject<RapierRigidBody | null>
  track: TrackData
  playerIndex?: 0 | 1
}) {
  const positions = useMemo(() => coinPositions(track, track.def.coinSlots), [track])
  const collected = useRaceStore((s) => s.collectedCoins)
  const collectCoin = useRaceStore((s) => s.collectCoin)
  const groupRef = useRef<Group>(null)

  useFrame((_, dt) => {
    // spin all visible coins around Y
    const group = groupRef.current
    if (group) for (const coin of group.children) coin.rotation.y += dt * 2.5

    const body = carRef.current
    if (!body) return
    const p = body.translation()
    const hit = checkCoinPickup(positions, collected, p.x, p.z, PICKUP_RADIUS)
    if (hit >= 0) collectCoin(playerIndex, hit)
  })

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) =>
        collected[i] ? null : (
          <group key={i} position={[pos.x, pos.y + COIN_Y, pos.z]}>
            <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.7, 0.7, 0.15, 24]} />
              <meshStandardMaterial
                color="#ffc93c"
                metalness={0.8}
                roughness={0.25}
                emissive="#ffb300"
                emissiveIntensity={1.2} // bright enough to catch the bloom threshold
              />
            </mesh>
          </group>
        ),
      )}
    </group>
  )
}

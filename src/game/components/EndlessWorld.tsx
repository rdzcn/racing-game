import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { BufferAttribute, BufferGeometry, Group } from 'three'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { MODELS } from '../assets/registry'
import { getSeason } from '../seasons'
import { useRaceStore } from '../state/raceStore'
import { useSettingsStore } from '../state/settingsStore'
import { telemetry } from '../state/telemetry'
import { CHUNK_SAMPLES, EndlessRoad, SAMPLE_SPACING } from '../systems/endlessRoad'
import { InstancedModel, type ModelInstance } from './InstancedModel'
import { Ground } from './Ground'

const CHUNKS_AHEAD = 5 // 600m of road in front of the leading car
const CHUNKS_BEHIND = 2
const COIN_PICKUP_RADIUS = 2.5
const COIN_POINTS = 10
/** grass texture repeats every 16m — the following plane snaps to this grid
 * so the pattern doesn't visibly swim underneath the car */
const GRASS_SNAP = 16

interface CarEntry {
  carRef: RefObject<RapierRigidBody | null>
  playerIndex: 0 | 1
}

/**
 * The slowroads-style infinite world: road chunks stream in ahead of the
 * car(s) and are dropped behind, trees and coins come seeded per chunk, and
 * the grass plane quietly follows the car. Physics is one huge flat ground
 * collider — the road is visual, on/off-road is centerline math like on
 * every other track.
 */
export function EndlessWorld({ road, cars }: { road: EndlessRoad; cars: CarEntry[] }) {
  const [range, setRange] = useState<[number, number]>([0, CHUNKS_AHEAD])
  const progress = useRef(cars.map(() => 0))
  // replaced immutably on pickup (rare) — render-safe, unlike a mutated ref
  const [collected, setCollected] = useState<ReadonlySet<number>>(() => new Set())
  const collectedRef = useRef<ReadonlySet<number>>(collected)
  useEffect(() => {
    collectedRef.current = collected
  }, [collected])
  const addScore = useRaceStore((s) => s.addScore)
  const frame = useRef(0)

  const coins = useMemo(() => {
    const out: { x: number; z: number; index: number }[] = []
    for (let c = range[0]; c <= range[1]; c++) out.push(...road.chunkCoins(c))
    return out
  }, [road, range])

  useFrame(() => {
    frame.current++
    let leadIndex = 0
    cars.forEach((car, ci) => {
      const body = car.carRef.current
      if (!body) return
      const p = body.translation()
      const idx = road.nearestIndex(p.x, p.z, progress.current[ci])
      progress.current[ci] = idx
      leadIndex = Math.max(leadIndex, idx)
      telemetry[car.playerIndex].distanceKm = (idx * SAMPLE_SPACING) / 1000

      // coin pickup
      for (const coin of coins) {
        if (collectedRef.current.has(coin.index)) continue
        const dx = coin.x - p.x
        const dz = coin.z - p.z
        if (dx * dx + dz * dz <= COIN_PICKUP_RADIUS * COIN_PICKUP_RADIUS) {
          setCollected((prev) => new Set(prev).add(coin.index))
          addScore(car.playerIndex, COIN_POINTS)
        }
      }
    })

    // stream chunks (throttled — range only changes every ~120m anyway)
    if (frame.current % 15 === 0) {
      const leadChunk = Math.floor(leadIndex / CHUNK_SAMPLES)
      const lo = Math.max(0, leadChunk - CHUNKS_BEHIND)
      const hi = leadChunk + CHUNKS_AHEAD
      setRange((r) => (r[0] === lo && r[1] === hi ? r : [lo, hi]))
    }
  })

  const chunks = useMemo(() => {
    const list: number[] = []
    for (let c = range[0]; c <= range[1]; c++) list.push(c)
    return list
  }, [range])

  return (
    <group>
      <FollowingGrass cars={cars} />
      {chunks.map((c) => (
        <EndlessChunk key={c} road={road} chunk={c} />
      ))}
      <EndlessCoins coins={coins} collected={collected} />
    </group>
  )
}

/** one huge flat collider + a season-colored grass plane that follows the car */
function FollowingGrass({ cars }: { cars: CarEntry[] }) {
  const meshRef = useRef<Group>(null)

  useFrame(() => {
    const body = cars[0]?.carRef.current
    const mesh = meshRef.current
    if (!body || !mesh) return
    const p = body.translation()
    mesh.position.set(
      Math.round(p.x / GRASS_SNAP) * GRASS_SNAP,
      0,
      Math.round(p.z / GRASS_SNAP) * GRASS_SNAP,
    )
  })

  return (
    <>
      {/* physics ground is effectively infinite and never moves */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[10000, 0.5, 10000]} position={[0, -0.5, 0]} />
      </RigidBody>
      {/* visual grass follows the car; collider disabled — the one above rules */}
      <group ref={meshRef}>
        <Ground size={800} visualOnly />
      </group>
    </>
  )
}

function toBufferGeometry(r: {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint32Array
}): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(r.positions, 3))
  g.setAttribute('normal', new BufferAttribute(r.normals, 3))
  g.setAttribute('uv', new BufferAttribute(r.uvs, 2))
  g.setIndex(new BufferAttribute(r.indices, 1))
  return g
}

/** 120m of road ribbon + its seeded trees */
function EndlessChunk({ road, chunk }: { road: EndlessRoad; chunk: number }) {
  const geometry = useMemo(() => toBufferGeometry(road.chunkGeometry(chunk)), [road, chunk])
  useEffect(() => () => geometry.dispose(), [geometry])

  const treeTint = getSeason(useSettingsStore((s) => s.season)).treeTint
  const { large, small } = useMemo(() => {
    const trees = road.chunkTrees(chunk)
    const toInstance = (t: (typeof trees)[number]): ModelInstance => ({
      x: t.x,
      z: t.z,
      rotationY: t.rotationY,
      scale: t.scale,
    })
    return {
      large: trees.filter((t) => t.large).map(toInstance),
      small: trees.filter((t) => !t.large).map(toInstance),
    }
  }, [road, chunk])

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#3a3a3e" roughness={0.95} />
      </mesh>
      {large.length > 0 && <InstancedModel url={MODELS.treeLarge} instances={large} tint={treeTint} />}
      {small.length > 0 && <InstancedModel url={MODELS.treeSmall} instances={small} tint={treeTint} />}
    </group>
  )
}

function EndlessCoins({
  coins,
  collected,
}: {
  coins: { x: number; z: number; index: number }[]
  collected: ReadonlySet<number>
}) {
  const groupRef = useRef<Group>(null)
  const visible = useMemo(() => coins.filter((c) => !collected.has(c.index)), [coins, collected])

  useFrame((_, dt) => {
    const group = groupRef.current
    if (group) for (const coin of group.children) coin.rotation.y += dt * 2.5
  })

  return (
    <group ref={groupRef}>
      {visible.map((c) => (
        <group key={c.index} position={[c.x, 1.1, c.z]}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.7, 0.7, 0.15, 24]} />
            <meshStandardMaterial
              color="#ffc93c"
              metalness={0.8}
              roughness={0.25}
              emissive="#ffb300"
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

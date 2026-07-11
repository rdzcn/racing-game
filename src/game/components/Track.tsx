import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { MODELS } from '../assets/registry'
import type {
  GeneratedTrackGeometry,
  RibbonGeometry,
  TrackData,
} from '../systems/trackGeometry'
import type { GridModel } from '../systems/gridTrack'
import type { TileModel } from '../systems/tileTrack'
import { InstancedModel, type ModelInstance } from './InstancedModel'

function toBufferGeometry(r: RibbonGeometry, colors?: Float32Array): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(r.positions, 3))
  g.setAttribute('normal', new BufferAttribute(r.normals, 3))
  g.setAttribute('uv', new BufferAttribute(r.uvs, 2))
  if (colors) g.setAttribute('color', new BufferAttribute(colors, 3))
  g.setIndex(new BufferAttribute(r.indices, 1))
  return g
}

/** Track visuals + (for mesh tracks) collision. Waypoint tracks are flat
 * ribbons over the ground collider; mesh tracks bring their own geometry
 * and get a fixed trimesh collider. */
export function Track({ data }: { data: TrackData }) {
  return (
    <group>
      {data.geometry && <GeneratedTrack geometry={data.geometry} />}
      {data.tiles && data.cellSize && <TileTrack data={data} />}
      {data.gridTiles && data.cellSize && <GridTrack data={data} />}
      {/* tile/grid tracks bring their own start gate */}
      {!data.tiles && !data.gridTiles && <StartLine data={data} />}
    </group>
  )
}

const GRID_MODEL_URL: Record<GridModel, string> = {
  straight: MODELS.starterStraight,
  corner: MODELS.starterCorner,
  finish: MODELS.starterFinish,
  ramp: MODELS.starterStraight, // no ramp in the imported layout
  empty: MODELS.starterEmpty,
  forest: MODELS.starterForest,
  tents: MODELS.starterTents,
}

/** Per-model render rotation offsets relative to library space (the finish
 * gate's drive-through direction matches the straights, so none needed —
 * flip finish to ±π/2 here if a future kit disagrees). */
const GRID_MODEL_ROT_OFFSET: Partial<Record<GridModel, number>> = {}

/** Starter-kit world: every cell (road + baked scenery) instanced per model.
 * Models are center-origin with ground at y=0 — drive surface = ground plane. */
function GridTrack({ data }: { data: TrackData }) {
  const scale = data.cellSize! / 10 // starter tiles are 10×10 units
  const byModel = useMemo(() => {
    const groups = new Map<GridModel, ModelInstance[]>()
    for (const t of data.gridTiles!) {
      const list = groups.get(t.model) ?? []
      list.push({
        x: t.x,
        z: t.z,
        rotationY: t.rotationY + (GRID_MODEL_ROT_OFFSET[t.model] ?? 0),
        scale,
      })
      groups.set(t.model, list)
    }
    return [...groups.entries()]
  }, [data, scale])

  return (
    <group>
      {byModel.map(([model, instances]) => (
        <InstancedModel
          key={model}
          url={GRID_MODEL_URL[model]}
          instances={instances}
          anchor="base-center"
        />
      ))}
    </group>
  )
}

const TILE_MODEL_URL: Record<TileModel, string> = {
  straight: MODELS.roadStraight,
  cornerSmall: MODELS.roadCornerSmall,
  cornerLarge: MODELS.roadCornerLarge,
  start: MODELS.roadStart,
}

/** thickness of the tiles' road slab in model units (probed from the glbs) */
const TILE_SLAB = 0.02

/** Kenney road tiles, instanced per model type. Flat tiles are anchored
 * 'top-center' so the drive surface coincides with the physics ground plane.
 * The start gate has an arch, so its top isn't the road — anchor its base
 * one slab-thickness below ground instead. */
function TileTrack({ data }: { data: TrackData }) {
  const scale = data.cellSize!
  const byModel = useMemo(() => {
    const groups = new Map<TileModel, ModelInstance[]>()
    for (const t of data.tiles!) {
      const list = groups.get(t.model) ?? []
      list.push({
        x: t.x,
        y: t.model === 'start' ? -TILE_SLAB * scale : 0,
        z: t.z,
        rotationY: t.rotationY,
        scale,
      })
      groups.set(t.model, list)
    }
    return [...groups.entries()]
  }, [data, scale])

  return (
    <group>
      {byModel.map(([model, instances]) => (
        <InstancedModel
          key={model}
          url={TILE_MODEL_URL[model]}
          instances={instances}
          anchor={model === 'start' ? 'base-center' : 'top-center'}
        />
      ))}
    </group>
  )
}

function GeneratedTrack({ geometry }: { geometry: GeneratedTrackGeometry }) {
  const road = useMemo(() => toBufferGeometry(geometry.road), [geometry])
  const curbL = useMemo(() => toBufferGeometry(geometry.curbLeft, geometry.curbColors), [geometry])
  const curbR = useMemo(() => toBufferGeometry(geometry.curbRight, geometry.curbColors), [geometry])

  return (
    <group>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial color="#3a3a3e" roughness={0.95} />
      </mesh>
      <mesh geometry={curbL} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.8} />
      </mesh>
      <mesh geometry={curbR} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.8} />
      </mesh>
    </group>
  )
}

function StartLine({ data }: { data: TrackData }) {
  return (
    <mesh
      position={[data.start.x, data.start.y + 0.04, data.start.z]}
      rotation={[-Math.PI / 2, 0, data.start.yaw]}
      receiveShadow
    >
      <planeGeometry args={[data.halfWidth * 2, 1.2]} />
      <meshStandardMaterial color="#ffffff" roughness={0.7} />
    </mesh>
  )
}

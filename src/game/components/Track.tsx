import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Mesh } from 'three'
import { useGLTF } from '@react-three/drei'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { MODELS } from '../assets/registry'
import type {
  GeneratedTrackGeometry,
  RibbonGeometry,
  TrackData,
} from '../systems/trackGeometry'
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
      {data.def.source.kind === 'centerline' && data.colliderRibbon && (
        <MeshTrack modelPath={data.def.source.modelPath} collider={data.colliderRibbon} />
      )}
      {data.tiles && data.cellSize && <TileTrack data={data} />}
      {/* tile tracks have the roadStart gate as their start line */}
      {!data.tiles && <StartLine data={data} />}
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

/**
 * Mesh track: the glb is VISUAL ONLY. Driving happens on a smooth trimesh
 * ribbon generated from the extracted centerline — the model's own geometry
 * (box side faces, rails, duplicated strips) causes ghost collisions.
 */
function MeshTrack({ modelPath, collider }: { modelPath: string; collider: RibbonGeometry }) {
  const { scene } = useGLTF(modelPath)

  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
  }, [scene])

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <TrimeshCollider args={[collider.positions, collider.indices]} />
      </RigidBody>
      <primitive object={scene} />
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

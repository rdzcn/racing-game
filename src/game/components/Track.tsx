import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Mesh } from 'three'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import type {
  GeneratedTrackGeometry,
  RibbonGeometry,
  TrackData,
} from '../systems/trackGeometry'

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
      {data.def.source.kind === 'centerline' && (
        <MeshTrack modelPath={data.def.source.modelPath} />
      )}
      <StartLine data={data} />
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

function MeshTrack({ modelPath }: { modelPath: string }) {
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
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={scene} />
    </RigidBody>
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

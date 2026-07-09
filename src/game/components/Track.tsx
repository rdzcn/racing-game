import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import type { RibbonGeometry, TrackData } from '../systems/trackGeometry'

function toBufferGeometry(r: RibbonGeometry, colors?: Float32Array): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(r.positions, 3))
  g.setAttribute('normal', new BufferAttribute(r.normals, 3))
  g.setAttribute('uv', new BufferAttribute(r.uvs, 2))
  if (colors) g.setAttribute('color', new BufferAttribute(colors, 3))
  g.setIndex(new BufferAttribute(r.indices, 1))
  return g
}

/** Visual track: road ribbon + striped curbs + start line. Physics-free —
 * the car drives on the ground collider; on/off-track is detection logic. */
export function Track({ data }: { data: TrackData }) {
  const road = useMemo(() => toBufferGeometry(data.road), [data])
  const curbL = useMemo(() => toBufferGeometry(data.curbLeft, data.curbColors), [data])
  const curbR = useMemo(() => toBufferGeometry(data.curbRight, data.curbColors), [data])

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
      {/* start/finish line */}
      <mesh
        position={[data.start.x, 0.04, data.start.z]}
        rotation={[-Math.PI / 2, 0, data.start.yaw]}
        receiveShadow
      >
        <planeGeometry args={[data.halfWidth * 2, 1.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
    </group>
  )
}

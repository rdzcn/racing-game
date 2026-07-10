import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  type BufferGeometry,
  type Material,
} from 'three'
import { useGLTF } from '@react-three/drei'
import { MODELS } from '../assets/registry'
import { generatePlacements, type SceneryPlacement } from '../systems/scenery'
import type { TrackData } from '../systems/trackGeometry'

const TREE_COUNT = 80
const SEED = 1337
const TREE_SCALE = 5 // Kenney trees are ~1.5m tall at unit scale

/**
 * Kenney scenery for generated tracks: instanced trees scattered off-road
 * plus grandstands and checkered flags at the start line. Purely visual,
 * no colliders (driving through a tree is funnier than crashing into one).
 */
export function Scenery({ track }: { track: TrackData }) {
  const placements = useMemo(
    () => generatePlacements(track, TREE_COUNT, { bound: 95, clearance: 6, seed: SEED }),
    [track],
  )
  // large trees on one seeded half, small on the other — cheap variety
  const large = useMemo(() => placements.filter((_, i) => i % 2 === 0), [placements])
  const small = useMemo(() => placements.filter((_, i) => i % 2 === 1), [placements])

  return (
    <group>
      <InstancedModel url={MODELS.treeLarge} placements={large} baseScale={TREE_SCALE} />
      <InstancedModel url={MODELS.treeSmall} placements={small} baseScale={TREE_SCALE} />
      <StartProps track={track} />
    </group>
  )
}

interface ModelPart {
  geometry: BufferGeometry
  material: Material | Material[]
  matrix: Matrix4
}

/** Renders one glb at many placements — one InstancedMesh (draw call) per sub-mesh. */
function InstancedModel({
  url,
  placements,
  baseScale,
}: {
  url: string
  placements: SceneryPlacement[]
  baseScale: number
}) {
  const { scene } = useGLTF(url)
  const parts: ModelPart[] = useMemo(() => {
    scene.updateMatrixWorld(true)
    const out: ModelPart[] = []
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        out.push({ geometry: o.geometry, material: o.material, matrix: o.matrixWorld.clone() })
      }
    })
    return out
  }, [scene])
  const refs = useRef<(InstancedMesh | null)[]>([])

  useLayoutEffect(() => {
    const dummy = new Object3D()
    const m = new Matrix4()
    placements.forEach((p, i) => {
      dummy.position.set(p.x, 0, p.z)
      dummy.rotation.set(0, p.rotationY, 0)
      dummy.scale.setScalar(p.scale * baseScale)
      dummy.updateMatrix()
      parts.forEach((part, pi) => {
        m.multiplyMatrices(dummy.matrix, part.matrix) // bake the glb's node transform
        refs.current[pi]?.setMatrixAt(i, m)
      })
    })
    for (const im of refs.current) if (im) im.instanceMatrix.needsUpdate = true
  }, [placements, parts, baseScale])

  return (
    <group>
      {parts.map((part, pi) => (
        <instancedMesh
          key={pi}
          ref={(el) => {
            refs.current[pi] = el
          }}
          args={[part.geometry, part.material, placements.length]}
          castShadow
        />
      ))}
    </group>
  )
}

/** Grandstands + checkered flags flanking the start/finish line. */
function StartProps({ track }: { track: TrackData }) {
  const { scene: grandStand } = useGLTF(MODELS.grandStand)
  const { scene: flag } = useGLTF(MODELS.flagCheckers)

  const items = useMemo(() => {
    const { start, halfWidth, curbWidth } = track
    const t = track.tangents[0]
    // left-hand side of travel direction (outside of the meadow start straight)
    const nx = t.z
    const nz = -t.x
    const side = halfWidth + curbWidth
    const place = (obj: Object3D, along: number, out: number, yawExtra: number, scale: number) => {
      const o = obj.clone(true)
      o.traverse((c) => {
        if (c instanceof Mesh) c.castShadow = true
      })
      o.position.set(
        start.x + t.x * along + nx * out,
        start.y,
        start.z + t.z * along + nz * out,
      )
      o.rotation.y = start.yaw + yawExtra
      o.scale.setScalar(scale)
      return o
    }
    return [
      place(grandStand, -8, side + 3, Math.PI / 2, 8),
      place(grandStand, 4, side + 3, Math.PI / 2, 8),
      place(flag, 0, side + 0.5, Math.PI / 2, 8),
      place(flag, 0, -(side + 0.5), -Math.PI / 2, 8),
    ]
  }, [track, grandStand, flag])

  return (
    <group>
      {items.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </group>
  )
}

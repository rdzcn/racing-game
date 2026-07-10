import { useMemo } from 'react'
import { MODELS } from '../assets/registry'
import { generatePlacements } from '../systems/scenery'
import type { TrackData } from '../systems/trackGeometry'
import { InstancedModel, type ModelInstance } from './InstancedModel'

const TREE_COUNT = 80
const SEED = 1337
const TREE_SCALE = 5 // Kenney trees are ~1.5m tall at unit scale

/**
 * Kenney scenery for flat tracks: instanced trees scattered off-road, plus
 * (optionally) grandstands and checkered flags at the start line. Purely
 * visual, no colliders (driving through a tree is funnier than crashing).
 */
export function Scenery({
  track,
  startProps = true,
  bound = 95,
}: {
  track: TrackData
  startProps?: boolean
  bound?: number
}) {
  const placements = useMemo(
    () => generatePlacements(track, TREE_COUNT, { bound, clearance: 6, seed: SEED }),
    [track, bound],
  )
  const trees: ModelInstance[] = useMemo(
    () => placements.map((p) => ({ x: p.x, z: p.z, rotationY: p.rotationY, scale: p.scale * TREE_SCALE })),
    [placements],
  )
  const large = useMemo(() => trees.filter((_, i) => i % 2 === 0), [trees])
  const small = useMemo(() => trees.filter((_, i) => i % 2 === 1), [trees])

  return (
    <group>
      <InstancedModel url={MODELS.treeLarge} instances={large} />
      <InstancedModel url={MODELS.treeSmall} instances={small} />
      {startProps && <StartProps track={track} />}
    </group>
  )
}

/** Grandstands + checkered flags flanking the start/finish line. */
function StartProps({ track }: { track: TrackData }) {
  const { stands, flags } = useMemo(() => {
    const { start, halfWidth, curbWidth } = track
    const t = track.tangents[0]
    // left-hand side of travel direction (outside of the start straight)
    const nx = t.z
    const nz = -t.x
    const side = halfWidth + curbWidth
    const at = (along: number, out: number, yawExtra: number, scale: number): ModelInstance => ({
      x: start.x + t.x * along + nx * out,
      y: start.y,
      z: start.z + t.z * along + nz * out,
      rotationY: start.yaw + yawExtra,
      scale,
    })
    return {
      stands: [at(-8, side + 7, Math.PI / 2, 8), at(4, side + 7, Math.PI / 2, 8)],
      flags: [at(0, side + 1, Math.PI / 2, 8), at(0, -(side + 1), -Math.PI / 2, 8)],
    }
  }, [track])

  return (
    <group>
      <InstancedModel url={MODELS.grandStand} instances={stands} />
      <InstancedModel url={MODELS.flagCheckers} instances={flags} />
    </group>
  )
}

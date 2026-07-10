import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { generatePlacements } from '../systems/scenery'
import type { TrackData } from '../systems/trackGeometry'

const TREE_COUNT = 80
const SEED = 1337

/**
 * Low-poly trees as two InstancedMeshes (trunks + canopies) — one draw call
 * each regardless of count. Purely visual, no colliders (driving through a
 * tree is funnier than crashing into one).
 */
export function Scenery({ track }: { track: TrackData }) {
  const trunkRef = useRef<InstancedMesh>(null)
  const canopyRef = useRef<InstancedMesh>(null)
  const placements = useMemo(
    () => generatePlacements(track, TREE_COUNT, { bound: 95, clearance: 6, seed: SEED }),
    [track],
  )

  useLayoutEffect(() => {
    const dummy = new Object3D()
    placements.forEach((p, i) => {
      dummy.rotation.set(0, p.rotationY, 0)
      dummy.scale.setScalar(p.scale)
      // geometry is origin-centered — lift each part to sit on the ground
      dummy.position.set(p.x, 1.2 * p.scale, p.z)
      dummy.updateMatrix()
      trunkRef.current?.setMatrixAt(i, dummy.matrix)
      dummy.position.y = (2.4 + 1.7) * p.scale // trunk height + half cone
      dummy.updateMatrix()
      canopyRef.current?.setMatrixAt(i, dummy.matrix)
    })
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true
    if (canopyRef.current) canopyRef.current.instanceMatrix.needsUpdate = true
  }, [placements])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, placements.length]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 2.4, 6]} />
        <meshStandardMaterial color="#6b4a2f" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, placements.length]} castShadow>
        <coneGeometry args={[1.6, 3.4, 7]} />
        <meshStandardMaterial color="#3e7c3a" roughness={0.9} />
      </instancedMesh>
    </group>
  )
}

import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  Box3,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three'
import { useGLTF } from '@react-three/drei'

export interface ModelInstance {
  x: number
  y?: number
  z: number
  rotationY: number
  scale: number
}

interface ModelPart {
  geometry: BufferGeometry
  material: Material | Material[]
  matrix: Matrix4
}

/**
 * Renders one glb at many placements — one InstancedMesh (single draw call)
 * per sub-mesh, with the model's node transforms baked into each instance.
 *
 * Kenney models have corner pivots and stray node offsets, so instances are
 * anchored deterministically from the model's bounding box:
 * - 'base-center': footprint center at (x,z), lowest point at y (props, trees)
 * - 'top-center':  footprint center at (x,z), TOP surface at y (road tiles —
 *   the drive surface must coincide with the physics ground plane)
 */
export function InstancedModel({
  url,
  instances,
  anchor = 'base-center',
}: {
  url: string
  instances: ModelInstance[]
  anchor?: 'base-center' | 'top-center'
}) {
  const { scene } = useGLTF(url)

  const { parts, correction } = useMemo(() => {
    scene.updateMatrixWorld(true)
    const out: ModelPart[] = []
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        out.push({ geometry: o.geometry, material: o.material, matrix: o.matrixWorld.clone() })
      }
    })
    const box = new Box3().setFromObject(scene)
    const center = box.getCenter(new Vector3())
    const yRef = anchor === 'top-center' ? box.max.y : box.min.y
    return {
      parts: out,
      correction: new Matrix4().makeTranslation(-center.x, -yRef, -center.z),
    }
  }, [scene, anchor])

  const refs = useRef<(InstancedMesh | null)[]>([])

  useLayoutEffect(() => {
    const dummy = new Object3D()
    const m = new Matrix4()
    instances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y ?? 0, inst.z)
      dummy.rotation.set(0, inst.rotationY, 0)
      dummy.scale.setScalar(inst.scale)
      dummy.updateMatrix()
      parts.forEach((part, pi) => {
        m.multiplyMatrices(correction, part.matrix) // model-space: anchor, then node transform
        m.premultiply(dummy.matrix) // then place in the world
        refs.current[pi]?.setMatrixAt(i, m)
      })
    })
    for (const im of refs.current) {
      if (im) {
        im.instanceMatrix.needsUpdate = true
        im.computeBoundingSphere()
      }
    }
  }, [instances, parts, correction])

  return (
    <group>
      {parts.map((part, pi) => (
        <instancedMesh
          key={pi}
          ref={(el) => {
            refs.current[pi] = el
          }}
          args={[part.geometry, part.material, instances.length]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  )
}

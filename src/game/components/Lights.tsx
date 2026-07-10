import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { DirectionalLight, Object3D, Vector3 } from 'three'

// tight frustum for crisp shadows — the light follows the car, so it only
// ever needs to cover the area around it
const SHADOW_BOUNDS = 45
const SUN_OFFSET = new Vector3(20, 30, 10)

/** Ambient + shadow-casting sun. The sun (and its shadow camera) tracks the
 * followRef target so shadows stay sharp on arbitrarily large tracks. */
export function Lights({ followRef }: { followRef?: RefObject<Object3D | null> }) {
  const lightRef = useRef<DirectionalLight>(null)
  const target = useMemo(() => new Object3D(), [])
  const pos = useRef(new Vector3()).current

  useFrame(() => {
    const followed = followRef?.current
    const light = lightRef.current
    if (!followed || !light) return
    followed.getWorldPosition(pos)
    light.position.copy(pos).add(SUN_OFFSET)
    target.position.copy(pos)
    target.updateMatrixWorld()
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <primitive object={target} />
      <directionalLight
        ref={lightRef}
        castShadow
        position={[20, 30, 10]}
        target={target}
        intensity={2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-SHADOW_BOUNDS}
        shadow-camera-right={SHADOW_BOUNDS}
        shadow-camera-top={SHADOW_BOUNDS}
        shadow-camera-bottom={-SHADOW_BOUNDS}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
    </>
  )
}

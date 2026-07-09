import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3 } from 'three'
import type { RapierRigidBody } from '@react-three/rapier'
import { cameraConfig } from '../config'

const FORWARD = new Vector3(0, 0, -1)

/**
 * Third-person chase camera. Sits behind the car along its horizontal heading
 * (yaw only — car pitch/bounce doesn't roll the camera) with exponential
 * position smoothing. Independent of input and vehicle physics.
 */
export function ChaseCamera({ targetRef }: { targetRef: RefObject<RapierRigidBody | null> }) {
  // reused per frame
  const quat = useRef(new Quaternion()).current
  const heading = useRef(new Vector3()).current
  const desired = useRef(new Vector3()).current
  const lookAt = useRef(new Vector3()).current
  const initialized = useRef(false)

  useFrame(({ camera }, dt) => {
    const body = targetRef.current
    if (!body) return

    const p = body.translation()
    const r = body.rotation()
    quat.set(r.x, r.y, r.z, r.w)
    heading.copy(FORWARD).applyQuaternion(quat)
    heading.y = 0
    // degenerate when car points straight up/down — keep last heading
    if (heading.lengthSq() > 1e-6) heading.normalize()

    desired
      .set(p.x, p.y, p.z)
      .addScaledVector(heading, -cameraConfig.distance)
    desired.y = p.y + cameraConfig.height

    if (!initialized.current) {
      camera.position.copy(desired) // snap on first frame, no fly-in
      initialized.current = true
    } else {
      // frame-rate independent exponential smoothing
      camera.position.lerp(desired, 1 - Math.exp(-cameraConfig.damping * dt))
    }

    lookAt.set(p.x, p.y + cameraConfig.lookAtHeight, p.z)
    camera.lookAt(lookAt)
  })

  return null
}

import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3, type Camera, type Object3D } from 'three'
import { cameraConfig } from '../config'

const FORWARD = new Vector3(0, 0, -1)

/**
 * Third-person chase camera. Follows the car's *rendered* (interpolated)
 * transform, not the raw physics body — rapier steps at a fixed rate and
 * interpolates meshes between steps, so sampling the body directly makes the
 * camera and car disagree by a fraction of a step and the scene shakes.
 * Yaw-only heading (car pitch/bounce doesn't roll the camera), exponential
 * position smoothing. Independent of input and vehicle physics.
 *
 * `cameraRef` lets a caller drive an explicit camera object instead of the
 * canvas's default camera — needed for split-screen, where two cameras
 * (one per player) exist simultaneously and only one can be "the" default.
 */
export function ChaseCamera({
  targetRef,
  cameraRef,
}: {
  targetRef: RefObject<Object3D | null>
  cameraRef?: RefObject<Camera | null>
}) {
  // reused per frame
  const pos = useRef(new Vector3()).current
  const quat = useRef(new Quaternion()).current
  const heading = useRef(new Vector3()).current
  const desired = useRef(new Vector3()).current
  const lookAt = useRef(new Vector3()).current
  const initialized = useRef(false)

  useFrame(({ camera: defaultCamera }, dt) => {
    const target = targetRef.current
    const camera = cameraRef?.current ?? defaultCamera
    if (!target) return

    target.getWorldPosition(pos)
    target.getWorldQuaternion(quat)
    heading.copy(FORWARD).applyQuaternion(quat)
    heading.y = 0
    // degenerate when car points straight up/down — keep last heading
    if (heading.lengthSq() > 1e-6) heading.normalize()

    desired.copy(pos).addScaledVector(heading, -cameraConfig.distance)
    desired.y = pos.y + cameraConfig.height

    if (!initialized.current) {
      camera.position.copy(desired) // snap on first frame, no fly-in
      initialized.current = true
    } else {
      // frame-rate independent exponential smoothing
      camera.position.lerp(desired, 1 - Math.exp(-cameraConfig.damping * dt))
    }

    lookAt.set(pos.x, pos.y + cameraConfig.lookAtHeight, pos.z)
    camera.lookAt(lookAt)
  })

  return null
}

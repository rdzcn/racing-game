import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import type { PerspectiveCamera } from 'three'

/**
 * Renders the shared scene twice per frame — once per player camera — into
 * top/bottom halves of the canvas via viewport+scissor. Registering a
 * `useFrame` callback with a positive priority tells r3f to stop doing its
 * own default-camera render, handing control to us entirely.
 */
export function SplitScreenCameras({
  topCameraRef,
  bottomCameraRef,
}: {
  topCameraRef: RefObject<PerspectiveCamera | null>
  bottomCameraRef: RefObject<PerspectiveCamera | null>
}) {
  useFrame(({ gl, scene, size }) => {
    const top = topCameraRef.current
    const bottom = bottomCameraRef.current
    if (!top || !bottom) return

    const halfHeight = Math.max(1, Math.round(size.height / 2))
    const aspect = size.width / halfHeight
    for (const cam of [top, bottom]) {
      if (cam.aspect !== aspect) {
        cam.aspect = aspect
        cam.updateProjectionMatrix()
      }
    }

    gl.setScissorTest(true)

    gl.setViewport(0, halfHeight, size.width, halfHeight)
    gl.setScissor(0, halfHeight, size.width, halfHeight)
    gl.render(scene, top)

    gl.setViewport(0, 0, size.width, halfHeight)
    gl.setScissor(0, 0, size.width, halfHeight)
    gl.render(scene, bottom)

    gl.setScissorTest(false)
  }, 1)

  return null
}

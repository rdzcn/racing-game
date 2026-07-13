import { useMemo } from 'react'
import { CanvasTexture, NearestFilter, RepeatWrapping } from 'three'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { getSeason } from '../seasons'
import { useSettingsStore } from '../state/settingsStore'
import { mulberry32 } from '../systems/scenery'

/** subtle multi-tone noise so the grass reads as ground, not as a green void */
function makeGrassTexture(palette: readonly string[]): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = mulberry32(7)
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      ctx.fillStyle = palette[Math.floor(rand() * palette.length)]
      ctx.fillRect(x, y, 4, 4)
    }
  }
  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.magFilter = NearestFilter
  return tex
}

/** Flat grass + the ground collider (top face at y=0). The plane renders a
 * hair lower so road tiles sitting at y=0 don't z-fight with it.
 * Grass colors come from the selected season.
 * `visualOnly` skips the collider — endless mode has its own infinite one. */
export function Ground({ size = 200, visualOnly = false }: { size?: number; visualOnly?: boolean }) {
  const season = useSettingsStore((s) => s.season)
  const texture = useMemo(() => {
    const tex = makeGrassTexture(getSeason(season).grass)
    tex.repeat.set(size / 16, size / 16)
    return tex
  }, [size, season])

  const plane = (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  )

  if (visualOnly) return plane

  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[size / 2, 0.5, size / 2]} position={[0, -0.5, 0]} />
      {plane}
    </RigidBody>
  )
}

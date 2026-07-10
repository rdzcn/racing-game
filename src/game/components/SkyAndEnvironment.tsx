import { Environment, Sky } from '@react-three/drei'

/**
 * Procedural sky (no assets) + HDRI environment map for PBR reflections on
 * the car paint. Sun direction matches the shadow-casting light in Lights.tsx.
 * The preset HDRI loads from drei's CDN at runtime; if it fails (offline),
 * the scene still works — directional + ambient light carry the lighting.
 */
export function SkyAndEnvironment() {
  return (
    <>
      <Sky sunPosition={[20, 30, 10]} turbidity={6} rayleigh={1.2} />
      <Environment preset="sunset" background={false} />
    </>
  )
}

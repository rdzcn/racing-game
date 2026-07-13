import { Environment, Sky } from '@react-three/drei'
import { getSeason } from '../seasons'
import { useSettingsStore } from '../state/settingsStore'

/**
 * Procedural sky (no assets) + HDRI environment map for PBR reflections on
 * the car paint. Sun direction matches the shadow-casting light in Lights.tsx.
 * Atmosphere knobs come from the selected season — swapping is instant
 * because it's just shader uniforms, nothing regenerates.
 * The preset HDRI loads from drei's CDN at runtime; if it fails (offline),
 * the scene still works — directional + ambient light carry the lighting.
 */
export function SkyAndEnvironment() {
  const season = getSeason(useSettingsStore((s) => s.season))
  return (
    <>
      <Sky sunPosition={[20, 30, 10]} turbidity={season.turbidity} rayleigh={season.rayleigh} />
      <Environment preset="sunset" background={false} />
    </>
  )
}

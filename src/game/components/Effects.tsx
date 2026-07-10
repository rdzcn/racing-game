import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useSettingsStore } from '../state/settingsStore'

/**
 * Post-processing, gated by the settings store. Bloom only catches
 * bright/emissive surfaces (coins, highlights) via the luminance threshold.
 * If fps suffers on integrated GPUs, this is the first thing to switch off.
 */
export function Effects() {
  const bloom = useSettingsStore((s) => s.bloom)
  if (!bloom) return null
  return (
    <EffectComposer>
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.7} mipmapBlur />
    </EffectComposer>
  )
}

import { useMemo } from 'react'
import { MODELS } from '../assets/registry'
import type { Decoration, DecorationModel } from '../systems/decorations'
import { InstancedModel, type ModelInstance } from './InstancedModel'

const URL: Record<DecorationModel, string> = {
  tire: MODELS.tire,
  pylon: MODELS.pylon,
  grandStand: MODELS.grandStand,
  grandStandRound: MODELS.grandStandRound,
  grandStandCovered: MODELS.grandStandCovered,
  tentLong: MODELS.tentLong,
  bannerTowerGreen: MODELS.bannerTowerGreen,
  bannerTowerRed: MODELS.bannerTowerRed,
}

/** tire model half-thickness in model units (it stands on edge; we lay it flat) */
const TIRE_HALF_THICKNESS = 0.17

/** Curvature-driven track dressing: tire walls on corner outsides, tribunes
 * and tents along the straights, banner towers at the start. All instanced. */
export function Decorations({ decorations }: { decorations: Decoration[] }) {
  const groups = useMemo(() => {
    const byModel = new Map<DecorationModel, ModelInstance[]>()
    for (const d of decorations) {
      const list = byModel.get(d.model) ?? []
      list.push({
        x: d.x,
        y: d.layFlat ? d.y + TIRE_HALF_THICKNESS * d.scale : d.y,
        z: d.z,
        rotationY: d.rotationY,
        rotationZ: d.layFlat ? Math.PI / 2 : 0,
        scale: d.scale,
      })
      byModel.set(d.model, list)
    }
    return [...byModel.entries()]
  }, [decorations])

  return (
    <group>
      {groups.map(([model, instances]) => (
        <InstancedModel
          key={model}
          url={URL[model]}
          instances={instances}
          anchor={model === 'tire' ? 'center' : 'base-center'}
        />
      ))}
    </group>
  )
}

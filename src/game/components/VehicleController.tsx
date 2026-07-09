import type { RefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { useVehicleController } from '../hooks/useVehicleController'
import type { TrackData } from '../systems/trackGeometry'

/** Mount point for the vehicle controller — must live inside <Physics>. */
export function VehicleController({
  carRef,
  track,
}: {
  carRef: RefObject<RapierRigidBody | null>
  track?: TrackData
}) {
  useVehicleController(carRef, track)
  return null
}

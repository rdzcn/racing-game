import type { RefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { useVehicleController } from '../hooks/useVehicleController'
import type { ControlScheme } from '../systems/input'
import type { TrackData } from '../systems/trackGeometry'

/** Mount point for the vehicle controller — must live inside <Physics>. */
export function VehicleController({
  carRef,
  track,
  scheme = 'both',
  playerIndex = 0,
}: {
  carRef: RefObject<RapierRigidBody | null>
  track?: TrackData
  scheme?: ControlScheme
  playerIndex?: 0 | 1
}) {
  useVehicleController(carRef, track, scheme, playerIndex)
  return null
}

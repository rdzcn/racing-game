import type { RefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { useVehicleController } from '../hooks/useVehicleController'

/** Mount point for the vehicle controller — must live inside <Physics>. */
export function VehicleController({ carRef }: { carRef: RefObject<RapierRigidBody | null> }) {
  useVehicleController(carRef)
  return null
}

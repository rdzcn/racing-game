import { useEffect, type RefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { useRaceStore } from '../state/raceStore'

/** Teleports the car back to the start pose whenever a race (re)starts. */
export function ResetHandler({
  carRef,
  spawn,
}: {
  carRef: RefObject<RapierRigidBody | null>
  spawn: { position: [number, number, number]; yaw: number }
}) {
  const resetCount = useRaceStore((s) => s.resetCount)

  useEffect(() => {
    if (resetCount === 0) return // initial mount — RigidBody already spawns there
    const body = carRef.current
    if (!body) return
    const [x, y, z] = spawn.position
    body.setTranslation({ x, y, z }, true)
    body.setRotation(
      { x: 0, y: Math.sin(spawn.yaw / 2), z: 0, w: Math.cos(spawn.yaw / 2) },
      true,
    )
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }, [resetCount, carRef, spawn])

  return null
}

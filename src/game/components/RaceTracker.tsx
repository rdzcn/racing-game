import { useEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import { useRaceStore } from '../state/raceStore'
import { createLapProgress, processGateCrossing } from '../systems/raceRules'
import type { TrackData } from '../systems/trackGeometry'

/** Watches the car cross checkpoint gates and drives the race store.
 * Gate progress lives in a ref (per-frame), the store only gets events. */
export function RaceTracker({
  carRef,
  track,
  playerIndex = 0,
}: {
  carRef: RefObject<RapierRigidBody | null>
  track: TrackData
  playerIndex?: 0 | 1
}) {
  const progress = useRef(createLapProgress())
  const startLap = useRaceStore((s) => s.startLap)
  const completeLap = useRaceStore((s) => s.completeLap)
  const status = useRaceStore((s) => s.status)
  const resetCount = useRaceStore((s) => s.resetCount)
  const radius = track.halfWidth + track.curbWidth

  // fresh gate progress whenever a race (re)starts
  useEffect(() => {
    progress.current = createLapProgress()
  }, [resetCount])

  useFrame(() => {
    if (status !== 'playing') return
    const body = carRef.current
    if (!body) return
    const p = body.translation()
    const v = body.linvel()
    const event = processGateCrossing(progress.current, track.gates, p.x, p.z, v.x, v.z, radius)
    if (event === 'started') startLap(playerIndex, performance.now())
    else if (event === 'lap') completeLap(playerIndex, performance.now())
  })

  return null
}

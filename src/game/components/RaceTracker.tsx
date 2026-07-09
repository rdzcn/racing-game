import { useRef, type RefObject } from 'react'
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
}: {
  carRef: RefObject<RapierRigidBody | null>
  track: TrackData
}) {
  const progress = useRef(createLapProgress())
  const startLap = useRaceStore((s) => s.startLap)
  const completeLap = useRaceStore((s) => s.completeLap)
  const radius = track.halfWidth + track.curbWidth

  useFrame(() => {
    const body = carRef.current
    if (!body) return
    const p = body.translation()
    const v = body.linvel()
    const event = processGateCrossing(progress.current, track.gates, p.x, p.z, v.x, v.z, radius)
    if (event === 'started') startLap(performance.now())
    else if (event === 'lap') completeLap(performance.now())
  })

  return null
}

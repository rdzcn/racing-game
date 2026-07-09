import { describe, expect, it } from 'vitest'
import { trackConfig } from '../config'
import { createLapProgress, processGateCrossing } from './raceRules'
import { buildTrack, type Gate } from './trackGeometry'

// square "track": 4 gates, travel direction counter-clockwise
const gates: Gate[] = [
  { x: 10, z: 0, tx: 0, tz: -1 }, // start, heading -z
  { x: 0, z: -10, tx: -1, tz: 0 },
  { x: -10, z: 0, tx: 0, tz: 1 },
  { x: 0, z: 10, tx: 1, tz: 0 },
]
const R = 3

/** cross gate i at its center, moving along its tangent */
const cross = (p: ReturnType<typeof createLapProgress>, i: number) =>
  processGateCrossing(p, gates, gates[i].x, gates[i].z, gates[i].tx * 5, gates[i].tz * 5, R)

describe('processGateCrossing', () => {
  it('first crossing of gate 0 starts the race', () => {
    const p = createLapProgress()
    expect(cross(p, 0)).toBe('started')
    expect(p.started).toBe(true)
    expect(p.nextGate).toBe(1)
  })

  it('full ordered sequence completes a lap; next lap continues', () => {
    const p = createLapProgress()
    cross(p, 0)
    expect(cross(p, 1)).toBe('gate')
    expect(cross(p, 2)).toBe('gate')
    expect(cross(p, 3)).toBe('gate')
    expect(cross(p, 0)).toBe('lap')
    // second lap works the same
    expect(cross(p, 1)).toBe('gate')
    expect(p.nextGate).toBe(2)
  })

  it('skipping ahead does nothing — infield cuts cannot complete laps', () => {
    const p = createLapProgress()
    cross(p, 0)
    expect(cross(p, 2)).toBe('none') // expected gate 1
    expect(cross(p, 3)).toBe('none')
    expect(cross(p, 0)).toBe('none') // premature finish crossing doesn't count either
    expect(p.nextGate).toBe(1)
  })

  it('re-crossing the previous gate does nothing', () => {
    const p = createLapProgress()
    cross(p, 0)
    cross(p, 1)
    expect(cross(p, 1)).toBe('none')
    expect(p.nextGate).toBe(2)
  })

  it('crossing against the track direction does not count', () => {
    const p = createLapProgress()
    const g = gates[0]
    // at the gate but moving against its tangent (reversing)
    const ev = processGateCrossing(p, gates, g.x, g.z, -g.tx * 5, -g.tz * 5, R)
    expect(ev).toBe('none')
    expect(p.started).toBe(false)
    // sideways (dot == 0) doesn't count either
    expect(processGateCrossing(p, gates, g.x, g.z, g.tz * 5, -g.tx * 5, R)).toBe('none')
  })

  it('only triggers within the gate radius', () => {
    const p = createLapProgress()
    const g = gates[0]
    expect(processGateCrossing(p, gates, g.x + R + 0.5, g.z, g.tx, g.tz, R)).toBe('none')
    expect(processGateCrossing(p, gates, g.x + R - 0.5, g.z, g.tx * 5, g.tz * 5, R)).toBe('started')
  })
})

describe('integration with the real track', () => {
  it('driving the centerline start-to-start produces started + one lap', () => {
    const track = buildTrack(trackConfig)
    const radius = track.halfWidth + track.curbWidth
    const p = createLapProgress()
    const events: string[] = []
    const n = track.centerline.length

    // one full loop + a little extra, sampled like a moving car
    for (let s = 0; s <= n + 5; s++) {
      const i = s % n
      const c = track.centerline[i]
      const t = track.tangents[i]
      const ev = processGateCrossing(p, track.gates, c.x, c.z, t.x * 10, t.z * 10, radius)
      if (ev !== 'none') events.push(ev)
    }

    expect(events[0]).toBe('started')
    expect(events.filter((e) => e === 'lap')).toHaveLength(1)
    expect(events.filter((e) => e === 'gate')).toHaveLength(trackConfig.gateCount - 1)
  })
})

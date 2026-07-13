import { describe, expect, it } from 'vitest'
import { getTrack } from '../config'
import { buildGridTrack, type GridCellData } from './gridTrack'
import { buildGridWorld } from './gridWorld'
import { createLapProgress, gateRadius, processGateCrossing } from './raceRules'
import { buildTrack } from './trackGeometry'

const C = 16

describe('buildGridWorld + buildGridTrack (Forest Kart Loop)', () => {
  const def = getTrack('starter-gp')
  const cells = (def.source as { kind: 'grid'; cells: GridCellData[] }).cells
  const { placements, centerline } = buildGridTrack(cells, C)

  it('generates a closed ~0.6km loop with exactly one finish gate', () => {
    expect(cells.filter(([, , m]) => m === 'finish')).toHaveLength(1)
    let len = 0
    for (let i = 0; i < centerline.length; i++) {
      const a = centerline[i]
      const b = centerline[(i + 1) % centerline.length]
      len += Math.hypot(b.x - a.x, b.z - a.z)
    }
    expect(len).toBeGreaterThan(480) // ≈30s+ of driving
    expect(len).toBeLessThan(700)
  })

  it('centerline is continuous including the wrap-around', () => {
    for (let i = 0; i < centerline.length; i++) {
      const a = centerline[i]
      const b = centerline[(i + 1) % centerline.length]
      expect(Math.hypot(b.x - a.x, b.z - a.z), `jump at sample ${i}`).toBeLessThan(6)
    }
  })

  it('fills the world with decoration tiles around the road', () => {
    expect(placements.filter((p) => p.model === 'forest').length).toBeGreaterThan(30)
    expect(placements.filter((p) => p.model === 'tents').length).toBeGreaterThan(0)
  })

  it('is deterministic', () => {
    expect(buildGridWorld('3 r 1 l 3 l 1 r 3 r 3 r 11 r 3 r')).toEqual(cells)
  })

  it('lap counting works: driving the loop yields started + gates + lap', () => {
    const track = buildTrack(def)
    const radius = gateRadius(track)
    const p = createLapProgress()
    const events: string[] = []
    const n = track.centerline.length
    for (let s = 0; s <= n + 5; s++) {
      const i = s % n
      const c = track.centerline[i]
      const t = track.tangents[i]
      const ev = processGateCrossing(p, track.gates, c.x, c.z, t.x * 10, t.z * 10, radius)
      if (ev !== 'none') events.push(ev)
    }
    expect(events[0]).toBe('started')
    expect(events.filter((e) => e === 'lap')).toHaveLength(1)
    expect(events.filter((e) => e === 'gate')).toHaveLength(def.gateCount - 1)
  })

  it('lap counting survives a lateral cut through the tight chicane right after the start', () => {
    // Forest Kart Loop's layout throws a 1-tile chicane ("1 l" / "1 r") right
    // after the start straight, and its track is the narrowest/tightest of
    // any track (halfWidth+curbWidth ≈ 5.6m — the old, unforgiving gate
    // radius). A real driving line commonly clips a curb or drifts onto the
    // grass through a chicane like that; this simulates a car that's
    // consistently offset just beyond the *old* radius but within the new
    // gateRadius() margin, and still completes the lap without stalling on
    // a missed intermediate gate.
    const track = buildTrack(def)
    const oldRadius = track.halfWidth + track.curbWidth
    const radius = gateRadius(track)
    const cut = oldRadius + 1.5
    expect(cut).toBeLessThan(radius)

    const p = createLapProgress()
    const events: string[] = []
    const n = track.centerline.length
    for (let s = 0; s <= n + 5; s++) {
      const i = s % n
      const c = track.centerline[i]
      const t = track.tangents[i]
      const nx = -t.z // perpendicular (right-hand) to travel direction
      const nz = t.x
      const ev = processGateCrossing(
        p,
        track.gates,
        c.x + nx * cut,
        c.z + nz * cut,
        t.x * 10,
        t.z * 10,
        radius,
      )
      if (ev !== 'none') events.push(ev)
    }
    expect(events[0]).toBe('started')
    expect(events.filter((e) => e === 'lap')).toHaveLength(1)
    expect(events.filter((e) => e === 'gate')).toHaveLength(def.gateCount - 1)
  })
})

describe('buildGridWorld validation', () => {
  it('rejects non-closing layouts', () => {
    expect(() => buildGridWorld('3 l 3 l 3 l 2 l')).toThrow(/does not close|overlap/)
  })

  it('rejects overlapping layouts', () => {
    expect(() => buildGridWorld('4 l 2 l 2 l 4 l 2 l 2 l')).toThrow(/overlap|does not close/)
  })
})

describe('buildGridTrack validation', () => {
  it('rejects road tiles that cannot form a loop', () => {
    const broken: GridCellData[] = [
      [0, 0, 'straight', 0],
      [0, 1, 'straight', 0],
      [0, 2, 'corner', 0],
      [1, 2, 'corner', 0],
    ]
    expect(() => buildGridTrack(broken, C)).toThrow(/no orientation mapping/)
  })

  it('rejects fewer than 4 road tiles', () => {
    expect(() => buildGridTrack([[0, 0, 'straight', 0]], C)).toThrow(/not enough road/)
  })
})

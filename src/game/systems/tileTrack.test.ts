import { describe, expect, it } from 'vitest'
import { tracks } from '../config'
import { buildTileTrack, parseLayout, trackLength } from './tileTrack'

describe('parseLayout', () => {
  it('parses runs and corners', () => {
    expect(parseLayout('12 l 3 R')).toEqual([12, 'l', 3, 'R'])
  })

  it('rejects junk', () => {
    expect(() => parseLayout('3 x 4')).toThrow(/unexpected token/)
  })
})

describe('buildTileTrack', () => {
  const C = 14

  it('builds a minimal closed loop (small-corner square)', () => {
    // 2 straights per side, small corners
    const { placements, centerline } = buildTileTrack('2 r 2 r 2 r 2 r', C)
    expect(placements.filter((p) => p.model === 'cornerSmall')).toHaveLength(4)
    expect(placements.filter((p) => p.model === 'start')).toHaveLength(1)
    // 8 straight cells total, 2 covered by the start gate
    expect(placements.filter((p) => p.model === 'straight')).toHaveLength(6)
    expect(centerline.length).toBeGreaterThan(20)
  })

  it('rejects non-closing layouts', () => {
    expect(() => buildTileTrack('3 l 3 l 3 l 2 l', C)).toThrow(/does not close/)
  })

  it('rejects overlapping layouts', () => {
    // straight run crossing back over itself
    expect(() => buildTileTrack('4 l 2 l 2 l 4 l 2 l 2 l', C)).toThrow(/overlap|does not close/)
  })

  it('rejects layouts starting with a corner or short run', () => {
    expect(() => buildTileTrack('l 3 l 3 l 3', C)).toThrow(/start gate/)
    expect(() => buildTileTrack('1 l 1 l 1 l 1 l', C)).toThrow(/start gate/)
  })

  it('re-centers the track on the origin', () => {
    const { centerline } = buildTileTrack('6 r 2 r 6 r 2 r', C)
    const xs = centerline.map((p) => p.x)
    const zs = centerline.map((p) => p.z)
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(0, 5)
    expect((Math.min(...zs) + Math.max(...zs)) / 2).toBeCloseTo(0, 5)
  })

  it('centerline is continuous (no jumps)', () => {
    const { centerline } = buildTileTrack('4 L 2 L 4 L 2 L', C)
    for (let i = 0; i < centerline.length; i++) {
      const a = centerline[i]
      const b = centerline[(i + 1) % centerline.length]
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(5)
    }
  })
})

describe('shipping tile layouts', () => {
  const tileTracks = tracks.filter((t) => t.source.kind === 'tiles')

  it('there are three of them', () => {
    expect(tileTracks).toHaveLength(3)
  })

  for (const def of tileTracks) {
    const source = def.source as { kind: 'tiles'; layout: string; cellSize: number }

    it(`${def.id}: closes, no overlaps, and is a ~1-minute lap`, () => {
      const { centerline, placements } = buildTileTrack(source.layout, source.cellSize)
      expect(placements.length).toBeGreaterThan(10)
      const len = trackLength(centerline)
      // ~1 min at kid pace (20-30 m/s average with braking)
      expect(len).toBeGreaterThan(900)
      expect(len).toBeLessThan(2000)
    })

    it(`${def.id}: fits its configured ground`, () => {
      const { centerline } = buildTileTrack(source.layout, source.cellSize)
      const half = (def.groundSize ?? 200) / 2
      for (const p of centerline) {
        expect(Math.abs(p.x)).toBeLessThan(half - source.cellSize)
        expect(Math.abs(p.z)).toBeLessThan(half - source.cellSize)
      }
    })
  }
})

import { describe, expect, it } from 'vitest'
import { trackConfig } from '../config'
import { generatePlacements, mulberry32 } from './scenery'
import { buildTrack, nearestCenterlineIndex } from './trackGeometry'

const track = buildTrack(trackConfig)

describe('generatePlacements', () => {
  const opts = { bound: 95, clearance: 5, seed: 42 }

  it('is deterministic for the same seed', () => {
    expect(generatePlacements(track, 30, opts)).toEqual(generatePlacements(track, 30, opts))
  })

  it('differs for a different seed', () => {
    expect(generatePlacements(track, 30, opts)).not.toEqual(
      generatePlacements(track, 30, { ...opts, seed: 7 }),
    )
  })

  it('keeps every placement clear of the road and inside bounds', () => {
    const placements = generatePlacements(track, 60, opts)
    expect(placements).toHaveLength(60)
    const limit = track.halfWidth + track.curbWidth + opts.clearance
    for (const p of placements) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(opts.bound)
      expect(Math.abs(p.z)).toBeLessThanOrEqual(opts.bound)
      const i = nearestCenterlineIndex(track, p.x, p.z)
      const d = Math.hypot(track.centerline[i].x - p.x, track.centerline[i].z - p.z)
      expect(d).toBeGreaterThanOrEqual(limit)
    }
  })
})

describe('mulberry32', () => {
  it('produces values in [0, 1)', () => {
    const rand = mulberry32(1)
    for (let i = 0; i < 1000; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

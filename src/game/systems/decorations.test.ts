import { describe, expect, it } from 'vitest'
import { getTrack } from '../config'
import { generateDecorations } from './decorations'
import { buildTrack, nearestCenterlineIndex } from './trackGeometry'

const tracksToTest = ['meadow', 'speedway', 'snake'].map((id) => buildTrack(getTrack(id)))

describe('generateDecorations', () => {
  for (const track of tracksToTest) {
    describe(track.def.id, () => {
      const decorations = generateDecorations(track)

      it('produces tires, stands and banner towers', () => {
        const models = new Set(decorations.map((d) => d.model))
        expect(models.has('tire')).toBe(true)
        expect(models.has('bannerTowerGreen')).toBe(true)
        expect(decorations.filter((d) => d.model.startsWith('grandStand')).length).toBeGreaterThan(0)
      })

      it('keeps everything off the road', () => {
        const limit = track.halfWidth + track.curbWidth
        for (const d of decorations) {
          const i = nearestCenterlineIndex(track, d.x, d.z)
          const c = track.centerline[i]
          expect(Math.hypot(c.x - d.x, c.z - d.z)).toBeGreaterThan(limit * 0.99)
        }
      })

      it('tires hug the road (tire walls, not confetti)', () => {
        const limit = track.halfWidth + track.curbWidth
        for (const d of decorations.filter((d) => d.model === 'tire')) {
          const i = nearestCenterlineIndex(track, d.x, d.z)
          const c = track.centerline[i]
          expect(Math.hypot(c.x - d.x, c.z - d.z)).toBeLessThan(limit + 3)
        }
      })

      it('is deterministic', () => {
        expect(generateDecorations(track)).toEqual(decorations)
      })
    })
  }

  it('puts tires only near corners (speedway straights stay clear)', () => {
    const speedway = tracksToTest[1]
    const decorations = generateDecorations(speedway)
    const tires = decorations.filter((d) => d.model === 'tire')
    // speedway is mostly straight — tires should cover a minority of the lap
    const n = speedway.centerline.length
    const cornerish = new Set(tires.map((d) => nearestCenterlineIndex(speedway, d.x, d.z)))
    expect(cornerish.size).toBeLessThan(n / 2)
    expect(tires.length).toBeGreaterThan(10)
  })
})

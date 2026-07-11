import { describe, expect, it } from 'vitest'
import { getTrack } from '../config'
import { generateDressing } from './decorations'
import { buildTrack, nearestCenterlineIndex } from './trackGeometry'

const tracksToTest = ['meadow', 'speedway', 'snake', 'chicane-gp'].map((id) =>
  buildTrack(getTrack(id)),
)

describe('generateDressing', () => {
  for (const track of tracksToTest) {
    describe(track.def.id, () => {
      const { decorations, barriers } = generateDressing(track)
      const roadEdge = track.halfWidth + track.curbWidth

      it('produces tires, barriers and stands', () => {
        const models = new Set(decorations.map((d) => d.model))
        expect(models.has('tire')).toBe(true)
        expect(barriers.length).toBeGreaterThan(5)
        expect(decorations.filter((d) => d.model.startsWith('grandStand')).length).toBeGreaterThan(0)
      })

      it('keeps every decoration off the road — including other road pieces', () => {
        for (const d of decorations) {
          const i = nearestCenterlineIndex(track, d.x, d.z)
          const c = track.centerline[i]
          const dist = Math.hypot(c.x - d.x, c.z - d.z)
          expect(dist, `${d.model} at (${d.x.toFixed(1)},${d.z.toFixed(1)})`).toBeGreaterThan(
            roadEdge * 0.99,
          )
        }
      })

      it('large props keep extra clearance for their footprint', () => {
        for (const d of decorations) {
          if (!d.model.startsWith('grandStand') && d.model !== 'tentLong') continue
          const i = nearestCenterlineIndex(track, d.x, d.z)
          const c = track.centerline[i]
          expect(Math.hypot(c.x - d.x, c.z - d.z)).toBeGreaterThan(roadEdge + 6)
        }
      })

      it('tires hug the road (tire walls, not confetti)', () => {
        for (const d of decorations.filter((d) => d.model === 'tire')) {
          const i = nearestCenterlineIndex(track, d.x, d.z)
          const c = track.centerline[i]
          expect(Math.hypot(c.x - d.x, c.z - d.z)).toBeLessThan(roadEdge + 3)
        }
      })

      it('barriers sit between consecutive tires, just off the road', () => {
        for (const b of barriers) {
          const i = nearestCenterlineIndex(track, b.x, b.z)
          const c = track.centerline[i]
          const dist = Math.hypot(c.x - b.x, c.z - b.z)
          expect(dist).toBeGreaterThan(track.halfWidth)
          expect(dist).toBeLessThan(roadEdge + 3)
          expect(b.length).toBeGreaterThan(0.5)
          expect(b.length).toBeLessThan(8)
        }
      })

      it('is deterministic', () => {
        expect(generateDressing(track)).toEqual({ decorations, barriers })
      })
    })
  }

  it('puts tires only near corners (speedway straights stay clear)', () => {
    const speedway = tracksToTest[1]
    const { decorations } = generateDressing(speedway)
    const tires = decorations.filter((d) => d.model === 'tire')
    const n = speedway.centerline.length
    const cornerish = new Set(tires.map((d) => nearestCenterlineIndex(speedway, d.x, d.z)))
    expect(cornerish.size).toBeLessThan(n / 2)
    expect(tires.length).toBeGreaterThan(10)
  })
})

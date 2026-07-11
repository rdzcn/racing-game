import { describe, expect, it } from 'vitest'
import { STARTER_GP_CELLS } from '../assets/tracks/starterGP'
import { buildGridTrack, type GridCellData } from './gridTrack'

const C = 16

describe('buildGridTrack on the imported Starter Kit layout', () => {
  const { placements, centerline } = buildGridTrack(STARTER_GP_CELLS, C)

  it('resolves orientations into one closed road loop', () => {
    const roadCount = STARTER_GP_CELLS.filter(([, , m]) =>
      ['straight', 'corner', 'finish', 'ramp'].includes(m),
    ).length
    expect(roadCount).toBe(16)
    expect(centerline.length).toBeGreaterThan(50)
  })

  it('centerline is continuous including the wrap-around', () => {
    for (let i = 0; i < centerline.length; i++) {
      const a = centerline[i]
      const b = centerline[(i + 1) % centerline.length]
      expect(
        Math.hypot(b.x - a.x, b.z - a.z),
        `jump between sample ${i} and ${i + 1}`,
      ).toBeLessThan(6)
    }
  })

  it('keeps every decoration cell as a placement', () => {
    expect(placements).toHaveLength(STARTER_GP_CELLS.length)
    expect(placements.filter((p) => p.model === 'forest').length).toBeGreaterThan(20)
  })

  it('is centered on the origin', () => {
    const xs = centerline.map((p) => p.x)
    const zs = centerline.map((p) => p.z)
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(0, 5)
    expect((Math.min(...zs) + Math.max(...zs)) / 2).toBeCloseTo(0, 5)
  })

  it('centerline stays within the decorated world', () => {
    const half = (Math.sqrt(placements.length) / 2 + 1) * C
    for (const p of centerline) {
      expect(Math.abs(p.x)).toBeLessThan(half * 2)
      expect(Math.abs(p.z)).toBeLessThan(half * 2)
    }
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

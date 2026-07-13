import { describe, expect, it } from 'vitest'
import { CHUNK_SAMPLES, EndlessRoad, SAMPLE_SPACING } from './endlessRoad'

describe('EndlessRoad', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = new EndlessRoad(42)
    const b = new EndlessRoad(42)
    const c = new EndlessRoad(7)
    a.ensureSamples(500)
    b.ensureSamples(500)
    c.ensureSamples(500)
    expect(a.points).toEqual(b.points)
    expect(a.points).not.toEqual(c.points)
  })

  it('grows a continuous, evenly spaced centerline', () => {
    const road = new EndlessRoad(42)
    road.ensureSamples(2000)
    for (let i = 1; i < 2000; i++) {
      const a = road.points[i - 1]
      const b = road.points[i]
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(SAMPLE_SPACING, 5)
    }
  })

  it('never turns tighter than the curvature cap allows', () => {
    const road = new EndlessRoad(1337)
    road.ensureSamples(3000)
    for (let i = 1; i < 3000; i++) {
      const a = road.tangents[i - 1]
      const b = road.tangents[i]
      const angle = Math.abs(Math.asin(Math.max(-1, Math.min(1, a.x * b.z - a.z * b.x))))
      // max heading change per sample = MAX_CURVATURE * spacing ≈ 0.055 rad
      expect(angle).toBeLessThan(0.06)
    }
  })

  it('chunk geometry spans the road width and shares seams between chunks', () => {
    const road = new EndlessRoad(42, 12)
    const g0 = road.chunkGeometry(0)
    const g1 = road.chunkGeometry(1)
    expect(g0.positions.length).toBe((CHUNK_SAMPLES + 1) * 6)
    // width
    const w = Math.hypot(g0.positions[3] - g0.positions[0], g0.positions[5] - g0.positions[2])
    expect(w).toBeCloseTo(12, 5)
    // last verts of chunk 0 == first verts of chunk 1 (no gaps)
    const tail = g0.positions.slice(-6)
    const head = g1.positions.slice(0, 6)
    for (let i = 0; i < 6; i++) expect(tail[i]).toBeCloseTo(head[i], 5)
  })

  it('places trees clear of the road, deterministically', () => {
    const road = new EndlessRoad(42)
    const trees = road.chunkTrees(3)
    expect(trees).toEqual(new EndlessRoad(42).chunkTrees(3))
    for (const tree of trees) {
      const idx = road.nearestIndex(tree.x, tree.z, 3 * CHUNK_SAMPLES + CHUNK_SAMPLES / 2)
      const c = road.points[idx]
      expect(Math.hypot(c.x - tree.x, c.z - tree.z)).toBeGreaterThan(road.halfWidth + 4)
    }
  })

  it('places coin rows on the centerline', () => {
    const road = new EndlessRoad(42)
    const coins = [0, 1, 2].flatMap((k) => road.chunkCoins(k))
    expect(coins.length).toBeGreaterThan(0)
    for (const coin of coins) {
      const c = road.points[coin.index]
      expect(Math.hypot(c.x - coin.x, c.z - coin.z)).toBeLessThan(0.01)
    }
  })

  it('windowed nearest-index finds the true nearest sample', () => {
    const road = new EndlessRoad(42)
    road.ensureSamples(1000)
    const p = road.points[500]
    expect(road.nearestIndex(p.x + 1, p.z, 490)).toBe(500)
  })
})

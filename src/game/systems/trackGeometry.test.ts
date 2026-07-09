import { describe, expect, it } from 'vitest'
import { trackConfig } from '../config'
import {
  buildTrack,
  isOffTrack,
  nearestCenterlineIndex,
  respawnPose,
  yawFromTangent,
} from './trackGeometry'

const track = buildTrack(trackConfig)

describe('buildTrack', () => {
  it('produces a closed, evenly-sampled centerline', () => {
    const line = track.centerline
    expect(line).toHaveLength(trackConfig.samples)
    // spacing between consecutive samples (incl. wrap-around) is near-uniform
    const dist = (a: number, b: number) =>
      Math.hypot(line[a].x - line[b].x, line[a].z - line[b].z)
    const first = dist(0, 1)
    const wrap = dist(line.length - 1, 0)
    expect(wrap).toBeGreaterThan(first * 0.5)
    expect(wrap).toBeLessThan(first * 2)
  })

  it('tangents are unit length', () => {
    for (const t of track.tangents) {
      expect(Math.hypot(t.x, t.z)).toBeCloseTo(1, 5)
    }
  })

  it('road ribbon spans the configured width', () => {
    const p = track.road.positions
    // first sample: left and right edge verts
    const w = Math.hypot(p[3] - p[0], p[5] - p[2])
    expect(w).toBeCloseTo(trackConfig.width, 5)
  })

  it('places the configured number of gates on the centerline', () => {
    expect(track.gates).toHaveLength(trackConfig.gateCount)
    for (const g of track.gates) {
      const i = nearestCenterlineIndex(track, g.x, g.z)
      const c = track.centerline[i]
      expect(Math.hypot(c.x - g.x, c.z - g.z)).toBeLessThan(1e-6)
    }
  })

  it('gates are roughly evenly spaced along the loop', () => {
    const spacings: number[] = []
    for (let i = 0; i < track.gates.length; i++) {
      const a = track.gates[i]
      const b = track.gates[(i + 1) % track.gates.length]
      spacings.push(Math.hypot(a.x - b.x, a.z - b.z))
    }
    const min = Math.min(...spacings)
    const max = Math.max(...spacings)
    // chord lengths vary with curvature but shouldn't be wildly uneven
    expect(max / min).toBeLessThan(2.5)
  })

  it('start pose faces along the track', () => {
    const t = track.tangents[0]
    const yaw = track.start.yaw
    // forward = (-sin yaw, -cos yaw) must equal the tangent
    expect(-Math.sin(yaw)).toBeCloseTo(t.x, 5)
    expect(-Math.cos(yaw)).toBeCloseTo(t.z, 5)
  })
})

describe('off-track detection', () => {
  it('centerline and curb points are on-track', () => {
    const c = track.centerline[10]
    expect(isOffTrack(track, c.x, c.z)).toBe(false)
    // point near the outer curb edge, offset sideways from a sample
    const t = track.tangents[10]
    const off = track.halfWidth + track.curbWidth * 0.4
    expect(isOffTrack(track, c.x + -t.z * off, c.z + t.x * off)).toBe(false)
  })

  it('grass beyond the curbs is off-track', () => {
    const c = track.centerline[10]
    const t = track.tangents[10]
    const off = track.halfWidth + track.curbWidth + 3
    expect(isOffTrack(track, c.x + -t.z * off, c.z + t.x * off)).toBe(true)
    // and deep infield
    expect(isOffTrack(track, 0, 0)).toBe(true)
  })
})

describe('respawnPose', () => {
  it('returns the nearest centerline point facing along the track', () => {
    const c = track.centerline[50]
    const t = track.tangents[50]
    // query from the grass, sideways of sample 50
    const pose = respawnPose(track, c.x + -t.z * 15, c.z + t.x * 15)
    expect(Math.hypot(pose.x - c.x, pose.z - c.z)).toBeLessThan(3)
    expect(pose.yaw).toBeCloseTo(yawFromTangent(t.x, t.z), 1)
  })
})

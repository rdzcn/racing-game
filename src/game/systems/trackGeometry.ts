import { CatmullRomCurve3, Vector3 } from 'three'
import type { TrackConfig } from '../config'

export interface Vec2 {
  x: number
  z: number
}

/** Flat (y-up) ribbon strip along the centerline — road surface, curbs */
export interface RibbonGeometry {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint32Array
}

export interface Gate extends Vec2 {
  /** unit tangent (direction of travel) at the gate */
  tx: number
  tz: number
}

export interface Pose extends Vec2 {
  yaw: number
}

export interface TrackData {
  centerline: Vec2[]
  /** unit tangents per sample */
  tangents: Vec2[]
  halfWidth: number
  curbWidth: number
  road: RibbonGeometry
  curbLeft: RibbonGeometry
  curbRight: RibbonGeometry
  /** per-vertex stripe colors for the curbs (shared by both sides) */
  curbColors: Float32Array
  gates: Gate[]
  start: Pose
}

/** Car-forward is -Z, so a heading tangent (tx, tz) maps to this yaw */
export function yawFromTangent(tx: number, tz: number): number {
  return Math.atan2(-tx, -tz)
}

const ROAD_Y = 0.02
const CURB_Y = 0.03

export function buildTrack(config: TrackConfig): TrackData {
  const points = config.waypoints.map(([x, z]) => new Vector3(x, 0, z))
  const curve = new CatmullRomCurve3(points, true, 'centripetal')

  const n = config.samples
  const centerline: Vec2[] = new Array(n)
  const tangents: Vec2[] = new Array(n)
  const spaced = curve.getSpacedPoints(n) // n+1 points, last === first
  const tmp = new Vector3()
  for (let i = 0; i < n; i++) {
    centerline[i] = { x: spaced[i].x, z: spaced[i].z }
    curve.getTangentAt(i / n, tmp)
    const len = Math.hypot(tmp.x, tmp.z) || 1
    tangents[i] = { x: tmp.x / len, z: tmp.z / len }
  }

  const halfWidth = config.width / 2
  const road = buildRibbon(centerline, tangents, -halfWidth, halfWidth, ROAD_Y)
  const curbLeft = buildRibbon(centerline, tangents, -halfWidth - config.curbWidth, -halfWidth, CURB_Y)
  const curbRight = buildRibbon(centerline, tangents, halfWidth, halfWidth + config.curbWidth, CURB_Y)

  const gates: Gate[] = []
  for (let g = 0; g < config.gateCount; g++) {
    const i = Math.round((g * n) / config.gateCount) % n
    gates.push({ ...centerline[i], tx: tangents[i].x, tz: tangents[i].z })
  }

  const start: Pose = {
    ...centerline[0],
    yaw: yawFromTangent(tangents[0].x, tangents[0].z),
  }

  return {
    centerline,
    tangents,
    halfWidth,
    curbWidth: config.curbWidth,
    road,
    curbLeft,
    curbRight,
    curbColors: buildCurbColors(n),
    gates,
    start,
  }
}

/**
 * Strip between two signed lateral offsets from the centerline
 * (negative = left of travel direction). Closed loop, flat, facing up.
 */
export function buildRibbon(
  centerline: Vec2[],
  tangents: Vec2[],
  fromOffset: number,
  toOffset: number,
  y: number,
): RibbonGeometry {
  const n = centerline.length
  const positions = new Float32Array(n * 2 * 3)
  const normals = new Float32Array(n * 2 * 3)
  const uvs = new Float32Array(n * 2 * 2)
  const indices = new Uint32Array(n * 6)

  for (let i = 0; i < n; i++) {
    const c = centerline[i]
    const t = tangents[i]
    // right-hand side normal of travel direction
    const nx = -t.z
    const nz = t.x
    const j = i * 6
    positions[j] = c.x + nx * fromOffset
    positions[j + 1] = y
    positions[j + 2] = c.z + nz * fromOffset
    positions[j + 3] = c.x + nx * toOffset
    positions[j + 4] = y
    positions[j + 5] = c.z + nz * toOffset
    normals[j + 1] = 1
    normals[j + 4] = 1
    const k = i * 4
    uvs[k] = i / n
    uvs[k + 1] = 0
    uvs[k + 2] = i / n
    uvs[k + 3] = 1
  }

  for (let i = 0; i < n; i++) {
    const a = i * 2
    const b = ((i + 1) % n) * 2
    const j = i * 6
    indices[j] = a
    indices[j + 1] = b
    indices[j + 2] = a + 1
    indices[j + 3] = b
    indices[j + 4] = b + 1
    indices[j + 5] = a + 1
  }

  return { positions, normals, uvs, indices }
}

/** Red/white stripes, alternating every `stripeEvery` samples */
function buildCurbColors(n: number, stripeEvery = 8): Float32Array {
  const colors = new Float32Array(n * 2 * 3)
  for (let i = 0; i < n; i++) {
    const red = Math.floor(i / stripeEvery) % 2 === 0
    const [r, g, b] = red ? [0.85, 0.1, 0.1] : [0.95, 0.95, 0.95]
    for (const v of [i * 6, i * 6 + 3]) {
      colors[v] = r
      colors[v + 1] = g
      colors[v + 2] = b
    }
  }
  return colors
}

/** Index of the closest centerline sample. O(samples) — fine per physics step. */
export function nearestCenterlineIndex(track: TrackData, x: number, z: number): number {
  let best = 0
  let bestD = Infinity
  const line = track.centerline
  for (let i = 0; i < line.length; i++) {
    const dx = line[i].x - x
    const dz = line[i].z - z
    const d = dx * dx + dz * dz
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** Off the road surface (curbs still count as on-track) */
export function isOffTrack(track: TrackData, x: number, z: number): boolean {
  const i = nearestCenterlineIndex(track, x, z)
  const dx = track.centerline[i].x - x
  const dz = track.centerline[i].z - z
  const limit = track.halfWidth + track.curbWidth
  return dx * dx + dz * dz > limit * limit
}

/** Where to put the car back: nearest centerline point, facing along the track */
export function respawnPose(track: TrackData, x: number, z: number): Pose {
  const i = nearestCenterlineIndex(track, x, z)
  const t = track.tangents[i]
  return { ...track.centerline[i], yaw: yawFromTangent(t.x, t.z) }
}

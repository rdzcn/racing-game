import { CatmullRomCurve3, Vector3 } from 'three'
import type { TrackDefinition } from '../config'
import { buildGridTrack, type GridPlacement } from './gridTrack'
import { buildTileTrack, type TilePlacement } from './tileTrack'

export interface Vec2 {
  x: number
  z: number
}

/** Centerline sample — y is the road surface height (0 for flat tracks) */
export interface CenterPoint extends Vec2 {
  y: number
}

/** Flat (y-up) ribbon strip along the centerline — road surface, curbs */
export interface RibbonGeometry {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint32Array
}

export interface Gate extends CenterPoint {
  /** unit tangent (direction of travel) at the gate */
  tx: number
  tz: number
}

export interface Pose extends CenterPoint {
  yaw: number
}

/** Ribbon geometry for generated (waypoint) tracks; mesh tracks render their model instead */
export interface GeneratedTrackGeometry {
  road: RibbonGeometry
  curbLeft: RibbonGeometry
  curbRight: RibbonGeometry
  /** per-vertex stripe colors for the curbs (shared by both sides) */
  curbColors: Float32Array
}

export interface TrackData {
  def: TrackDefinition
  centerline: CenterPoint[]
  /** unit xz tangents per sample */
  tangents: Vec2[]
  halfWidth: number
  curbWidth: number
  geometry?: GeneratedTrackGeometry
  /** Tile tracks: Kenney road-piece placements for rendering */
  tiles?: TilePlacement[]
  /** Grid tracks (Godot import): full-world tile placements incl. scenery */
  gridTiles?: GridPlacement[]
  /** Tile/grid tracks: grid cell size (also the tile model scale) */
  cellSize?: number
  gates: Gate[]
  start: Pose
}

/** Car-forward is -Z, so a heading tangent (tx, tz) maps to this yaw */
export function yawFromTangent(tx: number, tz: number): number {
  return Math.atan2(-tx, -tz)
}

const ROAD_Y = 0.02
const CURB_Y = 0.03

export function buildTrack(def: TrackDefinition): TrackData {
  const tiles =
    def.source.kind === 'tiles'
      ? buildTileTrack(def.source.layout, def.source.cellSize)
      : undefined
  const grid =
    def.source.kind === 'grid'
      ? buildGridTrack(def.source.cells, def.source.cellSize)
      : undefined

  const { centerline, tangents } =
    def.source.kind === 'waypoints'
      ? sampleWaypointSpline(def.source.waypoints, def.source.samples)
      : withComputedTangents((tiles ?? grid)!.centerline)

  const n = centerline.length
  const halfWidth = def.width / 2

  const geometry =
    def.source.kind === 'waypoints'
      ? {
          road: buildRibbon(centerline, tangents, -halfWidth, halfWidth, ROAD_Y),
          curbLeft: buildRibbon(centerline, tangents, -halfWidth - def.curbWidth, -halfWidth, CURB_Y),
          curbRight: buildRibbon(centerline, tangents, halfWidth, halfWidth + def.curbWidth, CURB_Y),
          curbColors: buildCurbColors(n),
        }
      : undefined

  const gates: Gate[] = []
  for (let g = 0; g < def.gateCount; g++) {
    const i = Math.round((g * n) / def.gateCount) % n
    gates.push({ ...centerline[i], tx: tangents[i].x, tz: tangents[i].z })
  }

  const start: Pose = {
    ...centerline[0],
    yaw: yawFromTangent(tangents[0].x, tangents[0].z),
  }

  return {
    def,
    centerline,
    tangents,
    halfWidth,
    curbWidth: def.curbWidth,
    geometry,
    tiles: tiles?.placements,
    gridTiles: grid?.placements,
    cellSize:
      def.source.kind === 'tiles' || def.source.kind === 'grid'
        ? def.source.cellSize
        : undefined,
    gates,
    start,
  }
}

/** finite-difference tangents for an already-sampled closed centerline */
function withComputedTangents(centerline: CenterPoint[]) {
  const n = centerline.length
  const tangents: Vec2[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const prev = centerline[(i - 1 + n) % n]
    const next = centerline[(i + 1) % n]
    const dx = next.x - prev.x
    const dz = next.z - prev.z
    const len = Math.hypot(dx, dz) || 1
    tangents[i] = { x: dx / len, z: dz / len }
  }
  return { centerline, tangents }
}

/** Waypoints → closed Catmull-Rom spline, evenly resampled (flat, y = 0) */
function sampleWaypointSpline(waypoints: [number, number][], samples: number) {
  const points = waypoints.map(([x, z]) => new Vector3(x, 0, z))
  const curve = new CatmullRomCurve3(points, true, 'centripetal')
  const centerline: CenterPoint[] = new Array(samples)
  const tangents: Vec2[] = new Array(samples)
  const spaced = curve.getSpacedPoints(samples) // n+1 points, last === first
  const tmp = new Vector3()
  for (let i = 0; i < samples; i++) {
    centerline[i] = { x: spaced[i].x, y: 0, z: spaced[i].z }
    curve.getTangentAt(i / samples, tmp)
    const len = Math.hypot(tmp.x, tmp.z) || 1
    tangents[i] = { x: tmp.x / len, z: tmp.z / len }
  }
  return { centerline, tangents }
}


/**
 * Strip between two signed lateral offsets from the centerline
 * (negative = left of travel direction). Closed loop, facing up.
 * `y`: constant height, or 'centerline' to follow each sample's elevation.
 */
export function buildRibbon(
  centerline: CenterPoint[],
  tangents: Vec2[],
  fromOffset: number,
  toOffset: number,
  y: number | 'centerline',
): RibbonGeometry {
  const n = centerline.length
  const positions = new Float32Array(n * 2 * 3)
  const normals = new Float32Array(n * 2 * 3)
  const uvs = new Float32Array(n * 2 * 2)
  const indices = new Uint32Array(n * 6)

  for (let i = 0; i < n; i++) {
    const c = centerline[i]
    const t = tangents[i]
    const yi = y === 'centerline' ? c.y : y
    // right-hand side normal of travel direction
    const nx = -t.z
    const nz = t.x
    const j = i * 6
    positions[j] = c.x + nx * fromOffset
    positions[j + 1] = yi
    positions[j + 2] = c.z + nz * fromOffset
    positions[j + 3] = c.x + nx * toOffset
    positions[j + 4] = yi
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
    // CCW seen from above (+y) so front faces point up and aren't culled
    indices[j] = a
    indices[j + 1] = a + 1
    indices[j + 2] = b
    indices[j + 3] = b
    indices[j + 4] = a + 1
    indices[j + 5] = b + 1
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

/** Off the road surface (curbs still count as on-track).
 * `margin` widens the allowed band — e.g. respawn-mode tracks give a little
 * grace beyond the curb before teleporting the car back. */
export function isOffTrack(track: TrackData, x: number, z: number, margin = 0): boolean {
  const i = nearestCenterlineIndex(track, x, z)
  const dx = track.centerline[i].x - x
  const dz = track.centerline[i].z - z
  const limit = track.halfWidth + track.curbWidth + margin
  return dx * dx + dz * dz > limit * limit
}

/** Where to put the car back: nearest centerline point, facing along the track */
export function respawnPose(track: TrackData, x: number, z: number): Pose {
  const i = nearestCenterlineIndex(track, x, z)
  const t = track.tangents[i]
  return { ...track.centerline[i], yaw: yawFromTangent(t.x, t.z) }
}

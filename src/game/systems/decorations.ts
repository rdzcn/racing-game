import { mulberry32 } from './scenery'
import type { TrackData } from './trackGeometry'

/**
 * Automatic track dressing derived from the centerline:
 * - corners get tire walls (and pylons at their entry) on the OUTSIDE
 * - long straights get grandstands/tents on the outside of the loop
 * - the start gets banner towers
 * Deterministic for a given track. Everything is placed with clearance so it
 * never encroaches on the road.
 */
export type DecorationModel =
  | 'tire'
  | 'pylon'
  | 'grandStand'
  | 'grandStandRound'
  | 'grandStandCovered'
  | 'tentLong'
  | 'bannerTowerGreen'
  | 'bannerTowerRed'

export interface Decoration {
  model: DecorationModel
  x: number
  y: number
  z: number
  rotationY: number
  scale: number
  /** lay the model on its side (tires: barrel-stack look) */
  layFlat?: boolean
}

/** signed turn rate at sample i over a window (positive = turning left) */
function turnRate(track: TrackData, i: number, window: number): number {
  const n = track.tangents.length
  const a = track.tangents[i]
  const b = track.tangents[(i + window) % n]
  // z-component of 2D cross(a, b); sign flips because our N is -z
  return -(a.x * b.z - a.z * b.x)
}

/** +1 if the loop runs counter-clockwise (interior on the left of travel) */
function loopOrientation(track: TrackData): number {
  let area = 0
  const line = track.centerline
  for (let i = 0; i < line.length; i++) {
    const a = line[i]
    const b = line[(i + 1) % line.length]
    area += a.x * b.z - b.x * a.z
  }
  return area > 0 ? 1 : -1
}

const CORNER_THRESHOLD = 0.18

export function generateDecorations(track: TrackData): Decoration[] {
  const rand = mulberry32(20260710)
  const out: Decoration[] = []
  const n = track.centerline.length
  const roadEdge = track.halfWidth + track.curbWidth

  // window sized to ~4m of arc so corner detection is sample-density independent
  let length = 0
  for (let i = 0; i < n; i++) {
    const a = track.centerline[i]
    const b = track.centerline[(i + 1) % n]
    length += Math.hypot(b.x - a.x, b.z - a.z)
  }
  const window = Math.max(2, Math.round(4 / (length / n)))

  // --- corner zones → tire walls on the outside ---------------------------
  const isCorner: boolean[] = new Array(n)
  const turnSign: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const t = turnRate(track, i, window)
    isCorner[i] = Math.abs(t) > CORNER_THRESHOLD
    turnSign[i] = Math.sign(t)
  }

  const TIRE_SPACING = 1.6 // meters along the edge
  let distSinceTire = TIRE_SPACING
  for (let i = 0; i < n; i++) {
    if (!isCorner[i]) {
      distSinceTire = TIRE_SPACING
      continue
    }
    const a = track.centerline[i]
    const b = track.centerline[(i + 1) % n]
    distSinceTire += Math.hypot(b.x - a.x, b.z - a.z)
    if (distSinceTire < TIRE_SPACING) continue
    distSinceTire = 0

    const t = track.tangents[i]
    // outside of the turn: right of travel when turning left, and vice versa
    const side = -turnSign[i]
    const nx = t.z * side
    const nz = -t.x * side
    const off = roadEdge + 1.2
    out.push({
      model: 'tire',
      x: a.x + nx * off,
      y: a.y,
      z: a.z + nz * off,
      rotationY: rand() * Math.PI,
      scale: 2.2,
      layFlat: true,
    })
  }

  // pylons flanking each corner-zone entry
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n
    if (!isCorner[i] || isCorner[prev]) continue
    const a = track.centerline[i]
    const t = track.tangents[i]
    for (const side of [1, -1]) {
      out.push({
        model: 'pylon',
        x: a.x + t.z * side * (roadEdge + 0.6),
        y: a.y,
        z: a.z - t.x * side * (roadEdge + 0.6),
        rotationY: 0,
        scale: 6,
      })
    }
  }

  // --- straights → grandstands / tents on the outside of the loop ---------
  const outward = -loopOrientation(track) // side away from the loop interior
  const stands: DecorationModel[] = ['grandStand', 'grandStandRound', 'grandStandCovered', 'tentLong']
  let standIdx = 0
  let distSinceStand = 0
  for (let i = 0; i < n; i++) {
    const a = track.centerline[i]
    const b = track.centerline[(i + 1) % n]
    distSinceStand += Math.hypot(b.x - a.x, b.z - a.z)
    if (isCorner[i] || distSinceStand < 55) continue
    // require a stretch of straight around the spot
    const ahead = Math.round((n / 100) * 3)
    if (isCorner[(i + ahead) % n] || isCorner[(i - ahead + n) % n]) continue
    distSinceStand = 0

    const t = track.tangents[i]
    const nx = t.z * outward
    const nz = -t.x * outward
    const off = roadEdge + 9
    const model = stands[standIdx++ % stands.length]
    out.push({
      model,
      x: a.x + nx * off,
      y: a.y,
      // stands face the track: rotate their front toward the road
      z: a.z + nz * off,
      rotationY: Math.atan2(-nx, -nz) + Math.PI,
      scale: 8,
    })
  }

  // --- start area → banner towers both sides ------------------------------
  const t0 = track.tangents[0]
  const s = track.start
  for (const [side, model] of [
    [1, 'bannerTowerGreen'],
    [-1, 'bannerTowerRed'],
  ] as const) {
    out.push({
      model,
      x: s.x + t0.z * side * (roadEdge + 2.5) + t0.x * 12,
      y: s.y,
      z: s.z - t0.x * side * (roadEdge + 2.5) + t0.z * 12,
      rotationY: s.yaw,
      scale: 7,
    })
  }

  return out
}

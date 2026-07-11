import { mulberry32 } from './scenery'
import { nearestCenterlineIndex, type TrackData } from './trackGeometry'

/**
 * Automatic track dressing derived from the centerline:
 * - corners get tire walls on the OUTSIDE (with physics barrier segments so
 *   hitting them bounces the car back onto the road)
 * - long straights get grandstands/tents on the outside of the loop
 * - the start gets banner towers
 *
 * Every placement is validated against the WHOLE centerline with a per-model
 * clearance radius — a prop proposed next to one straight can never end up
 * on a different piece of road (chicanes, parallel hairpins, ...).
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

/** invisible physics wall behind a run of tires */
export interface BarrierSegment {
  /** segment midpoint */
  x: number
  z: number
  /** yaw of the segment direction */
  rotationY: number
  length: number
}

export interface TrackDressing {
  decorations: Decoration[]
  barriers: BarrierSegment[]
}

/** how much room (m) each model needs beyond the road edge to be allowed */
const CLEARANCE: Record<DecorationModel, number> = {
  tire: 0.5,
  pylon: 0.2,
  grandStand: 6.5,
  grandStandRound: 7.5,
  grandStandCovered: 6.5,
  tentLong: 8.5,
  bannerTowerGreen: 1.2,
  bannerTowerRed: 1.2,
}

const CORNER_THRESHOLD = 0.18
const TIRE_SPACING = 1.6

/** signed turn rate at sample i over a window (positive = turning left) */
function turnRate(track: TrackData, i: number, window: number): number {
  const n = track.tangents.length
  const a = track.tangents[i]
  const b = track.tangents[(i + window) % n]
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

/** distance from (x,z) to the nearest centerline sample */
function roadDistance(track: TrackData, x: number, z: number): number {
  const i = nearestCenterlineIndex(track, x, z)
  const c = track.centerline[i]
  return Math.hypot(c.x - x, c.z - z)
}

export function generateDressing(track: TrackData): TrackDressing {
  const rand = mulberry32(20260710)
  const decorations: Decoration[] = []
  const barriers: BarrierSegment[] = []
  const n = track.centerline.length
  const roadEdge = track.halfWidth + track.curbWidth

  const allowed = (model: DecorationModel, x: number, z: number) =>
    roadDistance(track, x, z) >= roadEdge + CLEARANCE[model]

  // window sized to ~4m of arc so corner detection is sample-density independent
  let length = 0
  for (let i = 0; i < n; i++) {
    const a = track.centerline[i]
    const b = track.centerline[(i + 1) % n]
    length += Math.hypot(b.x - a.x, b.z - a.z)
  }
  const window = Math.max(2, Math.round(4 / (length / n)))

  const isCorner: boolean[] = new Array(n)
  const turnSign: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const t = turnRate(track, i, window)
    isCorner[i] = Math.abs(t) > CORNER_THRESHOLD
    turnSign[i] = Math.sign(t)
  }

  // --- corner zones → tire walls + physics barriers on the outside ---------
  const tireOffset = roadEdge + 1.2
  let distSinceTire = TIRE_SPACING
  let prevTire: { x: number; z: number } | null = null
  for (let i = 0; i < n; i++) {
    if (!isCorner[i]) {
      distSinceTire = TIRE_SPACING
      prevTire = null
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
    const x = a.x + t.z * side * tireOffset
    const z = a.z - t.x * side * tireOffset
    if (!allowed('tire', x, z)) {
      prevTire = null // break the barrier chain across disallowed spots
      continue
    }
    decorations.push({
      model: 'tire',
      x,
      y: a.y,
      z,
      rotationY: rand() * Math.PI,
      scale: 2.2,
      layFlat: true,
    })
    if (prevTire) {
      const dx = x - prevTire.x
      const dz = z - prevTire.z
      const segLen = Math.hypot(dx, dz)
      // note: on the outside of an arc, tire spacing expands by (r+offset)/r —
      // the threshold must absorb that or barrier chains fall apart
      if (segLen < TIRE_SPACING * 4) {
        barriers.push({
          x: (x + prevTire.x) / 2,
          z: (z + prevTire.z) / 2,
          rotationY: Math.atan2(-dz, dx),
          length: segLen + 0.6, // slight overlap, no gaps between segments
        })
      }
    }
    prevTire = { x, z }
  }

  // pylons flanking each corner-zone entry
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n
    if (!isCorner[i] || isCorner[prev]) continue
    const a = track.centerline[i]
    const t = track.tangents[i]
    for (const side of [1, -1]) {
      const x = a.x + t.z * side * (roadEdge + 0.6)
      const z = a.z - t.x * side * (roadEdge + 0.6)
      if (allowed('pylon', x, z)) {
        decorations.push({ model: 'pylon', x, y: a.y, z, rotationY: 0, scale: 6 })
      }
    }
  }

  // --- straights → grandstands / tents on the outside of the loop ----------
  const outward = -loopOrientation(track)
  const stands: DecorationModel[] = ['grandStand', 'grandStandRound', 'grandStandCovered', 'tentLong']
  let standIdx = 0
  let distSinceStand = 0
  for (let i = 0; i < n; i++) {
    const a = track.centerline[i]
    const b = track.centerline[(i + 1) % n]
    distSinceStand += Math.hypot(b.x - a.x, b.z - a.z)
    if (isCorner[i] || distSinceStand < 55) continue
    const ahead = Math.round((n / 100) * 3)
    if (isCorner[(i + ahead) % n] || isCorner[(i - ahead + n) % n]) continue

    const t = track.tangents[i]
    const nx = t.z * outward
    const nz = -t.x * outward
    const off = roadEdge + 9
    const model = stands[standIdx % stands.length]
    const x = a.x + nx * off
    const z = a.z + nz * off
    if (!allowed(model, x, z)) continue
    distSinceStand = 0
    standIdx++
    decorations.push({
      model,
      x,
      y: a.y,
      z,
      // stands face the track
      rotationY: Math.atan2(-nx, -nz) + Math.PI,
      scale: 8,
    })
  }

  // --- start area → banner towers both sides -------------------------------
  const t0 = track.tangents[0]
  const s = track.start
  for (const [side, model] of [
    [1, 'bannerTowerGreen'],
    [-1, 'bannerTowerRed'],
  ] as const) {
    const x = s.x + t0.z * side * (roadEdge + 2.5) + t0.x * 12
    const z = s.z - t0.x * side * (roadEdge + 2.5) + t0.z * 12
    if (allowed(model, x, z)) {
      decorations.push({ model, x, y: s.y, z, rotationY: s.yaw, scale: 7 })
    }
  }

  return { decorations, barriers }
}

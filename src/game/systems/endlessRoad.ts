import type { TrackDefinition } from '../config'
import { mulberry32 } from './scenery'
import type { CenterPoint, RibbonGeometry, TrackData, Vec2 } from './trackGeometry'

/**
 * Endless procedural road, slowroads-style: everything derives from a seed.
 *
 * The centerline is grown by integrating a heading whose curvature comes from
 * smooth 1D value noise — gentle wandering sweepers, never tighter than
 * MIN_TURN_RADIUS. Points are append-only (deterministic replay from the
 * seed), and the world materializes in fixed-size CHUNKS: each chunk knows
 * how to produce its road ribbon geometry, tree placements and coin spots.
 * Nothing is stored beyond the points themselves — chunks are recomputed
 * from (seed, chunkIndex) whenever they stream in.
 */

export const SAMPLE_SPACING = 3 // m between centerline samples
export const CHUNK_SAMPLES = 40 // 120m of road per chunk
/** curvature cap → minimum turn radius ≈ 1/MAX_CURVATURE = 55m */
const MAX_CURVATURE = 1 / 55
/** control point every N samples for the curvature noise */
const NOISE_STEP = 30

export interface TreeSpot {
  x: number
  z: number
  rotationY: number
  scale: number
  large: boolean
}

const smooth = (t: number) => t * t * (3 - 2 * t)

export class EndlessRoad {
  readonly seed: number
  readonly halfWidth: number
  /** growing, append-only — safe to hand to consumers as a live reference */
  readonly points: CenterPoint[] = []
  readonly tangents: Vec2[] = []
  private heading = 0 // radians; 0 = -z (game-forward)

  constructor(seed: number, width = 12) {
    this.seed = seed
    this.halfWidth = width / 2
    this.points.push({ x: 0, y: 0, z: 0 })
    this.tangents.push({ x: 0, z: -1 })
  }

  /** curvature noise: smooth interpolation between seeded control values */
  private curvatureAt(sampleIndex: number): number {
    const cell = Math.floor(sampleIndex / NOISE_STEP)
    const t = smooth((sampleIndex % NOISE_STEP) / NOISE_STEP)
    const ctrl = (c: number) => (mulberry32(this.seed ^ (c * 0x9e3779b9))() * 2 - 1) * MAX_CURVATURE
    return ctrl(cell) * (1 - t) + ctrl(cell + 1) * t
  }

  /** grow the centerline so at least `count` samples exist */
  ensureSamples(count: number) {
    while (this.points.length < count) {
      const i = this.points.length
      this.heading += this.curvatureAt(i) * SAMPLE_SPACING
      const prev = this.points[i - 1]
      const tx = -Math.sin(this.heading)
      const tz = -Math.cos(this.heading)
      this.points.push({
        x: prev.x + tx * SAMPLE_SPACING,
        y: 0,
        z: prev.z + tz * SAMPLE_SPACING,
      })
      this.tangents.push({ x: tx, z: tz })
    }
  }

  /** open (non-wrapping) road ribbon for one chunk, with +1 sample overlap so
   * consecutive chunks share their seam edge */
  chunkGeometry(chunk: number): RibbonGeometry {
    const start = chunk * CHUNK_SAMPLES
    const end = start + CHUNK_SAMPLES + 1
    this.ensureSamples(end + 1)

    const n = end - start
    const positions = new Float32Array(n * 2 * 3)
    const normals = new Float32Array(n * 2 * 3)
    const uvs = new Float32Array(n * 2 * 2)
    const indices = new Uint32Array((n - 1) * 6)

    for (let i = 0; i < n; i++) {
      const c = this.points[start + i]
      const t = this.tangents[start + i]
      const nx = -t.z
      const nz = t.x
      const j = i * 6
      positions[j] = c.x + nx * -this.halfWidth
      positions[j + 1] = 0.02
      positions[j + 2] = c.z + nz * -this.halfWidth
      positions[j + 3] = c.x + nx * this.halfWidth
      positions[j + 4] = 0.02
      positions[j + 5] = c.z + nz * this.halfWidth
      normals[j + 1] = 1
      normals[j + 4] = 1
      const k = i * 4
      uvs[k] = i / n
      uvs[k + 1] = 0
      uvs[k + 2] = i / n
      uvs[k + 3] = 1
    }
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2
      const b = (i + 1) * 2
      const j = i * 6
      // CCW from above (matches trackGeometry's winding)
      indices[j] = a
      indices[j + 1] = a + 1
      indices[j + 2] = b
      indices[j + 3] = b
      indices[j + 4] = a + 1
      indices[j + 5] = b + 1
    }
    return { positions, normals, uvs, indices }
  }

  /** seeded trees for one chunk, kept clear of the road */
  chunkTrees(chunk: number, perChunk = 10): TreeSpot[] {
    const start = chunk * CHUNK_SAMPLES
    this.ensureSamples(start + CHUNK_SAMPLES + 1)
    const rand = mulberry32((this.seed ^ 0x51ed270b) + chunk * 7919)
    const trees: TreeSpot[] = []
    for (let i = 0; i < perChunk; i++) {
      const s = start + Math.floor(rand() * CHUNK_SAMPLES)
      const c = this.points[s]
      const t = this.tangents[s]
      const side = rand() < 0.5 ? -1 : 1
      const off = this.halfWidth + 6 + rand() * 30
      trees.push({
        x: c.x + t.z * side * off,
        z: c.z - t.x * side * off,
        rotationY: rand() * Math.PI * 2,
        scale: (0.7 + rand() * 0.7) * 5,
        large: rand() < 0.5,
      })
    }
    return trees
  }

  /** coin spots for one chunk: a row of three every ~150m on the centerline */
  chunkCoins(chunk: number): { x: number; z: number; index: number }[] {
    const start = chunk * CHUNK_SAMPLES
    this.ensureSamples(start + CHUNK_SAMPLES + 1)
    const coins: { x: number; z: number; index: number }[] = []
    const every = 50 // samples ≈ 150m
    for (let s = start; s < start + CHUNK_SAMPLES; s++) {
      if (s === 0 || s % every !== 0) continue
      for (let k = -1; k <= 1; k++) {
        const c = this.points[s + k * 2]
        coins.push({ x: c.x, z: c.z, index: s + k * 2 })
      }
    }
    return coins
  }

  /**
   * TrackData-compatible view for the vehicle controller: the centerline and
   * tangents are LIVE references to the growing arrays, so off-track drag and
   * kill-plane respawn keep working arbitrarily far from the origin. Gates
   * are empty — endless mode has no laps (RaceTracker is not mounted).
   */
  trackFacade(def: TrackDefinition): TrackData {
    this.ensureSamples(CHUNK_SAMPLES * 6)
    return {
      def,
      centerline: this.points,
      tangents: this.tangents,
      halfWidth: this.halfWidth,
      curbWidth: def.curbWidth,
      gates: [],
      start: { x: 0, y: 0, z: 0, yaw: 0 },
    }
  }

  /** windowed nearest-sample search around a known previous index —
   * O(window), not O(total road length) */
  nearestIndex(x: number, z: number, aroundIndex: number, window = 120): number {
    const lo = Math.max(0, aroundIndex - window)
    const hi = Math.min(this.points.length - 1, aroundIndex + window)
    let best = lo
    let bestD = Infinity
    for (let i = lo; i <= hi; i++) {
      const dx = this.points[i].x - x
      const dz = this.points[i].z - z
      const d = dx * dx + dz * dz
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }
}

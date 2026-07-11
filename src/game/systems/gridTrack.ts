import type { CenterPoint } from './trackGeometry'

/**
 * Grid tracks imported from Godot GridMap scenes (Kenney Starter Kit Racing).
 *
 * Cells arrive as (x, z, model, godotOrientationIndex). Godot encodes tile
 * rotation as an orthogonal-basis index; rather than trusting a lookup table,
 * the builder SOLVES the index→yaw mapping: it tries the candidate mappings
 * and accepts the one under which all road tiles form one closed loop with
 * matching edge connectors. Wrong mappings simply don't produce a loop.
 *
 * Model-space road conventions (probed from the kit's glbs):
 * - straight: road along z (connects N and S edges)
 * - finish:   road along x (connects E and W edges)
 * - corner:   connects W and S edges
 */
export type GridModel = 'straight' | 'corner' | 'finish' | 'ramp' | 'empty' | 'forest' | 'tents'
export type GridCellData = [number, number, GridModel, number]

export interface GridPlacement {
  model: GridModel
  /** world position of the tile center (track re-centered on origin) */
  x: number
  z: number
  rotationY: number
}

export interface GridTrackResult {
  placements: GridPlacement[]
  centerline: CenterPoint[]
}

const ROAD_MODELS: GridModel[] = ['straight', 'corner', 'finish', 'ramp']

// compass: 0=E(+x) 1=N(-z) 2=W(-x) 3=S(+z); yaw of k quarter-turns maps dir d → (d+k)%4
const DIR = [
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
]

/** connected edges (compass indices) of each road model at yaw 0.
 * These are LIBRARY-space conventions (Godot's mesh-library bakes the finish
 * tile rotated 90° from its glb — the renderer compensates, see Track.tsx). */
const BASE_CONNECTORS: Record<string, [number, number]> = {
  straight: [1, 3], // N, S
  ramp: [1, 3],
  finish: [1, 3], // N, S in the library (the glb itself runs E/W)
  corner: [2, 3], // W, S
}

/** Godot orientation index 0 is always identity; candidate quarter-turn
 * assignments for the other indices seen in Y-rotated GridMaps. */
const CANDIDATE_MAPPINGS: Record<number, number>[] = permutations([1, 2, 3]).map((p) => ({
  0: 0,
  10: p[0],
  16: p[1],
  22: p[2],
}))

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  return arr.flatMap((v, i) =>
    permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((rest) => [v, ...rest]),
  )
}

interface RoadTile {
  x: number
  z: number
  model: GridModel
  orient: number
  /** compass edge indices this tile's road connects, under the resolved mapping */
  connectors: [number, number]
}

export function buildGridTrack(cells: GridCellData[], cellSize: number): GridTrackResult {
  const C = cellSize
  const roadCells = cells.filter(([, , model]) => ROAD_MODELS.includes(model))
  if (roadCells.length < 4) throw new Error('grid track: not enough road tiles')

  const { mapping, tiles } = solveOrientations(roadCells)
  const loop = walkLoop(tiles)
  const centerline = buildCenterline(loop, C)

  const placements: GridPlacement[] = cells.map(([x, z, model, orient]) => ({
    model,
    x: (x + 0.5) * C,
    z: (z + 0.5) * C,
    rotationY: (mapping[orient] ?? 0) * (Math.PI / 2),
  }))

  // re-center everything on the origin
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of centerline) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minZ = Math.min(minZ, p.z)
    maxZ = Math.max(maxZ, p.z)
  }
  const ox = (minX + maxX) / 2
  const oz = (minZ + maxZ) / 2
  for (const p of centerline) {
    p.x -= ox
    p.z -= oz
  }
  for (const p of placements) {
    p.x -= ox
    p.z -= oz
  }

  return { placements, centerline }
}

/** try candidate orientation mappings until the road tiles form a valid loop */
function solveOrientations(roadCells: GridCellData[]): {
  mapping: Record<number, number>
  tiles: Map<string, RoadTile>
} {
  const errors: string[] = []
  for (const mapping of CANDIDATE_MAPPINGS) {
    const tiles = new Map<string, RoadTile>()
    for (const [x, z, model, orient] of roadCells) {
      const k = mapping[orient]
      if (k === undefined) {
        errors.push(`unknown orientation index ${orient}`)
        continue
      }
      const base = BASE_CONNECTORS[model]
      tiles.set(`${x},${z}`, {
        x,
        z,
        model,
        orient,
        connectors: [(base[0] + k) % 4, (base[1] + k) % 4],
      })
    }
    const problem = validateConnectivity(tiles)
    if (!problem) return { mapping, tiles }
    errors.push(problem)
  }
  throw new Error(`grid track: no orientation mapping yields a closed loop (${errors[0]})`)
}

/** every road tile's connectors must point at road tiles that connect back */
function validateConnectivity(tiles: Map<string, RoadTile>): string | null {
  for (const t of tiles.values()) {
    for (const edge of t.connectors) {
      const n = tiles.get(`${t.x + DIR[edge].x},${t.z + DIR[edge].z}`)
      if (!n) return `tile (${t.x},${t.z}) ${t.model} has no neighbor through edge ${edge}`
      if (!n.connectors.includes((edge + 2) % 4)) {
        return `tile (${t.x},${t.z}) neighbor through edge ${edge} does not connect back`
      }
    }
  }
  return null
}

/** ordered traversal starting at the finish tile; throws if tiles are not one loop */
function walkLoop(tiles: Map<string, RoadTile>): { tile: RoadTile; entryEdge: number }[] {
  const start = [...tiles.values()].find((t) => t.model === 'finish') ?? [...tiles.values()][0]
  const loop: { tile: RoadTile; entryEdge: number }[] = []
  let current = start
  let entryEdge = (start.connectors[0] + 2) % 4 // pretend we came in through connector[0]

  do {
    loop.push({ tile: current, entryEdge })
    const exitEdge = current.connectors.find((e) => e !== entryEdge)!
    const next = tiles.get(`${current.x + DIR[exitEdge].x},${current.z + DIR[exitEdge].z}`)!
    entryEdge = (exitEdge + 2) % 4
    current = next
  } while (current !== start && loop.length <= tiles.size)

  if (loop.length !== tiles.size) {
    throw new Error(`grid track: road tiles form ${loop.length}-tile loop but there are ${tiles.size}`)
  }
  return loop
}

function buildCenterline(loop: { tile: RoadTile; entryEdge: number }[], C: number): CenterPoint[] {
  const centerline: CenterPoint[] = []
  const edgeMid = (t: RoadTile, e: number) => ({
    x: (t.x + 0.5) * C + DIR[e].x * (C / 2),
    z: (t.z + 0.5) * C + DIR[e].z * (C / 2),
  })

  for (const { tile, entryEdge } of loop) {
    const exitEdge = tile.connectors.find((e) => e !== entryEdge)!
    const from = edgeMid(tile, entryEdge)
    const to = edgeMid(tile, exitEdge)

    if (tile.model === 'corner') {
      // quarter arc around the cell corner shared by the two edges
      const center = {
        x: (tile.x + 0.5) * C + (DIR[entryEdge].x + DIR[exitEdge].x) * (C / 2),
        z: (tile.z + 0.5) * C + (DIR[entryEdge].z + DIR[exitEdge].z) * (C / 2),
      }
      const a0 = Math.atan2(from.z - center.z, from.x - center.x)
      let d = Math.atan2(to.z - center.z, to.x - center.x) - a0
      while (d > Math.PI) d -= 2 * Math.PI
      while (d < -Math.PI) d += 2 * Math.PI
      const steps = Math.max(4, Math.ceil((C / 2) * (Math.PI / 2) / 3))
      for (let s = 0; s < steps; s++) {
        const a = a0 + (d * s) / steps
        centerline.push({ x: center.x + (C / 2) * Math.cos(a), y: 0, z: center.z + (C / 2) * Math.sin(a) })
      }
    } else {
      const steps = Math.max(2, Math.ceil(C / 3))
      for (let s = 0; s < steps; s++) {
        const t = s / steps
        centerline.push({ x: from.x + (to.x - from.x) * t, y: 0, z: from.z + (to.z - from.z) * t })
      }
    }
  }
  return centerline
}

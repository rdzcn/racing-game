import type { CenterPoint } from './trackGeometry'

/**
 * Tile-based tracks from Kenney racing-kit road pieces.
 *
 * A layout is a turtle program on a grid: numbers = that many straight tiles,
 * `l`/`r` = small 90° corner (1×1 cell), `L`/`R` = large 90° corner (2×2).
 * The walk yields both the tile placements (for rendering) and the driving
 * centerline (for gates/coins/off-track detection) — one source of truth.
 *
 * Model-space conventions (probed from the glbs, see CP10 notes):
 * - straight road runs along z
 * - corners connect the S and E cell edges at rotation 0
 * - roadStart is 1×2 with the arch at its north end
 */
export type TileModel = 'straight' | 'cornerSmall' | 'cornerLarge' | 'start'

export interface TilePlacement {
  model: TileModel
  /** world position of the tile footprint center (track re-centered on origin) */
  x: number
  z: number
  rotationY: number
}

export interface TileTrackResult {
  placements: TilePlacement[]
  centerline: CenterPoint[]
}

type Command = number | 'l' | 'r' | 'L' | 'R'

export function parseLayout(layout: string): Command[] {
  const out: Command[] = []
  for (const m of layout.matchAll(/(\d+)|([lrLR])|(\S)/g)) {
    if (m[3]) throw new Error(`layout: unexpected token '${m[3]}'`)
    out.push(m[1] ? Number(m[1]) : (m[2] as Command))
  }
  return out
}

// headings: 0=E(+x) 1=N(-z) 2=W(-x) 3=S(+z)
const DIR = [
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
]
const EDGE_NAMES = ['E', 'N', 'W', 'S'] as const
type Edge = (typeof EDGE_NAMES)[number]

/** rotation that maps the corner model's {S,E} connection onto the given edge pair */
function cornerRotation(a: Edge, b: Edge): number {
  const key = [a, b].sort().join('')
  const table: Record<string, number> = { ES: 0, EN: Math.PI / 2, NW: Math.PI, SW: (3 * Math.PI) / 2 }
  const rot = table[key]
  if (rot === undefined) throw new Error(`layout: corner cannot connect edges ${a}/${b}`)
  return rot
}

/** samples spaced ~3m along a quarter arc */
const arcSamples = (radius: number) => Math.max(4, Math.ceil((radius * Math.PI) / 2 / 3))

export function buildTileTrack(layout: string, cellSize: number): TileTrackResult {
  const C = cellSize
  const commands = parseLayout(layout)
  if (typeof commands[0] !== 'number' || commands[0] < 2) {
    throw new Error('layout: must begin with a straight run of at least 2 (start gate needs 2 cells)')
  }

  const placements: TilePlacement[] = []
  const centerline: CenterPoint[] = []
  const occupied = new Map<string, number>() // cell -> placement index

  let cx = 0
  let cz = 0
  let h = 0 // heading, start East
  let tileIndex = 0

  const cellCenter = (icx: number, icz: number) => ({ x: (icx + 0.5) * C, z: (icz + 0.5) * C })
  const edgeMid = (icx: number, icz: number, e: Edge) => {
    const c = cellCenter(icx, icz)
    if (e === 'E') return { x: (icx + 1) * C, z: c.z }
    if (e === 'W') return { x: icx * C, z: c.z }
    if (e === 'N') return { x: c.x, z: icz * C }
    return { x: c.x, z: (icz + 1) * C }
  }
  const occupy = (icx: number, icz: number) => {
    const key = `${icx},${icz}`
    if (occupied.has(key)) {
      throw new Error(`layout: tile ${tileIndex} overlaps cell (${icx},${icz})`)
    }
    occupied.set(key, tileIndex)
  }
  const pushLine = (from: { x: number; z: number }, to: { x: number; z: number }) => {
    const steps = Math.max(2, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 3))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      centerline.push({ x: from.x + (to.x - from.x) * t, y: 0, z: from.z + (to.z - from.z) * t })
    }
  }
  const pushArc = (
    center: { x: number; z: number },
    radius: number,
    from: { x: number; z: number },
    to: { x: number; z: number },
  ) => {
    const a0 = Math.atan2(from.z - center.z, from.x - center.x)
    const a1 = Math.atan2(to.z - center.z, to.x - center.x)
    let d = a1 - a0
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    const steps = arcSamples(radius)
    for (let s = 0; s < steps; s++) {
      const a = a0 + (d * s) / steps
      centerline.push({ x: center.x + radius * Math.cos(a), y: 0, z: center.z + radius * Math.sin(a) })
    }
  }
  /** cell corner shared by two edges, for cell-range [minX..maxX]×[minZ..maxZ] */
  const sharedCorner = (edges: string, minX: number, minZ: number, maxX: number, maxZ: number) => ({
    x: (edges.includes('E') ? maxX + 1 : minX) * C,
    z: (edges.includes('S') ? maxZ + 1 : minZ) * C,
  })

  let startPlaced = false
  for (const cmd of commands) {
    if (typeof cmd === 'number') {
      for (let i = 0; i < cmd; i++) {
        const entry = edgeMid(cx, cz, EDGE_NAMES[(h + 2) % 4])
        const exit = edgeMid(cx, cz, EDGE_NAMES[h])
        occupy(cx, cz)
        if (!startPlaced) {
          // start gate covers this cell and the next; skip the next straight
          const next = cellCenter(cx + DIR[h].x, cz + DIR[h].z)
          const here = cellCenter(cx, cz)
          // arch (model north end) faces the entry side
          const archDir = (h + 2) % 4
          placements.push({
            model: 'start',
            x: (here.x + next.x) / 2,
            z: (here.z + next.z) / 2,
            rotationY: ((archDir - 1 + 4) % 4) * (Math.PI / 2),
          })
          startPlaced = true
        } else if (!(tileIndex === 1 && placements[0].model === 'start')) {
          const c = cellCenter(cx, cz)
          placements.push({
            model: 'straight',
            x: c.x,
            z: c.z,
            rotationY: h % 2 === 0 ? Math.PI / 2 : 0,
          })
        }
        pushLine(entry, exit)
        cx += DIR[h].x
        cz += DIR[h].z
        tileIndex++
      }
      continue
    }

    const small = cmd === 'l' || cmd === 'r'
    const hOut = cmd === 'l' || cmd === 'L' ? (h + 1) % 4 : (h + 3) % 4
    const entryEdge = EDGE_NAMES[(h + 2) % 4]
    const exitEdge = EDGE_NAMES[hOut]
    const rotationY = cornerRotation(entryEdge, exitEdge)

    if (small) {
      occupy(cx, cz)
      const c = cellCenter(cx, cz)
      placements.push({ model: 'cornerSmall', x: c.x, z: c.z, rotationY })
      const center = sharedCorner(entryEdge + exitEdge, cx, cz, cx, cz)
      pushArc(center, C / 2, edgeMid(cx, cz, entryEdge), edgeMid(cx, cz, exitEdge))
      cx += DIR[hOut].x
      cz += DIR[hOut].z
    } else {
      const f = DIR[h]
      const l = DIR[hOut]
      const cells = [
        [cx, cz],
        [cx + f.x, cz + f.z],
        [cx + l.x, cz + l.z],
        [cx + f.x + l.x, cz + f.z + l.z],
      ]
      for (const [icx, icz] of cells) occupy(icx, icz)
      const minX = Math.min(...cells.map((c) => c[0]))
      const maxX = Math.max(...cells.map((c) => c[0]))
      const minZ = Math.min(...cells.map((c) => c[1]))
      const maxZ = Math.max(...cells.map((c) => c[1]))
      placements.push({
        model: 'cornerLarge',
        x: ((minX + maxX + 1) / 2) * C,
        z: ((minZ + maxZ + 1) / 2) * C,
        rotationY,
      })
      const center = sharedCorner(entryEdge + exitEdge, minX, minZ, maxX, maxZ)
      // entry: edge midpoint of the entry cell; exit: block-edge point 1.5C from center
      const entry = edgeMid(cx, cz, entryEdge)
      const exitCell = cells.find(
        ([icx, icz]) => icx === cx + f.x + l.x && icz === cz + f.z + l.z,
      )!
      const exit = edgeMid(exitCell[0], exitCell[1], exitEdge)
      pushArc(center, 1.5 * C, entry, exit)
      cx += f.x + 2 * l.x
      cz += f.z + 2 * l.z
    }
    h = hOut
    tileIndex++
  }

  if (cx !== 0 || cz !== 0 || h !== 0) {
    throw new Error(`layout: does not close — ends at cell (${cx},${cz}) heading ${EDGE_NAMES[h]}`)
  }

  // re-center the whole track on the origin
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

/** approximate lap length in meters */
export function trackLength(centerline: CenterPoint[]): number {
  let len = 0
  for (let i = 0; i < centerline.length; i++) {
    const a = centerline[i]
    const b = centerline[(i + 1) % centerline.length]
    len += Math.hypot(b.x - a.x, b.z - a.z)
  }
  return len
}

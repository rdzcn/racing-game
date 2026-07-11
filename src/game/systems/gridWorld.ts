import { mulberry32 } from './scenery'
import type { GridCellData, GridModel } from './gridTrack'

/**
 * Generates Starter-Kit-style worlds from a turtle program: the road loop
 * (straights + small corners, finish gate at the start) surrounded by a
 * seeded fill of forest/tent/grass decoration tiles — the same cozy look as
 * Kenney's imported layout, at any track length.
 *
 * Layout syntax matches tileTrack: digits = straights, l/r = 90° corners.
 * Output feeds buildGridTrack, which re-validates connectivity (a bad layout
 * here fails loudly there).
 */

// compass: 0=E(+x) 1=N(-z) 2=W(-x) 3=S(+z)
const DIR = [
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
]

/** quarter-turns → Godot orientation index (one of gridTrack's candidate mappings) */
const K_TO_GODOT: Record<number, number> = { 0: 0, 1: 22, 2: 10, 3: 16 }

/** library-space connectors at k=0 (see gridTrack BASE_CONNECTORS) */
const STRAIGHT_BASE: [number, number] = [1, 3] // N, S
const CORNER_BASE: [number, number] = [2, 3] // W, S

const sameSet = (a: [number, number], b: [number, number]) =>
  (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0])

function solveK(base: [number, number], want: [number, number]): number {
  for (let k = 0; k < 4; k++) {
    if (sameSet([(base[0] + k) % 4, (base[1] + k) % 4], want)) return k
  }
  throw new Error(`gridWorld: no rotation maps ${base} onto ${want}`)
}

export function buildGridWorld(layout: string, seed = 20260712): GridCellData[] {
  const commands: (number | 'l' | 'r')[] = []
  for (const m of layout.matchAll(/(\d+)|([lr])|(\S)/g)) {
    if (m[3]) throw new Error(`gridWorld: unexpected token '${m[3]}'`)
    commands.push(m[1] ? Number(m[1]) : (m[2] as 'l' | 'r'))
  }
  if (typeof commands[0] !== 'number') throw new Error('gridWorld: must start with a straight run')

  const road: GridCellData[] = []
  const occupied = new Set<string>()
  let cx = 0
  let cz = 0
  let h = 0 // heading East
  let finishPlaced = false

  const place = (model: GridModel, k: number) => {
    const key = `${cx},${cz}`
    if (occupied.has(key)) throw new Error(`gridWorld: overlap at (${cx},${cz})`)
    occupied.add(key)
    road.push([cx, cz, model, K_TO_GODOT[k]])
  }

  for (const cmd of commands) {
    if (typeof cmd === 'number') {
      for (let i = 0; i < cmd; i++) {
        // straight road must connect the edges the path passes through
        const k = solveK(STRAIGHT_BASE, [(h + 2) % 4, h])
        place(finishPlaced ? 'straight' : 'finish', k)
        finishPlaced = true
        cx += DIR[h].x
        cz += DIR[h].z
      }
      continue
    }
    const hOut = cmd === 'l' ? (h + 1) % 4 : (h + 3) % 4
    const k = solveK(CORNER_BASE, [(h + 2) % 4, hOut])
    place('corner', k)
    cx += DIR[hOut].x
    cz += DIR[hOut].z
    h = hOut
  }

  if (cx !== 0 || cz !== 0 || h !== 0) {
    throw new Error(`gridWorld: layout does not close (ends at ${cx},${cz} heading ${h})`)
  }

  // --- seeded decoration fill around the road -----------------------------
  const rand = mulberry32(seed)
  const xs = road.map((c) => c[0])
  const zs = road.map((c) => c[1])
  const pad = 2
  const cells: GridCellData[] = [...road]
  for (let z = Math.min(...zs) - pad; z <= Math.max(...zs) + pad; z++) {
    for (let x = Math.min(...xs) - pad; x <= Math.max(...xs) + pad; x++) {
      if (occupied.has(`${x},${z}`)) continue
      const roll = rand()
      const model: GridModel = roll < 0.5 ? 'forest' : roll < 0.92 ? 'empty' : 'tents'
      cells.push([x, z, model, K_TO_GODOT[Math.floor(rand() * 4)]])
    }
  }
  return cells
}

import { MODELS } from './assets/registry'
import { STARTER_GP_CELLS } from './assets/tracks/starterGP'
import type { GridCellData } from './systems/gridTrack'

export interface CarDefinition {
  id: string
  label: string
  /** shown on the car-select card */
  emoji: string
  /** Kenney car .glb — includes wheel-* nodes that Car.tsx animates */
  modelPath: string
  scale: number
  /** Kenney cars face +z; game-forward is -z */
  rotationY: number
  /** Collider half-extents (x, y, z) in world units, after scale */
  colliderHalfExtents: [number, number, number]
}

export const cars: CarDefinition[] = [
  {
    id: 'race',
    label: 'Race Car',
    emoji: '🏎️',
    modelPath: MODELS.carRace,
    scale: 1.6,
    rotationY: Math.PI,
    colliderHalfExtents: [0.95, 0.5, 2.05],
  },
  {
    id: 'kart',
    label: 'Go-Kart',
    emoji: '🛺',
    modelPath: MODELS.carKart,
    scale: 1.8,
    rotationY: Math.PI,
    colliderHalfExtents: [0.85, 0.5, 1.3],
  },
  {
    id: 'firetruck',
    label: 'Firetruck',
    emoji: '🚒',
    modelPath: MODELS.carFiretruck,
    scale: 1.4,
    rotationY: Math.PI,
    colliderHalfExtents: [1.05, 0.6, 2.3],
  },
  {
    id: 'tractor',
    label: 'Tractor',
    emoji: '🚜',
    modelPath: MODELS.carTractor,
    scale: 1.5,
    rotationY: Math.PI,
    colliderHalfExtents: [1.0, 0.6, 1.5],
  },
  {
    id: 'truck-red',
    label: 'Red Truck',
    emoji: '🛻',
    modelPath: MODELS.truckRed,
    scale: 1.5,
    rotationY: Math.PI,
    colliderHalfExtents: [1.1, 0.55, 2.1],
  },
  {
    id: 'truck-green',
    label: 'Green Truck',
    emoji: '🚙',
    modelPath: MODELS.truckGreen,
    scale: 1.5,
    rotationY: Math.PI,
    colliderHalfExtents: [1.1, 0.55, 2.1],
  },
  {
    id: 'truck-purple',
    label: 'Purple Truck',
    emoji: '🚐',
    modelPath: MODELS.truckPurple,
    scale: 1.5,
    rotationY: Math.PI,
    colliderHalfExtents: [1.1, 0.55, 2.1],
  },
  {
    id: 'motorcycle',
    label: 'Motorcycle',
    emoji: '🏍️',
    modelPath: MODELS.motorcycle,
    scale: 1.6,
    rotationY: Math.PI,
    colliderHalfExtents: [0.5, 0.5, 1.35],
  },
]

export const defaultCarId = 'race'

/** each race is this many laps, single-player or 2-player alike */
export const LAPS_PER_RACE = 3

/** points awarded per coin — shown as each player's race score */
export const POINTS_PER_COIN = 10

/** coins to place per track */
export const COINS_PER_TRACK = 10

/** Evenly distributes `count` coins across gates 1..gateCount-1 (gate 0 is
 * the start/finish line, so it's never a coin slot). */
function coinSlotsFor(gateCount: number, count: number = COINS_PER_TRACK): number[] {
  const available = gateCount - 1
  const n = Math.min(count, available)
  const slots: number[] = []
  for (let i = 0; i < n; i++) slots.push(1 + Math.floor((i * available) / n))
  return slots
}

export function getCar(id: string): CarDefinition {
  return cars.find((c) => c.id === id) ?? cars[0]
}

/** spawn drop height above the road surface */
export const SPAWN_HEIGHT = 2

export interface VehicleTuning {
  /** N — forward drive force at full throttle */
  engineForce: number
  /** N — decel force when coasting (throttle released) */
  coastDrag: number
  /** m/s */
  maxSpeed: number
  maxReverseSpeed: number
  /** rad/s yaw at full steer and full effectiveness */
  steerRate: number
  /** m/s of forward speed at which steering reaches full effectiveness */
  steerFullEffectSpeed: number
  /** 1/s — how fast lateral (sideways) velocity is cancelled. Higher = grippier */
  grip: number
  /** 1/s — velocity-proportional drag applied when off track (grass). Caps crawl speed at engineForce/(mass*offTrackDrag) */
  offTrackDrag: number
  /** rad/s per unit of tilt — self-righting so jumps/crests can't leave the car on its roof */
  uprightStrength: number
  /** 1/s — damping on pitch/roll angular velocity (kills tumble) */
  uprightDamping: number
}

/** Where the road comes from: authored waypoints (we generate the geometry)
 * or Kenney road tiles laid out on a grid. */
export type TrackSource =
  | { kind: 'waypoints'; waypoints: [number, number][]; samples: number }
  /** Kenney road tiles laid out by a turtle program — see systems/tileTrack.ts */
  | { kind: 'tiles'; layout: string; cellSize: number }
  /** Grid imported from a Godot GridMap scene — see systems/gridTrack.ts */
  | { kind: 'grid'; cells: GridCellData[]; cellSize: number }

export interface TrackDefinition {
  id: string
  label: string
  /** shown on the track-select card */
  description: string
  /** Full road width in world units */
  width: number
  curbWidth: number
  /** Checkpoint gates per lap (counted in order) */
  gateCount: number
  /** Gate indices where coins spawn */
  coinSlots: number[]
  /** Car falls below this y → respawn (kid-safety: no lost-forever states) */
  killPlaneY: number
  /** side length of the grass plane (default 200) */
  groundSize?: number
  /** false: skip auto-dressing (tires/stands/trees) — for worlds with baked scenery */
  dressing?: boolean
  source: TrackSource
}

const meadowWaypoints: [number, number][] = [
    [40, 56], // start/finish, on the straight heading -x
    [-10, 58],
    [-45, 54], // end of start straight
    [-68, 38], // turn 1: left sweeper
    [-75, 5],
    [-70, -20], // down the left side
    // turn 2: hairpin left — r=14 arc around (-54,-26), 45° steps.
    // Catmull-Rom needs this density to follow a circle without pinching.
    [-68, -26],
    [-63.9, -35.9],
    [-54, -40],
    [-44.1, -35.9],
    [-40, -26],
    // turn 3: right sweeper through the infield — r=16 arc around (-24,-26)
    [-35.3, -14.7],
    [-24, -10],
    [-12.7, -14.7],
    [-8, -26],
    [0, -44], // down to the bottom straight
    [20, -54],
    [40, -58], // bottom straight
    [62, -46], // turn 4: right sweeper
    [72, -10],
    [64, 25],
    [56, 45], // final corner onto the start straight
  ]

export const tracks: TrackDefinition[] = [
  {
    id: 'meadow',
    label: 'Meadow Circuit',
    description: '~0.5 km · flat & forgiving · grass slows you down',
    width: 12,
    curbWidth: 1.2,
    gateCount: 12,
    coinSlots: coinSlotsFor(12),
    killPlaneY: -10,
    source: { kind: 'waypoints', waypoints: meadowWaypoints, samples: 384 },
  },
  {
    id: 'speedway',
    label: 'Speedway',
    description: '~1.1 km · long straights, sweeping turns · full throttle!',
    width: 9.8, // 0.7 × cellSize, the tiles' asphalt width
    curbWidth: 1,
    gateCount: 16,
    coinSlots: coinSlotsFor(16),
    killPlaneY: -10,
    groundSize: 560,
    source: { kind: 'tiles', layout: '30 L 3 L 30 L 3 L', cellSize: 14 },
  },
  {
    id: 'snake',
    label: 'Snake Run',
    description: '~1.0 km · tight hairpins and a chicane · technical',
    width: 9.8,
    curbWidth: 1,
    gateCount: 16,
    coinSlots: coinSlotsFor(16),
    killPlaneY: -10,
    groundSize: 460,
    source: { kind: 'tiles', layout: '8 r 1 l 8 l 1 r 8 r 6 r 26 r 6 r', cellSize: 14 },
  },
  {
    id: 'chicane-gp',
    label: 'Chicane GP',
    description: '~1.2 km · fast sweepers with one nasty chicane',
    width: 9.8,
    curbWidth: 1,
    gateCount: 16,
    coinSlots: coinSlotsFor(16),
    killPlaneY: -10,
    groundSize: 760,
    source: { kind: 'tiles', layout: '6 r 1 l 5 l 1 r 5 L 18 L 18 L 18 L', cellSize: 14 },
  },
  {
    id: 'starter-gp',
    label: 'Forest Kart Loop',
    description: "~0.3 km · Kenney's starter-kit track · cozy forest world",
    width: 9.6, // 0.6 × cellSize, the starter tiles' asphalt width
    curbWidth: 0.8,
    gateCount: 8,
    coinSlots: [1, 3, 5, 7],
    killPlaneY: -10,
    groundSize: 320,
    dressing: false, // the world ships its own baked scenery tiles
    source: { kind: 'grid', cells: STARTER_GP_CELLS, cellSize: 16 },
  },
]

export const defaultTrackId = 'meadow'

export function getTrack(id: string): TrackDefinition {
  return tracks.find((t) => t.id === id) ?? tracks[0]
}

export interface CameraConfig {
  distance: number
  height: number
  lookAtHeight: number
  /** 1/s — exponential smoothing rate */
  damping: number
}

export const vehicleTuning: VehicleTuning = {
  engineForce: 170, // enough punch to actually reach top speed against damping
  coastDrag: 25,
  maxSpeed: 42, // ≈ 151 km/h
  maxReverseSpeed: 8,
  steerRate: 2.2,
  steerFullEffectSpeed: 4,
  grip: 6,
  offTrackDrag: 2,
  uprightStrength: 3,
  uprightDamping: 4,
}

export const cameraConfig: CameraConfig = {
  distance: 8,
  height: 3.5,
  lookAtHeight: 1,
  damping: 4,
}


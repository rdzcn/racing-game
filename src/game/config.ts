import { MODELS } from './assets/registry'
import { GRAND_CIRCUIT_CENTERLINE } from './assets/tracks/grandCircuitCenterline'

export interface CarConfig {
  /** Path under public/ to a .glb/.gltf model; null → procedural box-car fallback */
  modelPath: string | null
  scale: number
  /** Corrective offset/rotation for models with off-center origins */
  offset: [number, number, number]
  rotationY: number
  spawnPosition: [number, number, number]
  /** Collider half-extents (x, y, z) in world units */
  colliderHalfExtents: [number, number, number]
}

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
 * or a mesh model with a pre-extracted centerline (see scripts/). */
export type TrackSource =
  | { kind: 'waypoints'; waypoints: [number, number][]; samples: number }
  | { kind: 'centerline'; modelPath: string; points: [number, number, number][] }

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
  /** drag: grass slows you down. respawn: leaving the road puts you back on it. */
  offTrackMode: 'drag' | 'respawn'
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
    coinSlots: [1, 3, 5, 7, 9, 11],
    killPlaneY: -10,
    offTrackMode: 'drag',
    source: { kind: 'waypoints', waypoints: meadowWaypoints, samples: 384 },
  },
  {
    id: 'grand',
    label: 'Grand Circuit',
    description: '3.3 km · hills & long straights · stay on the road!',
    width: 9,
    curbWidth: 0.8,
    gateCount: 24,
    coinSlots: [2, 5, 8, 11, 14, 17, 20, 23],
    killPlaneY: -30,
    offTrackMode: 'respawn',
    source: {
      kind: 'centerline',
      modelPath: MODELS.grandTrack,
      points: GRAND_CIRCUIT_CENTERLINE,
    },
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

export const carConfig: CarConfig = {
  modelPath: MODELS.car,
  scale: 1, // model is authored at real-world scale (~4.6m long)
  // model's wheels sit at y=0; drop it to the collider floor
  offset: [0, -0.5, 0],
  // model is authored facing +x; game-forward is -z
  rotationY: Math.PI / 2,
  spawnPosition: [0, 2, 0],
  colliderHalfExtents: [0.95, 0.5, 2.25],
}

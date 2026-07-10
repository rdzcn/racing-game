import { MODELS } from './assets/registry'

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
}

export interface TrackConfig {
  /** Closed centerline loop, (x, z) — swap this array to swap layouts */
  waypoints: [number, number][]
  /** Full road width in world units */
  width: number
  curbWidth: number
  /** Checkpoint gates per lap (lap logic in CP4 counts these in order) */
  gateCount: number
  /** Gate indices where coins spawn (CP5) */
  coinSlots: number[]
  /** Samples along the spline — geometry + detection resolution */
  samples: number
}

export const trackConfig: TrackConfig = {
  // circuit ~150x120m: start straight → left sweeper → hairpin → esses →
  // bottom straight → right sweeper → chicane back onto the straight
  waypoints: [
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
  ],
  width: 12,
  curbWidth: 1.2,
  gateCount: 12,
  coinSlots: [1, 3, 5, 7, 9, 11],
  samples: 384,
}

export interface CameraConfig {
  distance: number
  height: number
  lookAtHeight: number
  /** 1/s — exponential smoothing rate */
  damping: number
}

export const vehicleTuning: VehicleTuning = {
  engineForce: 110,
  coastDrag: 25,
  maxSpeed: 28,
  maxReverseSpeed: 8,
  steerRate: 2.2,
  steerFullEffectSpeed: 4,
  grip: 6,
  offTrackDrag: 2,
}

export const cameraConfig: CameraConfig = {
  distance: 8,
  height: 3.5,
  lookAtHeight: 1,
  damping: 4,
}

/** Car falls below this y → respawn at spawnPosition (kid-safety: no lost-forever states) */
export const KILL_PLANE_Y = -10

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

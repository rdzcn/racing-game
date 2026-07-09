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
  modelPath: null,
  scale: 1,
  offset: [0, 0, 0],
  rotationY: 0,
  spawnPosition: [0, 2, 0],
  colliderHalfExtents: [0.9, 0.5, 1.9],
}

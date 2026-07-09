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

export const carConfig: CarConfig = {
  modelPath: null,
  scale: 1,
  offset: [0, 0, 0],
  rotationY: 0,
  spawnPosition: [0, 2, 0],
  colliderHalfExtents: [0.9, 0.5, 1.9],
}

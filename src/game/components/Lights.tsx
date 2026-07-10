// must cover the whole circuit (±75m) or the car's shadow vanishes mid-lap
const SHADOW_BOUNDS = 95

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        position={[20, 30, 10]}
        intensity={2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-SHADOW_BOUNDS}
        shadow-camera-right={SHADOW_BOUNDS}
        shadow-camera-top={SHADOW_BOUNDS}
        shadow-camera-bottom={-SHADOW_BOUNDS}
        shadow-camera-near={1}
        shadow-camera-far={100}
      />
    </>
  )
}

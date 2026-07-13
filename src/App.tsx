import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Perf } from 'r3f-perf'
import { GameScene } from './game/components/GameScene'
import { TwoPlayerScene } from './game/components/TwoPlayerScene'
import { useRaceStore } from './game/state/raceStore'
import { CarSelect } from './ui/CarSelect'
import { HUD } from './ui/HUD'
import { Menu } from './ui/Menu'
import { PauseOverlay } from './ui/PauseOverlay'
import { ResultsOverlay } from './ui/ResultsOverlay'
import { TrackSelect } from './ui/TrackSelect'

function usePauseKey() {
  const status = useRaceStore((s) => s.status)
  const pause = useRaceStore((s) => s.pause)
  const resume = useRaceStore((s) => s.resume)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      if (status === 'playing') pause(performance.now())
      else if (status === 'paused') resume(performance.now())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status, pause, resume])
}

function App() {
  const status = useRaceStore((s) => s.status)
  const mode = useRaceStore((s) => s.mode)
  usePauseKey()

  const showHud = status === 'playing' || status === 'paused'
  // the 3D scene only shows behind the HUD once a race is actually running
  // (or paused/finished mid-race) — the pre-race menus get a plain
  // backdrop instead of the track, so car/track models still preload in the
  // background (the canvas stays mounted, just visually covered) without
  // spoiling the "menu" feel with a moving racetrack behind it.
  const inRace = status === 'playing' || status === 'paused' || status === 'finished'

  return (
    <div className="relative h-screen w-screen bg-black">
      {mode === 'single' ? (
        <div className="relative h-full w-full">
          <Canvas key="single" shadows camera={{ position: [0, 5, 10], fov: 50 }}>
            {/* bottom-left is the one corner the HUD never uses (lap/coins
                top-left, timer top-right, speedo bottom-center) */}
            {import.meta.env.DEV && <Perf position="bottom-left" />}
            <GameScene playerIndex={0} scheme="both" />
          </Canvas>
          {showHud && <HUD playerIndex={0} />}
        </div>
      ) : (
        <div className="relative h-full w-full">
          {/* one shared world/canvas — both cars are in the same physics sim
              and scene, so each player can see the other's car. Split into
              top/bottom halves by <SplitScreenCameras> inside the scene.
              key="two" forces a full remount (fresh WebGL context) when
              switching modes — otherwise React reuses the single-player
              Canvas's renderer and SplitScreenCameras's manual viewport/
              scissor state (or vice versa) leaks into the other mode. */}
          <Canvas key="two" shadows>
            {import.meta.env.DEV && <Perf position="bottom-left" />}
            <TwoPlayerScene />
          </Canvas>
          {/* divider line drawn over the seam between the two viewports */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-black" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 overflow-hidden">
            {showHud && <HUD playerIndex={0} label="Player 1" />}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 overflow-hidden">
            {showHud && <HUD playerIndex={1} label="Player 2" />}
          </div>
        </div>
      )}
      {!inRace && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900 to-black" />
      )}
      {status === 'menu' && <Menu />}
      {status === 'trackSelect' && <TrackSelect />}
      {status === 'carSelect' && <CarSelect />}
      {status === 'paused' && <PauseOverlay />}
      {status === 'finished' && <ResultsOverlay />}
    </div>
  )
}

export default App

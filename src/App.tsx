import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Perf } from 'r3f-perf'
import { GameScene } from './game/components/GameScene'
import { useRaceStore } from './game/state/raceStore'
import { CarSelect } from './ui/CarSelect'
import { HUD } from './ui/HUD'
import { Menu } from './ui/Menu'
import { PauseOverlay } from './ui/PauseOverlay'
import { ResultsOverlay } from './ui/ResultsOverlay'

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

  return (
    <div className="relative h-screen w-screen bg-black">
      {mode === 'single' ? (
        <div className="relative h-full w-full">
          <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
            {import.meta.env.DEV && <Perf position="top-left" />}
            <GameScene playerIndex={0} scheme="both" />
          </Canvas>
          {showHud && <HUD playerIndex={0} />}
        </div>
      ) : (
        <div className="grid h-full w-full grid-rows-2 gap-[3px] bg-black">
          <div className="relative overflow-hidden">
            <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
              <GameScene playerIndex={0} scheme="wasd" />
            </Canvas>
            {showHud && <HUD playerIndex={0} label="Player 1" />}
          </div>
          <div className="relative overflow-hidden">
            <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
              <GameScene playerIndex={1} scheme="arrows" />
            </Canvas>
            {showHud && <HUD playerIndex={1} label="Player 2" />}
          </div>
        </div>
      )}
      {status === 'menu' && <Menu />}
      {status === 'carSelect' && <CarSelect />}
      {status === 'paused' && <PauseOverlay />}
      {status === 'finished' && <ResultsOverlay />}
    </div>
  )
}

export default App

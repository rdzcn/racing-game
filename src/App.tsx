import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Perf } from 'r3f-perf'
import { GameScene } from './game/components/GameScene'
import { useRaceStore } from './game/state/raceStore'
import { HUD } from './ui/HUD'
import { Menu } from './ui/Menu'
import { PauseOverlay } from './ui/PauseOverlay'

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
  usePauseKey()

  return (
    <div className="relative h-screen w-screen bg-black">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        {import.meta.env.DEV && <Perf position="top-left" />}
        <GameScene />
      </Canvas>
      {status !== 'menu' && <HUD />}
      {status === 'menu' && <Menu />}
      {status === 'paused' && <PauseOverlay />}
    </div>
  )
}

export default App

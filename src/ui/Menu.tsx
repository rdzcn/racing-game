import { useProgress } from '@react-three/drei'
import { useRaceStore } from '../game/state/raceStore'

export function Menu() {
  const startGame = useRaceStore((s) => s.startGame)
  const bestLapTime = useRaceStore((s) => s.bestLapTime)
  const { active, progress } = useProgress()

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/40 font-sans">
      <h1 className="text-7xl font-black tracking-tight text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.6)]">
        🏁 RACING
      </h1>

      <button
        onClick={startGame}
        disabled={active}
        className="rounded-2xl bg-emerald-500 px-14 py-5 text-4xl font-black text-white shadow-xl transition hover:scale-105 hover:bg-emerald-400 active:scale-95 disabled:scale-100 disabled:bg-gray-500"
      >
        {active ? `Loading… ${Math.round(progress)}%` : 'PLAY'}
      </button>

      <div className="text-center text-lg text-white/90">
        <p>Drive with the arrow keys or WASD</p>
        <p>Esc pauses the race</p>
        {bestLapTime != null && <p className="mt-2 font-bold text-amber-300">Can you beat your best lap?</p>}
      </div>

      <p className="absolute bottom-3 text-xs text-white/50">
        Car: “Orion Skylark GT” by dark_igorek — CC Attribution
      </p>
    </div>
  )
}

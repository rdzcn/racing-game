import { useProgress } from '@react-three/drei'
import { cars, tracks } from '../game/config'
import { useRaceStore } from '../game/state/raceStore'

export function Menu() {
  const startGame = useRaceStore((s) => s.startGame)
  const bestLapTime = useRaceStore((s) => s.bestLapTime)
  const selectedTrackId = useRaceStore((s) => s.selectedTrackId)
  const selectTrack = useRaceStore((s) => s.selectTrack)
  const selectedCarId = useRaceStore((s) => s.selectedCarId)
  const selectCar = useRaceStore((s) => s.selectCar)
  const { active, progress } = useProgress()

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/40 font-sans">
      <h1 className="text-7xl font-black tracking-tight text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.6)]">
        🏁 RACING
      </h1>

      <div className="flex max-w-4xl flex-wrap justify-center gap-4">
        {tracks.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTrack(t.id)}
            className={`w-64 rounded-2xl border-4 p-4 text-left text-white transition hover:scale-105 ${
              t.id === selectedTrackId
                ? 'border-emerald-400 bg-emerald-500/30'
                : 'border-white/20 bg-black/30 hover:border-white/50'
            }`}
          >
            <div className="text-2xl font-black">{t.label}</div>
            <div className="mt-1 text-sm text-white/80">{t.description}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        {cars.map((c) => (
          <button
            key={c.id}
            onClick={() => selectCar(c.id)}
            className={`w-32 rounded-2xl border-4 p-3 text-center text-white transition hover:scale-105 ${
              c.id === selectedCarId
                ? 'border-amber-400 bg-amber-500/30'
                : 'border-white/20 bg-black/30 hover:border-white/50'
            }`}
          >
            <div className="text-4xl">{c.emoji}</div>
            <div className="mt-1 text-sm font-bold">{c.label}</div>
          </button>
        ))}
      </div>

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
        Cars, tracks &amp; props by Kenney (kenney.nl) — CC0
      </p>
    </div>
  )
}

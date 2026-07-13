import { useProgress } from '@react-three/drei'
import { cars } from '../game/config'
import { useRaceStore } from '../game/state/raceStore'

function PlayerPanel({ index, label }: { index: number; label: string }) {
  const carId = useRaceStore((s) => s.players[index]?.carId ?? null)
  const selectCar = useRaceStore((s) => s.selectCar)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <div className="text-2xl font-black text-white">{label}</div>
      <div className="flex flex-wrap justify-center gap-3">
        {cars.map((c) => (
          <button
            key={c.id}
            onClick={() => selectCar(index, c.id)}
            className={`w-28 rounded-2xl border-4 p-3 text-center text-white transition hover:scale-105 ${
              c.id === carId
                ? 'border-amber-400 bg-amber-500/30'
                : 'border-white/20 bg-black/30 hover:border-white/50'
            }`}
          >
            <div className="text-4xl">{c.emoji}</div>
            <div className="mt-1 text-sm font-bold">{c.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Screen 3 — car select. Single-player gets one centered panel; 2-player
 * mode splits the screen vertically (left/right) so each player picks in
 * "their half" — same left/right layout as the in-race split-screen would
 * suggest for a head-to-head duel. */
export function CarSelect() {
  const mode = useRaceStore((s) => s.mode)
  const backToTrackSelect = useRaceStore((s) => s.backToTrackSelect)
  const startGame = useRaceStore((s) => s.startGame)
  const ready = useRaceStore((s) => s.players.every((p) => p.carId != null))
  const { active, progress } = useProgress()

  return (
    <div className="absolute inset-0 flex flex-col bg-black/60 font-sans">
      {mode === 'single' ? (
        <div className="flex flex-1 items-center justify-center">
          <PlayerPanel index={0} label="Choose your car" />
        </div>
      ) : (
        <div className="flex flex-1 divide-x-4 divide-white/20">
          <PlayerPanel index={0} label="Player 1 — WASD" />
          <PlayerPanel index={1} label="Player 2 — Arrow Keys" />
        </div>
      )}
      <div className="flex items-center justify-center gap-4 py-6">
        <button
          onClick={backToTrackSelect}
          className="rounded-xl bg-gray-600 px-8 py-3 text-xl font-bold text-white shadow-lg transition hover:scale-105 hover:bg-gray-500 active:scale-95"
        >
          ← Back
        </button>
        <button
          onClick={startGame}
          disabled={!ready || active}
          className="rounded-2xl bg-emerald-500 px-14 py-5 text-3xl font-black text-white shadow-xl transition hover:scale-105 hover:bg-emerald-400 active:scale-95 disabled:scale-100 disabled:bg-gray-500"
        >
          {active ? `Loading… ${Math.round(progress)}%` : 'START RACE'}
        </button>
      </div>
    </div>
  )
}


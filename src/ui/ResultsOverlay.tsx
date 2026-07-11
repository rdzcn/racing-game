import { useRaceStore } from '../game/state/raceStore'
import { formatLapTime } from './format'

const buttonBase =
  'rounded-xl px-10 py-3 text-2xl font-bold text-white shadow-lg transition hover:scale-105 active:scale-95'

/** Shown once someone crosses the line on the final lap — the race ends for
 * everyone at that point (first past the post), win or DNF. */
export function ResultsOverlay() {
  const mode = useRaceStore((s) => s.mode)
  const players = useRaceStore((s) => s.players)
  const winnerIndex = useRaceStore((s) => s.winnerIndex)
  const restartRace = useRaceStore((s) => s.restartRace)
  const toMenu = useRaceStore((s) => s.toMenu)

  const title =
    mode === 'two'
      ? winnerIndex != null
        ? `🏆 Player ${winnerIndex + 1} Wins!`
        : 'Race Finished!'
      : '🏁 Race Finished!'

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 font-sans">
      <h2 className="text-5xl font-black text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.6)]">
        {title}
      </h2>

      <div className="flex gap-8">
        {players.map((p, i) => (
          <div
            key={i}
            className="w-64 rounded-2xl border-4 border-white/20 bg-black/30 p-5 text-white"
          >
            {mode === 'two' && <div className="mb-2 text-xl font-black">Player {i + 1}</div>}
            <div className="text-sm opacity-80">Finish time</div>
            <div className="text-2xl font-bold tabular-nums">
              {p.finishTime != null ? formatLapTime(p.finishTime) : 'DNF'}
            </div>
            <div className="mt-3 text-sm opacity-80">Best lap</div>
            <div className="text-xl font-bold tabular-nums">
              {p.bestLapTime != null ? formatLapTime(p.bestLapTime) : '–'}
            </div>
            <div className="mt-3 text-sm opacity-80">Score</div>
            <div className="text-xl font-bold tabular-nums text-amber-300">{p.score} pts</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button onClick={restartRace} className={`${buttonBase} bg-sky-500 hover:bg-sky-400`}>
          Race Again
        </button>
        <button onClick={toMenu} className={`${buttonBase} bg-gray-600 hover:bg-gray-500`}>
          Main Menu
        </button>
      </div>
    </div>
  )
}

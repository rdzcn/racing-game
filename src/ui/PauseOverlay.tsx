import { useRaceStore } from '../game/state/raceStore'

const buttonBase =
  'rounded-xl px-10 py-3 text-2xl font-bold text-white shadow-lg transition hover:scale-105 active:scale-95'

export function PauseOverlay() {
  const resume = useRaceStore((s) => s.resume)
  const restartRace = useRaceStore((s) => s.restartRace)
  const toMenu = useRaceStore((s) => s.toMenu)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/50 font-sans">
      <h2 className="mb-4 text-5xl font-black text-white">Paused</h2>
      <button onClick={() => resume(performance.now())} className={`${buttonBase} bg-emerald-500 hover:bg-emerald-400`}>
        Resume
      </button>
      <button onClick={restartRace} className={`${buttonBase} bg-sky-500 hover:bg-sky-400`}>
        Restart race
      </button>
      <button onClick={toMenu} className={`${buttonBase} bg-gray-600 hover:bg-gray-500`}>
        Main menu
      </button>
    </div>
  )
}

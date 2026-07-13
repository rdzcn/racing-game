import { useRaceStore } from '../game/state/raceStore'

/** Screen 1 — mode select. Just "how many players", nothing else; track and
 * car pickers are their own screens (see TrackSelect / CarSelect). */
export function Menu() {
  const mode = useRaceStore((s) => s.mode)
  const setMode = useRaceStore((s) => s.setMode)
  const goToTrackSelect = useRaceStore((s) => s.goToTrackSelect)
  const bestLapTime = useRaceStore((s) => s.players[0]?.bestLapTime ?? null)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 bg-black/40 font-sans">
      <h1 className="text-7xl font-black tracking-tight text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.6)]">
        🏁 RACING
      </h1>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 px-8 sm:grid-cols-2">
        <button
          onClick={() => setMode('single')}
          className={`rounded-2xl border-4 p-8 text-center text-white transition hover:scale-105 ${
            mode === 'single'
              ? 'border-sky-400 bg-sky-500/30 shadow-xl'
              : 'border-white/20 bg-black/30 hover:border-white/50'
          }`}
        >
          <div className="text-6xl">🧑</div>
          <div className="mt-3 text-3xl font-black">1 Player</div>
          <div className="mt-1 text-sm text-white/80">Solo run, beat your best lap</div>
        </button>
        <button
          onClick={() => setMode('two')}
          className={`rounded-2xl border-4 p-8 text-center text-white transition hover:scale-105 ${
            mode === 'two'
              ? 'border-sky-400 bg-sky-500/30 shadow-xl'
              : 'border-white/20 bg-black/30 hover:border-white/50'
          }`}
        >
          <div className="text-6xl">🧑🧑</div>
          <div className="mt-3 text-3xl font-black">2 Players</div>
          <div className="mt-1 text-sm text-white/80">Split-screen head to head</div>
        </button>
      </div>

      <button
        onClick={goToTrackSelect}
        className="rounded-2xl bg-emerald-500 px-14 py-5 text-4xl font-black text-white shadow-xl transition hover:scale-105 hover:bg-emerald-400 active:scale-95"
      >
        Continue →
      </button>

      <div className="text-center text-lg text-white/90">
        {mode === 'single' ? (
          <p>Drive with the arrow keys or WASD</p>
        ) : (
          <p>Player 1: WASD · Player 2: Arrow keys</p>
        )}
        <p>Esc pauses the race</p>
        {mode === 'single' && bestLapTime != null && (
          <p className="mt-2 font-bold text-amber-300">Can you beat your best lap?</p>
        )}
      </div>

      <p className="absolute bottom-3 text-xs text-white/50">
        Cars, tracks &amp; props by Kenney (kenney.nl) — CC0
      </p>
    </div>
  )
}


import { tracks } from '../game/config'
import { seasons } from '../game/seasons'
import { useRaceStore } from '../game/state/raceStore'
import { useSettingsStore } from '../game/state/settingsStore'

/** Screen 2 — track select. One choice for the whole race, even in
 * 2-player mode (Player 1 picks for both, matching the "host picks the
 * arena" flow from the mockups). */
export function TrackSelect() {
  const mode = useRaceStore((s) => s.mode)
  const selectedTrackId = useRaceStore((s) => s.selectedTrackId)
  const selectTrack = useRaceStore((s) => s.selectTrack)
  const backToMenu = useRaceStore((s) => s.backToMenu)
  const goToCarSelect = useRaceStore((s) => s.goToCarSelect)
  const season = useSettingsStore((s) => s.season)
  const setSeason = useSettingsStore((s) => s.setSeason)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/40 font-sans">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.6)]">
          🗺️ SELECT TRACK
        </h1>
        {mode === 'two' && (
          <p className="mt-2 text-lg font-bold text-sky-300">Player 1 picks the track for both of you</p>
        )}
      </div>

      <div className="flex max-w-5xl flex-wrap justify-center gap-4 px-8">
        {tracks.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTrack(t.id)}
            className={`w-64 rounded-2xl border-4 p-4 text-left text-white transition hover:scale-105 ${
              t.id === selectedTrackId
                ? 'border-emerald-400 bg-emerald-500/30 shadow-xl'
                : 'border-white/20 bg-black/30 hover:border-white/50'
            }`}
          >
            <div className="text-2xl font-black">{t.label}</div>
            <div className="mt-1 text-sm text-white/80">{t.description}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-bold uppercase tracking-widest text-white/60">Season</span>
        {seasons.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeason(s.id)}
            className={`rounded-xl border-2 px-4 py-2 text-lg font-bold text-white transition hover:scale-105 ${
              s.id === season
                ? 'border-amber-400 bg-amber-500/30'
                : 'border-white/20 bg-black/30 hover:border-white/50'
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={backToMenu}
          className="rounded-xl bg-gray-600 px-8 py-3 text-xl font-bold text-white shadow-lg transition hover:scale-105 hover:bg-gray-500 active:scale-95"
        >
          ← Back
        </button>
        <button
          onClick={goToCarSelect}
          className="rounded-2xl bg-emerald-500 px-14 py-5 text-3xl font-black text-white shadow-xl transition hover:scale-105 hover:bg-emerald-400 active:scale-95"
        >
          Choose Cars →
        </button>
      </div>
    </div>
  )
}
